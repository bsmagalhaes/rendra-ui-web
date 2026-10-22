import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionOn, useMotionPresets } from '@/lib/motion'
import { bindNativeEvents, splitNativeEvents } from '@/lib/motion/native-events'

/**
 * Botão único do sistema. Variantes, tamanho, ícone, só ícone, carregamento e
 * largura total são props: nunca crie outro arquivo de botão.
 * Altura vem de h-control-*: 44px ou mais no mobile, compacta a partir de md.
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-(--rendra-duration-press) ease-out select-none active:scale-97 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Hover troca para a cor de hover da marca e eleva um nível; pressionar comprime.
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:text-primary-hover-foreground hover:shadow-md active:bg-primary-hover active:text-primary-hover-foreground active:shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover hover:text-secondary-hover-foreground hover:shadow-md active:bg-secondary-hover active:text-secondary-hover-foreground active:shadow-sm',
        outline:
          'border border-input bg-card text-foreground hover:border-primary hover:bg-primary-soft hover:text-primary-soft-foreground active:bg-primary-soft',
        // Transparentes: no hover, assumem a cor primária do template.
        ghost:
          'text-foreground hover:bg-primary-soft hover:text-primary-soft-foreground active:bg-primary-soft',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover hover:shadow-md active:bg-destructive-hover active:shadow-sm',
        link: 'min-h-touch min-w-touch text-primary-text underline-offset-4 hover:text-primary-hover hover:underline md:min-h-0 md:min-w-0',
      },
      size: {
        sm: 'h-control-sm px-3 text-sm [&_svg]:size-icon-sm',
        md: 'h-control-md px-4 text-sm [&_svg]:size-icon-sm',
        lg: 'h-control-lg px-6 text-base [&_svg]:size-icon-md',
      },
      iconOnly: { true: 'px-0', false: '' },
      fullWidth: { true: 'w-full', false: '' },
    },
    compoundVariants: [
      { iconOnly: true, size: 'sm', className: 'w-control-sm' },
      { iconOnly: true, size: 'md', className: 'w-control-md' },
      { iconOnly: true, size: 'lg', className: 'w-control-lg' },
      { variant: 'link', className: 'h-auto px-0' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', iconOnly: false, fullWidth: false },
  },
)

type Variants = VariantProps<typeof buttonVariants>

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, Omit<Variants, 'iconOnly' | 'fullWidth'> {
  /** Ícone à esquerda do texto (ou o próprio conteúdo, com iconOnly). */
  icon?: ReactNode
  /** Ícone à direita do texto. */
  iconRight?: ReactNode
  /** Botão só com ícone: quadrado, e aria-label passa a ser obrigatório. */
  iconOnly?: boolean
  /** Mostra indicador, bloqueia cliques e marca aria-busy. */
  loading?: boolean
  /** Ocupa toda a largura do contêiner. */
  fullWidth?: boolean
  /** Renderiza o filho (ex.: <Link>) com a aparência de botão. */
  asChild?: boolean
}

type MotionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
}

/**
 * O botão de `on`: `m.button` com toque discreto (whileTap). Os eventos que o Motion toma
 * (`onDrag*` e `onAnimationStart`) saem das props dele e viram ouvintes nativos no elemento,
 * então o consumidor continua recebendo o evento. Só existe em `on`; por isso os hooks de motion
 * moram aqui e o `off` não paga nada.
 */
const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  function MotionButton(props, ref) {
    const { m } = useMotionOn()
    const presets = useMotionPresets()
    const { native, rest } = splitNativeEvents(props)
    const attach = (el: HTMLButtonElement | null) => {
      assignRef(ref, el)
      if (!el) return
      const unbind = bindNativeEvents(el, native)
      return () => {
        unbind()
        assignRef(ref, null)
      }
    }
    return (
      <m.button
        ref={attach}
        whileTap={presets.press.whileTap}
        transition={presets.press.transition}
        {...rest}
      />
    )
  },
)

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    icon,
    iconRight,
    iconOnly = false,
    loading = false,
    fullWidth = false,
    asChild = false,
    disabled,
    type = 'button',
    children,
    ...props
  },
  ref,
) {
  if (import.meta.env.DEV && iconOnly && !props['aria-label']) {
    console.warn('Button com iconOnly precisa de aria-label.')
  }
  const on = useMotionMode() === 'on'
  // Em `on` o toque é do whileTap: a classe `active:scale-97` sairia somando com ele, e o
  // `transform` sai da lista de transition (senão o CSS transiciona cada quadro que o Motion grava
  // e o toque chega atrasado). Com asChild nada disso: é só CSS, como em `off`.
  const classes = cn(
    buttonVariants({ variant, size, iconOnly, fullWidth }),
    on &&
      !asChild &&
      'transition-[color,background-color,border-color,box-shadow] active:scale-100',
    className,
  )
  const code = resolveCatalogCode('Button', { variant: variant ?? 'primary' })

  if (asChild) {
    return (
      <Slot.Root ref={ref} data-rendra={code} className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  // Ícone dentro do botão segue o tamanho do próprio botão (sm/md -> sm, lg -> md, como o
  // [&_svg]:size-icon-* de buttonVariants já fazia com o Loader2 solto).
  const leading = loading ? <Spinner size={size === 'lg' ? 'md' : 'sm'} /> : icon
  if (on) {
    return (
      <MotionButton
        ref={ref}
        type={type}
        data-rendra={code}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {leading}
        {iconOnly ? (loading ? null : children) : children}
        {!iconOnly && iconRight}
      </MotionButton>
    )
  }
  return (
    <button
      ref={ref}
      type={type}
      data-rendra={code}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {leading}
      {iconOnly ? (loading ? null : children) : children}
      {!iconOnly && iconRight}
    </button>
  )
})
