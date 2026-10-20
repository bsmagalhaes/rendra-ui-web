import { X } from 'lucide-react'
import { AnimatePresence, animate, m, useDragControls } from 'motion/react'
import { Dialog, Popover } from 'radix-ui'
import { useRef, type ReactNode } from 'react'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/cn'
import { useLayoutReady, useMotionMode, useMotionPresets } from '@/lib/motion'

/*
 * Painel de escolha usado por Select e DatePicker (não é para uso direto nas telas).
 * Desktop: popover ancorado no campo, na largura dele.
 * Mobile (< 768px): o mesmo conteúdo reconstruído como bottom sheet, com título,
 * área rolável e rodapé fixo que respeita a área segura do aparelho.
 */

interface PickerPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** O gatilho (renderizado com asChild). */
  trigger: ReactNode
  /** Título do bottom sheet no mobile (normalmente o rótulo do campo). */
  title: string
  /** Topo fixo (ex.: campo de busca). */
  header?: ReactNode
  children: ReactNode
  /** Rodapé fixo (ex.: Limpar / Aplicar). */
  footer?: ReactNode
  /** Largura no desktop: do gatilho ou automática (calendário). */
  width?: 'trigger' | 'auto'
  /**
   * Botão sobreposto ao gatilho (ex.: limpar). Fica como irmão do gatilho, nunca dentro
   * dele: botão dentro de botão é HTML inválido e confunde leitores de tela.
   */
  adornment?: ReactNode
  align?: 'start' | 'center' | 'end'
}

/** A folha fecha se o arraste passou de 40% da altura ou se foi um arremesso (> 0,11 px/ms). */
const DISMISS_FRACTION = 0.4
const DISMISS_VELOCITY = 110

interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  adornment?: ReactNode
  /** Alça e título: a única área que começa o arraste (o resto rola). */
  head: ReactNode
  /** Busca, lista e rodapé. */
  rest: ReactNode
}

/**
 * A folha do celular em `on`: entra de baixo, acompanha o dedo (arraste vertical pela alça, com
 * fricção ao puxar para cima), fecha por distância ou por arremesso e, se o dedo solta antes
 * disso, volta à origem com a mola da folha (a velocidade do dedo entra na mola, sem costura). O
 * fundo escurecido acompanha a distância. Só a alça arrasta: o corpo rola sem disputar o gesto.
 * Nenhum valor passa por `style`: o Motion guarda a posição do arraste, e o escurecimento do
 * fundo é gravado direto no elemento (sem render por quadro).
 */
function MobileSheet({ open, onOpenChange, trigger, adornment, head, rest }: MobileSheetProps) {
  const presets = useMotionPresets()
  const ready = useLayoutReady()
  const controls = useDragControls()
  const sheetRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  const height = useRef(1)
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Anchor adornment={adornment}>
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      </Anchor>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount key="sheet">
            <Dialog.Overlay forceMount asChild>
              <m.div className="fixed inset-0 z-40" {...presets.fade}>
                <div ref={dimRef} className="absolute inset-0 bg-overlay" />
              </m.div>
            </Dialog.Overlay>
            <Dialog.Content
              forceMount
              asChild
              aria-describedby={undefined}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-sheet flex-col rounded-t-surface border-t bg-popover text-popover-foreground shadow-lg outline-none"
            >
              <m.div
                ref={sheetRef}
                {...presets.sheet('bottom')}
                drag={ready ? 'y' : false}
                dragControls={controls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0.2, bottom: 0 }}
                dragSnapToOrigin
                dragTransition={presets.sheetBounce}
                onDragStart={() => {
                  height.current = sheetRef.current?.offsetHeight || 1
                }}
                onDrag={(_, info) => {
                  const dim = dimRef.current
                  if (dim)
                    dim.style.opacity = String(
                      1 - Math.min(1, Math.max(0, info.offset.y / height.current)),
                    )
                }}
                onDragEnd={(_, info) => {
                  if (
                    info.offset.y > height.current * DISMISS_FRACTION ||
                    info.velocity.y > DISMISS_VELOCITY
                  ) {
                    onOpenChange(false)
                    return
                  }
                  // Soltou antes: o fundo volta a escurecer por inteiro junto com a folha.
                  if (dimRef.current) animate(dimRef.current, { opacity: 1 }, presets.springSheet)
                }}
              >
                <div
                  data-sheet-handle
                  onPointerDown={(e) => controls.start(e)}
                  className="touch-none"
                >
                  {head}
                </div>
                {rest}
              </m.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function Anchor({ adornment, children }: { adornment?: ReactNode; children: ReactNode }) {
  if (!adornment) return children
  return (
    <div className="relative w-full min-w-0">
      {children}
      {adornment}
    </div>
  )
}

export function PickerPanel({
  open,
  onOpenChange,
  trigger,
  title,
  header,
  children,
  footer,
  width = 'trigger',
  adornment,
  align = 'start',
}: PickerPanelProps) {
  const { isMobile } = useBreakpoint()
  const motion = useMotionMode()
  const presets = useMotionPresets()
  const on = motion === 'on'

  // Conteúdo interno do sheet (mobile) e do painel (desktop), igual nos dois modos. A alça e o
  // título ficam à parte porque, em `on`, só eles começam o arraste da folha.
  const sheetHead = (
    <>
      <div className="flex shrink-0 flex-col items-center pt-2">
        <span aria-hidden className="h-1 w-12 rounded-full bg-border" />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 pr-2 pl-4">
        <Dialog.Title className="truncate text-base font-semibold">{title}</Dialog.Title>
        <Dialog.Close
          aria-label="Fechar"
          className="flex size-touch items-center justify-center rounded-item text-muted-foreground hover:bg-accent"
        >
          <X className="size-icon-md" aria-hidden />
        </Dialog.Close>
      </div>
    </>
  )
  const sheetRest = (
    <>
      {header && <div className="shrink-0 border-b px-4 pb-3">{header}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">{children}</div>
      {footer && <div className="shrink-0 border-t px-4 pt-3 pb-safe">{footer}</div>}
    </>
  )
  const sheetBody = (
    <>
      {sheetHead}
      {sheetRest}
    </>
  )
  // O painel nasce do campo, não do centro (W6): a origem vem do Radix (é um Popover).
  const panelCls = cn(
    'z-50 flex max-h-command origin-(--radix-popover-content-transform-origin) flex-col overflow-hidden rounded-surface border bg-popover text-popover-foreground shadow-md outline-none',
    width === 'trigger' ? 'w-trigger max-w-popover' : 'w-auto max-w-popover md:max-w-none',
  )
  const panelBody = (
    <>
      {header && <div className="shrink-0 border-b p-2">{header}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">{children}</div>
      {footer && <div className="shrink-0 border-t p-2">{footer}</div>}
    </>
  )

  if (on && isMobile) {
    return (
      <MobileSheet
        open={open}
        onOpenChange={onOpenChange}
        trigger={trigger}
        adornment={adornment}
        head={sheetHead}
        rest={sheetRest}
      />
    )
  }

  if (on) {
    return (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Anchor adornment={adornment}>
          <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        </Anchor>
        <AnimatePresence>
          {open && (
            <Popover.Portal forceMount key="panel">
              <Popover.Content
                forceMount
                asChild
                align={align}
                sideOffset={6}
                collisionPadding={16}
                className={panelCls}
              >
                <m.div {...presets.open()}>{panelBody}</m.div>
              </Popover.Content>
            </Popover.Portal>
          )}
        </AnimatePresence>
      </Popover.Root>
    )
  }

  if (isMobile) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Anchor adornment={adornment}>
          <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        </Anchor>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-sheet flex-col rounded-t-surface border-t bg-popover text-popover-foreground shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
          >
            {sheetBody}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Anchor adornment={adornment}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      </Anchor>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={16}
          className={cn(
            'z-50 flex max-h-command origin-(--radix-popover-content-transform-origin) flex-col overflow-hidden rounded-surface border bg-popover text-popover-foreground shadow-md outline-none',
            'data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            width === 'trigger' ? 'w-trigger max-w-popover' : 'w-auto max-w-popover md:max-w-none',
          )}
        >
          {panelBody}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
