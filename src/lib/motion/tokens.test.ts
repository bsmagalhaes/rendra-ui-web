// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { EASE, DURATION, readMotionTokens } from './tokens'

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

  it('não cria duração sem o prefixo do Rendra nem curva nova com o prefixo', () => {
    expect(css).not.toMatch(/--duration-/)
    expect(css).not.toMatch(/--rendra-ease-/)
  })
})

describe('readMotionTokens', () => {
  afterEach(() => {
    const el = document.documentElement
    for (const n of ['fast', 'base', 'slow', 'draw'])
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
    const bezier = (v: string | null) =>
      /cubic-bezier\(([^)]+)\)/
        .exec(v!)![1]!
        .split(',')
        .map((n) => parseFloat(n))
    expect(EASE.out).toEqual(bezier(declared('--ease-out')))
    expect(EASE.inOut).toEqual(bezier(declared('--ease-in-out')))
    expect(EASE.spring).toEqual(bezier(declared('--ease-spring')))
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
