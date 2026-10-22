// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionProvider } from './motion-context'
import { createPresets, toCubicBezier } from './presets'
import { DURATION, EASE, SPRING, type MotionTokens } from './tokens'
import { useMotionPresets } from './use-motion-presets'

const tokens: MotionTokens = {
  duration: {
    press: 0.1,
    hover: 0.15,
    fast: 0.11,
    base: 0.22,
    move: 0.25,
    slow: 0.33,
    draw: 0.44,
    pulse: 0.9,
  },
  reveal: { enter: 0.55, stagger: 0.11, count: 1.1, draw: 0.88 },
  ease: EASE,
}

describe('presets', () => {
  it('usam só a duração e a curva dos tokens', () => {
    const p = createPresets(tokens, false)
    expect(p.fade.transition).toMatchObject({ duration: 0.22, ease: EASE.out })
    expect(p.pop.transition).toMatchObject({ duration: 0.33, ease: EASE.spring })
    expect(p.slide('right').transition).toMatchObject({ duration: 0.33, ease: EASE.out })
    expect(p.slide('bottom', 'short').transition).toMatchObject({ duration: 0.22 })
    expect(p.move).toMatchObject({ duration: 0.25, ease: EASE.move })
    // `layout` é o nome antigo do deslocamento: alias de `move` (W10)
    expect(p.layout).toEqual(p.move)
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

  it('stagger usa metade de --duration-fast (60 ms), limita a 8 itens (480 ms) e zera com movimento reduzido', () => {
    const p = createPresets(tokens, false)
    expect(p.stagger(0)).toEqual({ delay: 0 })
    expect(p.stagger(4).delay).toBeCloseTo(4 * 0.055)
    expect(p.stagger(50).delay).toBeCloseTo(8 * 0.055)
    expect(p.stagger(50, 10).delay).toBeCloseTo(10 * 0.055)
    const real = createPresets({ duration: DURATION, reveal: tokens.reveal, ease: EASE }, false)
    expect(real.stagger(1).delay).toBeCloseTo(0.06)
    expect(real.stagger(99).delay).toBeCloseTo(0.48)
    expect(createPresets(tokens, true).stagger(4)).toEqual({ delay: 0 })
  })

  it('reveal: entrada de uso único usa reveal.enter (mais lenta que slide) e a cascata usa reveal.stagger', () => {
    const p = createPresets(tokens, false)
    expect(p.reveal('bottom').transition).toMatchObject({ duration: 0.55, ease: EASE.out })
    expect(p.reveal('bottom').initial).toMatchObject({ y: 8, opacity: 0 })
    expect(p.reveal('bottom').exit).toEqual(p.reveal('bottom').initial)
    expect(p.reveal('bottom').transition.duration).toBeGreaterThan(
      p.slide('bottom', 'short').transition.duration as number,
    )
    expect(p.staggerReveal(0)).toEqual({ delay: 0 })
    expect(p.staggerReveal(3).delay).toBeCloseTo(3 * 0.11)
    expect(p.staggerReveal(50, 8).delay).toBeCloseTo(8 * 0.11)
    expect(createPresets(tokens, true).staggerReveal(4)).toEqual({ delay: 0 })
    // reduzido: só opacidade, na duração base (não zero)
    expect(createPresets(tokens, true).reveal('bottom').transition).toEqual({
      duration: 0.22,
      ease: EASE.out,
    })
  })

  it('com movimento reduzido nenhum preset carrega x, y, scale, filter nem cascata, e a opacidade usa base (não 0)', () => {
    const p = createPresets(tokens, true)
    const all = [
      p.fade,
      p.scale,
      p.pop,
      p.slide('right'),
      p.slide('top', 'short'),
      p.open(),
      p.open(0.97),
      p.sheet('right'),
      p.sheet('bottom'),
      p.tooltip(false),
      p.swap(1),
      p.swap(-1),
      p.indicator,
      p.reveal('bottom'),
    ]
    for (const preset of all) {
      for (const target of [preset.initial, preset.animate, preset.exit]) {
        const props = Object.keys(target).filter((k) => k !== 'transition')
        expect(props).toEqual(['opacity'])
      }
      expect(preset.transition).toMatchObject({ duration: 0.22, ease: EASE.out })
    }
    // deslocamento no layout não existe no reduzido
    expect(p.layout).toEqual({ duration: 0 })
    expect(p.move).toEqual({ duration: 0 })
    expect(p.settle).toEqual({ duration: 0 })
    expect(p.stagger(4)).toEqual({ delay: 0 })
    // tooltip que abre instantâneo nunca anima
    expect(p.tooltip(true).transition).toEqual({ duration: 0 })
  })
})

describe('tap, press, bump e curva do recharts', () => {
  it('press: 120 ms, ease.out, escala 0,97; tap é o alias; reduzido não tem nenhum dos dois', () => {
    const p = createPresets(tokens, false)
    expect(p.press.whileTap).toEqual({ scale: 0.97 })
    expect(p.press.transition).toEqual({ duration: 0.1, ease: EASE.out })
    expect(p.tap).toBe(p.press.whileTap)
    const real = createPresets({ duration: DURATION, reveal: tokens.reveal, ease: EASE }, false)
    expect(real.press.transition).toEqual({ duration: 0.12, ease: EASE.out })
    const r = createPresets(tokens, true)
    expect(r.tap).toBeUndefined()
    expect(r.press.whileTap).toBeUndefined()
    expect(r.bump).toBeUndefined()
  })

  it('bump é um salto curto [1,08 -> 1] na duração fast, sem mola; estável entre chamadas', () => {
    const p = createPresets(tokens, false)
    expect(p.bump).toMatchObject({ scale: [1.08, 1] })
    expect(p.bump).toMatchObject({ transition: { duration: 0.11, ease: EASE.out } })
  })

  it('toCubicBezier escreve o formato do recharts, sem espaços', () => {
    expect(toCubicBezier(EASE.out)).toBe('cubic-bezier(0.22,1,0.36,1)')
  })
})

describe('open: overlays entram com mola a partir da origem e saem mais rápido', () => {
  const real = createPresets({ duration: DURATION, reveal: tokens.reveal, ease: EASE }, false)

  it('entra em mola criticamente amortecida (quique 0) na duração base; sai só em opacidade na duração fast', () => {
    const o = real.open()
    expect(o.initial).toEqual({ opacity: 0, scale: 0.95 })
    expect(o.animate).toMatchObject({ opacity: 1, scale: 1 })
    expect(o.transition).toEqual({ type: 'spring', duration: DURATION.base, bounce: 0 })
    expect((o.animate as { transition: unknown }).transition).toEqual(o.transition)
    expect(Object.keys(o.exit).sort()).toEqual(['opacity', 'transition'])
    expect(o.exit).toMatchObject({
      opacity: 0,
      transition: { duration: DURATION.fast, ease: EASE.out },
    })
  })

  it('a saída é mais curta que a entrada (assimetria) em todo overlay', () => {
    const exitOf = (p: ReturnType<typeof real.open>) =>
      (p.exit as { transition: { duration: number } }).transition.duration
    const enterOf = (p: ReturnType<typeof real.open>) =>
      (p.transition as { duration: number }).duration
    for (const p of [
      real.open(),
      real.open(0.97),
      real.sheet('right'),
      real.sheet('bottom'),
      real.fade,
    ]) {
      expect(exitOf(p)).toBeLessThan(enterOf(p) as number)
    }
  })

  it('escala de partida é parâmetro e nunca é 0 (nada nasce do nada)', () => {
    expect(real.open(0.9).initial).toMatchObject({ scale: 0.9 })
    expect(real.scale.initial).toMatchObject({ scale: 0.95 })
    expect(real.open().initial).not.toMatchObject({ scale: 0 })
  })

  it('o modal em tela cheia (celular) entra por opacidade e deslocamento curto, sem escala', () => {
    const f = real.open({ y: 8 })
    expect(f.initial).toEqual({ opacity: 0, y: 8 })
    expect(f.animate).toMatchObject({ opacity: 1, y: 0 })
    expect(Object.keys(f.exit)).not.toContain('y')
  })

  it('tooltip: 120 ms, escala 0,97, e 0 ms quando abre instantâneo (instant-open)', () => {
    const t = real.tooltip(false)
    expect(t.initial).toEqual({ opacity: 0, scale: 0.97 })
    expect(t.transition).toEqual({ duration: DURATION.fast, ease: EASE.out })
    const instant = real.tooltip(true)
    expect(instant.transition).toEqual({ duration: 0 })
    expect(instant.exit).toMatchObject({ opacity: 0, transition: { duration: DURATION.fast } })
  })

  it('sheet: gaveta e folha entram em slow com ease.drawer e saem em fast (mais rápido que a entrada, nos dois ramos), de volta pelo mesmo lado', () => {
    const d = real.sheet('right')
    expect(d.initial).toEqual({ x: '100%' })
    expect(d.animate).toMatchObject({ x: 0 })
    expect(d.transition).toEqual({ duration: DURATION.slow, ease: EASE.drawer })
    expect(d.exit).toMatchObject({
      x: '100%',
      transition: { duration: DURATION.fast, ease: EASE.drawer },
    })
    expect(real.sheet('bottom').initial).toEqual({ y: '100%' })
  })
})

describe('move, settle, indicator e molas (linguagem única)', () => {
  const real = createPresets({ duration: DURATION, reveal: tokens.reveal, ease: EASE }, false)

  it('swap: a etapa que entra vem de 8 px na direção do passo, a que sai esmaece com blur de 2 px em fast', () => {
    const go = real.swap(1)
    expect(go.initial).toEqual({ opacity: 0, x: 8, filter: 'blur(2px)' })
    expect(go.animate).toMatchObject({ opacity: 1, x: 0, filter: 'blur(0px)' })
    expect(go.transition).toEqual({ duration: DURATION.base, ease: EASE.out })
    expect(real.swap(-1).initial).toMatchObject({ x: -8 })
    expect(go.exit).toEqual({
      opacity: 0,
      filter: 'blur(2px)',
      transition: { duration: DURATION.fast, ease: EASE.out },
    })
    // o desfoque nunca passa de 20 px (caro, sobretudo no Safari)
    expect(parseFloat(/blur\(([\d.]+)px\)/.exec(String(go.initial.filter))![1]!)).toBeLessThan(20)
  })

  it('move: 250 ms em ease.move; settle e sheet são as molas dos tokens', () => {
    expect(real.move).toEqual({ duration: 0.25, ease: EASE.move })
    expect(real.settle).toEqual({ type: 'spring', ...SPRING.settle })
    expect(real.springSheet).toEqual({ type: 'spring', ...SPRING.sheet })
    // a volta do arraste usa a mesma mola da folha: duração 0,3 e quique 0,2 em rigidez e amortecimento
    expect(real.sheetBounce).toEqual({ bounceStiffness: 439, bounceDamping: 34 })
  })

  it('indicator (check e radio): 0,9 -> 1 com opacidade em fast, nunca scale(0), sem quique', () => {
    expect(real.indicator.initial).toEqual({ opacity: 0, scale: 0.9 })
    expect(real.indicator.animate).toEqual({ opacity: 1, scale: 1 })
    expect(real.indicator.exit).toEqual(real.indicator.initial)
    expect(real.indicator.transition).toEqual({ duration: DURATION.fast, ease: EASE.out })
  })

  it('pop é cota rara: 0,8 -> 1 em slow com a curva back (a antiga spring)', () => {
    expect(real.pop.initial).toEqual({ opacity: 0, scale: 0.8 })
    expect(real.pop.transition).toEqual({ duration: DURATION.slow, ease: EASE.spring })
  })

  it('a cota de quique: nenhum preset do dia a dia usa a curva back', () => {
    const daily = [
      real.fade,
      real.scale,
      real.open(),
      real.sheet('right'),
      real.indicator,
      real.slide('bottom', 'short'),
    ]
    for (const p of daily)
      expect(JSON.stringify(p.transition)).not.toContain(String(EASE.spring[1]))
  })

  it('API antiga continua: fade, scale, pop, slide, reveal, layout, stagger, tap, bump', () => {
    for (const k of [
      'fade',
      'scale',
      'pop',
      'slide',
      'reveal',
      'layout',
      'stagger',
      'staggerReveal',
      'tap',
      'bump',
      'tokens',
      'reduced',
    ] as const) {
      expect(real).toHaveProperty(k)
    }
  })
})

describe('useMotionPresets', () => {
  const original = window.matchMedia
  afterEach(() => {
    window.matchMedia = original
  })
  const wrapper = (mode: 'on' | 'off') =>
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(MotionProvider, { mode, children })
    }

  it('em on, sem preferência de movimento reduzido, devolve os presets normais com a reserva dos tokens', () => {
    const { result } = renderHook(() => useMotionPresets(), { wrapper: wrapper('on') })
    expect(result.current.reduced).toBe(false)
    expect(result.current.fade.transition).toMatchObject({ duration: DURATION.base })
  })

  it('em on, com prefers-reduced-motion: reduce, devolve só opacidade (fonte única: o matchMedia do projeto)', () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    const { result } = renderHook(() => useMotionPresets(), { wrapper: wrapper('on') })
    expect(result.current.reduced).toBe(true)
    expect(Object.keys(result.current.scale.animate)).toEqual(['opacity'])
    expect(result.current.scale.transition).toMatchObject({ duration: DURATION.base })
  })

  it('em off não assina o matchMedia nem lê o documento: devolve um objeto único e inerte', () => {
    const spy = vi.fn(original)
    window.matchMedia = spy as unknown as typeof window.matchMedia
    const a = renderHook(() => useMotionPresets(), { wrapper: wrapper('off') })
    const b = renderHook(() => useMotionPresets(), { wrapper: wrapper('off') })
    expect(a.result.current).toBe(b.result.current)
    expect(a.result.current.reduced).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })
})
