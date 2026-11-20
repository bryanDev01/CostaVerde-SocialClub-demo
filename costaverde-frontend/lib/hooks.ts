'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from './api'
import { describeApiError } from './errorMessages'
import type {
  ActivityCategory,
  ActivityWithCategory,
  AdminDashboardStats,
  AdminUserListResponse,
  AffinityCheckResult,
  Associate,
  CapacityReport,
  CarnetData,
  CarnetVerificationResult,
  CompanyDetail,
  CompanySummary,
  CreateExternalUserInput,
  DailyReport,
  EmployeeUploadResult,
  EmployeeUploadRow,
  FamilyRelation,
  GeneralReport,
  HrUserListResponse,
  HrUserRecord,
  StaffAccount,
  StaffRole,
  HrUserStatusReportRow,
  NotificationListResponse,
  OccupancyReportRow,
  Payment,
  PaymentIntentResult,
  PaymentWithUser,
  PaymentsByDayReport,
  PreEmployee,
  ReceptionToday,
  Reservation,
  ReservationWithDetails,
  RevenueReport,
  Subscription,
  SubscriptionPlan,
  User,
  UserProfile,
  UserStatus,
  VipListResponse,
  VipUser,
} from './types'

function toErrorMessage(error: unknown): string {
  return describeApiError(error, 'No se pudo conectar con el servidor')
}

interface ApiListState<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => void
}

function useApiList<T>(path: string): ApiListState<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true

    apiGet<T[]>(path)
      .then((result) => {
        if (!active) return
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [path, version])

  const refetch = useCallback(() => {
    setLoading(true)
    setVersion((value) => value + 1)
  }, [])

  return { data, loading, error, refetch }
}

export function useReservations() {
  const state = useApiList<Reservation>('/api/reservations')
  return {
    reservations: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useActiveReservations() {
  const state = useApiList<Reservation>('/api/reservations/active')
  return {
    reservations: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useActivities() {
  const state = useApiList<ActivityWithCategory>('/api/activities')
  return {
    activities: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useActivityCategories() {
  const state = useApiList<ActivityCategory>('/api/activities/categories')
  return {
    categories: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useApiResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const requestKey = `${path}#${version}`

  useEffect(() => {
    let active = true
    const key = requestKey

    apiGet<T>(path)
      .then((result) => {
        if (!active) return
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(toErrorMessage(err))
      })
      .finally(() => {
        if (!active) return
        setLoadedKey(key)
      })

    return () => {
      active = false
    }
  }, [path, requestKey])

  const refetch = useCallback(() => {
    setVersion((value) => value + 1)
  }, [])

  return { data, loading: loadedKey !== requestKey, error, refetch }
}

export function useActivity(id: string) {
  const state = useApiResource<ActivityWithCategory>(`/api/activities/${id}`)
  return {
    activity: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useReservation(id: string) {
  const state = useApiResource<ReservationWithDetails>(`/api/reservations/${id}`)
  return {
    reservation: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

interface AffinityState {
  key: string
  result: AffinityCheckResult | null
  error: string | null
}

interface UseAffinityCheckResult {
  result: AffinityCheckResult | null
  error: string | null
  checking: boolean
}

export function useAffinityCheck(
  activityId: string | null,
  reservationDate: string | null,
  quantity: number
): UseAffinityCheckResult {
  const requestKey =
    activityId && reservationDate && quantity >= 1
      ? `${activityId}|${reservationDate}|${quantity}`
      : null

  const [state, setState] = useState<AffinityState | null>(null)

  useEffect(() => {
    if (!requestKey || !activityId || !reservationDate || quantity < 1) return

    let active = true
    const timer = setTimeout(() => {
      if (!active) return

      const params = new URLSearchParams({
        activity_id: activityId,
        reservation_date: reservationDate,
        quantity: String(quantity),
      })

      apiGet<AffinityCheckResult>(`/api/reservations/check?${params.toString()}`)
        .then((result) => {
          if (!active) return
          setState({ key: requestKey, result, error: null })
        })
        .catch((err: unknown) => {
          if (!active) return
          setState({ key: requestKey, result: null, error: toErrorMessage(err) })
        })
    }, 350)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [requestKey, activityId, reservationDate, quantity])

  const current = state && state.key === requestKey ? state : null

  return {
    result: current?.result ?? null,
    error: current?.error ?? null,
    checking: requestKey !== null && current === null,
  }
}

interface CreateReservationInput {
  activity_id: string
  reservation_date: string
  quantity: number
  notes?: string
}

export function useReservationActions() {
  const createReservation = useCallback(async (payload: CreateReservationInput) => {
    return apiPost<Reservation>('/api/reservations', payload)
  }, [])

  const cancelReservation = useCallback(async (id: string) => {
    return apiPost<Reservation>(`/api/reservations/${id}/cancel`)
  }, [])

  const confirmAttendance = useCallback(async (id: string) => {
    return apiPost<Reservation>(`/api/reservations/${id}/confirm`)
  }, [])

  return { createReservation, cancelReservation, confirmAttendance }
}

interface UpdateProfileInput {
  name?: string
  email?: string
  phone?: string
  profile_photo_url?: string | null
}

export function useProfileActions() {
  const updateProfile = useCallback(async (payload: UpdateProfileInput) => {
    return apiPut<User>('/api/users/me', payload)
  }, [])

  const uploadProfilePhoto = useCallback(async (image: string) => {
    return apiPost<User>('/api/users/me/photo', { image })
  }, [])

  return { updateProfile, uploadProfilePhoto }
}

interface CreateAssociateInput {
  ci: string
  name: string
  phone?: string
  relation: FamilyRelation
  date_of_birth?: string
}

interface UpdateAssociateInput {
  name?: string
  phone?: string
  relation?: FamilyRelation
  date_of_birth?: string
}

export function useAssociateActions() {
  const createAssociate = useCallback(async (payload: CreateAssociateInput) => {
    return apiPost<Associate>('/api/associates', payload)
  }, [])

  const updateAssociate = useCallback(async (id: string, payload: UpdateAssociateInput) => {
    return apiPut<Associate>(`/api/associates/${id}`, payload)
  }, [])

  const deleteAssociate = useCallback(async (id: string) => {
    return apiDelete<{ deleted: true }>(`/api/associates/${id}`)
  }, [])

  return { createAssociate, updateAssociate, deleteAssociate }
}

export function useAssociates() {
  const state = useApiList<Associate>('/api/associates')
  return {
    associates: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function usePlans() {
  const state = useApiList<SubscriptionPlan>('/api/subscriptions/plans')
  return {
    plans: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

interface UseSubscriptionResult {
  subscription: Subscription | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useSubscription(): UseSubscriptionResult {
  const state = useApiResource<Subscription | null>('/api/subscriptions/me')
  return {
    subscription: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminDashboard() {
  const state = useApiResource<AdminDashboardStats>('/api/admin/reports/dashboard')
  return {
    stats: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminPendingPayments() {
  const state = useApiList<PaymentWithUser>('/api/admin/payments')
  return {
    payments: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

interface AdminUsersOptions {
  search?: string
  status?: string
  userType?: string
  page?: number
  limit?: number
}

export function useAdminUsers(options: AdminUsersOptions) {
  const params = new URLSearchParams()
  if (options.search) params.set('search', options.search)
  if (options.status) params.set('status', options.status)
  if (options.userType) params.set('user_type', options.userType)
  if (options.page && options.page > 1) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))

  const query = params.toString()
  const state = useApiResource<AdminUserListResponse>(
    `/api/admin/users${query ? `?${query}` : ''}`
  )

  const getAllUsers = useCallback(async (): Promise<User[]> => {
    const exportLimit = 200
    const all: User[] = []
    let totalCount = Number.POSITIVE_INFINITY
    let currentPage = 1

    while (all.length < totalCount) {
      const exportParams = new URLSearchParams()
      if (options.search) exportParams.set('search', options.search)
      if (options.status) exportParams.set('status', options.status)
      if (options.userType) exportParams.set('user_type', options.userType)
      exportParams.set('page', String(currentPage))
      exportParams.set('limit', String(exportLimit))

      const result = await apiGet<AdminUserListResponse>(
        `/api/admin/users?${exportParams.toString()}`
      )
      all.push(...result.users)
      totalCount = result.total
      if (result.users.length === 0) break
      currentPage += 1
    }

    return all
  }, [options.search, options.status, options.userType])

  return {
    users: state.data?.users ?? [],
    total: state.data?.total ?? 0,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
    getAllUsers,
  }
}

interface HrUsersOptions {
  companyId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export function useHrUsers(options: HrUsersOptions) {
  const params = new URLSearchParams()
  if (options.companyId) params.set('company_id', options.companyId)
  if (options.status) params.set('status', options.status)
  if (options.search) params.set('search', options.search)
  if (options.page) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))

  const query = params.toString()
  const state = useApiResource<HrUserListResponse>(
    `/api/hr/users${query ? `?${query}` : ''}`
  )
  const getAllUsers = useCallback(async (): Promise<HrUserRecord[]> => {
    const exportLimit = 200
    const exportedUsers: HrUserRecord[] = []
    let totalCount = Number.POSITIVE_INFINITY
    let currentPage = 1

    while (exportedUsers.length < totalCount) {
      const exportParams = new URLSearchParams()
      if (options.companyId) exportParams.set('company_id', options.companyId)
      if (options.status) exportParams.set('status', options.status)
      if (options.search) exportParams.set('search', options.search)
      exportParams.set('page', String(currentPage))
      exportParams.set('limit', String(exportLimit))

      const result = await apiGet<HrUserListResponse>(
        `/api/hr/users?${exportParams.toString()}`
      )
      exportedUsers.push(...result.users)
      totalCount = result.total
      if (result.users.length === 0) break
      currentPage += 1
    }

    return exportedUsers
  }, [options.companyId, options.search, options.status])

  return {
    users: state.data?.users ?? [],
    total: state.data?.total ?? 0,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
    getAllUsers,
  }
}

export function useHrUserStatusReport(companyId?: string) {
  const params = new URLSearchParams()
  if (companyId) params.set('company_id', companyId)
  const query = params.toString()
  const state = useApiResource<HrUserStatusReportRow[]>(
    `/api/hr/reports/user-status${query ? `?${query}` : ''}`
  )

  return {
    // Postgres COUNT(*) arrives as a string; coerce so summing never concatenates.
    rows: (state.data ?? []).map((row) => ({ ...row, total: Number(row.total) })),
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminOccupancy(startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  const state = useApiResource<OccupancyReportRow[]>(
    `/api/admin/reports/occupancy?${params.toString()}`
  )
  return {
    rows: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminRevenue(startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  const state = useApiResource<RevenueReport>(
    `/api/admin/reports/revenue?${params.toString()}`
  )
  return {
    report: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminDailyReport(date: string) {
  const params = new URLSearchParams({ date })
  const state = useApiResource<DailyReport>(
    `/api/admin/reports/daily?${params.toString()}`
  )
  return {
    report: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminPaymentsByDay(startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  const state = useApiResource<PaymentsByDayReport>(
    `/api/admin/reports/payments-by-day?${params.toString()}`
  )
  return {
    report: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminCapacity(startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  const state = useApiResource<CapacityReport>(
    `/api/admin/reports/capacity?${params.toString()}`
  )
  return {
    report: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminCompanies() {
  const state = useApiResource<CompanySummary[]>('/api/admin/companies')
  return {
    companies: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminCompanyDetail(id: string) {
  const state = useApiResource<CompanyDetail>(`/api/admin/companies/${id}`)
  return {
    detail: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useCompanyActions() {
  const createCompany = useCallback(async (name: string) => {
    return apiPost<CompanySummary>('/api/admin/companies', { name })
  }, [])

  const updateCompany = useCallback(
    async (id: string, payload: { name?: string; is_active?: boolean }) => {
      return apiPut<CompanySummary>(`/api/admin/companies/${id}`, payload)
    },
    []
  )

  return { createCompany, updateCompany }
}

export interface HrCompanyOption {
  id: string
  name: string
}

export function useHrAvailableCompanies() {
  const state = useApiResource<HrCompanyOption[]>('/api/hr/available-companies')
  return {
    companies: state.data ?? [],
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useHrAssignCompany() {
  const assignCompany = useCallback(async (companyId: string) => {
    return apiPost<{ company_id: string; company_name: string }>(
      '/api/hr/company',
      { company_id: companyId }
    )
  }, [])

  return { assignCompany }
}

export function useAdminGeneralReport(startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  const state = useApiResource<GeneralReport>(
    `/api/admin/reports/general?${params.toString()}`
  )
  return {
    report: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useAdminActions() {
  const validatePayment = useCallback(async (id: string) => {
    return apiPut<Payment>(`/api/admin/payments/${id}/validate`)
  }, [])

  const rejectPayment = useCallback(async (id: string) => {
    return apiPut<Payment>(`/api/admin/payments/${id}/reject`)
  }, [])

  const updateUserStatus = useCallback(async (id: string, status: UserStatus) => {
    return apiPut<User>(`/api/admin/users/${id}/status`, { status })
  }, [])

  return {
    validatePayment,
    rejectPayment,
    updateUserStatus,
  }
}

interface UsePaymentResult {
  createIntent: (planId: string) => Promise<PaymentIntentResult>
  confirmTransaction: (paymentId: string, transactionNumber: string) => Promise<Payment>
}

export function usePayment(): UsePaymentResult {
  const createIntent = useCallback(async (planId: string) => {
    return apiPost<PaymentIntentResult>('/api/payments/intent', { plan_id: planId })
  }, [])

  const confirmTransaction = useCallback(
    async (paymentId: string, transactionNumber: string) => {
      return apiPost<Payment>('/api/payments/confirm', {
        payment_id: paymentId,
        transaction_number: transactionNumber,
      })
    },
    []
  )

  return { createIntent, confirmTransaction }
}

export function usePreEmployees(status?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const query = params.toString()

  const state = useApiList<PreEmployee>(
    `/api/employees${query ? `?${query}` : ''}`
  )
  return {
    employees: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useEmployeeActions() {
  const bulkUpload = useCallback(async (rows: EmployeeUploadRow[]) => {
    return apiPost<EmployeeUploadResult>('/api/employees/bulk-upload', { rows })
  }, [])

  return { bulkUpload }
}

export function useReceptionToday() {
  const state = useApiResource<ReceptionToday>('/api/reception/today')
  return {
    today: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useCarnetVerification() {
  const verifyCarnet = useCallback(async (qrPayload: string) => {
    return apiPost<CarnetVerificationResult>('/api/reception/verify-carnet', {
      qr_payload: qrPayload,
    })
  }, [])

  return { verifyCarnet }
}

export function useMyCarnet() {
  const state = useApiResource<CarnetData>('/api/carnet/me')
  return {
    carnet: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useExternalRegistration() {
  const registerExternal = useCallback(
    async (payload: CreateExternalUserInput) => {
      return apiPost<UserProfile>('/api/auth/external', payload)
    },
    []
  )

  return { registerExternal }
}

export function useNotifications(limit = 20) {
  const state = useApiResource<NotificationListResponse>(
    `/api/notifications?limit=${limit}`
  )
  return {
    notifications: state.data?.notifications ?? [],
    unreadCount: state.data?.unread_count ?? 0,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export function useNotificationActions() {
  const markRead = useCallback(async (id: string) => {
    return apiPut<{ updated: boolean }>(`/api/notifications/${id}/read`)
  }, [])

  const markAllRead = useCallback(async () => {
    return apiPut<{ updated: number }>('/api/notifications/read-all')
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    return apiDelete<{ deleted: boolean }>(`/api/notifications/${id}`)
  }, [])

  return { markRead, markAllRead, deleteNotification }
}

interface AdminVipsOptions {
  search?: string
  status?: string
  page?: number
  limit?: number
}

export function useAdminVips(options: AdminVipsOptions = {}) {
  const params = new URLSearchParams()
  if (options.search) params.set('search', options.search)
  if (options.status) params.set('status', options.status)
  if (options.page && options.page > 1) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))
  const query = params.toString()

  const state = useApiResource<VipListResponse>(
    `/api/admin/vips${query ? `?${query}` : ''}`
  )
  return {
    vips: state.data?.vips ?? [],
    total: state.data?.total ?? 0,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export interface VipInput {
  name: string
  ci: string
  partners_count: number
}

export function useVipActions() {
  const createVip = useCallback(async (payload: VipInput) => {
    return apiPost<VipUser>('/api/admin/vips', payload)
  }, [])

  const updateVip = useCallback(
    async (id: string, payload: Partial<VipInput> & { is_active?: boolean }) => {
      return apiPut<VipUser>(`/api/admin/vips/${id}`, payload)
    },
    []
  )

  return { createVip, updateVip }
}

export function useReceptionVipSearch() {
  const searchVips = useCallback(async (query: string) => {
    return apiGet<VipUser[]>(`/api/reception/vips?q=${encodeURIComponent(query)}`)
  }, [])

  return { searchVips }
}

export function useReceptionVipEntry() {
  const registerVipEntry = useCallback(
    async (
      vipId: string,
      payment?: {
        amount_cup: number
        payment_method: VisitPaymentMethod
        payment_reference?: string | null
      } | null
    ) => {
      return apiPost<{ vip: VipUser; visit: unknown }>(
        `/api/reception/vips/${vipId}/entry`,
        payment ? { payment } : undefined
      )
    },
    []
  )

  return { registerVipEntry }
}

export interface MemberSearchResult {
  id: string
  name: string
  ci: string
  company_name: string | null
  associates_count: number
}

export function useReceptionMemberSearch() {
  const searchMembers = useCallback(async (query: string) => {
    return apiGet<MemberSearchResult[]>(
      `/api/reception/associates?q=${encodeURIComponent(query)}`
    )
  }, [])

  return { searchMembers }
}

export function useAssociateEntry() {
  const registerEntry = useCallback(
    async (
      memberId: string,
      payload: {
        people: number
        payment: {
          amount_cup: number
          payment_method: VisitPaymentMethod
          payment_reference?: string | null
        }
      }
    ) => {
      return apiPost<unknown>(`/api/reception/associates/${memberId}/entry`, payload)
    },
    []
  )

  return { registerEntry }
}

export interface VisitorAutocompleteResult {
  id: string
  ci: string
  name: string
  phone: string | null
}

export function useVisitorAutocomplete() {
  const [results, setResults] = useState<VisitorAutocompleteResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }
    
    setLoading(true)
    try {
      const response = await apiGet<VisitorAutocompleteResult[]>(
        `/api/reception/visitors/autocomplete?q=${encodeURIComponent(query)}`
      )
      setResults(response)
    } catch (error) {
      console.error('Autocomplete error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, loading, search }
}

export type VisitPaymentMethod = 'cash' | 'transfer' | 'other'

export interface WalkInPayload {
  ci: string
  name: string
  phone?: string | null
  partner_count: number
  visit_date?: string
  payment?: {
    amount_cup: number
    payment_method: VisitPaymentMethod
    payment_reference?: string | null
  } | null
}

export type VisitKind = 'walk_in' | 'vip' | 'associate'

export interface ExternalPaymentTotalsBucket {
  visits: number
  people: number
  amount_cup: number
}

export interface ExternalPaymentRecord {
  id: string
  kind: VisitKind
  visit_date: string
  responsible_name: string
  responsible_ci: string | null
  partner_count: number
  amount_cup: number
  payment_method: VisitPaymentMethod
  payment_reference: string | null
  paid_at: string
  registered_by_name: string | null
}

export interface ExternalPaymentsReport {
  from: string
  to: string
  totals: ExternalPaymentTotalsBucket
  by_kind: Record<VisitKind, ExternalPaymentTotalsBucket>
  items: ExternalPaymentRecord[]
}

/** Admin: collections made at reception for external visitors/VIPs (outside the app). */
export function useAdminExternalPayments(from: string, to: string) {
  const state = useApiResource<ExternalPaymentsReport>(
    `/api/admin/external-payments?from=${from}&to=${to}`
  )
  return {
    report: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export interface WalkInResult {
  user: unknown
  visit: unknown
}

export function useRegisterWalkIn() {
  const registerWalkIn = useCallback(
    async (payload: WalkInPayload, idempotencyKey?: string) => {
      return apiPost<WalkInResult>(
        '/api/reception/visitors',
        payload,
        idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
      )
    },
    []
  )

  return { registerWalkIn }
}

export function useAdminRoles() {
  const state = useApiResource<StaffRole[]>('/api/admin/roles')
  return {
    roles: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export interface RoleInput {
  name?: string
  description?: string | null
  permissions: string[]
}

export function useRoleMutations() {
  const createRole = useCallback(async (payload: RoleInput) => {
    return apiPost<StaffRole>('/api/admin/roles', payload)
  }, [])

  const updateRole = useCallback(async (id: string, payload: RoleInput) => {
    return apiPut<StaffRole>(`/api/admin/roles/${id}`, payload)
  }, [])

  const deleteRole = useCallback(async (id: string) => {
    return apiDelete<{ deleted: boolean }>(`/api/admin/roles/${id}`)
  }, [])

  return { createRole, updateRole, deleteRole }
}

export function useAdminStaff() {
  const state = useApiResource<StaffAccount[]>('/api/admin/staff')
  return {
    accounts: state.data,
    loading: state.loading,
    error: state.error,
    refetch: state.refetch,
  }
}

export interface StaffInput {
  name: string
  ci: string
  email: string
  password: string
  role_id: string
}

export interface StaffUpdateInput {
  role_id?: string
  user_status?: 'active' | 'inactive'
  password?: string
}

export function useStaffMutations() {
  const createStaff = useCallback(async (payload: StaffInput) => {
    return apiPost<StaffAccount>('/api/admin/staff', payload)
  }, [])

  const updateStaff = useCallback(async (id: string, payload: StaffUpdateInput) => {
    return apiPut<StaffAccount>(`/api/admin/staff/${id}`, payload)
  }, [])

  return { createStaff, updateStaff }
}
