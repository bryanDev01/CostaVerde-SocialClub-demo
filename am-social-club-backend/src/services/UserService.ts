import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UserQuery } from '../db/queries/users.js'
import { resolvePermissions } from '../config/permissions.js'
import { NotificationService } from './NotificationService.js'
import type { User, SafeUser, UserProfile, UpdateProfilePayload, UserStatus, UserType } from '../types/user.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import { isValidEmail, isValidPhone } from '../utils/validators.js'

const ALLOWED_PROFILE_FIELDS: ReadonlySet<string> = new Set([
  'name', 'phone', 'email', 'profile_photo_url',
])

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'pending_activation', 'pending_payment', 'active', 'suspended', 'inactive', 'external_active',
])

const AVATAR_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
const MAX_AVATAR_BYTES = 1024 * 1024

const AVATARS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'uploads',
  'avatars'
)

async function deleteAvatarFile(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl || !photoUrl.startsWith('/uploads/avatars/')) return
  const fileName = path.basename(photoUrl)
  if (!fileName) return
  await unlink(path.join(AVATARS_DIR, fileName)).catch(() => undefined)
}

export class UserService {
  static toSafeUser(user: User): SafeUser {
    const { password_hash: _passwordHash, ...safe } = user
    return safe
  }

  static async getById(id: string): Promise<SafeUser> {
    const user = await UserQuery.getSafeById(id)
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  static async getProfile(id: string): Promise<UserProfile> {
    const profile = await UserQuery.getProfileById(id)
    if (!profile) throw new NotFoundError('User not found')
    profile.role_permissions = resolvePermissions(
      profile.role_name ?? 'user',
      profile.role_permissions
    )
    return profile
  }

  static async updateProfile(
    id: string,
    payload: UpdateProfilePayload
  ): Promise<SafeUser> {
    const unknownFields = Object.keys(payload).filter(
      (key) => !ALLOWED_PROFILE_FIELDS.has(key)
    )
    if (unknownFields.length > 0) {
      throw new ValidationError(
        `Cannot update fields: ${unknownFields.join(', ')}`
      )
    }

    if (payload.email !== undefined && payload.email !== null && !isValidEmail(payload.email)) {
      throw new ValidationError('Invalid email format')
    }
    if (payload.phone !== undefined && payload.phone !== null && !isValidPhone(payload.phone)) {
      throw new ValidationError('Invalid phone format')
    }
    if (payload.name !== undefined && (!payload.name || payload.name.trim().length === 0)) {
      throw new ValidationError('Name cannot be empty')
    }

    let previousPhotoUrl: string | null = null
    if (payload.profile_photo_url !== undefined) {
      const profile = await UserQuery.getProfileById(id)
      if (!profile) throw new NotFoundError('User not found')
      previousPhotoUrl = profile.profile_photo_url
    }

    const updated = await UserQuery.update(id, payload)
    if (!updated) throw new NotFoundError('User not found')

    if (
      payload.profile_photo_url !== undefined &&
      previousPhotoUrl &&
      previousPhotoUrl !== payload.profile_photo_url
    ) {
      await deleteAvatarFile(previousPhotoUrl)
    }

    return UserService.toSafeUser(updated)
  }

  static async updateProfilePhoto(id: string, image: unknown): Promise<SafeUser> {
    if (typeof image !== 'string' || image.length === 0) {
      throw new ValidationError('image is required')
    }

    const match = AVATAR_DATA_URL_PATTERN.exec(image)
    if (!match) {
      throw new ValidationError('image must be a base64 data URL (jpeg, png or webp)')
    }

    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length === 0) throw new ValidationError('image is empty')
    if (buffer.length > MAX_AVATAR_BYTES) {
      throw new ValidationError('image exceeds the 1MB limit')
    }

    const profile = await UserQuery.getProfileById(id)
    if (!profile) throw new NotFoundError('User not found')

    const extension = match[1] === 'jpeg' ? 'jpg' : match[1]
    const fileName = `${id}-${Date.now()}.${extension}`

    await mkdir(AVATARS_DIR, { recursive: true })
    await writeFile(path.join(AVATARS_DIR, fileName), buffer)

    const photoUrl = `/uploads/avatars/${fileName}`
    const updated = await UserQuery.update(id, { profile_photo_url: photoUrl })
    if (!updated) throw new NotFoundError('User not found')

    if (profile.profile_photo_url && profile.profile_photo_url !== photoUrl) {
      await deleteAvatarFile(profile.profile_photo_url)
    }

    return UserService.toSafeUser(updated)
  }

  static async deactivate(id: string): Promise<SafeUser> {
    const updated = await UserQuery.updateStatus(id, 'inactive')
    if (!updated) throw new NotFoundError('User not found')
    return UserService.toSafeUser(updated)
  }

  static async listForAdmin(filters: {
    status?: UserStatus
    user_type?: UserType
    search?: string
    page?: number
    limit?: number
  }): Promise<{ users: SafeUser[]; total: number }> {
    return UserQuery.listAll({
      status: filters.status,
      user_type: filters.user_type,
      search: filters.search,
      page: filters.page,
      limit: filters.limit,
    })
  }

  static async updateStatus(id: string, status: UserStatus): Promise<SafeUser> {
    if (!VALID_STATUSES.has(status)) {
      throw new ValidationError(`Invalid status: ${status}`)
    }
    const updated = await UserQuery.updateStatus(id, status)
    if (!updated) throw new NotFoundError('User not found')

    if (status === 'suspended') {
      await NotificationService.notifyUser(id, {
        type: 'account_suspended',
        title: 'Tu cuenta fue suspendida',
        message:
          'Un administrador suspendió el acceso a tu cuenta. Contacta a administración para más información.',
      })
    } else if (status === 'active' || status === 'external_active') {
      await NotificationService.notifyUser(id, {
        type: 'account_reactivated',
        title: 'Tu cuenta fue reactivada',
        message: 'Tu acceso al club está activo de nuevo. ¡Bienvenido de vuelta!',
      })
    }

    return UserService.toSafeUser(updated)
  }
}
