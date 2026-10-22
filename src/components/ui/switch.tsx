import { Switch as S } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useMotionLib, useMotionPresets } from '@/lib/motion'

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  'aria-label'?: string
}

/** Switch único, com rótulo e descrição à esquerda e a chave à direita. */
export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  description,
  disabled,
  id,
  name,
  className,
  ...aria
}: SwitchProps) {
  const auto = useId()
  const sid = id ?? `sw${auto}`
  const lib = useMotionLib()
  const presets = useMotionPresets()
  const rootCls =
    'relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary max-md:before:absolute max-md:before:-inset-3'
  const thumbBase =
    'pointer-events-none block size-icon-md rounded-full bg-card shadow-sm duration-(--rendra-duration-base) ease-move data-[state=checked]:translate-x-6'
  // `off`: o CSS anima tudo (deslocamento e escala do toque). `on`: o CSS só transiciona
  // `translate`; o `transform` é do Motion, e uma transição de CSS nele (W1) faria cada quadro
  // gravado virar uma transição de 200 ms e o toque chegaria mole.
  const thumbCls = cn(thumbBase, lib ? 'transition-[translate]' : 'transition-transform')
  // `on`: o toque fica no Root (o polegar tem pointer-events-none, então um whileTap nele nunca
  // dispararia) e chega ao polegar por variants. O deslocamento é a propriedade CSS `translate`
  // (Tailwind v4) e o Motion grava `transform`: as duas se compõem, não se anulam.
  const tap = presets.tap
  const control = lib ? (
    <S.Root
      asChild
      id={sid}
      name={name}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={aria['aria-label']}
      data-touch="expanded"
      data-rendra="SWT-001"
    >
      <lib.m.button
        type="button"
        className={rootCls}
        initial="rest"
        animate="rest"
        whileTap={tap ? 'tap' : undefined}
      >
        <S.Thumb asChild>
          <lib.m.span
            className={thumbCls}
            variants={{ rest: { scale: 1 }, tap: { scale: tap ? 1.15 : 1 } }}
            transition={presets.press.transition}
          />
        </S.Thumb>
      </lib.m.button>
    </S.Root>
  ) : (
    <S.Root
      id={sid}
      name={name}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={aria['aria-label']}
      data-touch="expanded"
      data-rendra="SWT-001"
      className={rootCls}
    >
      <S.Thumb className={thumbCls} />
    </S.Root>
  )
  if (!label) return control
  return (
    <label
      htmlFor={sid}
      className={cn(
        'flex min-h-touch cursor-pointer items-center justify-between gap-4 py-3 md:min-h-0 md:py-2',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </span>
      {control}
    </label>
  )
}
