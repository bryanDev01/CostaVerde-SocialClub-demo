import { HrQuery } from '../db/queries/hr.js'
import { CompanyQuery } from '../db/queries/companies.js'
import { UserQuery } from '../db/queries/users.js'
import type { UserStatus } from '../types/user.js'
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors.js'

const VALID_STATUSES: ReadonlySet<UserStatus> = new Set([
  'pending_activation',
  'pending_payment',
  'active',
  'suspended',
  'inactive',
  'external_active',
])

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class HrService {
  /** Active companies that still have no HR account (for onboarding). */
  static async getAvailableCompanies(): Promise<{ id: string; name: string }[]> {
    const rows = await CompanyQuery.listAvailableForHr()
    return rows.map((row) => ({ id: row.id, name: row.name }))
  }

  /**
   * Link the authenticated HR account to a company (one HR per company).
   * The HR chooses this themselves on first login.
   */
  static async assignCompany(
    hrUserId: string,
    currentCompanyId: string | null,
    companyId: string | undefined
  ): Promise<{ company_id: string; company_name: string }> {
    if (!companyId || !UUID_PATTERN.test(companyId)) {
      throw new ValidationError('Invalid company_id')
    }
    if (currentCompanyId) {
      throw new ConflictError('Your account is already linked to a company')
    }

    const company = await CompanyQuery.getById(companyId)
    if (!company || !company.is_active) {
      throw new NotFoundError('Company not found')
    }

    const assignedHrId = await CompanyQuery.getAssignedHrUserId(companyId)
    if (assignedHrId && assignedHrId !== hrUserId) {
      throw new ConflictError('This company already has an HR account')
    }

    const updated = await UserQuery.update(hrUserId, { company_id: companyId })
    if (!updated) throw new NotFoundError('User not found')

    return { company_id: company.id, company_name: company.name }
  }

  static async listUsers(
    input: {
      companyId?: string
      status?: string
      search?: string
      page?: number
      limit?: number
    }
  ) {
    if (input.companyId && input.companyId !== 'none' && !UUID_PATTERN.test(input.companyId)) {
      throw new ValidationError('Invalid company_id')
    }
    if (input.status && !VALID_STATUSES.has(input.status as UserStatus)) {
      throw new ValidationError(`Invalid status: ${input.status}`)
    }

    const page = input.page ?? 1
    const limit = input.limit ?? 50
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('page must be a positive integer')
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new ValidationError('limit must be between 1 and 200')
    }

    return HrQuery.listUsers({
      companyId: input.companyId,
      status: input.status as UserStatus | undefined,
      search: input.search?.trim() || undefined,
      page,
      limit,
    })
  }

  static async getUserStatusReport(companyId?: string) {
    if (companyId && companyId !== 'none' && !UUID_PATTERN.test(companyId)) {
      throw new ValidationError('Invalid company_id')
    }
    return HrQuery.getUserStatusReport(companyId)
  }
}