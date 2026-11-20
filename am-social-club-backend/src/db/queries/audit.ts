import { pool } from '../connection.js'

export interface AuditLogEntry {
  actorUserId: string
  actorRole: string
  action: string
  targetType: string
  targetId: string | null
  details?: Record<string, unknown> | null
}

export class AuditQuery {
  /**
   * Records a privileged action. Auditing must never break the operation that
   * is being audited, so failures are logged and swallowed.
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_log
          (actor_user_id, actor_role, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.actorUserId,
          entry.actorRole,
          entry.action,
          entry.targetType,
          entry.targetId,
          entry.details ? JSON.stringify(entry.details) : null,
        ]
      )
    } catch (error) {
      console.error('Audit log write failed:', error)
    }
  }
}
