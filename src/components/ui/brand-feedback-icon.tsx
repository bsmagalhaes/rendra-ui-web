import { cva, type VariantProps } from 'class-variance-authority'
import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { SVGProps } from 'react'
import { useBrand } from '@/brand/use-brand'
import type { FeedbackType } from '@/brand/types'
import { cn } from '@/lib/cn'

const sizes = {
  sm: 'size-icon-sm',
  md: 'size-icon-md',
  lg: 'size-icon-lg',
  xl: 'size-12',
  '2xl': 'size-16',
} as const

const iconVariants = cva('relative inline-flex shrink-0', {
  variants: { size: sizes },
  defaultVariants: { size: 'md' },
})

/** Cor do estado (tinge o símbolo e, em statusBadge, o ícone ao lado). */
const stateText: Record<FeedbackType, string> = {
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
}

/** Ícone Lucide do selo ao lado do símbolo (statusBadge). */
const badgeIcons: Record<FeedbackType, LucideIcon> = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
}

/** Tamanho do ícone ao lado, proporcional ao do símbolo. */
const badgeIconSize: Record<keyof typeof sizes, string> = {
  sm: 'size-3',
  md: 'size-icon-sm',
  lg: 'size-icon-md',
  xl: 'size-icon-lg',
  '2xl': 'size-icon-lg',
}

const badgeTone: Record<FeedbackType, string> = {
  success: 'bg-success text-success-foreground',
  error: 'bg-destructive text-destructive-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-info text-info-foreground',
}

export const feedbackLabels: Record<FeedbackType, string> = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação',
}

/** Glifos universais de status desenhados em traço, herdando currentColor. */
function StatusGlyph({
  type,
  animated,
  ...props
}: { type: FeedbackType; animated?: boolean } & SVGProps<SVGSVGElement>) {
  // pathLength=1 normaliza o traço: o desenho anima de 1 a 0 em qualquer glifo.
  const draw = animated
    ? ({ pathLength: 1, strokeDasharray: 1, className: 'animate-draw' } as const)
    : {}
  const common = {
    viewBox: '0 0 12 12',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
  switch (type) {
    case 'success':
      return (
        <svg {...common}>
          <path d="M3 6.2 5.1 8.2 9 4" {...draw} />
        </svg>
      )
    case 'error':
      return (
        <svg {...common}>
          <path d="M4 4l4 4M8 4 4 8" {...draw} />
        </svg>
      )
    case 'warning':
      return (
        <svg {...common}>
          <path d="M6 3.2v3.3M6 8.8v0" {...draw} />
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <path d="M6 3.2v0M6 5.5v3.3" {...draw} />
        </svg>
      )
  }
}

export interface BrandFeedbackIconProps extends VariantProps<typeof iconVariants> {
  type: FeedbackType
  /** Texto para leitores de tela. Sem ele o ícone é decorativo (o texto ao lado informa). */
  label?: string
  /**
   * Anima a entrada: o símbolo entra com mola e o glifo se desenha (check se formando,
   * X se riscando). O erro treme ao final. Respeita reduzir movimento.
   * Troque a key do componente para repetir a animação.
   */
  animated?: boolean
  /**
   * Cor do símbolo. `state` (padrão): a cor do estado (verde, vermelho, amarelo, azul).
   * `brand`: a cor primária da marca (`text-primary-text`); o selo de estado mantém a cor do
   * estado, para o significado não depender só da cor.
   */
  symbolTone?: 'state' | 'brand'
  /**
   * `false` (padrão): selo de estado sobreposto ao símbolo. `true`: o ícone do estado
   * (Lucide, na cor do estado) fica ao lado do símbolo, no lugar do selo sobreposto. Com um
   * SVG próprio em `brand.feedbackIcons[type]`, o SVG vence e nenhum selo é desenhado.
   */
  statusBadge?: boolean
  /**
   * Só vale com `animated`. `pop` (padrão): entra com mola, o glifo se desenha e o erro
   * treme. `encaixe`: entra em 240 ms, curva de saída suave, sem quique, sem desenho e sem
   * tremor. Com "reduzir movimento" do sistema, nenhuma animação roda.
   */
  animation?: 'pop' | 'encaixe'
  className?: string
}

/**
 * Ícone de feedback da marca: o símbolo da marca em currentColor, tingido pela cor
 * semântica, com um selo de status para que o significado não dependa só da cor.
 * Cada tipo pode ser substituído por um SVG próprio em brand.config.ts (feedbackIcons).
 */
export function BrandFeedbackIcon({
  type,
  size,
  label,
  animated = false,
  symbolTone = 'state',
  statusBadge = false,
  animation = 'pop',
  className,
}: BrandFeedbackIconProps) {
  const { brand } = useBrand()
  const Custom = brand.feedbackIcons?.[type]
  const Symbol = brand.symbol
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const)
  const encaixe = animation === 'encaixe'
  // Com `symbolTone="state"` o texto do estado fica na raiz (como sempre); com `brand` sai da raiz.
  const rootTone = symbolTone === 'state' ? stateText[type] : undefined
  const symbolTonal = symbolTone === 'brand' && 'text-primary-text'
  const symbolAnim = animated && (encaixe ? 'animate-encaixe' : 'animate-pop')
  const badgeAnim = animated && (encaixe ? 'animate-encaixe' : 'animate-pop anim-delay-1')
  const BadgeIcon = badgeIcons[type]
  const sideBadge = statusBadge && !Custom

  return (
    <span
      data-slot="feedback-icon"
      data-rendra="BFI-001"
      className={cn(
        sideBadge ? 'relative inline-flex shrink-0 items-center gap-1' : iconVariants({ size }),
        rootTone,
        animated && !encaixe && type === 'error' && 'animate-shake',
        className,
      )}
      {...a11y}
    >
      {Custom ? (
        <Custom className={cn('size-full', symbolTonal, symbolAnim)} />
      ) : sideBadge ? (
        <>
          <Symbol className={cn(sizes[size ?? 'md'], symbolTonal, symbolAnim)} />
          <BadgeIcon
            aria-hidden
            className={cn('shrink-0', badgeIconSize[size ?? 'md'], stateText[type], badgeAnim)}
          />
        </>
      ) : (
        <>
          <Symbol className={cn('size-full mask-status-cutout', symbolTonal, symbolAnim)} />
          <span
            className={cn(
              'absolute right-0 bottom-0 flex size-1/2 items-center justify-center rounded-full',
              badgeTone[type],
              badgeAnim,
            )}
          >
            <StatusGlyph type={type} animated={animated && !encaixe} className="size-full" />
          </span>
        </>
      )}
    </span>
  )
}
