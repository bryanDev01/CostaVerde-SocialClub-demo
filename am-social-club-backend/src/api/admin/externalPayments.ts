import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/authGuard.js'
import { getExternalPaymentsReport } from '../../services/VisitorService.js'

export const adminExternalPaymentsRouter = Router()

/**
 * GET /api/admin/external-payments?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Collections made at reception for external visitors and VIPs (outside the app).
 * Access: admin only. Defaults to the current month.
 */
adminExternalPaymentsRouter.get('/', authenticate, requirePermission('external_payments'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string }
    const report = await getExternalPaymentsReport(from, to)
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
