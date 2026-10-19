// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { createPresets } from './presets'
import { DURATION, EASE, type MotionTokens } from './tokens'
import { useMotionPresets } from './use-motion-presets'

const tokens: MotionTokens = {
  duration: { fast: 0.11, base: 0.22, slow: 0.33, draw: 0.44 },
  ease: EASE,
}

describe('presets', () => {
  it('usam só a duração e a curva dos tokens', () => {
    const p = createPresets(tokens, false)
    expect(p.fade.transition).toMatchObject({ duration: 0.22, ease: EASE.out })
    expect(p.scale.transition).toMatchObject({ duration: 0.22, ease: EASE.out })
    expect(p.pop.transition).toMatchObject({ duration: 0.33, ease: EASE.spring })
    expect(p.slide('right').transition).toMatchObject({ duration: 0.33, ease: EASE.out })
    expect(p.slide('bottom', 'short').transition).toMatchObject({ duration: 0.22 })
    expect(p.layout).toMatchObject({ duration: 0.22, ease: EASE.out })
  })

  it('o código-fonte não tem literal de duração nem de atraso', () => {
    const src = readFileSync('src/lib/motion/presets.ts', 'utf8')
    expect(src).not.toMatch(/duration:\s*(?!0\b)[0-9]/)
    expect(src).not.toMatch(/delay:\s*(?!0\b)[0-9]/)
    expect(src).not.toMatch(/ease:\s*\[/)
  })

  it('slide desloca na direção certa e termina em 0', () => {
    const p = createPresets(tokens, false)
    expect(p.slide('right').initial).toMatchObject({ x: '100%', opacity: 0 })
    expect(p.slide('right').animate).toMatchObject({ x: 0, opacity: 1 })
    expect(p.slide('left').initial).toMatchObject({ x: '-100%' })
    expect(p.slide('bottom').initial).toMatchObject({ y: '100%' })
    expect(p.slide('top', 'short').initial).toMatchObject({ y: -8 })
    expect(p.slide('right').exit).toEqual(p.slide('right').initial)
  })

  it('stagger usa --duration-fast, limita a quantidade e zera com movimento reduzido', () => {
    const p = createPresets(tokens, false)
    expect(p.stagger(0)).toEqual({ delay: 0 })
    expect(p.stagger(4).delay).toBeCloseTo(4 * 0.055)
    expect(p.stagger(50, 10).delay).toBeCloseTo(10 * 0.055)
    expect(createPresets(tokens, true).stagger(4)).toEqual({ delay: 0 })
  })

  it('com movimento reduzido todos perdem x, y e scale e têm duração 0', () => {
    const p = createPresets(tokens, true)
    const all = [p.fade, p.scale, p.pop, p.slide('right'), p.slide('top', 'short')]
    for (const preset of all) {
      for (const target of [preset.initial, preset.animate, preset.exit]) {
        expect(Object.keys(target)).toEqual(['opacity'])
      }
      expect(preset.transition).toEqual({ duration: 0 })
    }
    expect(p.layout).toEqual({ duration: 0 })
  })
})

describe('useMotionPresets', () => {
  const original = window.matchMedia
  afterEach(() => {
    window.matchMedia = original
  })

  it('sem preferência de movimento reduzido, devolve os presets normais com a reserva dos tokens', () => {
    const { result } = renderHook(() => useMotionPresets())
    expect(result.current.reduced).toBe(false)
    expect(result.current.fade.transition).toMatchObject({ duration: DURATION.base })
  })

  it('com prefers-reduced-motion: reduce, devolve só opacidade (fonte única: o hook do projeto)', () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    const { result } = renderHook(() => useMotionPresets())
    expect(result.current.reduced).toBe(true)
    expect(Object.keys(result.current.scale.animate)).toEqual(['opacity'])
    expect(result.current.scale.transition).toEqual({ duration: 0 })
  })
})
