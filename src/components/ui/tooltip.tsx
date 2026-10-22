import { Tooltip as T } from 'radix-ui'
import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useMotionLib, useMotionOn, useMotionPresets } from '@/lib/motion'
import type { RendraMotion } from '@/lib/motion/motion-on'

/**
 * Tooltip: só para informação complementar, nunca essencial (não existe hover no toque).
 * Informação essencial vai em texto de ajuda visível ou em Popover acionado por toque.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <T.Provider delayDuration={300} skipDelayDuration={150}>
      {children}
    </T.Provider>
  )
}

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Desliga o tooltip sem mudar a árvore (ex.: sidebar expandida já mostra o rótulo). */
  disabled?: boolean
}

// O tooltip nasce do gatilho (W6). A origem vem do Radix.
const contentCls =
  'z-50 max-w-xs origin-(--radix-tooltip-content-transform-origin) wrap-break-word rounded-control bg-foreground px-3 py-2 text-xs font-medium text-background'

/**
 * O corpo animado do tooltip em `on`. O Radix entrega ao filho (asChild) o `data-state`, e é por
 * ele que se sabe se o tooltip abriu "instantâneo" (`instant-open`: o usuário já estava com outro
 * aberto, ou foi o foco do teclado). Nesse caso não anima: depois do primeiro, os outros abrem sem
 * atraso e sem animação, e a barra inteira parece mais rápida (W7).
 */
const TooltipBody = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<RendraMotion['m']['div']>>(
  function TooltipBody(props, ref) {
    const { m } = useMotionOn()
    const presets = useMotionPresets()
    const instant = (props as { 'data-state'?: string })['data-state'] === 'instant-open'
    return <m.div ref={ref} {...props} {...presets.tooltip(instant)} />
  },
)

export function Tooltip({ content, children, side = 'top', disabled }: TooltipProps) {
  const lib = useMotionLib()
  // Só em `on`: o estado aberto fica aqui para o conteúdo continuar montado durante a saída.
  // O Radix segue dono do atraso: `onOpenChange` só dispara depois do `delayDuration`.
  const [open, setOpen] = useState(false)
  if (disabled) return <>{children}</>
  if (lib) {
    return (
      <T.Root open={open} onOpenChange={setOpen}>
        <T.Trigger asChild>{children}</T.Trigger>
        <lib.AnimatePresence>
          {open && (
            <T.Portal forceMount key="tooltip">
              <T.Content
                forceMount
                asChild
                side={side}
                sideOffset={8}
                collisionPadding={16}
                data-rendra="TIP-001"
                className={contentCls}
              >
                <TooltipBody>{content}</TooltipBody>
              </T.Content>
            </T.Portal>
          )}
        </lib.AnimatePresence>
      </T.Root>
    )
  }
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={8}
          collisionPadding={16}
          data-rendra="TIP-001"
          className={cn(
            contentCls,
            // `instant-open` não anima; a saída é mais curta que a entrada (W5, W7).
            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:fade-out-0 data-[state=instant-open]:animate-none',
          )}
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
