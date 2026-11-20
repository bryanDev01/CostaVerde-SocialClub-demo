import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../utils/errors.js'

type Validator<T> = (value: unknown) => T

export function validateBody<T>(validator: Validator<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = validator(req.body)
      ;(req as Request & { validatedBody: T }).validatedBody = result
      next()
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error)
      } else {
        next(new ValidationError('Invalid request body'))
      }
    }
  }
}

export function validateQuery<T>(validator: Validator<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = validator(req.query)
      ;(req as Request & { validatedQuery: T }).validatedQuery = result
      next()
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error)
      } else {
        next(new ValidationError('Invalid query parameters'))
      }
    }
  }
}

export function requireFields(...fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown>
    const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '')
    if (missing.length > 0) {
      next(new ValidationError(`Missing required fields: ${missing.join(', ')}`))
      return
    }
    next()
  }
}
