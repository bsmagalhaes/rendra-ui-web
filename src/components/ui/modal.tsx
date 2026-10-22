import { Dialog } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { BrandFeedbackIcon } from '@/components/ui/brand-feedback-icon'
import { ActionBar } from '@/components/ui/action-bar'
import { cn } from '@/lib/cn'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useMotionLib, useMotionPresets } from '@/lib/motion'
import { OverlayShell } from './overlay-shell'

/*
 * Modal único. Só para confirmações, mensagens e formulários de até 3 campos simples.
 * Mais que isso vai em Drawer (até ~12 campos) ou em página inteira. Nunca modal dentro de modal.
 *   type confirm      pergunta com ícone de info e ação principal primária
 *   type destructive  ação irreversível: ícone de erro e ação principal destrutiva
 *   type info         só informa: um botão de largura total
 *   type form         até 3 campos no body, ações no rodapé
 */

export type ModalType = 'confirm' | 'destructive' | 'info' | 'form'

const sizes = { sm: 'md:max-w-sm', md: 'md:max-w-lg', lg: 'md:max-w-2xl' } as const

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  type?: ModalType
  size?: keyof typeof sizes
  /** Conteúdo do body (em form, os campos). */
  children?: ReactNode
  confirmLabel?: string
  /**
   * Rótulo do botão de cancelar. Em `confirm` e `destructive` o padrão é "Cancelar". Em `info`
   * não há botão de cancelar: o segundo botão só aparece quando `cancelLabel` é passado.
   */
  cancelLabel?: string
  /** Pode ser assíncrono: o botão mostra carregamento até terminar. */
  onConfirm?: () => void | Promise<void>
  /** id do <form> quando type="form" (o botão principal vira submit dele). */
  formId?: string
  /** Estado de envio controlado de fora (ex.: isSubmitting do React Hook Form). */
  loading?: boolean
}

// Classes do Tailwind do caminho `off`; em `on` o Motion anima e `tw-animate-css` sai.
const overlayCls = 'fixed inset-0 z-50 bg-overlay'
const overlayOffCls = cn(
  overlayCls,
  'data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
)
const contentCls = cn(
  // Mobile: tela inteira. Desktop: centralizado.
  'fixed inset-0 z-50 flex h-dvh flex-col bg-card text-card-foreground outline-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-sheet md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-surface md:border md:shadow-lg',
)

const feedback = { confirm: 'info', destructive: 'error', info: 'info' } as const

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  type = 'confirm',
  size = 'sm',
  children,
  confirmLabel = type === 'destructive' ? 'Excluir' : type === 'info' ? 'Entendi' : 'Confirmar',
  cancelLabel,
  onConfirm,
  formId,
  loading,
}: ModalProps) {
  const [busy, setBusy] = useState(false)
  const close = () => onOpenChange(false)
  const confirm = async () => {
    if (!onConfirm) return close()
    try {
      setBusy(true)
      await onConfirm()
      close()
    } finally {
      setBusy(false)
    }
  }
  const isForm = type === 'form'
  const lib = useMotionLib()
  const presets = useMotionPresets()
  const { isMobile } = useBreakpoint()

  // destructive tem o mesmo formato do confirm (só muda a cor): mesmo código, MOD-001.
  // O desvio fica explícito de propósito: sem ele, destructive só cairia em MOD-001
  // pelo fallback de resolveCatalogCode (o primeiro código do Modal no catálogo), ou
  // seja, dependeria da ordem das entradas em src/catalog/components.ts.
  const code = resolveCatalogCode('Modal', {
    type: type === 'destructive' ? 'confirm' : type,
  })
  const sizeCls = sizes[size]
  const shell = (
    <OverlayShell
      title={title}
      description={isForm ? description : undefined}
      hideHeader={!isForm}
      onRequestClose={close}
      bodyClassName={cn(!isForm && 'flex flex-col items-center justify-center gap-4 text-center')}
      footer={
        <ActionBar
          primary={{
            label: confirmLabel,
            destructive: type === 'destructive',
            loading: busy || loading,
            loadingLabel: `${confirmLabel}...`,
            type: isForm && formId ? 'submit' : 'button',
            form: isForm ? formId : undefined,
            onClick: isForm && formId ? undefined : confirm,
          }}
          cancel={
            type === 'info' && cancelLabel === undefined
              ? undefined
              : { label: cancelLabel ?? 'Cancelar', onClick: close }
          }
        />
      }
    >
      {!isForm && (
        <>
          <BrandFeedbackIcon type={feedback[type as keyof typeof feedback]} size="2xl" animated />
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold wrap-anywhere">{title}</p>
            {description && (
              <p className="text-sm wrap-anywhere text-muted-foreground">{description}</p>
            )}
          </div>
          {children}
        </>
      )}
      {isForm && <div className="flex flex-col gap-2">{children}</div>}
    </OverlayShell>
  )

  // `on`: o conteúdo só existe enquanto aberto ou saindo (AnimatePresence); o Radix fica com
  // forceMount e o `m.div` entra por asChild, preservando data-rendra e o foco do Dialog.
  if (lib) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <lib.AnimatePresence>
          {open && (
            <Dialog.Portal forceMount key="modal">
              <Dialog.Overlay forceMount asChild>
                <lib.m.div className={overlayCls} {...presets.fade} />
              </Dialog.Overlay>
              <Dialog.Content
                forceMount
                asChild
                data-rendra={code}
                className={cn(contentCls, sizeCls)}
              >
                {/* Em tela cheia (celular) a escala do centro perde o sentido: entra de baixo, 8 px. */}
                <lib.m.div {...presets.open(isMobile ? { y: 8 } : undefined)}>{shell}</lib.m.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </lib.AnimatePresence>
      </Dialog.Root>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayOffCls} />
        <Dialog.Content
          data-rendra={code}
          className={cn(
            contentCls,
            'data-[state=closed]:animate-out data-[state=closed]:duration-(--rendra-duration-fast) data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95',
            sizeCls,
          )}
        >
          {shell}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
