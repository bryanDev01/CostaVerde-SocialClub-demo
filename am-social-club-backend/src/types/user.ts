/** Core role names, or the name of an admin-defined internal role. */
export type UserRole = 'admin' | 'hr' | 'receptionist' | 'user' | string

export type UserType = 'corporate' | 'external'

export type UserStatus =
  | 'pending_activation'
  | 'pending_payment'
  | 'active'
  | 'suspended'
  | 'inactive'
  | 'external_active'

export interface User {
  id: string
  ci: string
  email: string | null
  password_hash: string | null
  name: string
  phone: string | null
  company_id: string | null
  user_type: UserType
  user_status: UserStatus
  profile_photo_url: string | null
  role_id: string | null
  created_by_user_id: string | null
  created_at: Date
  updated_at: Date
}

export interface UserProfile {
  id: string
  ci: string
  email: string | null
  name: string
  phone: string | null
  company_id: string | null
  company_name: string | null
  user_type: UserType
  user_status: UserStatus
  profile_photo_url: string | null
  role_name: string | null
  role_permissions?: string[] | null
  created_at: Date
}

export type SafeUser = Omit<User, 'password_hash'>

export interface CreateUserPayload {
  ci: string
  email?: string
  password_hash?: string
  name: string
  phone?: string
  company_id?: string
  user_type: UserType
  user_status?: UserStatus
  role_id?: string
  created_by_user_id?: string
}

export interface UpdateUserPayload {
  email?: string
  password_hash?: string
  name?: string
  phone?: string
  company_id?: string
  user_status?: UserStatus
  profile_photo_url?: string | null
}

export interface UpdateProfilePayload {
  name?: string
  phone?: string
  email?: string
  profile_photo_url?: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterCorporatePayload {
  ci: string
  name: string
  email: string
  password: string
  phone?: string
}

export interface CreateExternalUserPayload {
  ci: string
  name: string
  phone?: string
}

export interface LoginResponse {
  user: UserProfile
  token: string
}

export interface JwtPayload {
  userId: string
  email: string | null
  role: UserRole
  /** Effective capabilities. Not signed into the token: resolved from the DB on every request. */
  permissions?: string[]
  userType: UserType
  companyId: string | null
}
