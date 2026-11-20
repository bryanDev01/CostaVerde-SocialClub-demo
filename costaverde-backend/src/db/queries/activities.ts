import { pool } from '../connection.js'
import { clubToday } from '../../utils/helpers.js'
import type { Activity, ActivityCategory, ActivityWithCategory, CreateActivityPayload, UpdateActivityPayload } from '../../types/activity.js'

/** Statuses that occupy a seat for a given day. */
const ACTIVE_RESERVATION_STATUSES = `('pending', 'confirmed', 'pending_reminder')`

export class ActivityQuery {
  static async getAll(): Promise<ActivityWithCategory[]> {
    const result = await pool.query(
      `SELECT a.*, ac.name as category_name,
              COALESCE((
                SELECT SUM(r.quantity) FROM reservations r
                WHERE r.activity_id = a.id
                  AND r.reservation_date = $1::date
                  AND r.status IN ${ACTIVE_RESERVATION_STATUSES}
              ), 0)::int AS reserved_today
       FROM activities a
       JOIN activity_categories ac ON a.category_id = ac.id
       WHERE a.is_active = true
       ORDER BY a.name ASC`,
      [clubToday()]
    )
    return result.rows as ActivityWithCategory[]
  }

  static async getById(id: string): Promise<Activity | null> {
    const result = await pool.query(
      `SELECT a.*,
              COALESCE((
                SELECT SUM(r.quantity) FROM reservations r
                WHERE r.activity_id = a.id
                  AND r.reservation_date = $2::date
                  AND r.status IN ${ACTIVE_RESERVATION_STATUSES}
              ), 0)::int AS reserved_today
       FROM activities a
       WHERE a.id = $1`,
      [id, clubToday()]
    )
    return (result.rows[0] as Activity) ?? null
  }

  static async getWithCategory(id: string): Promise<ActivityWithCategory | null> {
    const result = await pool.query(
      `SELECT a.*, ac.name as category_name,
              COALESCE((
                SELECT SUM(r.quantity) FROM reservations r
                WHERE r.activity_id = a.id
                  AND r.reservation_date = $2::date
                  AND r.status IN ${ACTIVE_RESERVATION_STATUSES}
              ), 0)::int AS reserved_today
       FROM activities a
       JOIN activity_categories ac ON a.category_id = ac.id
       WHERE a.id = $1`,
      [id, clubToday()]
    )
    return (result.rows[0] as ActivityWithCategory) ?? null
  }

  static async getByCategoryId(categoryId: string): Promise<Activity[]> {
    const result = await pool.query(
      'SELECT * FROM activities WHERE category_id = $1 AND is_active = true ORDER BY name',
      [categoryId]
    )
    return result.rows as Activity[]
  }

  static async getCapacity(activityId: string): Promise<{ capacity: number; reserved_count: number } | null> {
    const result = await pool.query(
      'SELECT capacity, reserved_count FROM activities WHERE id = $1',
      [activityId]
    )
    return (result.rows[0] as { capacity: number; reserved_count: number }) ?? null
  }

  static async create(payload: CreateActivityPayload): Promise<Activity> {
    const result = await pool.query(
      `INSERT INTO activities (category_id, name, description, capacity, location, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        payload.category_id,
        payload.name,
        payload.description ?? null,
        payload.capacity,
        payload.location ?? null,
        payload.image_url ?? null,
      ]
    )
    return result.rows[0] as Activity
  }

  static async update(id: string, payload: UpdateActivityPayload): Promise<Activity | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (payload.category_id !== undefined) {
      fields.push(`category_id = $${paramIndex++}`)
      values.push(payload.category_id)
    }
    if (payload.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(payload.name)
    }
    if (payload.description !== undefined) {
      fields.push(`description = $${paramIndex++}`)
      values.push(payload.description)
    }
    if (payload.capacity !== undefined) {
      fields.push(`capacity = $${paramIndex++}`)
      values.push(payload.capacity)
    }
    if (payload.location !== undefined) {
      fields.push(`location = $${paramIndex++}`)
      values.push(payload.location)
    }
    if (payload.image_url !== undefined) {
      fields.push(`image_url = $${paramIndex++}`)
      values.push(payload.image_url)
    }
    if (payload.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`)
      values.push(payload.is_active)
    }

    if (fields.length === 0) return null

    values.push(id)
    const result = await pool.query(
      `UPDATE activities SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )
    return (result.rows[0] as Activity) ?? null
  }

  static async updateReservedCount(id: string, delta: number): Promise<Activity | null> {
    const result = await pool.query(
      `UPDATE activities
       SET reserved_count = reserved_count + $1
       WHERE id = $2 AND reserved_count + $1 >= 0
       RETURNING *`,
      [delta, id]
    )
    return (result.rows[0] as Activity) ?? null
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM activities WHERE id = $1',
      [id]
    )
    return (result.rowCount ?? 0) > 0
  }

  static async getCategories(): Promise<ActivityCategory[]> {
    const result = await pool.query(
      'SELECT * FROM activity_categories WHERE is_active = true ORDER BY name'
    )
    return result.rows as ActivityCategory[]
  }

  /**
   * Marks the reservable places and keeps the rest of the catalog visible.
   * Runs at backend startup in one transaction and is idempotent.
   * Startup only manages what is structural: which places can be reserved and
   * that the place exists. Editable data (capacity, description, location,
   * image, active state) belongs to the administration and is never overwritten.
   * A lock serializes concurrent starts so two instances cannot duplicate rows.
   * Nothing is deleted, because reservations and visits reference activities.
   */
  static async syncReservableServices(services: ReservableService[]): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['activities:sync'])

      const names = services.map((service) => service.name)
      await client.query(
        `UPDATE activities SET is_reservable = false
         WHERE is_reservable = true AND name <> ALL($1::varchar[])`,
        [names]
      )

      for (const service of services) {
        await client.query(
          `INSERT INTO activity_categories (name, is_active)
           SELECT $1::varchar, true
           WHERE NOT EXISTS (SELECT 1 FROM activity_categories WHERE name = $1::varchar)`,
          [service.category]
        )

        // Rename a previously seeded place in place (keeps its id and reservations).
        if (service.rename_from) {
          await client.query(
            `UPDATE activities SET name = $1::varchar
             WHERE name = $2::varchar
               AND NOT EXISTS (SELECT 1 FROM activities WHERE name = $1::varchar)`,
            [service.name, service.rename_from]
          )
        }

        await client.query(
          `INSERT INTO activities (category_id, name, description, capacity, location, image_url, is_active, is_reservable)
           SELECT c.id, $1::varchar, $2::text, $3::int, $4::varchar, $5::varchar, true, true
           FROM activity_categories c
           WHERE c.name = $6::varchar
             AND NOT EXISTS (SELECT 1 FROM activities WHERE name = $1::varchar)`,
          [service.name, service.description, service.capacity, service.location, service.image_url, service.category]
        )
        // Only the capability flag is refreshed on existing places.
        await client.query(
          `UPDATE activities SET is_reservable = true WHERE name = $1::varchar`,
          [service.name]
        )
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

export interface ReservableService {
  name: string
  category: string
  description: string
  capacity: number
  location: string | null
  image_url: string | null
  /** Optional legacy name to rename in place instead of creating a duplicate. */
  rename_from?: string
}

/**
 * The only places that require a reservation. Everything else in the catalog is
 * informational: you can enter those places without booking.
 */
export const RESERVABLE_SERVICES: ReservableService[] = [
  {
    name: 'Sala de Juegos',
    category: 'Juegos',
    description: 'Sala de recreación con juegos de mesa y actividades para toda la familia.',
    capacity: 20,
    location: 'Edificio Social',
    image_url: '/images/Sala%20de%20Juegos/Sala-de-juegos.jpg',
  },
  {
    name: 'Casa del Mar',
    category: 'Restaurante',
    description: 'Restaurante especializado en mariscos y pescados junto al malecón.',
    capacity: 50,
    location: 'Malecón',
    image_url: '/images/Casa%20del%20Mar/casa-mar-0.jpg',
  },
  {
    name: 'Gym',
    category: 'Gimnasio',
    description: 'Gimnasio equipado con máquinas de cardio y pesas, con cupos por horario.',
    capacity: 30,
    location: 'Ala Deportiva',
    image_url: '/images/Gym/gym.jpg',
  },
  {
    name: 'Restaurante de Comida Criolla',
    category: 'Restaurante',
    description: 'Restaurante con comida criolla y nacional, reservas para grupos y familias.',
    capacity: 60,
    location: 'Casa Principal',
    image_url: '/images/Restaurante%20de%20Comida%20Criolla/comida-cubana.jpg',
  },
  {
    name: 'Casa de la Pasta',
    category: 'Restaurante',
    description: 'Casa de la pasta del club, con reservas para socios y sus acompañantes.',
    capacity: 60,
    location: null,
    image_url: '/images/Casa%20de%20la%20Pasta/casa-pasta.jpg',
  },
  {
    name: 'Casa del Ron',
    category: 'Restaurante',
    description: 'Un espacio para degustar la tradición del ron cubano, con catas guiadas y coctelería clásica.',
    capacity: 60,
    location: null,
    image_url: '/images/Casa%20del%20Ron/casa-ron.jpg',
  },
  {
    name: 'Salón de Belleza',
    category: 'Belleza',
    description: 'Salón de belleza y cuidado personal con cita previa para socios.',
    capacity: 10,
    location: 'Edificio Social',
    image_url: '/images/Sal%C3%B3n%20de%20Belleza/Salon-de-belleza.jpeg',
  },
  {
    name: 'Spa',
    category: 'Belleza',
    description: 'Zona de spa y relajación con cita previa para socios.',
    capacity: 10,
    location: null,
    image_url: '/images/Spa/WhatsApp%20Image%202026-11-09%20at%2011.54.39.jpeg',
  },
]
