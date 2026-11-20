// ============================================================================
// seed-demo.mjs — Datos ficticios para la DEMO DE PORTAFOLIO (rama `demo`)
// ============================================================================
// Marca ficticia: "Club Social Costa Verde" (Nada de esto es real).
// Borra los datos de negocio de la base de datos conectada y siembra:
//   empresas, staff, socios con suscripciones/pagos, acompañantes,
//   precarga HR, reservas pasadas y futuras, eventos, visitas VIP y
//   notificaciones — además re-apunta las imágenes del catálogo a los
//   assets vectoriales de /branding-demo.
//
// Uso:
//   cd am-social-club-backend
//   npm run migrate        # primero: esquema + seed de desarrollo
//   node scripts/seed-demo.mjs --force
//
// SEGURIDAD: se niega a ejecutar si el nombre de la base de datos no
// contiene "demo", a menos que se pase --force explícitamente.
// ============================================================================

import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.DB_URL_AV
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Configure the backend .env file first.')
  process.exit(1)
}

const FORCE = process.argv.includes('--force')
const dbName = new URL(DATABASE_URL).pathname.replace(/^\//, '')
if (!FORCE) {
  console.error(
    `Refusing to wipe "${dbName}": database name does not contain "demo".\n` +
      'Re-run with --force only against a disposable demo database.'
  )
  process.exit(1)
}

const PASSWORD = 'demo1234'
const passwordHash = await bcrypt.hash(PASSWORD, 10)

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require/.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
})

const client = await pool.connect()

// ---------------------------------------------------------------------------
// Datos ficticios
// ---------------------------------------------------------------------------

const COMPANIES = [
  { name: 'Grupo Empresarial Marina', code: 'GEM' },
  { name: 'Astilleros del Este S.A.', code: 'AEZ' },
]

const STAFF = [
  { email: 'administrador@clubcostaverde.cu', name: 'Admin Demo', role: 'admin', company: null, ci: '99000000001', phone: '55551010' },
  { email: 'recepcion@clubcostaverde.cu', name: 'Recepción Costa Verde', role: 'receptionist', company: null, ci: '99000000002', phone: '55551011' },
  { email: 'rrhh@clubcostaverde.cu', name: 'HR Marina', role: 'hr', company: 'Grupo Empresarial Marina', ci: '99000000003', phone: '55551012' },
  { email: 'rrhh.aez@clubcostaverde.cu', name: 'HR Astilleros', role: 'hr', company: 'Astilleros del Este S.A.', ci: '99000000004', phone: '55551013' },
]

// Socios ficticios con distintos estados para recorrer todos los flujos.
const MEMBERS = [
  { ci: '80010150001', email: 'socio1@demo.costaverde.cu', name: 'Laura Quesada Ferrán', company: 0, status: 'active', plan: 3 },
  { ci: '75020245002', email: 'socio2@demo.costaverde.cu', name: 'Ernesto Beltrán Rojas', company: 0, status: 'active', plan: 12 },
  { ci: '85030330003', email: 'socio3@demo.costaverde.cu', name: 'Mayelin Cruz Duarte', company: 0, status: 'active', plan: 6 },
  { ci: '90040420004', email: 'socio4@demo.costaverde.cu', name: 'Yasmani Perera Lescay', company: 0, status: 'active', plan: 1 },
  { ci: '82050515005', email: 'socio5@demo.costaverde.cu', name: 'Daimarí Fuentes Salazar', company: 1, status: 'active', plan: 3 },
  { ci: '78060610006', email: 'socio6@demo.costaverde.cu', name: 'Roberto Alcalde Milán', company: 1, status: 'active', plan: 12 },
  // Suspendida por impago (expiró hace 20 días → sin periodo de gracia)
  { ci: '88070705007', email: 'socio7@demo.costaverde.cu', name: 'Gladys Tamayo Iznaga', company: 0, status: 'suspended', plan: 3, expiredDaysAgo: 20 },
  // En periodo de gracia (expiró hace 3 días → sigue operativa)
  { ci: '91080802008', email: 'socio8@demo.costaverde.cu', name: 'Osmany Cardero Batista', company: 1, status: 'active', plan: 1, expiringInDays: -3 },
  // Registrado, esperando validar su pago (muro de pago)
  { ci: '95090901009', email: 'socio9@demo.costaverde.cu', name: 'Paloma Estévez Mirabal', company: 0, status: 'pending_payment', plan: null },
  // Cuentas "invitado" para inspectores de la demo: activas, sin reservas ni
  // acompañantes, para probar el flujo completo de reserva sin romper los escenarios.
  { ci: '92090907012', email: 'invitado1@demo.costaverde.cu', name: 'Invitado Curioso Pérez', company: 0, status: 'active', plan: 12 },
  { ci: '93090908013', email: 'invitada2@demo.costaverde.cu', name: 'Inspectora Entusiasta Ledesma', company: 1, status: 'active', plan: 12 },
]

const EXTERNALS = [
  { ci: '70101020010', email: 'externo1@demo.costaverde.cu', name: 'Cándido Reinoso Vega' },
  { ci: '83111130011', email: 'externo2@demo.costaverde.cu', name: 'Silvia Nápoles Cuesta' },
  { ci: '84111140014', email: 'visitante@demo.costaverde.cu', name: 'Visitante de la Demo' },
]

const ASSOCIATES = [
  { owner: 'socio1@demo.costaverde.cu', ci: '05121240021', name: 'Adrián Quesada Ferrán', relation: 'son', dob: '2012-12-04' },
  { owner: 'socio1@demo.costaverde.cu', ci: '78010160022', name: 'Isabel Ferrán Montiel', relation: 'spouse', dob: '1978-01-01' },
  { owner: 'socio2@demo.costaverde.cu', ci: '10050570023', name: 'Lucía Beltrán Aguiar', relation: 'daughter', dob: '2010-05-05' },
  { owner: 'socio5@demo.costaverde.cu', ci: '15080880024', name: 'Daniel Fuentes Ortega', relation: 'son', dob: '2015-08-08' },
]

// Precarga de HR (aún sin registrarse en la app)
const PRE_EMPLOYEES = [
  { ci: '98121290031', name: 'Norge Escalona Piloto', company: 'Grupo Empresarial Marina' },
  { ci: '01020230032', name: 'Marilyn Baute Ferrer', company: 'Grupo Empresarial Marina' },
  { ci: '99030340033', name: 'Félix Arguelles Nadal', company: 'Astilleros del Este S.A.' },
]

// Reubicación de imágenes del catálogo a assets vectoriales ficticios
const IMG = {
  piscina: '/branding-demo/piscina.svg',
  restaurante: '/branding-demo/restaurante.svg',
  bar: '/branding-demo/billar.svg',
  cancha: '/branding-demo/cancha.svg',
  belleza: '/branding-demo/belleza.svg',
  menu: '/branding-demo/menu.svg',
  club: '/images/hero-club.svg',
  eventos: '/images/events-banner.svg',
  tenis: '/images/activity-tenis.svg',
}

const ACTIVITY_IMAGES = {
  'Piscina Artificial': [IMG.piscina, IMG.club],
  'Piscina Natural': [IMG.piscina],
  Gym: [IMG.cancha, IMG.tenis],
  'Sala de Juegos': [IMG.bar],
  'Salón de Belleza': [IMG.belleza],
  Spa: [IMG.belleza, IMG.club],
  'Restaurante de Comida Criolla': [IMG.restaurante, IMG.menu],
  'Ranchón de Comida Criolla': [IMG.restaurante],
  'Casa de la Pasta': [IMG.restaurante],
  'Casa del Mar': [IMG.restaurante, IMG.piscina],
  'Casa del Ron': [IMG.bar, IMG.restaurante],
  'Casa de la Cerveza': [IMG.bar],
  'Casa del Café': [IMG.menu, IMG.restaurante],
  'Casa del Chocolate': [IMG.menu],
  'Casa del Helado': [IMG.menu, IMG.piscina],
  'Casa del Refresco': [IMG.menu],
  'Casa la Picadera': [IMG.restaurante, IMG.bar],
  'Pan con': [IMG.restaurante],
}

// Catálogo completo: mismos nombres/capacidades que la app real, textos ficticios.
// [nombre, categoría, descripción, capacidad, locación, reservable]
const ACTIVITY_CATALOG = [
  ['Piscina Artificial', 'Piscina', 'Piscina grande con áreas para adultos y niños, duchas y camastros.', 100, 'Ala Deportiva', false],
  ['Piscina Natural', 'Piscina', 'Baño en área natural con vistas al mar, ideal para disfrutar en familia.', 40, 'Área Natural', false],
  ['Gym', 'Gimnasio', 'Sala de musculación y cardio con equipos y clases guiadas.', 30, 'Ala Deportiva', true],
  ['Sala de Juegos', 'Juegos', 'Billar, dominó, ping-pong y juegos de mesa para compartir.', 20, 'Edificio Social', true],
  ['Salón de Belleza', 'Belleza', 'Corte, peinado, manicura y cuidados personales.', 10, 'Edificio Social', true],
  ['Spa', 'Belleza', 'Masajes relajantes y tratamientos de bienestar.', 10, null, true],
  ['Restaurante de Comida Criolla', 'Restaurante', 'Comida criolla cubana al plato con servicio a la mesa.', 60, 'Casa Principal', true],
  ['Ranchón de Comida Criolla', 'Restaurante', 'Ranchón con comida criolla para grupos y familias.', 80, null, false],
  ['Casa de la Pasta', 'Restaurante', 'Pastas frescas con salsas caseras y opciones del mar.', 60, null, true],
  ['Casa del Mar', 'Restaurante', 'Pescados y mariscos frente a la costa.', 50, 'Malecón', true],
  ['Casa del Ron', 'Restaurante', 'Coctelería con rones añejos y música en vivo.', 60, null, true],
  ['Casa de la Cerveza', 'Restaurante', 'Cerveza artesanal bien fría con pinchos para compartir.', 40, 'Terraza', false],
  ['Casa del Café', 'Restaurante', 'Café, repostería y desayunos en el jardín.', 30, 'Jardín', false],
  ['Casa del Chocolate', 'Restaurante', 'Chocolate artesanal y dulces elaborados con productos locales.', 35, 'Edificio Social', false],
  ['Casa del Helado', 'Restaurante', 'Helados y raspaduras de sabores tropicales.', 30, 'Edificio Social', false],
  ['Casa del Refresco', 'Restaurante', 'Bebidas refrescantes, aguas y jugos naturales.', 30, null, false],
  ['Casa la Picadera', 'Restaurante', 'Picadera cubana: frituras, embutidos y bocados tradicionales.', 40, null, false],
  ['Pan con', 'Restaurante', 'Pan con… la opción rápida del club para comer al paso.', 20, null, false],
]

const MENUS = [
  { name: 'Buffet Criollo Clásico', desc: 'Arroz congrí, pollo frito, yuca con mojo y ensalada.', price: 850 },
  { name: 'Buffet del Marino', desc: 'Pescado del día, arroz caldoso, tostones y ensalada tropical.', price: 1200 },
  { name: 'Parrilla de la Costa', desc: 'Carnes a la brasa, maíz asado, frijoles negros y bebidas.', price: 1500 },
]

const EVENTS = [
  { name: 'Salón Fiesta del Muelle', loc: 'Salón principal', capacity: 120, price: 15000, menu: 0, img: IMG.eventos, desc: 'Salón climatizado con tarima, audio y meseros para celebraciones familiares.' },
  { name: 'Jardín de la Brisa', loc: 'Área exterior', capacity: 60, price: 9000, menu: 1, img: IMG.club, desc: 'Espacio al aire libre con pérgola, ideal para cumpleaños y bodas pequeñas.' },
  { name: 'Terraza del Faro', loc: 'Terraza bar', capacity: 40, price: 7000, menu: 2, img: IMG.bar, desc: 'Terraza con barra y vista al club para cocteles y reuniones de empresa.' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const userIds = new Map() // email -> id
const activityIds = new Map() // name -> id

async function q(text, params) {
  return client.query(text, params)
}

function daysFromNow(days, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d
}

async function insertUser({ ci, email, name, phone, company, status, role }) {
  const roleId = (await q('SELECT id FROM roles WHERE name = $1', [role])).rows[0].id
  const companyId = company === null || company === undefined
    ? null
    : (await q('SELECT id FROM companies WHERE name = $1', [company])).rows[0].id
  const userType = role === 'user' && /^(externo|visitante)@/.test(email) ? 'external' : 'corporate'
  const { rows } = await q(
    `INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [ci, email, passwordHash, name, phone, companyId, userType, status, roleId]
  )
  userIds.set(email, rows[0].id)
  return rows[0].id
}

async function insertSubscription(userId, planMonths, status, { expiredDaysAgo = null, expiringInDays = null } = {}) {
  const plan = (await q('SELECT id, price_cup FROM subscription_plans WHERE duration_months = $1', [planMonths])).rows[0]
  const started = expiredDaysAgo !== null
    ? daysFromNow(-planMonths * 30 - expiredDaysAgo)
    : daysFromNow(expiringInDays !== null ? expiringInDays - planMonths * 30 : -planMonths * 30 + 1)
  const expires = expiredDaysAgo !== null
    ? daysFromNow(-expiredDaysAgo)
    : expiringInDays !== null
      ? daysFromNow(expiringInDays)
      : daysFromNow(planMonths * 30)
  const inGrace = expiringInDays !== null && expiringInDays < 0 && Math.abs(expiringInDays) <= 5
  const { rows } = await q(
    `INSERT INTO subscriptions (user_id, plan_id, price_paid, status, started_at, expires_at, is_grace_period)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [userId, plan.id, plan.price_cup, status, started, expires, inGrace]
  )
  return rows[0].id
}

async function insertPayment(userId, subscriptionId, amount, reference, txn, status, validated) {
  await q(
    `INSERT INTO payments (user_id, subscription_id, amount_cup, reference_code, transaction_number, status, validated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, subscriptionId, amount, reference, txn, status, validated ? new Date() : null]
  )
}

async function insertReservation(email, activityName, date, qty, status, notes) {
  const userId = userIds.get(email)
  const activityId = activityIds.get(activityName)
  if (!userId || !activityId) return
  await q(
    `INSERT INTO reservations (user_id, activity_id, reservation_date, quantity, status, notes, user_confirmed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, activity_id, reservation_date) WHERE status != 'cancelled' DO NOTHING`,
    [userId, activityId, date, qty, status, notes ?? null,
      ['confirmed', 'pending_reminder', 'completed'].includes(status) ? daysFromNow(-1) : null]
  )
}

// ---------------------------------------------------------------------------
// Semilla
// ---------------------------------------------------------------------------

try {
  await q('BEGIN')

  console.log('· Limpiando datos de negocio…')
  await q(`TRUNCATE notifications, payments, event_reservations, reservations, subscriptions,
            carnet, associates, visits, vip_users, pre_employees, users, events, menus,
            companies, audit_log
          RESTART IDENTITY CASCADE`)

  console.log('· Empresas y staff…')
  for (const c of COMPANIES) {
    await q('INSERT INTO companies (name, is_active) VALUES ($1, true)', [c.name])
  }
  for (const s of STAFF) {
    await insertUser({ ...s, status: 'active' })
  }

  console.log('· Socios, externos y suscripciones…')
  for (const m of MEMBERS) {
    const id = await insertUser({
      ci: m.ci, email: m.email, name: m.name,
      phone: `55${m.ci.slice(-6)}`,
      company: COMPANIES[m.company].name,
      status: m.status, role: 'user',
    })
    if (m.plan) {
      await insertSubscription(id, m.plan, 'validated', {
        expiredDaysAgo: m.expiredDaysAgo ?? null,
        expiringInDays: m.expiringInDays ?? null,
      })
    }
  }
  for (const e of EXTERNALS) {
    const id = await insertUser({ ...e, company: null, status: 'external_active', role: 'user' })
    const subId = await insertSubscription(id, 1, 'validated')
    await insertPayment(id, subId, 150, `CV-${e.ci.slice(-6)}-EXT-001`, `TXN-${e.ci.slice(-6)}`, 'validated', true)
  }

  // Pagos reales de socios (validados + uno pendiente para el panel admin)
  console.log('· Pagos de suscripción…')
  const memberEmails = [...userIds.keys()].filter((em) => em.includes('demo.costaverde'))
  for (const email of memberEmails) {
    const sub = (await q(
      `SELECT s.id, s.price_paid, p.id AS pay_id FROM subscriptions s
       LEFT JOIN payments p ON p.subscription_id = s.id
       WHERE s.user_id = $1`,
      [userIds.get(email)]
    )).rows[0]
    if (!sub || sub.pay_id) continue
    const ci = (await q('SELECT ci FROM users WHERE id = $1', [userIds.get(email)])).rows[0].ci
    if (email === 'socio9@demo.costaverde.cu') continue // aún sin pago registrado
    const pending = email === 'socio8@demo.costaverde.cu'
    await insertPayment(
      userIds.get(email), sub.id, sub.price_paid,
      `CV-${ci.slice(-6)}-2026${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      pending ? null : `TXN-${ci.slice(-4)}-${ci.slice(0, 3)}`,
      pending ? 'pending_validation' : 'validated',
      !pending
    )
  }
  // socio9: suscripción pendiente de validación con pago en curso
  const s9 = userIds.get('socio9@demo.costaverde.cu')
  const s9sub = await insertSubscription(s9, 3, 'pending_validation')
  await insertPayment(s9, s9sub, 450, 'CV-901009-202611-02', 'TXN-778812', 'pending_validation', false)

  console.log('· Acompañantes y precarga HR…')
  for (const a of ASSOCIATES) {
    await q(
      `INSERT INTO associates (user_id, ci, name, relation, date_of_birth)
       VALUES ($1,$2,$3,$4,$5)`,
      [userIds.get(a.owner), a.ci, a.name, a.relation, a.dob]
    )
  }
  for (const p of PRE_EMPLOYEES) {
    await q(
      `INSERT INTO pre_employees (ci, name, company, status) VALUES ($1,$2,$3,'pending')`,
      [p.ci, p.name, p.company]
    )
  }

  console.log('· VIP y visitas…')
  const adminId = userIds.get('administrador@clubcostaverde.cu')
  const recId = userIds.get('recepcion@clubcostaverde.cu')
  const vips = [
    { name: 'Ramiro Villazón (delegación)', ci: '66010190041', partners: 3 },
    { name: 'Sociedad Cultural El Faro', ci: '66010190042', partners: 6 },
  ]
  for (const v of vips) {
    await q(
      `INSERT INTO vip_users (name, ci, partners_count, created_by_user_id) VALUES ($1,$2,$3,$4)`,
      [v.name, v.ci, v.partners, adminId]
    )
  }
  for (let d = -10; d <= 0; d += 2) {
    const paid = d !== 0
    await q(
      `INSERT INTO visits (kind, responsible_name, responsible_ci, partner_count, visit_date,
                           amount_cup, payment_method, payment_reference, paid_at, paid_by_user_id)
       VALUES ('walk_in', $1, $2, $3, CURRENT_DATE + ($4::int), $5, $6, $7, $8, $9)`,
      ['Visitante de paso', null, 2, d,
        paid ? 3000 : null, paid ? 'cash' : null, paid ? 'RC-' + Math.abs(d) * 7717 : null,
        paid ? daysFromNow(d) : null, paid ? recId : null]
    )
  }

  console.log('· Catálogo: 18 lugares con imágenes ficticias…')
  const catalogCategoryNames = [...new Set(ACTIVITY_CATALOG.map(([, cat]) => cat))]
  const categoryIds = new Map()
  for (const catName of catalogCategoryNames) {
    const { rows } = await q(
      `INSERT INTO activity_categories (name, description, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (name) DO UPDATE SET is_active = true
       RETURNING id`,
      [catName, `Categoría demo: ${catName}`]
    )
    categoryIds.set(catName, rows[0].id)
  }
  const catalogNames = ACTIVITY_CATALOG.map(([name]) => name)
  // Quita lugares heredados de las migraciones (Main Pool, Tennis Court 1…) sin reservas.
  await q(
    `DELETE FROM activities WHERE name <> ALL($1::text[])
       AND NOT EXISTS (SELECT 1 FROM reservations r WHERE r.activity_id = activities.id)`,
    [catalogNames]
  )
  for (const [name, cat, desc, capacity, location, reservable] of ACTIVITY_CATALOG) {
    const images = ACTIVITY_IMAGES[name] ?? [IMG.club]
    await q(
      `INSERT INTO activities (category_id, name, description, capacity, location, image_url, images, is_active, is_reservable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
       ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description,
         capacity = EXCLUDED.capacity,
         location = EXCLUDED.location,
         image_url = EXCLUDED.image_url,
         images = EXCLUDED.images,
         is_active = true,
         is_reservable = EXCLUDED.is_reservable`,
      [categoryIds.get(cat), name, desc, capacity, location, images[0], images, reservable]
    )
  }
  const catalog = await q('SELECT id, name FROM activities')
  for (const row of catalog.rows) {
    activityIds.set(row.name, row.id)
  }

  console.log('· Eventos y menús de catering…')
  const menuIds = []
  for (const m of MENUS) {
    const { rows } = await q(
      'INSERT INTO menus (name, description, price_per_guest_cup, is_active) VALUES ($1,$2,$3,true) RETURNING id',
      [m.name, m.desc, m.price]
    )
    menuIds.push(rows[0].id)
  }
  const eventIds = []
  for (const e of EVENTS) {
    const { rows } = await q(
      `INSERT INTO events (name, description, location, menu_id, capacity, rental_price_cup, is_active, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,true,$7) RETURNING id`,
      [e.name, e.desc, e.loc, menuIds[e.menu], e.capacity, e.price, e.img]
    )
    eventIds.push(rows[0].id)
  }
  await q(
    `INSERT INTO event_reservations (user_id, event_id, event_date, guest_count, total_price_cup, status)
     VALUES ($1,$2,$3,45,82500,'confirmed'), ($4,$5,$6,25,40000,'completed')`,
    [userIds.get('socio2@demo.costaverde.cu'), eventIds[0], daysFromNow(21).toISOString().slice(0, 10),
      userIds.get('socio6@demo.costaverde.cu'), eventIds[1], daysFromNow(-15).toISOString().slice(0, 10)]
  )

  console.log('· Reservas (historial + próximas)…')
  const reservable = Object.entries(ACTIVITY_IMAGES)
    .filter(([name]) => ['Gym', 'Sala de Juegos', 'Salón de Belleza', 'Spa',
      'Restaurante de Comida Criolla', 'Casa de la Pasta', 'Casa del Mar', 'Casa del Ron'].includes(name))
    .map(([name]) => name)
  const activeMembers = ['socio1@demo.costaverde.cu', 'socio2@demo.costaverde.cu', 'socio3@demo.costaverde.cu',
    'socio4@demo.costaverde.cu', 'socio5@demo.costaverde.cu', 'socio6@demo.costaverde.cu',
    'externo1@demo.costaverde.cu', 'externo2@demo.costaverde.cu']
  let i = 0
  for (const email of activeMembers) {
    for (const d of [-18, -11, -4]) {
      await insertReservation(email, reservable[i % reservable.length], daysFromNow(d).toISOString().slice(0, 10), 1 + (i % 3), 'completed')
      i += 1
    }
    await insertReservation(email, reservable[(i + 1) % reservable.length], daysFromNow(3).toISOString().slice(0, 10), 2, i % 2 === 0 ? 'confirmed' : 'pending')
    i += 1
  }
  // Una reserva dentro de 48h para el flujo de recordatorio
  await insertReservation('socio3@demo.costaverde.cu', 'Spa', daysFromNow(1).toISOString().slice(0, 10), 1, 'pending_reminder')

  console.log('· Notificaciones de ejemplo…')
  const s9name = 'Paloma Estévez Mirabal'
  await q(
    `INSERT INTO notifications (user_id, type, title, message, channel, status, sent_at)
     VALUES ($1,'payment_pending','Pago en revisión',
             'Registramos tu pago. Un administrador lo validará en las próximas 24 horas.','in_app','sent',NOW())`,
    [userIds.get('socio9@demo.costaverde.cu')]
  )
  await q(
    `INSERT INTO notifications (user_id, type, title, message, channel, status, sent_at)
     VALUES ($1,'reservation_reminder','Confirma tu asistencia',
             'Tu reserva de mañana en Spa requiere confirmación dentro de las próximas 48 horas.','in_app','sent',NOW())`,
    [userIds.get('socio3@demo.costaverde.cu')]
  )
  await q(
    `INSERT INTO notifications (user_id, type, title, message, channel, status, sent_at)
     VALUES ($1,'payment_submitted','Pago pendiente de validar',
             $2,'in_app','sent',NOW())`,
    [adminId, `${s9name} envió el número de operación de su suscripción. Revísalo en Pagos.`]
  )

  await q('COMMIT')

  const counts = await q(`SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM reservations) AS reservations,
    (SELECT COUNT(*) FROM payments) AS payments,
    (SELECT COUNT(*) FROM activities) AS activities`)
  console.log('\n✔ Demo sembrada en "' + dbName + '":', counts.rows[0])
  console.log('\nCredenciales (todas las cuentas):')
  console.log('  Admin:          administrador@clubcostaverde.cu / ' + PASSWORD)
  console.log('  Recepción:      recepcion@clubcostaverde.cu / ' + PASSWORD)
  console.log('  HR Marina:      rrhh@clubcostaverde.cu / ' + PASSWORD)
  console.log('  HR Astilleros:  rrhh.aez@clubcostaverde.cu / ' + PASSWORD)
  console.log('  Socio activo:   socio1@demo.costaverde.cu / ' + PASSWORD)
  console.log('  Pago pendiente: socio9@demo.costaverde.cu / ' + PASSWORD)
  console.log('  Invitado demo:    invitado1@demo.costaverde.cu / ' + PASSWORD)
  console.log('  (externo1/visitante: registros de recepción, no inician sesión en la app)')
} catch (error) {
  await q('ROLLBACK')
  console.error('✘ Seed demo falló:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
