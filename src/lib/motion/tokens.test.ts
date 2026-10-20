// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { EASE, DURATION, REVEAL, SPRING, readMotionTokens } from './tokens'

const css = readFileSync('src/styles/globals.css', 'utf8')

/** Valor de uma variável CSS declarada em globals.css. */
const declared = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim() ?? null

describe('tokens de duração em globals.css', () => {
  it.each([
    ['--rendra-duration-fast', '120ms'],
    ['--rendra-duration-base', '200ms'],
    ['--rendra-duration-slow', '320ms'],
    ['--rendra-duration-draw', '420ms'],
  ])('declara %s: %s', (name, value) => {
    expect(declared(name)).toBe(value)
  })

  it('as durações ficam num bloco :root fora do @theme e de qualquer camada (vão para o dist/tokens.css)', () => {
    const block = /:root,\s*\[data-rendra-root\]\s*\{([^}]*--rendra-duration-fast[^}]*)\}/.exec(css)
    expect(block).not.toBeNull()
    const before = css.slice(0, block!.index)
    const opens = (before.match(/\{/g) ?? []).length
    const closes = (before.match(/\}/g) ?? []).length
    // nível 0: o bloco não está dentro de @theme nem de @layer
    expect(opens - closes).toBe(0)
  })

  it('não cria duração sem o prefixo do Rendra (--duration-*)', () => {
    expect(css).not.toMatch(/--duration-/)
  })
})

describe('linguagem única de movimento (Passo 2): novos tokens, aditivos', () => {
  it.each([
    ['--rendra-duration-press', '120ms'],
    ['--rendra-duration-hover', '150ms'],
    ['--rendra-duration-move', '250ms'],
    ['--rendra-duration-pulse', '1000ms'],
  ])('declara a duração %s: %s', (name, value) => {
    expect(declared(name)).toBe(value)
  })

  it.each([
    ['--rendra-ease-out', 'cubic-bezier(0.22, 1, 0.36, 1)'],
    ['--rendra-ease-in-out', 'cubic-bezier(0.65, 0, 0.35, 1)'],
    ['--rendra-ease-spring', 'cubic-bezier(0.34, 1.56, 0.64, 1)'],
    ['--rendra-ease-move', 'cubic-bezier(0.77, 0, 0.175, 1)'],
    ['--rendra-ease-drawer', 'cubic-bezier(0.32, 0.72, 0, 1)'],
  ])('as curvas moram em :root (o host as sobrescreve): %s = %s', (name, value) => {
    expect(declared(name)).toBe(value)
  })

  it('as curvas --rendra-ease-* estão no mesmo bloco :root fora de @theme e de camada', () => {
    const block = /:root,\s*\[data-rendra-root\]\s*\{([^}]*--rendra-ease-move[^}]*)\}/.exec(css)
    expect(block).not.toBeNull()
    const before = css.slice(0, block!.index)
    expect((before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length).toBe(0)
  })

  it('o @theme guarda os nomes antigos como alias e cria ease-move e ease-drawer para o Tailwind', () => {
    expect(declared('--ease-out')).toBe('var(--rendra-ease-out)')
    expect(declared('--ease-in-out')).toBe('var(--rendra-ease-in-out)')
    expect(declared('--ease-spring')).toBe('var(--rendra-ease-spring)')
    expect(declared('--ease-move')).toBe('var(--rendra-ease-move)')
    expect(declared('--ease-drawer')).toBe('var(--rendra-ease-drawer)')
  })

  it('--ease-in-out não muda de valor (R4: o tremor do erro continua o mesmo)', () => {
    expect(EASE.inOut).toEqual([0.65, 0, 0.35, 1])
    expect(declared('--rendra-ease-in-out')).toBe('cubic-bezier(0.65, 0, 0.35, 1)')
  })

  it('a reserva em TS tem as cinco curvas e as molas', () => {
    expect(EASE.move).toEqual([0.77, 0, 0.175, 1])
    expect(EASE.drawer).toEqual([0.32, 0.72, 0, 1])
    expect(EASE.spring).toEqual([0.34, 1.56, 0.64, 1])
    expect(SPRING.settle).toEqual({ duration: 0.4, bounce: 0 })
    expect(SPRING.sheet).toEqual({ duration: 0.3, bounce: 0.2 })
  })

  it('o host sobrescreve uma curva no documento e readMotionTokens a lê', () => {
    const el = document.documentElement
    el.style.setProperty('--rendra-ease-move', 'cubic-bezier(0.1, 0.2, 0.3, 0.4)')
    try {
      expect(readMotionTokens().ease.move).toEqual([0.1, 0.2, 0.3, 0.4])
      expect(readMotionTokens().ease.out).toEqual(EASE.out)
    } finally {
      el.style.removeProperty('--rendra-ease-move')
    }
  })

  it('curva inválida no documento cai na reserva', () => {
    const el = document.documentElement
    el.style.setProperty('--rendra-ease-drawer', 'ease-in')
    try {
      expect(readMotionTokens().ease.drawer).toEqual(EASE.drawer)
    } finally {
      el.style.removeProperty('--rendra-ease-drawer')
    }
  })
})

describe('tokens de reveal em globals.css (entrada de uso único, mais lenta que as interações)', () => {
  it.each([
    ['--rendra-reveal-enter', '600ms'],
    ['--rendra-reveal-stagger', '120ms'],
    ['--rendra-reveal-count', '1200ms'],
    ['--rendra-reveal-draw', '900ms'],
  ])('declara %s: %s', (name, value) => {
    expect(declared(name)).toBe(value)
  })

  it('a reserva em segundos é a do dono: 0,6, 0,12, 1,2 e 0,9', () => {
    expect(REVEAL).toEqual({ enter: 0.6, stagger: 0.12, count: 1.2, draw: 0.9 })
  })

  it('lê as variáveis do documento e cai na reserva quando faltam', () => {
    const el = document.documentElement
    expect(readMotionTokens().reveal).toEqual(REVEAL)
    el.style.setProperty('--rendra-reveal-enter', '800ms')
    try {
      expect(readMotionTokens().reveal.enter).toBeCloseTo(0.8)
      expect(readMotionTokens().reveal.count).toBe(REVEAL.count)
    } finally {
      el.style.removeProperty('--rendra-reveal-enter')
    }
  })

  it('as durações do dia a dia não mudaram e ganharam press, hover e move (aditivo)', () => {
    expect(DURATION).toEqual({
      press: 0.12,
      hover: 0.15,
      fast: 0.12,
      base: 0.2,
      move: 0.25,
      slow: 0.32,
      draw: 0.42,
      pulse: 1,
    })
  })
})

describe('readMotionTokens', () => {
  afterEach(() => {
    const el = document.documentElement
    for (const n of ['fast', 'base', 'slow', 'draw', 'press', 'hover', 'move', 'pulse'])
      el.style.removeProperty(`--rendra-duration-${n}`)
  })

  it('lê as durações do documento e converte ms e s em segundos', () => {
    const el = document.documentElement
    el.style.setProperty('--rendra-duration-fast', '100ms')
    el.style.setProperty('--rendra-duration-base', '0.25s')
    const t = readMotionTokens()
    expect(t.duration.fast).toBeCloseTo(0.1)
    expect(t.duration.base).toBeCloseTo(0.25)
    // as que não foram postas caem na reserva
    expect(t.duration.slow).toBe(DURATION.slow)
  })

  it('sem variáveis, devolve a reserva', () => {
    expect(readMotionTokens().duration).toEqual(DURATION)
    expect(readMotionTokens().ease).toEqual(EASE)
  })

  it('a reserva é igual ao que globals.css declara (evita divergência)', () => {
    const seconds = (v: string | null) =>
      v!.endsWith('ms') ? parseFloat(v!) / 1000 : parseFloat(v!)
    expect(DURATION.fast).toBeCloseTo(seconds(declared('--rendra-duration-fast')))
    expect(DURATION.base).toBeCloseTo(seconds(declared('--rendra-duration-base')))
    expect(DURATION.slow).toBeCloseTo(seconds(declared('--rendra-duration-slow')))
    expect(DURATION.draw).toBeCloseTo(seconds(declared('--rendra-duration-draw')))
    expect(DURATION.press).toBeCloseTo(seconds(declared('--rendra-duration-press')))
    expect(DURATION.hover).toBeCloseTo(seconds(declared('--rendra-duration-hover')))
    expect(DURATION.move).toBeCloseTo(seconds(declared('--rendra-duration-move')))
    expect(DURATION.pulse).toBeCloseTo(seconds(declared('--rendra-duration-pulse')))
    const bezier = (v: string | null) =>
      /cubic-bezier\(([^)]+)\)/
        .exec(v!)![1]!
        .split(',')
        .map((n) => parseFloat(n))
    expect(EASE.out).toEqual(bezier(declared('--rendra-ease-out')))
    expect(EASE.inOut).toEqual(bezier(declared('--rendra-ease-in-out')))
    expect(EASE.spring).toEqual(bezier(declared('--rendra-ease-spring')))
    expect(EASE.move).toEqual(bezier(declared('--rendra-ease-move')))
    expect(EASE.drawer).toEqual(bezier(declared('--rendra-ease-drawer')))
  })
})

describe('readMotionTokens sem window', () => {
  it('não lança e devolve a reserva', async () => {
    const win = globalThis.window
    // @ts-expect-error simula o servidor
    delete globalThis.window
    try {
      expect(readMotionTokens().duration).toEqual(DURATION)
    } finally {
      globalThis.window = win
    }
  })
})
