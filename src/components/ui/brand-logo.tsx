import { cva } from 'class-variance-authority'
import { useBrand } from '@/brand/use-brand'
import { cn } from '@/lib/cn'

/*
 * Logotipo da marca, montado com o símbolo do modelo e as cores da paleta ativa.
 * Assim o logo acompanha o tema: forma e símbolo vêm do modelo; cores, da paleta.
 * Com logoMode: 'image' no brand.config, usa os SVGs oficiais sem recolorir.
 *
 *   on="sidebar"  sobre a sidebar colorida
 *   on="surface"  sobre fundo claro ou escuro comum (header, telas de login no mobile)
 *   on="brand"    sobre o degradê forte (painel do login)
 */

const tile = cva('flex shrink-0 items-center justify-center rounded-control', {
  variants: {
    on: {
      sidebar: 'bg-sidebar-indicator text-sidebar',
      surface: 'bg-primary text-primary-foreground',
      brand: 'bg-gradient-brand-foreground text-sidebar',
    },
    size: { sm: 'size-6 p-1', md: 'size-8 p-1' },
  },
  defaultVariants: { on: 'surface', size: 'md' },
})

const word = {
  sidebar: ['text-sidebar-foreground', 'text-sidebar-muted-foreground'],
  surface: ['text-foreground', 'text-muted-foreground'],
  brand: ['text-gradient-brand-foreground', 'text-gradient-brand-foreground opacity-80'],
} as const

export interface BrandLogoProps {
  on?: 'sidebar' | 'surface' | 'brand'
  /** Só o selo com o símbolo (sidebar recolhida, favicon). */
  symbolOnly?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function BrandLogo({ on = 'surface', symbolOnly, size = 'md', className }: BrandLogoProps) {
  const { brand, resolvedMode, sidebarLogoVariant } = useBrand()

  // Arte oficial: usa os SVGs como estão.
  if (brand.logoMode === 'image' && !symbolOnly) {
    const variant =
      on === 'sidebar'
        ? sidebarLogoVariant
        : on === 'brand' || resolvedMode === 'dark'
          ? 'dark'
          : 'light'
    const Logo = brand.logo[variant]
    return (
      // Wrapper sem layout próprio (display: contents): só para carregar o data-rendra,
      // já que o SVG da arte oficial não repassa atributos que não conhece.
      <span className="contents" data-rendra="LOGO-001">
        <Logo className={cn('h-8 w-auto', className)} role="img" aria-label={brand.productName} />
      </span>
    )
  }

  const Symbol = brand.symbol
  const [first, ...rest] = brand.productName.split(' ')
  const [strong, soft] = word[on]
  return (
    <span data-rendra="LOGO-001" className={cn('flex min-w-0 items-center gap-3', className)}>
      <span aria-hidden className={tile({ on, size })}>
        <Symbol className="size-full" />
      </span>
      {!symbolOnly && (
        <span className="truncate text-lg leading-none tracking-tight">
          <span className={cn('font-semibold', strong)}>{first}</span>
          {/* O espaço fica fora dos spans: o axe apara o espaço da ponta de cada um e juntaria
              "RendraSafira", que o nome acessível do link não contém (WCAG 2.5.3). */}
          {rest.length > 0 && ' '}
          {rest.length > 0 && <span className={cn('font-normal', soft)}>{rest.join(' ')}</span>}
        </span>
      )}
      {symbolOnly && <span className="sr-only">{brand.productName}</span>}
    </span>
  )
}
