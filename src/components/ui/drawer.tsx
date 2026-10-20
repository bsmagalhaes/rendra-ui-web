import { AnimatePresence, m } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'
import { OverlayShell } from './overlay-shell'

/*
 * Drawer único, componente central do sistema. Desliza da direita para a esquerda.
 * Para formulários e detalhes de volume médio (até ~12 campos).
 *   Header fixo: ícone, título, descrição e fechar.
 *   Body: única área com rolagem.
 *   Footer fixo: ações (use <ActionBar>), com borda superior.
 * Mobile: tela inteira (100dvh), footer acima da área segura e do teclado.
 * Fecha por Esc e clique fora; com dirty, pede confirmação antes.
 */

/*
 * Largura no desktop, em porcentagem da tela: 30 (padrão), 40, 50 ou 75. Nunca menos que
 * 28rem (para caber o formulário em telas médias); no celular, sempre tela inteira.
 * sm, md, lg e xl são os nomes antigos e valem 30, 30, 50 e 75.
 */
const sizes = {
  '30': 'md:w-sheet-30',
  '40': 'md:w-sheet-40',
  '50': 'md:w-sheet-50',
  '75': 'md:w-sheet-75',
  full: 'md:w-full',
  sm: 'md:w-sheet-30',
  md: 'md:w-sheet-30',
  lg: 'md:w-sheet-50',
  xl: 'md:w-sheet-75',
} as const

const overlayCls = 'fixed inset-0 z-50 bg-overlay'
const panelCls =
  'fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col bg-card text-card-foreground shadow-lg outline-none md:border-l'

export interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  size?: keyof typeof sizes
  children: ReactNode
  /** Rodapé fixo. Normalmente um <ActionBar>. */
  footer?: ReactNode
  /** Há alterações não salvas: fechar pede confirmação. */
  dirty?: boolean
  /** Textos da confirmação de descarte. */
  discardTitle?: string
  discardDescription?: string
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  icon,
  size = '30',
  children,
  footer,
  dirty,
  discardTitle = 'Descartar alterações?',
  discardDescription = 'As informações preenchidas neste painel serão perdidas.',
}: DrawerProps) {
  const [confirming, setConfirming] = useState(false)
  const requestClose = () => (dirty ? setConfirming(true) : onOpenChange(false))
  const motion = useMotionMode()
  const presets = useMotionPresets()

  const keepOpenIfDirty = (e: { preventDefault: () => void }) => {
    if (dirty) {
      e.preventDefault()
      setConfirming(true)
    }
  }
  const shell = (
    <OverlayShell
      title={title}
      description={description}
      icon={icon}
      footer={footer}
      onRequestClose={requestClose}
    >
      {children}
    </OverlayShell>
  )

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
        {motion === 'on' ? (
          // `on`: o painel só existe enquanto aberto ou saindo; o Radix fica com forceMount.
          <AnimatePresence>
            {open && (
              <Dialog.Portal forceMount key="drawer">
                <Dialog.Overlay forceMount asChild>
                  <m.div className={overlayCls} {...presets.fade} />
                </Dialog.Overlay>
                <Dialog.Content
                  forceMount
                  asChild
                  onEscapeKeyDown={keepOpenIfDirty}
                  onPointerDownOutside={keepOpenIfDirty}
                  data-rendra="GAV-001"
                  className={cn(panelCls, sizes[size])}
                >
                  <m.div {...presets.sheet('right')}>{shell}</m.div>
                </Dialog.Content>
              </Dialog.Portal>
            )}
          </AnimatePresence>
        ) : (
          <Dialog.Portal>
            <Dialog.Overlay
              className={cn(
                overlayCls,
                'data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
              )}
            />
            <Dialog.Content
              onEscapeKeyDown={keepOpenIfDirty}
              onPointerDownOutside={keepOpenIfDirty}
              data-rendra="GAV-001"
              className={cn(
                panelCls,
                'data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
                sizes[size],
              )}
            >
              {shell}
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </Dialog.Root>
      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        type="destructive"
        title={discardTitle}
        description={discardDescription}
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  )
}
