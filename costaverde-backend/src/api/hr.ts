import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { requireRole } from '../middleware/authGuard.js'
import { HrService } from '../services/HrService.js'
import { ValidationError } from '../utils/errors.js'

export const hrRouter = Router()

/**
 * GET /api/hr/available-companies
 * Active companies without an HR account, for HR onboarding.
 */
hrRouter.get('/available-companies', authenticate, requireRole('hr'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await HrService.getAvailableCompanies()
    res.json({ success: true, data: companies, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/hr/company
 * Link the authenticated HR to a company (one HR per company).
 * Body: { company_id }
 */
hrRouter.post('/company', authenticate, requireRole('hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { company_id } = req.body as { company_id?: string }
    const result = await HrService.assignCompany(actor.userId, actor.companyId, company_id)
    res.json({ success: true, data: result, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/** HR requests are always scoped to their own company; admin may filter. */
function resolveCompanyScope(role: string, actorCompanyId: string | null, queryCompanyId?: string): string | undefined {
  if (role === 'hr') {
    if (!actorCompanyId) {
      throw new ValidationError('You must select your company first')
    }
    return actorCompanyId
  }
  return queryCompanyId
}

hrRouter.get('/users', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { company_id, status, search, page, limit } = req.query as {
      company_id?: string
      status?: string
      search?: string
      page?: string
      limit?: string
    }
    const companyId = resolveCompanyScope(actor.role, actor.companyId, company_id)
    const result = await HrService.listUsers({
      companyId,
      status,
      search,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    })
    res.json({ success: true, data: result, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

hrRouter.get('/reports/user-status', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const queryCompanyId = typeof req.query.company_id === 'string'
      ? req.query.company_id
      : undefined
    const companyId = resolveCompanyScope(actor.role, actor.companyId, queryCompanyId)
    const report = await HrService.getUserStatusReport(companyId)
    res.json({ success: true, data: report, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})
