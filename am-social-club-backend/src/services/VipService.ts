import { VipQuery } from '../db/queries/vips.js'
import { VisitQuery } from '../db/queries/visits.js'
import { normalizePayment } from './VisitorService.js'
import { isValidCI } from '../utils/validators.js'
import { clubToday } from '../utils/helpers.js'
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js'
import type { VipUser, CreateVipPayload, UpdateVipPayload, Visit, VisitPaymentInput } from '../types/vip.js'

const MAX_PARTNERS = 50
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertPartners(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_PARTNERS) {
    throw new ValidationError(
      `partners_count must be an integer between 0 and ${MAX_PARTNERS}`
    )
  }
}

export class VipService {
  static async list(filters: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ vips: VipUser[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 50
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('page must be a positive integer')
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('limit must be between 1 and 100')
    }
    return VipQuery.list({
      search: filters.search?.trim() || undefined,
      isActive: filters.isActive,
      page,
      limit,
    })
  }

  static async create(payload: CreateVipPayload, actorId: string): Promise<VipUser> {
    const name = payload.name?.trim()
    if (!name) throw new ValidationError('Name is required')
    if (!payload.ci || !isValidCI(payload.ci)) {
      throw new ValidationError('Invalid CI format. Expected 11 digits.')
    }
    assertPartners(payload.partners_count)

    const existing = await VipQuery.getByCi(payload.ci)
    if (existing) {
      throw new ConflictError('A VIP with this CI already exists')
    }

    return VipQuery.create(
      { name, ci: payload.ci, partners_count: payload.partners_count },
      actorId
    )
  }

  static async update(id: string, payload: UpdateVipPayload): Promise<VipUser> {
    if (!UUID_PATTERN.test(id)) throw new ValidationError('Invalid VIP id')

    const patch: UpdateVipPayload = {}
    if (payload.name !== undefined) {
      const name = payload.name.trim()
      if (!name) throw new ValidationError('Name is required')
      patch.name = name
    }
    if (payload.ci !== undefined) {
      if (!isValidCI(payload.ci)) {
        throw new ValidationError('Invalid CI format. Expected 11 digits.')
      }
      const existing = await VipQuery.getByCi(payload.ci)
      if (existing && existing.id !== id) {
        throw new ConflictError('A VIP with this CI already exists')
      }
      patch.ci = payload.ci
    }
    if (payload.partners_count !== undefined) {
      assertPartners(payload.partners_count)
      patch.partners_count = payload.partners_count
    }
    if (payload.is_active !== undefined) patch.is_active = payload.is_active

    const updated = await VipQuery.update(id, patch)
    if (!updated) throw new NotFoundError('VIP not found')
    return updated
  }

  /** Reception search by CI or name (active VIPs only). */
  static async searchForReception(query: string): Promise<VipUser[]> {
    const trimmed = query?.trim()
    if (!trimmed) return []
    return VipQuery.search(trimmed, 20)
  }

  /**
   * Register a VIP entry for today. Reusable VIPs may return on different
   * days, but only one entry per day is allowed.
   */
  static async registerEntry(
    vipId: string,
    receptionistId: string,
    payment?: VisitPaymentInput | null
  ): Promise<{ vip: VipUser; visit: Visit }> {
    if (!UUID_PATTERN.test(vipId)) throw new ValidationError('Invalid VIP id')

    const vip = await VipQuery.getById(vipId)
    if (!vip) throw new NotFoundError('VIP not found')
    if (!vip.is_active) throw new ValidationError('This VIP is inactive')

    const date = clubToday()
    if (await VisitQuery.hasEntryToday(vip.id, date)) {
      throw new ConflictError('This VIP already registered an entry today')
    }

    const visit = await VisitQuery.create({
      kind: 'vip',
      vip_id: vip.id,
      responsible_name: vip.name,
      responsible_ci: vip.ci,
      partner_count: vip.partners_count,
      visit_date: date,
      created_by_user_id: receptionistId,
      payment: normalizePayment(payment ?? null),
    })

    return { vip, visit }
  }
}
