import { cva, type VariantProps } from 'class-variance-authority'
import { Progress as P } from 'radix-ui'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

const bar = cva(
  'h-full rounded-full transition-[width] duration-(--rendra-duration-base) ease-linear',
  {
    variants: {
      tone: {
        primary: 'bg-primary',
        brand: 'bg-gradient-accent',
        success: 'bg-success',
        warning: 'bg-warning',
        error: 'bg-destructive',
      },
    },
    defaultVariants: { tone: 'primary' },
  },
)

export interface ProgressProps extends VariantProps<typeof bar> {
  /** 0 a 100. Sem valor: indeterminado (animado). */
  value?: number | null
  size?: 'sm' | 'md'
  /** Mostra o percentual à direita. */
  showValue?: boolean
  label?: string
  className?: string
}

/** Barra de progresso única. tone="brand" usa o degradê de detalhe do template. */
export function Progress({ value, size = 'md', tone, showValue, label, className }: ProgressProps) {
  const indeterminate = value == null
  return (
    <div data-rendra="PROG-001" className={cn('flex min-w-0 items-center gap-3', className)}>
      <P.Root
        value={indeterminate ? null : value}
        aria-label={label}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-muted',
          size === 'sm' ? 'h-1' : 'h-2',
        )}
      >
        <P.Indicator
          className={cn(
            bar({ tone }),
            indeterminate ? 'absolute inset-y-0 left-0 w-1/3 progress-slide' : 'w-progress',
          )}
          style={
            indeterminate
              ? undefined
              : ({ '--progress': `${Math.min(100, Math.max(0, value))}%` } as CSSProperties)
          }
        />
      </P.Root>
      {showValue && !indeterminate && (
        <span className="w-12 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
          {Math.round(value)}%
        </span>
      )}
    </div>
  )
}
