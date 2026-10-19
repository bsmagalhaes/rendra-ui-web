import type { ReactNode } from 'react'

/*
 * Contador do StatCard: lê o `value` (número, ou texto com número em pt-BR, como
 * "R$ 1.234,50", "98%" ou "12,5 mil"), preserva prefixo, sufixo, casas decimais e agrupamento,
 * e reescreve o número durante a contagem. O que não for número devolve null (só aparece, sem
 * contar). No fim da contagem o texto é exatamente o `value` original.
 */

export interface ParsedNumber {
  /** Tudo antes do número (inclui o sinal de menos). */
  prefix: string
  /** Tudo depois do número. */
  suffix: string
  /** Valor numérico (sem sinal no `prefix`: o sinal já está aqui). */
  value: number
  decimals: number
  /** Separador de milhar "." (texto pt-BR que o usava). */
  grouping: boolean
  /** Separador decimal: "," no texto pt-BR, "." no número do JavaScript. */
  decimalSeparator: ',' | '.'
}

// prefixo sem dígito nem sinal, sinal opcional, inteiro (com milhar "." ou sem), decimais, sufixo sem dígito.
const PT_BR = /^([^\d-]*)(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?([^\d]*)$/

export function parseLocaleNumber(value: ReactNode): ParsedNumber | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const text = String(Math.abs(value))
    if (/e/i.test(text)) return null
    const decimals = text.includes('.') ? text.split('.')[1]!.length : 0
    return {
      prefix: value < 0 ? '-' : '',
      suffix: '',
      value: Math.abs(value),
      decimals,
      grouping: false,
      decimalSeparator: '.',
    }
  }
  if (typeof value !== 'string') return null
  const match = PT_BR.exec(value)
  if (!match) return null
  const [, prefix = '', sign = '', integer = '', fraction = '', suffix = ''] = match
  const grouping = integer.includes('.')
  const n = Number(`${integer.replace(/\./g, '')}${fraction ? `.${fraction}` : ''}`)
  if (!Number.isFinite(n)) return null
  return {
    prefix: `${prefix}${sign}`,
    suffix,
    value: n,
    decimals: fraction.length,
    grouping,
    decimalSeparator: ',',
  }
}

/** Escreve `n` com o mesmo formato do valor original. */
export function formatLike(parsed: ParsedNumber, n: number): string {
  const [int = '0', frac = ''] = Math.abs(n).toFixed(parsed.decimals).split('.')
  const grouped = parsed.grouping ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int
  const number = frac ? `${grouped}${parsed.decimalSeparator}${frac}` : grouped
  return `${parsed.prefix}${number}${parsed.suffix}`
}
