import type { ElementType, ReactNode } from 'react'
import type { FeedbackType } from '@/brand/types'
import { BrandFeedbackIcon } from '@/components/ui/brand-feedback-icon'
import { cn } from '@/lib/cn'
import { useMotionLib, useMotionPresets } from '@/lib/motion'

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
  const lib = useMotionLib()
  const on = lib !== null
  const presets = useMotionPresets()
  // Em `on` as quatro partes (ícone, título, descrição e ações) sobem em cascata de 60 ms, cada
  // uma com o deslize curto; a raiz em si não anima. Estado vazio é cota de encanto: ocasional,
  // sem teclado no caminho. Em `off` o HTML é o de sempre.
  const Icon: ElementType = on ? lib.m.span : 'span'
  const Title: ElementType = on ? lib.m.p : 'p'
  const Description: ElementType = on ? lib.m.p : 'p'
  const Actions: ElementType = on ? lib.m.div : 'div'
  const part = (index: number) => {
    if (!on) return {}
    const enter = presets.slide('bottom', 'short')
    return { ...enter, transition: { ...enter.transition, ...presets.stagger(index) } }
  }
  return (
    <div
      data-rendra="VAZ-001"
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center',
        size === 'compact' ? 'px-4 py-8' : 'px-4 py-12 md:py-16',
        className,
      )}
    >
      <Icon className="relative flex items-center justify-center" {...part(0)}>
        <span aria-hidden className="absolute size-16 rounded-full bg-gradient-soft" />
        <BrandFeedbackIcon
          type={type}
          size={size === 'compact' ? 'xl' : '2xl'}
          className="relative"
        />
      </Icon>
      <div className="flex w-full flex-col gap-1">
        <Title className="text-base font-semibold wrap-break-word" {...part(1)}>
          {title}
        </Title>
        {description && (
          <Description className="text-sm wrap-break-word text-muted-foreground" {...part(2)}>
            {description}
          </Description>
        )}
      </div>
      {actions && (
        <Actions className="flex flex-wrap justify-center gap-3" {...part(3)}>
          {actions}
        </Actions>
      )}
    </div>
  )
}
