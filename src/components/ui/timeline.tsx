import { CheckCircle2, SkipForward, XCircle } from 'lucide-react'
import { m } from 'motion/react'
import type { ComponentType, ElementType, ReactNode } from 'react'
import type { FeedbackType } from '@/brand/types'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

export interface TimelineEvent {
  id: string
  title: ReactNode
  description?: ReactNode
  /** Data em formato curto (ex.: "22/09/2026 14:30"). */
  date: string
  tone?: FeedbackType | 'neutral'
  icon?: ReactNode
  /** Resultado do evento: mostrado com ícone e texto, nunca só pela cor. */
  status?: 'succeeded' | 'failed' | 'skipped'
}

const dot: Record<NonNullable<TimelineEvent['tone']>, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  error: 'bg-destructive-soft text-destructive-soft-foreground',
}

const statusTone: Record<
  NonNullable<TimelineEvent['status']>,
  NonNullable<TimelineEvent['tone']>
> = {
  succeeded: 'success',
  failed: 'error',
  skipped: 'neutral',
}

const statusIcon: Record<
  NonNullable<TimelineEvent['status']>,
  ComponentType<{ className?: string }>
> = {
  succeeded: CheckCircle2,
  failed: XCircle,
  skipped: SkipForward,
}

const statusLabel: Record<NonNullable<TimelineEvent['status']>, string> = {
  succeeded: 'Concluído',
  failed: 'Falhou',
  skipped: 'Ignorado',
}

const statusTextTone: Record<NonNullable<TimelineEvent['status']>, string> = {
  succeeded: 'text-success-soft-foreground',
  failed: 'text-destructive-soft-foreground',
  skipped: 'text-muted-foreground',
}

/** Linha do tempo única, com eventos em ordem e tom semântico por evento. */
export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  // Em `on` cada evento entra com slide curto e atraso escalonado (no máximo 10 itens).
  const Item: ElementType = on ? m.li : 'li'
  const enter = presets.slide('bottom', 'short')
  return (
    <ol data-rendra="TLN-001" className={cn('@container flex flex-col', className)}>
      {events.map((e, i) => {
        const StatusIcon = e.status ? statusIcon[e.status] : null
        const tone = e.tone ?? (e.status ? statusTone[e.status] : 'neutral')
        return (
          <Item
            key={e.id}
            className="relative flex gap-3 pb-6 last:pb-0"
            {...(on
              ? { ...enter, transition: { ...enter.transition, ...presets.stagger(i) } }
              : {})}
          >
            {i < events.length - 1 && (
              <span
                aria-hidden
                className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-border"
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-icon-sm',
                dot[tone],
              )}
            >
              {e.icon ?? (StatusIcon && <StatusIcon />) ?? (
                <span className="size-2 rounded-full bg-current" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
              <div className="flex min-w-0 flex-col gap-1 @sm:flex-row @sm:items-baseline @sm:justify-between @sm:gap-3">
                <span className="text-sm font-medium">{e.title}</span>
                <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {e.date}
                </time>
              </div>
              {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
              {e.status && StatusIcon && (
                <span
                  className={cn(
                    'inline-flex w-fit items-center gap-1 text-xs font-medium [&_svg]:size-icon-sm',
                    statusTextTone[e.status],
                  )}
                >
                  <StatusIcon />
                  {statusLabel[e.status]}
                </span>
              )}
            </div>
          </Item>
        )
      })}
    </ol>
  )
}
