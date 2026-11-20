export interface ActivityCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Date
}

export interface Activity {
  id: string
  category_id: string
  name: string
  description: string | null
  capacity: number
  reserved_count: number
  location: string | null
  image_url: string | null
  is_active: boolean
  /** true = can be booked; false = informational place (free access). */
  is_reservable: boolean
  /** Every photo of the place, main photo first. */
  images: string[]
  /** Seats already booked for today (club timezone). */
  reserved_today: number
  created_at: Date
  updated_at: Date
}

export interface ActivityWithCategory extends Activity {
  category_name: string
}

export interface CreateActivityPayload {
  category_id: string
  name: string
  description?: string
  capacity: number
  location?: string
  image_url?: string
}

export interface UpdateActivityPayload {
  category_id?: string
  name?: string
  description?: string
  capacity?: number
  location?: string
  image_url?: string
  is_active?: boolean
}
