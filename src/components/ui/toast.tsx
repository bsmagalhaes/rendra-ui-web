import { toast as sonner, Toaster as SonnerToaster } from 'sonner'
import type { FeedbackType } from '@/brand/types'
import { useBrand } from '@/brand/use-brand'
import { BrandFeedbackIcon } from '@/components/ui/brand-feedback-icon'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/cn'

/*
 * Toast único (Sonner), com o ícone de feedback da marca e o formato do template.
 * Uso: toast.success('Cliente salvo', { description: '...' }), toast.error(...), etc.
 * Coloque <Toaster /> uma vez na raiz da aplicação.
 */

const tone: Record<FeedbackType, string> = {
  success: 'border-success/25',
  error: 'border-destructive/25',
  warning: 'border-warning/25',
  info: 'border-info/25',
}

interface ToastOptions {
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

function show(type: FeedbackType, title: string, opts: ToastOptions = {}) {
  return sonner.custom(
    (id) => (
      <div
        role={type === 'error' ? 'alert' : 'status'}
        data-rendra="TST-001"
        className={cn(
          'flex w-full items-start gap-3 rounded-control border bg-popover p-4 text-popover-foreground shadow-lg',
          tone[type],
        )}
      >
        <BrandFeedbackIcon type={type} size="lg" animated className="mt-px" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold wrap-break-word">{title}</p>
          {opts.description && (
            <p className="text-sm wrap-break-word text-muted-foreground">{opts.description}</p>
          )}
        </div>
        {opts.action && (
          <button
            type="button"
            onClick={() => {
              opts.action?.onClick()
              sonner.dismiss(id)
            }}
            className="-my-1 flex min-h-touch shrink-0 cursor-pointer items-center rounded-item px-2 text-sm font-semibold text-primary-text hover:bg-accent md:min-h-0 md:py-1"
          >
            {opts.action.label}
          </button>
        )}
      </div>
    ),
    { duration: opts.duration ?? (type === 'error' ? 8000 : 4000) },
  )
}

export const toast = {
  success: (title: string, opts?: ToastOptions) => show('success', title, opts),
  error: (title: string, opts?: ToastOptions) => show('error', title, opts),
  warning: (title: string, opts?: ToastOptions) => show('warning', title, opts),
  info: (title: string, opts?: ToastOptions) => show('info', title, opts),
  dismiss: sonner.dismiss,
}

/** Posição: embaixo no centro no mobile (perto do polegar), canto inferior direito no desktop. */
export function Toaster() {
  const { isMobile } = useBreakpoint()
  const { resolvedMode } = useBrand()
  return (
    <SonnerToaster
      position={isMobile ? 'bottom-center' : 'bottom-right'}
      theme={resolvedMode}
      offset={16}
      mobileOffset={{ bottom: 88, left: 16, right: 16 }}
      visibleToasts={3}
      toastOptions={{ unstyled: true, className: 'w-full' }}
    />
  )
}
