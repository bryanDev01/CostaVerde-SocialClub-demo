import { AssociateQuery } from '../db/queries/associates.js'
import { UserQuery } from '../db/queries/users.js'
import { env } from '../config/env.js'
import { isValidCI, isValidPhone } from '../utils/validators.js'
import { ValidationError, ConflictError, NotFoundError, ForbiddenError } from '../utils/errors.js'
import type { Associate, CreateAssociatePayload, UpdateAssociatePayload } from '../types/associate.js'

export class AssociateService {
  static async create(payload: CreateAssociatePayload): Promise<Associate> {
    if (!isValidCI(payload.ci)) {
      throw new ValidationError('Invalid CI format. Expected 11 digits.')
    }
    if (!payload.name || payload.name.trim().length === 0) {
      throw new ValidationError('Associate name is required')
    }
    if (payload.phone && !isValidPhone(payload.phone)) {
      throw new ValidationError('Invalid phone format')
    }

    const titular = await UserQuery.getById(payload.user_id)
    if (!titular) throw new NotFoundError('Titular user not found')
    if (titular.user_type === 'external') {
      throw new ForbiddenError('External users cannot register associates')
    }

    const count = await AssociateQuery.countByUserId(payload.user_id)
    if (count >= env.MAX_ASSOCIATES) {
      throw new ConflictError(
        `Maximum number of associates reached (${env.MAX_ASSOCIATES})`
      )
    }

    const existing = await AssociateQuery.getByCI(payload.ci)
    if (existing) {
      throw new ConflictError('An associate with this CI already exists')
    }

    return AssociateQuery.create(payload)
  }

  static async listByUser(userId: string): Promise<Associate[]> {
    return AssociateQuery.getByUserId(userId)
  }

  static async update(
    id: string,
    userId: string,
    payload: UpdateAssociatePayload
  ): Promise<Associate> {
    const associate = await AssociateQuery.getById(id)
    if (!associate) throw new NotFoundError('Associate not found')
    if (associate.user_id !== userId) {
      throw new ForbiddenError('Cannot modify an associate of another user')
    }
    if (payload.phone && !isValidPhone(payload.phone)) {
      throw new ValidationError('Invalid phone format')
    }

    const updated = await AssociateQuery.update(id, payload)
    if (!updated) throw new NotFoundError('Associate not found')
    return updated
  }

  static async remove(id: string, userId: string): Promise<boolean> {
    const associate = await AssociateQuery.getById(id)
    if (!associate) throw new NotFoundError('Associate not found')
    if (associate.user_id !== userId) {
      throw new ForbiddenError('Cannot remove an associate of another user')
    }

    return AssociateQuery.delete(id)
  }
}
