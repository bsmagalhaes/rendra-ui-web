import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { useMotionMode } from '@/lib/motion'

/**
 * Bloco de carregamento. Monte o skeleton com a mesma estrutura do conteúdo final. Em `off` pulsa
 * (animate-pulse do Tailwind); em `on` um brilho suave cruza o bloco (skeleton-shimmer, em
 * globals.css: transform, tempo e curva pelos tokens, parado com "reduzir movimento").
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const on = useMotionMode() === 'on'
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      data-rendra="SKEL-001"
      className={cn(on ? 'skeleton-shimmer' : 'animate-pulse', 'rounded-block bg-muted', className)}
      {...props}
    />
  )
}
