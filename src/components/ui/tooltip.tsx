import { AnimatePresence, m } from 'motion/react'
import { Tooltip as T } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

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

const contentCls =
  'z-50 max-w-xs rounded-control bg-foreground px-3 py-2 text-xs font-medium text-background'

export function Tooltip({ content, children, side = 'top', disabled }: TooltipProps) {
  const motion = useMotionMode()
  const presets = useMotionPresets()
  // Só em `on`: o estado aberto fica aqui para o conteúdo continuar montado durante a saída.
  // O Radix segue dono do atraso: `onOpenChange` só dispara depois do `delayDuration`.
  const [open, setOpen] = useState(false)
  if (disabled) return <>{children}</>
  if (motion === 'on') {
    return (
      <T.Root open={open} onOpenChange={setOpen}>
        <T.Trigger asChild>{children}</T.Trigger>
        <AnimatePresence>
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
                <m.div {...presets.scale}>{content}</m.div>
              </T.Content>
            </T.Portal>
          )}
        </AnimatePresence>
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
            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
