import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/authGuard.js'
import { CompanyService } from '../../services/CompanyService.js'
import { getAuthenticatedUser } from '../../middleware/auth.js'
import { ForbiddenError } from '../../utils/errors.js'

export const adminCompaniesRouter = Router()

/**
 * GET /api/admin/companies
 * List all companies with per-status user counts and associate totals.
 * Access: admin (manage) and hr (read-only, for onboarding/reference).
 */
adminCompaniesRouter.get('/', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    // HR only sees its own company (RF-015); admin sees all.
    const companies = await CompanyService.getAllWithStats(
      actor.role === 'hr' ? actor.companyId ?? '' : undefined
    )
    res.json({
      success: true,
      data: companies,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/admin/companies
 * Create a company. Body: { name }
 */
adminCompaniesRouter.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: string }
    const company = await CompanyService.create(name ?? '')
    res.status(201).json({
      success: true,
      data: company,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/admin/companies/:id
 * Update name and/or active flag. Body: { name?, is_active? }
 */
adminCompaniesRouter.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, is_active } = req.body as { name?: string; is_active?: boolean }
    const company = await CompanyService.update(req.params.id as string, { name, is_active })
    res.json({
      success: true,
      data: company,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/admin/companies/:id
 * Company detail: titular members and their family associates.
 */
adminCompaniesRouter.get('/:id', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const companyId = req.params.id as string
    // Prevent IDOR: an HR account can only read members of its own company.
    if (actor.role === 'hr' && actor.companyId !== companyId) {
      throw new ForbiddenError('Solo puedes consultar tu propia empresa')
    }
    const detail = await CompanyService.getDetail(companyId)
    res.json({
      success: true,
      data: detail,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
