import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { requireRole } from '../middleware/authGuard.js'
import { EmployeeService } from '../services/EmployeeService.js'
import { CompanyQuery } from '../db/queries/companies.js'
import { ValidationError, NotFoundError } from '../utils/errors.js'
import type { JwtPayload } from '../types/user.js'

export const employeesRouter = Router()

/**
 * Resolve the company name that scopes an HR request. HR uploads/listings are
 * always limited to the company they selected; admin stays global.
 */
async function resolveHrCompanyName(actor: JwtPayload): Promise<string | undefined> {
  if (actor.role !== 'hr') return undefined
  if (!actor.companyId) {
    throw new ValidationError('You must select your company first')
  }
  const company = await CompanyQuery.getById(actor.companyId)
  if (!company) throw new NotFoundError('Company not found')
  return company.name
}

employeesRouter.post('/bulk-upload', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const rows = (req.body.rows ?? req.body) as unknown
    if (!Array.isArray(rows)) {
      throw new ValidationError('Request body must contain a rows array')
    }
    const companyName = await resolveHrCompanyName(actor)
    const result = await EmployeeService.bulkUpload(
      rows as Parameters<typeof EmployeeService.bulkUpload>[0],
      actor.userId,
      companyName ? { companyName } : undefined
    )
    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

employeesRouter.get('/', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { status } = req.query as { status?: string }
    const validStatuses = ['pending', 'activated', 'rejected']
    if (status && !validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status: ${status}`)
    }
    const companyName = await resolveHrCompanyName(actor)
    const employees = await EmployeeService.list(
      status as 'pending' | 'activated' | 'rejected' | undefined,
      companyName
    )
    res.json({
      success: true,
      data: employees,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

employeesRouter.get('/company/:company', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const requested = req.params.company as string
    const hrCompany = await resolveHrCompanyName(actor)
    if (hrCompany && hrCompany !== requested) {
      throw new ValidationError('You can only access your own company')
    }
    const employees = await EmployeeService.getByCompany(requested)
    res.json({
      success: true,
      data: employees,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
