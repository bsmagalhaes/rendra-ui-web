/*
 * Durações e curvas do motion (linguagem única, web e app). A fonte é o globals.css:
 *   --rendra-duration-*  bloco :root fora de camada (vai para o dist/tokens.css do pacote);
 *   --rendra-ease-*      no mesmo bloco, então o host as sobrescreve; o @theme guarda os nomes
 *                        do Tailwind (--ease-out, --ease-move...) como alias delas.
 * As constantes daqui são a reserva em tempo de execução (SSR, variável ausente ou inválida), e
 * tokens.test.ts confere que elas batem com o globals.css. Valores em segundos e vetores de 4
 * números, o formato que o Motion aceita.
 */

export type Bezier = [number, number, number, number]

/**
 * Reserva das durações, em segundos (SSR, ou variável ausente).
 * `press` e `fast` valem o mesmo (120 ms) com propósitos diferentes: o toque e a saída de overlay.
 */
export const DURATION = {
  press: 0.12,
  hover: 0.15,
  fast: 0.12,
  base: 0.2,
  move: 0.25,
  slow: 0.32,
  draw: 0.42,
  pulse: 1,
}
export type DurationName = keyof typeof DURATION

/**
 * Reveal: entrada de uso único (dashboard: bloco, cascata, contador e desenho do gráfico), mais
 * lenta que as interações do dia a dia. Reserva em segundos (SSR, ou variável ausente).
 */
export const REVEAL = { enter: 0.6, stagger: 0.12, count: 1.2, draw: 0.9 }
export type RevealName = keyof typeof REVEAL

/**
 * Curvas do globals.css (`--rendra-ease-*`). `spring` é a curva "back" (quique): só para a cota
 * rara de encanto. `move` desloca na tela; `drawer` é a curva de gaveta e folha.
 */
export const EASE: Record<'out' | 'inOut' | 'spring' | 'move' | 'drawer', Bezier> = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
  move: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
}
export type EaseName = keyof typeof EASE

/** Nome da variável CSS de cada curva (`inOut` vira `in-out`). */
const EASE_VAR: Record<EaseName, string> = {
  out: 'out',
  inOut: 'in-out',
  spring: 'spring',
  move: 'move',
  drawer: 'drawer',
}

/**
 * Molas no formato "duração e quique" (Motion). `settle` assenta sem passar do ponto (layout,
 * overlay que entra, soltura do arraste); `sheet` é a folha depois do gesto, com quique mínimo.
 * Mola não é variável CSS: mora aqui, e o app a espelha em `dampingRatio`.
 */
export const SPRING = {
  settle: { duration: 0.4, bounce: 0 },
  sheet: { duration: 0.3, bounce: 0.2 },
}

/** Escalas da linguagem: entrada de overlay, tooltip, ponto pequeno, toque, pop e salto curto. */
export const SCALE = { enter: 0.95, tooltip: 0.97, small: 0.9, press: 0.97, pop: 0.8, bump: 1.08 }

/** Desfoque (px) que disfarça o cruzamento entre dois estados (troca de passo). Abaixo de 20. */
export const BLUR = 2

export interface MotionTokens {
  duration: Record<DurationName, number>
  reveal: Record<RevealName, number>
  ease: Record<EaseName, Bezier>
}

function toSeconds(value: string): number | null {
  const v = value.trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return null
  if (v.endsWith('ms')) return n / 1000
  if (v.endsWith('s')) return n
  return null
}

/** `cubic-bezier(a, b, c, d)` em vetor; qualquer outra coisa (`ease-in`, vazio) vira `null`. */
function toBezier(value: string): Bezier | null {
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(value.trim())
  if (!m) return null
  const parts = m[1]!.split(',').map((n) => parseFloat(n))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  return parts as Bezier
}

/** Lê as durações e as curvas do documento; o que faltar (ou sem window) vem da reserva. */
export function readMotionTokens(): MotionTokens {
  const duration = { ...DURATION }
  const reveal = { ...REVEAL }
  const ease = { ...EASE }
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
    for (const name of Object.keys(EASE) as EaseName[]) {
      const read = toBezier(style.getPropertyValue(`--rendra-ease-${EASE_VAR[name]}`))
      if (read !== null) ease[name] = read
    }
  }
  return { duration, reveal, ease }
}
