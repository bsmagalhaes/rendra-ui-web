import { Check, Minus } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { Checkbox as C } from 'radix-ui'
import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

export interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  invalid?: boolean
  id?: string
  name?: string
  className?: string
  'aria-label'?: string
}

/**
 * Checkbox único, com estado indeterminado (checked="indeterminate").
 * Com label, a linha inteira é área de toque de 44px no mobile.
 */
export function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  description,
  disabled,
  invalid,
  id,
  name,
  className,
  ...aria
}: CheckboxProps) {
  const auto = useId()
  const cid = id ?? `cb${auto}`
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  // Só em `on`: o estado marcado é espelhado aqui (controlado ou não) para o indicador poder
  // sair com animação. O Radix mantém o indicador sempre presente com forceMount, então ele só
  // existe no DOM enquanto marcado ou saindo (AnimatePresence).
  const [inner, setInner] = useState<boolean | 'indeterminate'>(defaultChecked ?? false)
  const state = checked ?? inner
  const mark =
    checked === 'indeterminate' ? (
      <Minus className="size-3" strokeWidth={3} aria-hidden />
    ) : (
      <Check className="size-3" strokeWidth={3} aria-hidden />
    )
  const box = (
    <C.Root
      id={cid}
      name={name}
      checked={on ? state : checked}
      defaultChecked={on ? undefined : defaultChecked}
      onCheckedChange={(v) => {
        if (on) setInner(v)
        onCheckedChange?.(v === true)
      }}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-label={aria['aria-label']}
      data-touch={label ? undefined : 'expanded'}
      className={cn(
        'peer relative flex size-icon-md shrink-0 cursor-pointer items-center justify-center rounded-item border border-input bg-card transition-colors',
        'hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        invalid && 'border-destructive',
        // Área de toque ampliada sem mudar o desenho
        !label && 'before:absolute before:-inset-3 md:before:hidden',
      )}
    >
      {on ? (
        <AnimatePresence initial={false}>
          {state !== false && (
            <C.Indicator forceMount asChild>
              <m.span className="flex items-center justify-center" {...presets.pop}>
                {mark}
              </m.span>
            </C.Indicator>
          )}
        </AnimatePresence>
      ) : (
        <C.Indicator className="flex items-center justify-center data-[state=checked]:animate-in data-[state=checked]:zoom-in-50">
          {mark}
        </C.Indicator>
      )}
    </C.Root>
  )
  if (!label)
    return (
      <span data-rendra="CHK-001" className={cn('inline-flex', className)}>
        {box}
      </span>
    )
  return (
    <label
      htmlFor={cid}
      data-rendra="CHK-001"
      className={cn(
        'flex min-h-touch cursor-pointer items-start gap-3 py-3 md:min-h-0 md:py-1',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="flex pt-px">{box}</span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}

export interface CheckboxGroupProps {
  options: { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }[]
  value?: string[]
  onChange?: (value: string[]) => void
  /** Checkbox "Selecionar todos" com estado indeterminado. */
  selectAll?: boolean
  orientation?: 'vertical' | 'horizontal'
  invalid?: boolean
  id?: string
  'aria-describedby'?: string
  label?: string
}

export function CheckboxGroup({
  options,
  value = [],
  onChange,
  selectAll,
  orientation = 'vertical',
  invalid,
  id,
  label,
  ...aria
}: CheckboxGroupProps) {
  const enabled = options.filter((o) => !o.disabled)
  const all = enabled.length > 0 && enabled.every((o) => value.includes(o.value))
  const some = value.length > 0 && !all
  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      aria-describedby={aria['aria-describedby']}
      data-rendra="CHK-002"
      className="flex flex-col"
    >
      {selectAll && (
        <Checkbox
          label="Selecionar todos"
          checked={all ? true : some ? 'indeterminate' : false}
          onCheckedChange={() => onChange?.(all ? [] : enabled.map((o) => o.value))}
          className="border-b"
        />
      )}
      <div
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col' : 'flex-col sm:flex-row sm:flex-wrap sm:gap-x-6',
        )}
      >
        {options.map((o) => (
          <Checkbox
            key={o.value}
            label={o.label}
            description={o.description}
            disabled={o.disabled}
            invalid={invalid}
            checked={value.includes(o.value)}
            onCheckedChange={(c) =>
              onChange?.(c ? [...value, o.value] : value.filter((v) => v !== o.value))
            }
          />
        ))}
      </div>
    </div>
  )
}
