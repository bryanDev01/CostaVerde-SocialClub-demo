import { CompanyQuery } from '../db/queries/companies.js'
import type {
  Company,
  CompanyAssociateRow,
  CompanyMemberRow,
  CompanyStatsRow,
} from '../db/queries/companies.js'
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js'
import { toDateOnly } from '../utils/helpers.js'

export interface CompanySummary {
  id: string
  name: string
  is_active: boolean
  created_at: string
  total_users: number
  active_users: number
  suspended_users: number
  pending_payment_users: number
  pending_activation_users: number
  total_associates: number
  total_members: number
}

export interface CompanyAssociate {
  id: string
  titular_id: string
  titular_name: string
  titular_ci: string
  ci: string
  name: string
  phone: string | null
  relation: string
  date_of_birth: string | null
}

export interface CompanyMember {
  id: string
  ci: string
  name: string
  email: string | null
  phone: string | null
  user_type: string
  user_status: string
  profile_photo_url: string | null
  created_at: string
  associate_count: number
}

export interface CompanyDetail {
  company: {
    id: string
    name: string
    is_active: boolean
  }
  members: CompanyMember[]
  associates: CompanyAssociate[]
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toSummary(row: CompanyStatsRow): CompanySummary {
  const totalUsers = parseInt(row.total_users, 10)
  const totalAssociates = parseInt(row.total_associates, 10)
  return {
    id: row.id,
    name: row.name,
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
    total_users: totalUsers,
    active_users: parseInt(row.active_users, 10),
    suspended_users: parseInt(row.suspended_users, 10),
    pending_payment_users: parseInt(row.pending_payment_users, 10),
    pending_activation_users: parseInt(row.pending_activation_users, 10),
    total_associates: totalAssociates,
    total_members: totalUsers + totalAssociates,
  }
}

/** Summary for a freshly created/updated company with no members yet. */
function toSummaryFromCompany(company: Company): CompanySummary {
  return {
    id: company.id,
    name: company.name,
    is_active: company.is_active,
    created_at: company.created_at.toISOString(),
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    pending_payment_users: 0,
    pending_activation_users: 0,
    total_associates: 0,
    total_members: 0,
  }
}

function toMember(row: CompanyMemberRow): CompanyMember {
  return {
    id: row.id,
    ci: row.ci,
    name: row.name,
    email: row.email,
    phone: row.phone,
    user_type: row.user_type,
    user_status: row.user_status,
    profile_photo_url: row.profile_photo_url,
    created_at: row.created_at.toISOString(),
    associate_count: parseInt(row.associate_count, 10),
  }
}

function toAssociate(row: CompanyAssociateRow): CompanyAssociate {
  return {
    id: row.id,
    titular_id: row.titular_id,
    titular_name: row.titular_name,
    titular_ci: row.titular_ci,
    ci: row.ci,
    name: row.name,
    phone: row.phone,
    relation: row.relation,
    date_of_birth: row.date_of_birth ? toDateOnly(row.date_of_birth) : null,
  }
}

export class CompanyService {
  /**
   * List all companies with per-status user and associate counts.
   */
  static async getAllWithStats(onlyCompanyId?: string): Promise<CompanySummary[]> {
    const rows = await CompanyQuery.listWithStats()
    const scoped = onlyCompanyId === undefined
      ? rows
      : rows.filter((row) => row.id === onlyCompanyId)
    return scoped.map(toSummary)
  }

  static async getAvailableForHr(): Promise<
    { id: string; name: string }[]
  > {
    const rows = await CompanyQuery.listAvailableForHr()
    return rows.map((row) => ({ id: row.id, name: row.name }))
  }

  static async create(name: string): Promise<CompanySummary> {
    const trimmed = name?.trim()
    if (!trimmed) throw new ValidationError('Company name is required')
    if (trimmed.length > 255) throw new ValidationError('Company name is too long')

    try {
      const company = await CompanyQuery.create(trimmed)
      const rows = await CompanyQuery.listWithStats()
      const found = rows.find((row) => row.id === company.id)
      return found ? toSummary(found) : toSummaryFromCompany(company)
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError('A company with this name already exists')
      }
      throw error
    }
  }

  static async update(
    id: string,
    payload: { name?: string; is_active?: boolean }
  ): Promise<CompanySummary> {
    if (!UUID_PATTERN.test(id)) throw new ValidationError('Invalid company id')

    const patch: { name?: string; isActive?: boolean } = {}
    if (payload.name !== undefined) {
      const trimmed = payload.name.trim()
      if (!trimmed) throw new ValidationError('Company name is required')
      patch.name = trimmed
    }
    if (payload.is_active !== undefined) patch.isActive = payload.is_active

    try {
      const updated = await CompanyQuery.update(id, patch)
      if (!updated) throw new NotFoundError('Company not found')
      const rows = await CompanyQuery.listWithStats()
      const found = rows.find((row) => row.id === id)
      return found ? toSummary(found) : toSummaryFromCompany(updated)
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError('A company with this name already exists')
      }
      throw error
    }
  }

  /**
   * Company detail: titular members and their family associates.
   */
  static async getDetail(companyId: string): Promise<CompanyDetail> {
    if (!UUID_PATTERN.test(companyId)) {
      throw new ValidationError('Invalid company id')
    }

    const company = await CompanyQuery.getById(companyId)
    if (!company) {
      throw new NotFoundError('Company not found')
    }

    const [memberRows, associateRows] = await Promise.all([
      CompanyQuery.getMembersByCompany(companyId),
      CompanyQuery.getAssociatesByCompany(companyId),
    ])

    return {
      company: {
        id: company.id,
        name: company.name,
        is_active: company.is_active,
      },
      members: memberRows.map(toMember),
      associates: associateRows.map(toAssociate),
    }
  }
}
