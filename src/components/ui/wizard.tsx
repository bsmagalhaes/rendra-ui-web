import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ActionBar } from '@/components/ui/action-bar'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/cn'

export interface WizardStep {
  id: string
  title: string
  description?: string
}

export type StepStatus = 'complete' | 'current' | 'pending' | 'error'

export interface StepperProps {
  steps: WizardStep[]
  /** Índice da etapa atual (0 é a primeira). */
  current: number
  /** Etapas com erro de validação (índices). */
  errors?: number[]
  orientation?: 'horizontal' | 'vertical'
  /** Permite voltar clicando em etapas concluídas. */
  onStepClick?: (index: number) => void
  className?: string
}

function statusOf(i: number, current: number, errors: number[]): StepStatus {
  if (errors.includes(i)) return 'error'
  if (i < current) return 'complete'
  if (i === current) return 'current'
  return 'pending'
}

const statusLabel: Record<StepStatus, string> = {
  complete: 'concluída',
  current: 'atual',
  pending: 'pendente',
  error: 'com erro',
}

/**
 * Indicador de etapas. Desktop: todas as etapas (horizontal ou vertical).
 * Mobile: reconstruído como "Etapa 2 de 5", barra de progresso e nome da etapa.
 */
export function Stepper({
  steps,
  current,
  errors = [],
  orientation = 'horizontal',
  onStepClick,
  className,
}: StepperProps) {
  const step = steps[current]
  return (
    <div data-rendra="WIZ-002" className={cn('min-w-0', className)}>
      {/* Mobile: indicador compacto */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            Etapa {current + 1} de {steps.length}
          </span>
          {errors.includes(current) && (
            <span className="text-xs font-medium text-destructive">Revise esta etapa</span>
          )}
        </div>
        <Progress
          value={((current + 1) / steps.length) * 100}
          size="sm"
          tone="brand"
          label="Progresso"
        />
        <p className="text-base font-semibold">{step?.title}</p>
      </div>

      {/* Desktop */}
      <ol
        className={cn(
          'hidden md:flex',
          orientation === 'horizontal' ? 'items-start gap-2' : 'flex-col gap-1',
        )}
      >
        {steps.map((s, i) => {
          const st = statusOf(i, current, errors)
          const clickable = onStepClick && st === 'complete'
          const circle = (
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums transition-colors',
                st === 'complete' && 'border-primary bg-primary text-primary-foreground',
                st === 'current' && 'border-primary bg-card text-primary-text',
                st === 'pending' && 'border-border bg-card text-muted-foreground',
                st === 'error' && 'border-destructive bg-destructive text-destructive-foreground',
              )}
            >
              {st === 'complete' ? (
                <Check className="size-icon-sm" strokeWidth={3} aria-hidden />
              ) : st === 'error' ? (
                <X className="size-icon-sm" strokeWidth={3} aria-hidden />
              ) : (
                i + 1
              )}
            </span>
          )
          const text = (
            <span className="flex min-w-0 flex-col gap-1 text-left">
              <span
                className={cn(
                  'text-sm font-medium',
                  st === 'pending' && 'text-muted-foreground',
                  st === 'error' && 'text-destructive',
                )}
              >
                {s.title}
              </span>
              {s.description && (
                <span className="text-xs text-muted-foreground">{s.description}</span>
              )}
            </span>
          )
          const inner = (
            <span className="flex items-start gap-3">
              {circle}
              <span className="pt-1">{text}</span>
            </span>
          )
          return (
            <li
              key={s.id}
              aria-current={st === 'current' ? 'step' : undefined}
              className={cn(
                'flex min-w-0',
                orientation === 'horizontal' ? 'flex-1 flex-col gap-3' : 'flex-col',
              )}
            >
              <div
                className={cn('flex items-center gap-2', orientation === 'horizontal' && 'w-full')}
              >
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick(i)}
                    className="cursor-pointer rounded-item text-left hover:opacity-80"
                  >
                    {inner}
                  </button>
                ) : (
                  inner
                )}
                <span className="sr-only">, {statusLabel[st]}</span>
                {orientation === 'horizontal' && i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'mt-4 h-px min-w-4 flex-1 self-start',
                      i < current ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
              {orientation === 'vertical' && i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn('ml-4 h-6 w-px', i < current ? 'bg-primary' : 'bg-border')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export interface WizardProps {
  steps: WizardStep[]
  /** Conteúdo de cada etapa, na mesma ordem. */
  children: ReactNode[]
  /** Valida a etapa antes de avançar. Retorne false para bloquear (e marcar erro). */
  onValidateStep?: (index: number) => boolean | Promise<boolean>
  onFinish?: () => void | Promise<void>
  onCancel?: () => void
  /** Rótulo do cancelar da primeira etapa (só aparece com `onCancel`). Padrão: "Cancelar". */
  cancelLabel?: string
  /** Rótulo do voltar das etapas seguintes. Padrão: "Voltar". */
  backLabel?: string
  /** Rótulo do avançar (todas as etapas menos a última). Padrão: "Avançar". */
  nextLabel?: string
  finishLabel?: string
  /**
   * Torna a etapa opcional: "Pular" aparece no menu "Mais ações" da barra de ações (nunca na
   * última etapa), avança **sem validar** e limpa o erro da etapa. Sem esta prop não há menu.
   */
  onSkip?: () => void
  /** Rótulo do item de pular. Padrão: "Pular". */
  skipLabel?: string
  orientation?: 'horizontal' | 'vertical'
  /** Botões no rodapé fixo da tela. Padrão: não, seguem junto do card do wizard. */
  stickyFooter?: boolean
}

/** Cadastro em etapas, com validação por etapa e rodapé Voltar / Avançar. */
export function Wizard({
  steps,
  children,
  onValidateStep,
  onFinish,
  onCancel,
  cancelLabel = 'Cancelar',
  backLabel = 'Voltar',
  nextLabel = 'Avançar',
  finishLabel = 'Concluir',
  onSkip,
  skipLabel = 'Pular',
  orientation = 'horizontal',
  stickyFooter = false,
}: WizardProps) {
  const [current, setCurrent] = useState(0)
  const [errors, setErrors] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const last = current === steps.length - 1

  const next = async () => {
    setBusy(true)
    try {
      const ok = onValidateStep ? await onValidateStep(current) : true
      if (!ok) {
        setErrors((e) => [...new Set([...e, current])])
        return
      }
      setErrors((e) => e.filter((x) => x !== current))
      if (last) await onFinish?.()
      else setCurrent((c) => c + 1)
    } finally {
      setBusy(false)
    }
  }

  // Pular não passa pela validação: a etapa opcional fica em branco de propósito.
  const skip = () => {
    setErrors((e) => e.filter((x) => x !== current))
    setCurrent((c) => c + 1)
    onSkip?.()
  }

  const body = <div className="flex min-w-0 flex-col gap-6">{children[current]}</div>

  return (
    <div
      data-rendra="WIZ-001"
      className={cn(
        'flex min-w-0 flex-col gap-8',
        orientation === 'vertical' && 'md:flex-row md:gap-12',
      )}
    >
      <Stepper
        steps={steps}
        current={current}
        errors={errors}
        orientation={orientation}
        onStepClick={setCurrent}
        className={cn(orientation === 'vertical' && 'md:w-3xs md:shrink-0')}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        {body}
        <ActionBar
          sticky={stickyFooter}
          cancel={
            current > 0
              ? { label: backLabel, icon: <ArrowLeft />, onClick: () => setCurrent((c) => c - 1) }
              : onCancel
                ? { label: cancelLabel, onClick: onCancel }
                : undefined
          }
          secondary={onSkip && !last ? [{ label: skipLabel, onClick: skip }] : undefined}
          primary={{
            label: last ? finishLabel : nextLabel,
            icon: last ? <Check /> : <ArrowRight />,
            onClick: next,
            loading: busy,
            loadingLabel: last ? 'Concluindo...' : 'Validando...',
          }}
        />
      </div>
    </div>
  )
}
