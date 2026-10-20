import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * Estrutura interna de Drawer e Modal (não usar direto nas telas):
 * header fixo (ícone, título, descrição, fechar), body como única área rolável
 * e footer fixo com borda superior, respeitando a área segura do aparelho.
 */

interface OverlayShellProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Esconde o header visualmente (o título continua para leitores de tela). */
  hideHeader?: boolean
  onRequestClose: () => void
  bodyClassName?: string
}

export function OverlayShell({
  title,
  description,
  icon,
  children,
  footer,
  hideHeader,
  onRequestClose,
  bodyClassName,
}: OverlayShellProps) {
  const closeButton = (
    <button
      type="button"
      onClick={onRequestClose}
      aria-label="Fechar"
      className={cn(
        '-mt-1 -mr-2 flex size-touch shrink-0 cursor-pointer items-center justify-center rounded-item text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:size-control-md',
        // Sem cabeçalho visível, o botão sai do header oculto e fica invisível (sem clip, para
        // receber clique e foco), aparecendo só com foco de teclado.
        hideHeader &&
          'pointer-events-auto m-0 cursor-default opacity-0 focus-visible:cursor-pointer focus-visible:opacity-100',
      )}
    >
      <X className="size-icon-md" aria-hidden />
    </button>
  )

  return (
    <>
      {hideHeader && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end px-2 pt-safe md:px-4 md:pt-4">
          {closeButton}
        </div>
      )}
      <header
        className={cn(
          'flex shrink-0 items-start gap-3 border-b px-4 pt-safe pb-4 md:px-6 md:pt-6',
          hideHeader && 'sr-only',
        )}
      >
        {icon && (
          <span
            aria-hidden
            className="flex size-control-md shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-soft-foreground [&_svg]:size-icon-md"
          >
            {icon}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <Dialog.Title className="text-lg font-semibold wrap-break-word">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="text-sm wrap-break-word text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
        </div>
        {!hideHeader && closeButton}
      </header>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-6',
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer && (
        <footer className="shrink-0 border-t bg-card px-4 pt-4 pb-safe md:px-6 md:pb-6">
          {footer}
        </footer>
      )}
    </>
  )
}
