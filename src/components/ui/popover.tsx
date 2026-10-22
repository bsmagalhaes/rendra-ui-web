import { Popover as P } from 'radix-ui'
import { createContext, useContext, useState, type ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { useMotionLib, useMotionMode, useMotionPresets } from '@/lib/motion'

/*
 * Em `on` o Popover precisa saber se está aberto para manter o conteúdo montado durante a
 * saída animada. O Root vira um wrapper com exatamente os mesmos tipos do Radix
 * (`ComponentProps<typeof P.Root>`) que espelha o estado (controlado ou não) num contexto.
 * Em `off` é o `P.Root` de sempre, sem estado nem contexto novos.
 */
const PopoverOpenContext = createContext<boolean | null>(null)

function AnimatedRoot({ open, defaultOpen, onOpenChange, ...rest }: ComponentProps<typeof P.Root>) {
  const [inner, setInner] = useState(defaultOpen ?? false)
  const current = open ?? inner
  return (
    <PopoverOpenContext.Provider value={current}>
      <P.Root
        {...rest}
        open={current}
        onOpenChange={(next) => {
          setInner(next)
          onOpenChange?.(next)
        }}
      />
    </PopoverOpenContext.Provider>
  )
}

export function Popover(props: ComponentProps<typeof P.Root>) {
  return useMotionMode() === 'on' ? <AnimatedRoot {...props} /> : <P.Root {...props} />
}
export const PopoverTrigger = P.Trigger
export const PopoverClose = P.Close
export const PopoverAnchor = P.Anchor

interface PopoverContentProps extends ComponentProps<typeof P.Content> {
  /** Largura: sm (16rem) ou md (22rem). Sempre limitada à tela menos 32px. */
  width?: 'sm' | 'md'
}

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 8,
  width = 'md',
  children,
  asChild,
  ...props
}: PopoverContentProps) {
  const open = useContext(PopoverOpenContext)
  const lib = useMotionLib()
  const presets = useMotionPresets()
  // O popover nasce do gatilho, não do centro (W6): a origem vem do Radix.
  const base = cn(
    'z-50 origin-(--radix-popover-content-transform-origin) rounded-surface border bg-popover text-popover-foreground shadow-md outline-none',
    width === 'sm' ? 'w-popover-sm' : 'w-popover',
  )

  if (lib && open !== null && !asChild) {
    return (
      <lib.AnimatePresence>
        {open && (
          <P.Portal forceMount key="popover">
            <P.Content
              forceMount
              asChild
              align={align}
              sideOffset={sideOffset}
              collisionPadding={16}
              data-rendra="POP-001"
              className={cn(base, className)}
              {...props}
            >
              <lib.m.div {...presets.open()}>{children}</lib.m.div>
            </P.Content>
          </P.Portal>
        )}
      </lib.AnimatePresence>
    )
  }

  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        data-rendra="POP-001"
        className={cn(
          base,
          // A saída é mais curta que a entrada (W5): o usuário já decidiu fechar.
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        asChild={asChild}
        {...props}
      >
        {children}
      </P.Content>
    </P.Portal>
  )
}
