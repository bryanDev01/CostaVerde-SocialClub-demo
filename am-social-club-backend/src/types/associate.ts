export type FamilyRelation =
  | 'spouse'
  | 'son'
  | 'daughter'
  | 'parent'
  | 'sibling'
  | 'other'

export interface Associate {
  id: string
  user_id: string
  ci: string
  name: string
  phone: string | null
  relation: FamilyRelation
  date_of_birth: Date | null
  created_at: Date
  updated_at: Date
}

export interface CreateAssociatePayload {
  user_id: string
  ci: string
  name: string
  phone?: string
  relation: FamilyRelation
  date_of_birth?: string
}

export interface UpdateAssociatePayload {
  name?: string
  phone?: string
  relation?: FamilyRelation
  date_of_birth?: string
}
