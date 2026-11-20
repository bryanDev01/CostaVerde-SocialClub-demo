export interface CarnetData {
  id: string
  user_id: string
  qr_code_data: string | null
  photo_url: string | null
  issued_at: Date | null
  expires_at: Date | null
  is_valid: boolean
  created_at: Date
  updated_at: Date
}

export interface CarnetQR {
  user_id: string
  ci: string
  name: string
  user_type: string
  expires_at: string | null
}

export interface CarnetWithUser extends CarnetData {
  user_name: string
  user_ci: string
  user_email: string | null
  user_phone: string | null
}
