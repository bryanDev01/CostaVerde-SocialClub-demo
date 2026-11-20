import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/authGuard.js'
import { ReportService } from '../../services/ReportService.js'

export const adminReportsRouter = Router()

/**
 * GET /api/admin/reports/dashboard
 * Summary stats for the admin dashboard.
 */
adminReportsRouter.get('/dashboard', authenticate, requirePermission('reports'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await ReportService.getDashboardStats()
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/admin/reports/occupancy
 * Occupancy by activity and date range.
 * Query params: start_date, end_date (ISO format YYYY-MM-DD)
 */
adminReportsRouter.get('/occupancy', authenticate, requirePermission('reports'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string }
    const report = await ReportService.getOccupancy(start_date, end_date)
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/admin/reports/daily
 * Day resume: global aforo, per-activity occupancy with attendees,
 * status breakdown and event bookings.
 * Query params: date (required, ISO format YYYY-MM-DD)
 */
adminReportsRouter.get('/daily', authenticate, requirePermission('reports'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query as { date?: string }

    if (!date) {
      res.status(400).json({
        success: false,
        error: 'date is required (YYYY-MM-DD)',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const report = await ReportService.getDaily(date)
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/admin/reports/payments-by-day
 * Payments aggregated per day (validated totals + pending/rejected backlog).
 * Query params: start_date, end_date (required, ISO format, max 92 days)
 */
adminReportsRouter.get('/payments-by-day', authenticate, requirePermission('reports'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string }

    if (!start_date || !end_date) {
      res.status(400).json({
        success: false,
        error: 'start_date and end_date are required (YYYY-MM-DD)',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const report = await ReportService.getPaymentsByDay(start_date, end_date)
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/admin/reports/capacity
 * Capacity usage by location/venue for a date range.
 * Query params: start_date, end_date (required, ISO format, max 92 days)
 */
adminReportsRouter.get('/capacity', authenticate, requirePermission('reports'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string }

    if (!start_date || !end_date) {
      res.status(400).json({
        success: false,
        error: 'start_date and end_date are required (YYYY-MM-DD)',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const report = await ReportService.getCapacityByLocation(start_date, end_date)
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/admin/reports/revenue
 * Revenue report for a date range.
 * Query params: start_date, end_date (required, ISO format)
 */
adminReportsRouter.get('/revenue', authenticate, requirePermission('reports'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string }

    if (!start_date || !end_date) {
      res.status(400).json({
        success: false,
        error: 'start_date and end_date are required (YYYY-MM-DD)',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const report = await ReportService.getRevenue(start_date, end_date)
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/admin/reports/general
 * Executive summary report for a date range (financial, users,
 * reservations, capacity, top rankings).
 * Query params: start_date, end_date (required, ISO format, max 92 days)
 */
adminReportsRouter.get('/general', authenticate, requirePermission('reports'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string }

    if (!start_date || !end_date) {
      res.status(400).json({
        success: false,
        error: 'start_date and end_date are required (YYYY-MM-DD)',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const report = await ReportService.getGeneralReport(start_date, end_date)
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
