/*
 * Durações e curvas do motion. A fonte é o globals.css:
 *   --rendra-duration-*  bloco :root fora de camada (vai para o dist/tokens.css do pacote);
 *   --ease-*             no @theme (o build do pacote inlineia, então no host a curva não existe
 *                        como variável: as constantes de reserva daqui são a fonte em tempo de
 *                        execução, e tokens.test.ts confere que elas batem com o globals.css).
 * Valores em segundos e vetores de 4 números, o formato que o Motion aceita.
 */

export type Bezier = [number, number, number, number]

/** Reserva das durações, em segundos (SSR, ou variável ausente). */
export const DURATION = { fast: 0.12, base: 0.2, slow: 0.32, draw: 0.42 }
export type DurationName = keyof typeof DURATION

/**
 * Reveal: entrada de uso único (dashboard: bloco, cascata, contador e desenho do gráfico), mais
 * lenta que as interações do dia a dia. Reserva em segundos (SSR, ou variável ausente).
 */
export const REVEAL = { enter: 0.6, stagger: 0.12, count: 1.2, draw: 0.9 }
export type RevealName = keyof typeof REVEAL

/** Curvas do globals.css (`--ease-out`, `--ease-in-out`, `--ease-spring`). */
export const EASE: Record<'out' | 'inOut' | 'spring', Bezier> = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
}

export interface MotionTokens {
  duration: Record<DurationName, number>
  reveal: Record<RevealName, number>
  ease: Record<keyof typeof EASE, Bezier>
}

function toSeconds(value: string): number | null {
  const v = value.trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return null
  if (v.endsWith('ms')) return n / 1000
  if (v.endsWith('s')) return n
  return null
}

/** Lê as durações do documento; o que faltar (ou sem window) vem da reserva. */
export function readMotionTokens(): MotionTokens {
  const duration = { ...DURATION }
  const reveal = { ...REVEAL }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const style = getComputedStyle(document.documentElement)
    for (const name of Object.keys(DURATION) as DurationName[]) {
      const read = toSeconds(style.getPropertyValue(`--rendra-duration-${name}`))
      if (read !== null) duration[name] = read
    }
    for (const name of Object.keys(REVEAL) as RevealName[]) {
      const read = toSeconds(style.getPropertyValue(`--rendra-reveal-${name}`))
      if (read !== null) reveal[name] = read
    }
  }
  return { duration, reveal, ease: EASE }
}
