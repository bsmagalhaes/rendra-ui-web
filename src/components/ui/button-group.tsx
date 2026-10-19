import type { ReactNode } from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { cn } from '@/lib/cn'

interface ButtonGroupProps {
  /** Botões encostados, com borda compartilhada. */
  children?: ReactNode
  /**
   * Modo seleção (segmentado): passe options, value e onChange.
   * Se as opções não couberem, o grupo quebra linha em vez de rolar.
   */
  options?: { value: string; label: ReactNode; icon?: ReactNode; disabled?: boolean }[]
  value?: string
  onChange?: (value: string) => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
  /**
   * Só no modo agrupado (`children`); o segmentado (`options`) ignora. `horizontal` (padrão):
   * botões lado a lado. `vertical`: empilhados, na largura do grupo, com as bordas unidas.
   * `responsive`: vertical abaixo de `md` e horizontal a partir dele (para três botões largos
   * que não cabem em 360 px).
   */
  orientation?: 'horizontal' | 'vertical' | 'responsive'
  'aria-label'?: string
  className?: string
}

/**
 * ButtonGroup único: agrupa botões de ação (children) ou funciona como controle
 * segmentado de escolha única (options + value).
 */
export function ButtonGroup({
  children,
  options,
  value,
  onChange,
  size = 'md',
  fullWidth,
  orientation = 'horizontal',
  className,
  ...aria
}: ButtonGroupProps) {
  if (options) {
    return (
      <div
        role="radiogroup"
        aria-label={aria['aria-label']}
        data-rendra={resolveCatalogCode('ButtonGroup', { orientation: 'horizontal' })}
        className={cn(
          'inline-flex max-w-full flex-wrap gap-1 rounded-control border bg-muted p-1',
          fullWidth && 'flex w-full',
          className,
        )}
      >
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={o.disabled}
              onClick={() => onChange?.(o.value)}
              className={cn(
                'inline-flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-item px-3 text-sm font-medium whitespace-nowrap transition-colors md:min-h-0 [&_svg]:size-icon-sm',
                size === 'sm' ? 'md:h-8' : 'md:h-8',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {o.icon}
              {o.label}
            </button>
          )
        })}
      </div>
    )
  }
  const vertical = orientation === 'vertical'
  const responsive = orientation === 'responsive'
  return (
    <div
      role="group"
      aria-label={aria['aria-label']}
      data-rendra={resolveCatalogCode('ButtonGroup', { orientation })}
      className={cn(
        'inline-flex max-w-full',
        '[&>*]:rounded-none [&>*]:shadow-none [&>*:focus-visible]:z-10',
        orientation === 'horizontal' &&
          '[&>*:first-child]:rounded-l-control [&>*:last-child]:rounded-r-control [&>*:not(:first-child)]:-ml-px',
        vertical &&
          'flex-col [&>*]:w-full [&>*:first-child]:rounded-t-control [&>*:last-child]:rounded-b-control [&>*:not(:first-child)]:-mt-px',
        // Vertical abaixo de md; de md em diante volta a linha e zera o que a vertical pôs
        // (o canto superior direito do primeiro, o inferior esquerdo do último e o -mt-px).
        responsive &&
          'flex-col md:flex-row [&>*]:w-full md:[&>*]:w-auto [&>*:first-child]:rounded-t-control md:[&>*:first-child]:rounded-l-control md:[&>*:first-child]:rounded-tr-none [&>*:last-child]:rounded-b-control md:[&>*:last-child]:rounded-r-control md:[&>*:last-child]:rounded-bl-none [&>*:not(:first-child)]:-mt-px md:[&>*:not(:first-child)]:mt-0 md:[&>*:not(:first-child)]:-ml-px',
        fullWidth && (vertical ? 'flex w-full' : 'flex w-full [&>*]:flex-1'),
        className,
      )}
    >
      {children}
    </div>
  )
}
