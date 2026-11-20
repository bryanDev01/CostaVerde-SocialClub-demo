export type PreEmployeeStatus = 'pending' | 'activated' | 'rejected'

export interface PreEmployee {
  id: string
  ci: string
  name: string
  company: string
  email: string | null
  phone: string | null
  status: PreEmployeeStatus
  user_id: string | null
  activated_by_user_id: string | null
  imported_at: Date
  activated_at: Date | null
  created_at: Date
}

export interface EmployeeUploadRow {
  ci: string
  name: string
  company: string
  email?: string
  phone?: string
}

export interface EmployeeUploadResult {
  total: number
  imported: number
  skipped: number
  errors: Array<{
    row: number
    ci: string
    reason: string
  }>
}
