import { ActivityQuery } from '../db/queries/activities.js'
import type {
  Activity,
  ActivityCategory,
  ActivityWithCategory,
  CreateActivityPayload,
  UpdateActivityPayload,
} from '../types/activity.js'
import { ValidationError, NotFoundError } from '../utils/errors.js'

export class ActivityService {
  private static validateImageUrl(imageUrl?: string | null): void {
    if (!imageUrl) return
    // Local asset under /public (e.g. /images/Piscina/piscina.jpg)
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
      if (imageUrl.includes('..')) throw new ValidationError('Invalid image URL')
      if (imageUrl.toLowerCase().includes('.svg')) {
        throw new ValidationError('SVG images are not allowed')
      }
      return
    }
    let parsed: URL
    try {
      parsed = new URL(imageUrl)
    } catch {
      throw new ValidationError('Invalid image URL')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ValidationError('Invalid image URL')
    }
    if (parsed.pathname.toLowerCase().endsWith('.svg')) {
      throw new ValidationError('SVG images are not allowed')
    }
  }

  static async getAll(): Promise<ActivityWithCategory[]> {
    return ActivityQuery.getAll()
  }

  static async getById(id: string): Promise<ActivityWithCategory> {
    const activity = await ActivityQuery.getWithCategory(id)
    if (!activity) throw new NotFoundError('Activity not found')
    return activity
  }

  static async getByCategory(categoryId: string): Promise<Activity[]> {
    return ActivityQuery.getByCategoryId(categoryId)
  }

  static async getCategories(): Promise<ActivityCategory[]> {
    return ActivityQuery.getCategories()
  }

  static async create(payload: CreateActivityPayload): Promise<Activity> {
    if (!payload.name || payload.name.trim().length === 0) {
      throw new ValidationError('Activity name is required')
    }
    if (!Number.isInteger(payload.capacity) || payload.capacity <= 0) {
      throw new ValidationError('Capacity must be a positive integer')
    }

    const category = await ActivityQuery.getCategories()
    const categoryExists = category.some((c) => c.id === payload.category_id)
    if (!categoryExists) {
      throw new ValidationError('Activity category not found')
    }

    ActivityService.validateImageUrl(payload.image_url)

    return ActivityQuery.create(payload)
  }

  static async update(id: string, payload: UpdateActivityPayload): Promise<Activity> {
    const existing = await ActivityQuery.getById(id)
    if (!existing) throw new NotFoundError('Activity not found')

    if (payload.capacity !== undefined) {
      if (!Number.isInteger(payload.capacity) || payload.capacity <= 0) {
        throw new ValidationError('Capacity must be a positive integer')
      }
      if (payload.capacity < existing.reserved_count) {
        throw new ValidationError(
          `Capacity cannot be lower than current reserved count (${existing.reserved_count})`
        )
      }
    }

    ActivityService.validateImageUrl(payload.image_url)

    const updated = await ActivityQuery.update(id, payload)
    if (!updated) throw new NotFoundError('Activity not found')
    return updated
  }

  static async delete(id: string): Promise<boolean> {
    const existing = await ActivityQuery.getById(id)
    if (!existing) throw new NotFoundError('Activity not found')
    return ActivityQuery.delete(id)
  }
}
