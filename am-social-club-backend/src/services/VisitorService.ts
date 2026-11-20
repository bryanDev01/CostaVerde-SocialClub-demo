import { UserQuery } from '../db/queries/users.js'
import { VisitQuery, type CreateVisitPayload, type ExternalPaymentRow, type ExternalPaymentSummary, type ExternalPaymentTotals } from '../db/queries/visits.js'
import { ReservationQuery } from '../db/queries/reservations.js'
import { RoleQuery } from '../db/queries/roles.js'
import { isValidCI, isValidPhone } from '../utils/validators.js'
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js'
import { clubToday, parseDate } from '../utils/helpers.js'
import type { User, Visit } from '../types/index.js'
import type { VisitPaymentInput, VisitPaymentMethod } from '../types/vip.js'

export interface VisitorAutocompleteResult {
  id: string
  ci: string
  name: string
  phone: string | null
}

export interface WalkInPayload {
  ci: string
  name: string
  phone?: string
  partner_count: number
  visit_date?: string
  payment?: {
    amount_cup: number
    payment_method: VisitPaymentMethod
    payment_reference?: string | null
  } | null
  /** Client-generated key so retries do not charge twice. */
  idempotency_key?: string | null
}

const PAYMENT_METHODS: ReadonlySet<VisitPaymentMethod> = new Set(['cash', 'transfer', 'other'])
const MAX_COLLECTION_CUP = 100000

/** Validates a reception collection; returns a normalized payment or null. */
export function normalizePayment(
  payment: WalkInPayload['payment']
): VisitPaymentInput | null {
  if (!payment) return null
  if (!Number.isInteger(payment.amount_cup) || payment.amount_cup < 0 || payment.amount_cup > MAX_COLLECTION_CUP) {
    throw new ValidationError(`amount_cup must be an integer between 0 and ${MAX_COLLECTION_CUP}`)
  }
  if (!PAYMENT_METHODS.has(payment.payment_method)) {
    throw new ValidationError('payment_method must be cash, transfer or other')
  }
  const reference = payment.payment_reference?.trim() ?? ''
  if (reference.length > 100) {
    throw new ValidationError('payment_reference is too long')
  }
  return {
    amount_cup: payment.amount_cup,
    payment_method: payment.payment_method,
    payment_reference: reference || null,
  }
}

/** Account fields safe to return to the client (never the password hash). */
export type PublicUser = Omit<User, 'password_hash'>

function toPublicUser(user: User): PublicUser {
  const { password_hash: _omit, ...publicFields } = user
  return publicFields
}

export class VisitorService {
  /** Corporate members (associates) for the reception entrance desk. */
  static async searchMembers(query: string): Promise<Awaited<ReturnType<typeof UserQuery.searchMembers>>> {
    if (!query?.trim()) return []
    return UserQuery.searchMembers(query.trim())
  }

  /**
   * Entrance charge for an associate. One record: the visit and its payment.
   * The titular pays for the group; the aforo is only counted here when the
   * member has no reservation for the day (otherwise it would count twice).
   */
  static async registerAssociateEntry(
    payload: { user_id: string; people: number; payment?: WalkInPayload['payment'] },
    receptionistId: string
  ): Promise<Visit> {
    if (!Number.isInteger(payload.people) || payload.people < 1 || payload.people > 51) {
      throw new ValidationError('people must be an integer between 1 and 51')
    }
    const payment = normalizePayment(payload.payment)

    const profile = await UserQuery.getProfileById(payload.user_id)
    if (!profile) throw new NotFoundError('User not found')
    if (profile.user_type !== 'corporate') {
      throw new ValidationError('Only associates can register this entrance')
    }
    if (profile.user_status !== 'active') {
      throw new ConflictError('Associate is not active')
    }

    const date = clubToday()
    if (await VisitQuery.hasAssociateEntryToday(profile.id, date)) {
      throw new ConflictError('This associate already registered an entry today')
    }

    const hasReservation = await ReservationQuery.hasActiveToday(profile.id, date)

    return VisitQuery.create({
      kind: 'associate',
      responsible_user_id: profile.id,
      responsible_name: profile.name,
      responsible_ci: profile.ci,
      partner_count: payload.people - 1,
      visit_date: date,
      created_by_user_id: receptionistId,
      payment,
      counts_aforo: !hasReservation,
    })
  }

  /**
   * Search external users by CI or name for autocomplete.
   * Returns active external users only, limited to 10 results.
   */
  static async autocomplete(query: string): Promise<VisitorAutocompleteResult[]> {
    if (!query?.trim()) return []
    
    const results = await UserQuery.search({
      query: query.trim(),
      limit: 10,
    })
    
    return results
      .filter(u => u.user_type === 'external' && u.user_status === 'external_active')
      .map(u => ({
        id: u.id,
        ci: u.ci,
        name: u.name,
        phone: u.phone,
      }))
  }

  /**
   * Register a walk-in visitor.
   * Finds or creates an external user, then creates a visit record.
   */
  static async registerWalkIn(
    payload: WalkInPayload,
    receptionistId: string
  ): Promise<{ user: PublicUser; visit: Visit }> {
    // Validate CI
    if (!payload.ci || !isValidCI(payload.ci)) {
      throw new ValidationError('Invalid CI format. Expected 11 digits.')
    }
    
    // Validate name
    if (!payload.name?.trim()) {
      throw new ValidationError('Name is required')
    }
    
    // Validate phone if provided
    if (payload.phone && !isValidPhone(payload.phone)) {
      throw new ValidationError('Invalid phone format')
    }
    
    // Validate partner count
    if (payload.partner_count < 0 || payload.partner_count > 50) {
      throw new ValidationError('Partner count must be between 0 and 50')
    }

    // Validate the collection made at reception (optional)
    const payment = normalizePayment(payload.payment)

    // Same key on a retried request: return the visit already registered.
    if (payload.idempotency_key) {
      const existingVisit = await VisitQuery.getByIdempotencyKey(payload.idempotency_key)
      if (existingVisit?.responsible_user_id) {
        const existingUser = await UserQuery.getById(existingVisit.responsible_user_id)
        if (existingUser) {
          return { user: toPublicUser(existingUser), visit: existingVisit }
        }
      }
    }
    
    // Validate date (club-local calendar)
    let visitDate: string
    if (payload.visit_date) {
      parseDate(payload.visit_date)
      visitDate = payload.visit_date
    } else {
      visitDate = clubToday()
    }
    
    // Find existing external user by CI
    const existingUser = await UserQuery.getByCIAndType(payload.ci, 'external')
    
    let user: User
    if (existingUser) {
      // Reuse existing user, update name/phone if changed
      const updated = await UserQuery.update(existingUser.id, {
        name: payload.name.trim(),
        phone: payload.phone ?? existingUser.phone ?? undefined,
      })
      if (!updated) throw new Error('Failed to update user')
      user = updated
    } else {
      // Create new external user
      const userRole = await RoleQuery.getByName('user')
      if (!userRole) {
        throw new NotFoundError('Default user role not found')
      }
      
      user = await UserQuery.create({
        ci: payload.ci,
        name: payload.name.trim(),
        phone: payload.phone ?? undefined,
        user_type: 'external',
        user_status: 'external_active',
        role_id: userRole.id,
        created_by_user_id: receptionistId,
      }).catch(async (error: unknown) => {
        // Two simultaneous submissions for the same first-time visitor: the
        // other request created the account first. Reuse it instead of failing.
        if ((error as { code?: string }).code !== '23505') throw error
        const raced = await UserQuery.getByCIAndType(payload.ci, 'external')
        if (!raced) throw error
        return raced
      })
    }
    
    // Create visit record
    const visitPayload: CreateVisitPayload = {
      kind: 'walk_in',
      vip_id: null,
      responsible_user_id: user.id,
      responsible_name: user.name,
      responsible_ci: user.ci,
      partner_count: payload.partner_count,
      visit_date: visitDate,
      created_by_user_id: receptionistId,
      payment,
      idempotency_key: payload.idempotency_key ?? null,
    }
    
    const visit = await VisitQuery.create(visitPayload)

    return { user: toPublicUser(user), visit }
  }
}

export interface ExternalPaymentsReport {
  from: string
  to: string
  /** Overall totals for the range. */
  totals: ExternalPaymentTotals
  /** Same totals split by visitor type: walk_in = externos, vip = VIP. */
  by_kind: ExternalPaymentSummary['by_kind']
  items: ExternalPaymentRow[]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Admin view: collections made at reception for external visitors and VIPs, by date range. */
export async function getExternalPaymentsReport(from?: string, to?: string): Promise<ExternalPaymentsReport> {
  const today = clubToday()
  const start = from ?? today.slice(0, 8) + '01'
  const end = to ?? today
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    throw new ValidationError('from and to must be valid dates (YYYY-MM-DD)')
  }
  if (start > end) {
    throw new ValidationError('from must be before or equal to to')
  }
  const [items, summary] = await Promise.all([
    VisitQuery.listPaidByRange(start, end),
    VisitQuery.sumPaidByRange(start, end),
  ])
  return { from: start, to: end, totals: summary.totals, by_kind: summary.by_kind, items }
}
