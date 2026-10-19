import { m } from 'motion/react'
import type { ElementType, ReactNode } from 'react'
import type { FeedbackType } from '@/brand/types'
import { BrandFeedbackIcon } from '@/components/ui/brand-feedback-icon'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  /** Tipo do ícone de feedback da marca. info para "sem dados", error para falha. */
  type?: FeedbackType
  /** Ações: no máximo uma principal e uma secundária. */
  actions?: ReactNode
  /** compact: dentro de tabela ou card pequeno. */
  size?: 'default' | 'compact'
  /**
   * Classes extras, que vencem as do componente. Para zerar o respiro vertical (por exemplo,
   * dentro de um card que já tem o seu) use `className="py-0 md:py-0"`.
   */
  className?: string
}

/** Estado vazio (e de erro) com o ícone de feedback da marca. */
export function EmptyState({
  title,
  description,
  type = 'info',
  actions,
  size = 'default',
  className,
}: EmptyStateProps) {
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  // Em `on` o contêiner entra com fade e deslocamento curto.
  const Root: ElementType = on ? m.div : 'div'
  return (
    <Root
      data-rendra="VAZ-001"
      {...(on ? presets.slide('bottom', 'short') : {})}
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center',
        size === 'compact' ? 'px-4 py-8' : 'px-4 py-12 md:py-16',
        className,
      )}
    >
      <span className="relative flex items-center justify-center">
        <span aria-hidden className="absolute size-16 rounded-full bg-gradient-soft" />
        <BrandFeedbackIcon
          type={type}
          size={size === 'compact' ? 'xl' : '2xl'}
          className="relative"
        />
      </span>
      <div className="flex w-full flex-col gap-1">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
    </Root>
  )
}
