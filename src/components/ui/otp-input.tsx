import {
  useRef,
  type ClipboardEvent,
  type CSSProperties,
  type ElementType,
  type KeyboardEvent,
} from 'react'
import { cn } from '@/lib/cn'
import { useMotionLib, useMotionPresets } from '@/lib/motion'

export interface OtpInputProps {
  /** Quantidade de dígitos. Padrão 6. */
  length?: number
  value: string
  onChange: (value: string) => void
  /** Chamado quando todos os dígitos foram preenchidos. */
  onComplete?: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  id?: string
  'aria-describedby'?: string
}

/**
 * Código de verificação (2FA, confirmação de e-mail). Uma caixa por dígito, aceita colar
 * o código inteiro, teclado numérico no celular e preenchimento automático por SMS.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  id,
  ...aria
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const lib = useMotionLib()
  const on = lib !== null
  const presets = useMotionPresets()
  // Em `on` a célula que recebe um dígito faz um salto curto de escala.
  const Cell: ElementType = on ? lib.m.input : 'input'
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus()
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    set(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div
      id={id}
      role="group"
      aria-label="Código de verificação"
      aria-describedby={aria['aria-describedby']}
      data-rendra="OTP-001"
      // gap-1 no celular: 6 casas com 44px de toque mesmo dentro de um card em 360px.
      className="grid w-full max-w-sm grid-cols-otp gap-1 sm:gap-2"
      style={{ '--otp': length } as CSSProperties}
    >
      {digits.map((d, i) => (
        <Cell
          key={i}
          {...(on ? { animate: d ? presets.bump : undefined } : {})}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Dígito ${i + 1} de ${length}`}
          aria-invalid={invalid || undefined}
          onPaste={onPaste}
          onKeyDown={(e) => onKey(i, e)}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1)
            const arr = digits.slice()
            arr[i] = ch
            set(arr.join(''))
            if (ch && i < length - 1) refs.current[i + 1]?.focus()
          }}
          className={cn(
            'h-control-lg w-full min-w-0 rounded-control border border-input bg-field text-center text-xl font-semibold tabular-nums transition-[border-color,box-shadow] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:opacity-60',
            d && 'border-primary',
            invalid && 'border-destructive focus:border-destructive focus:ring-destructive/25',
          )}
        />
      ))}
    </div>
  )
}
