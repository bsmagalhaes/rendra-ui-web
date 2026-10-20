import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { animate, m, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'
import { formatLike, parseLocaleNumber, type ParsedNumber } from '@/lib/motion/count'

export interface StatCardProps {
  label: string
  value: ReactNode
  /** Variação em %, positiva ou negativa. */
  change?: number
  /** Texto ao lado da variação (ex.: "vs. mês anterior"). */
  changeLabel?: string
  /** Quando cair é bom (ex.: custo), inverte as cores da variação. */
  inverse?: boolean
  icon?: ReactNode
  /** Destaque com o degradê suave do template. Use em no máximo um card por tela. */
  highlight?: boolean
  loading?: boolean
  /** Conteúdo extra no rodapé (ex.: mini gráfico). */
  footer?: ReactNode
  className?: string
}

/** Contagem de 0 até o valor, com o formato do texto original; no fim mostra o `value` exato. */
function Counter({ parsed, value }: { parsed: ParsedNumber; value: ReactNode }) {
  const presets = useMotionPresets()
  const progress = useMotionValue(0)
  const text = useTransform(progress, (n) => formatLike(parsed, n))
  const [done, setDone] = useState(false)
  useEffect(() => {
    const controls = animate(progress, parsed.value, {
      duration: presets.tokens.reveal.count,
      ease: presets.tokens.ease.out,
      onComplete: () => setDone(true),
    })
    return () => controls.stop()
  }, [progress, parsed.value, presets.tokens])
  return <m.span {...presets.fade}>{done ? value : text}</m.span>
}

/**
 * O valor do card. Em `off`, o valor como sempre veio. Em `on`, número (ou texto pt-BR com
 * número) conta até o valor; qualquer outra coisa só aparece com fade. Com "reduzir movimento"
 * o valor final aparece direto.
 */
function StatValue({ value }: { value: ReactNode }) {
  const motion = useMotionMode()
  const presets = useMotionPresets()
  const parsed = useMemo(() => parseLocaleNumber(value), [value])
  if (motion !== 'on') return <>{value}</>
  if (!parsed || presets.reduced) return <m.span {...presets.fade}>{value}</m.span>
  return <Counter key={String(value)} parsed={parsed} value={value} />
}

/** Card de indicador. Em grid: 1 coluna no mobile, 2 para cards pequenos. */
export function StatCard({
  label,
  value,
  change,
  changeLabel,
  inverse,
  icon,
  highlight,
  loading,
  footer,
  className,
}: StatCardProps) {
  const up = (change ?? 0) > 0
  const flat = !change
  const good = inverse ? !up : up
  const TrendIcon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight

  return (
    <Card
      data-rendra="STAT-001"
      className={cn('@container gap-3 p-4 md:p-6', highlight && 'bg-gradient-soft', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-soft-foreground [&_svg]:size-icon-sm"
          >
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </>
      ) : (
        <>
          <span className="text-2xl font-semibold tracking-tight tabular-nums @xs:text-3xl">
            <StatValue value={value} />
          </span>
          {change !== undefined && (
            <span className="flex flex-wrap items-center gap-1 text-xs">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-item px-1 font-medium tabular-nums',
                  flat
                    ? 'bg-muted text-muted-foreground'
                    : good
                      ? 'bg-success-soft text-success-soft-foreground'
                      : 'bg-destructive-soft text-destructive-soft-foreground',
                )}
              >
                <TrendIcon className="size-3" aria-hidden />
                {change > 0 ? '+' : ''}
                {change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </span>
              {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
            </span>
          )}
        </>
      )}
      {footer}
    </Card>
  )
}
