import { m } from 'motion/react'
import { RadioGroup as R } from 'radix-ui'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

export interface RadioOption {
  value: string
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface RadioGroupProps {
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** list: bolinha e texto; cards: cartões selecionáveis com ícone e descrição. */
  variant?: 'list' | 'cards'
  /** Colunas dos cards a partir de md (no mobile sempre 1). */
  columns?: 1 | 2 | 3
  orientation?: 'vertical' | 'horizontal'
  invalid?: boolean
  disabled?: boolean
  id?: string
  name?: string
  'aria-describedby'?: string
  'aria-label'?: string
}

const cols = { 1: '', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' } as const

/**
 * O item do Radix. Em `on` ele é um `m.button` (asChild) que responde ao toque (whileTap 0,97,
 * em `press`); em `off` é o `R.Item` de sempre, sem nó novo.
 */
function Item({ on, children, ...props }: ComponentProps<typeof R.Item> & { on: boolean }) {
  const presets = useMotionPresets()
  if (!on) return <R.Item {...props}>{children}</R.Item>
  return (
    <R.Item asChild {...props}>
      <m.button
        type="button"
        whileTap={presets.press.whileTap}
        transition={presets.press.transition}
      >
        {children}
      </m.button>
    </R.Item>
  )
}

/** Radio único: em lista ou em cards, por prop. */
export function RadioGroup({
  options,
  value,
  defaultValue,
  onChange,
  variant = 'list',
  columns = 2,
  orientation = 'vertical',
  invalid,
  disabled,
  id,
  name,
  ...aria
}: RadioGroupProps) {
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  // Só em `on`: o valor é espelhado aqui (controlado ou não) para a bolinha animar a escala
  // nos dois sentidos pelos presets; o Radix segue dono da seleção.
  const [inner, setInner] = useState(defaultValue)
  const current = value ?? inner
  const dotFor = (optionValue: string) => (
    <span
      aria-hidden
      className={cn(
        'flex size-icon-md shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors group-data-[state=checked]:border-primary',
        invalid && 'border-destructive',
      )}
    >
      {on ? (
        // Nunca scale(0): a bolinha vai de 0,9 com opacidade 0 até 1, em `fast`, sem quique.
        <m.span
          className="size-2 rounded-full bg-primary"
          initial={false}
          animate={current === optionValue ? presets.indicator.animate : presets.indicator.initial}
          transition={presets.indicator.transition}
        />
      ) : (
        <span className="size-2 scale-90 rounded-full bg-primary opacity-0 transition-[transform,opacity] duration-(--rendra-duration-fast) ease-out group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100" />
      )}
    </span>
  )

  return (
    <R.Root
      id={id}
      name={name}
      value={on ? current : value}
      defaultValue={on ? undefined : defaultValue}
      onValueChange={(v) => {
        if (on) setInner(v)
        onChange?.(v)
      }}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-describedby={aria['aria-describedby']}
      aria-label={aria['aria-label']}
      data-rendra={resolveCatalogCode('RadioGroup', { variant })}
      className={cn(
        variant === 'cards'
          ? cn('grid grid-cols-1 gap-3', cols[columns])
          : orientation === 'horizontal'
            ? 'flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-6'
            : 'flex flex-col',
      )}
    >
      {options.map((o) =>
        variant === 'cards' ? (
          <Item
            on={on}
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            className={cn(
              'group relative flex cursor-pointer items-start gap-3 rounded-control border bg-card p-4 text-left transition-[border-color,box-shadow,background-color]',
              'hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:ring-1 data-[state=checked]:ring-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              invalid && 'border-destructive',
            )}
          >
            {o.icon && (
              <span className="flex size-control-sm shrink-0 items-center justify-center rounded-control bg-muted text-foreground transition-colors group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground md:size-control-md [&_svg]:size-icon-md">
                {o.icon}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-semibold">{o.label}</span>
              {o.description && (
                <span className="text-sm text-muted-foreground">{o.description}</span>
              )}
            </span>
            {dotFor(o.value)}
          </Item>
        ) : (
          <label
            key={o.value}
            className={cn(
              'flex min-h-touch cursor-pointer items-start gap-3 py-3 md:min-h-0 md:py-1',
              o.disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <Item
              on={on}
              value={o.value}
              disabled={o.disabled}
              className="group flex pt-px outline-none focus-visible:[&>span]:focus-ring"
            >
              {dotFor(o.value)}
            </Item>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">{o.label}</span>
              {o.description && (
                <span className="text-sm text-muted-foreground">{o.description}</span>
              )}
            </span>
          </label>
        ),
      )}
    </R.Root>
  )
}
