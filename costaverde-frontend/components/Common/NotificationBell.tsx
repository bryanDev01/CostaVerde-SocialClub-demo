'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  CreditCard,
  Info,
  ShieldAlert,
  Sparkles,
  UserPlus,
  UserX,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useNotificationActions, useNotifications } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { cn } from '@/lib/utils'
import type { AppNotification, NotificationType } from '@/lib/types'

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  account_created: Sparkles,
  user_registered: UserPlus,
  payment_submitted: CreditCard,
  payment_validated: CreditCard,
  payment_rejected: CreditCard,
  subscription_activated: CalendarCheck,
  subscription_expiring: CalendarCheck,
  subscription_expired: CalendarCheck,
  account_suspended: ShieldAlert,
  account_reactivated: Sparkles,
  reservation_created: CalendarDays,
  reservation_cancelled: CalendarDays,
  reservation_reminder: CalendarDays,
  no_show: UserX,
}

function relativeTime(value: string): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSeconds < 60) return 'ahora'
  const minutes = Math.floor(diffSeconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: AppNotification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Info
  const unread = notification.read_at === null

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => {
          if (unread) onRead(notification.id)
        }}
        className={cn(
          'flex w-full items-start gap-3 rounded-xl py-3 pl-3 pr-10 text-left transition-colors',
          unread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted'
        )}
      >
      <span
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
          unread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {notification.title}
          </span>
          {unread ? (
            <span
              className="size-1.5 shrink-0 rounded-full bg-danger"
              aria-label="No leída"
            />
          ) : null}
        </span>
        {notification.message ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {notification.message}
          </span>
        ) : null}
        <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
          {relativeTime(notification.created_at)}
        </span>
      </span>
      </button>

      <button
        type="button"
        onClick={() => onDelete(notification.id)}
        aria-label={`Eliminar la notificación: ${notification.title}`}
        title="Eliminar notificación"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-100 outline-none transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

export function NotificationBell({ align = 'end' }: { align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, loading, refetch } = useNotifications()
  const { markRead, markAllRead, deleteNotification } = useNotificationActions()

  const hasUnread = unreadCount > 0
  const badge = useMemo(
    () => (unreadCount > 99 ? '99+' : String(unreadCount)),
    [unreadCount]
  )

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleRead = async (id: string) => {
    try {
      await markRead(id)
      refetch()
    } catch (error) {
      toast.error(describeApiError(error, 'No se pudo marcar la notificación'))
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllRead()
      refetch()
      toast.success('Notificaciones marcadas como leídas')
    } catch (error) {
      toast.error(describeApiError(error, 'No se pudieron actualizar las notificaciones'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      refetch()
      toast.success('Notificación eliminada')
    } catch (error) {
      toast.error(describeApiError(error, 'No se pudo eliminar la notificación'))
    }
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-10 rounded-lg text-muted-foreground hover:text-foreground"
        aria-label={
          hasUnread
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-5" aria-hidden />
        {hasUnread ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-[1.125rem] text-danger-foreground">
            {badge}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Notificaciones"
          className="absolute top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(30,58,138,0.45)]"
          style={align === 'start' ? { left: 0 } : { right: 0 }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold text-foreground">
              Notificaciones
            </p>
            {hasUnread ? (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <CheckCheck className="size-3.5" aria-hidden />
                Marcar todas
              </button>
            ) : null}
          </div>

          <div className="max-h-[24rem] overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-1">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
                    aria-hidden
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto size-6 text-muted-foreground" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Sin notificaciones
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aquí verás avisos de pagos, suscripción y reservas.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
