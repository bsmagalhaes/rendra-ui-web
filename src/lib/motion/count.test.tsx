// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { formatLike, parseLocaleNumber } from './count'

describe('parseLocaleNumber', () => {
  it('número: conta de 0 até o valor, sem agrupar e com as casas que ele tem', () => {
    const p = parseLocaleNumber(1234)!
    expect(p).toMatchObject({ value: 1234, decimals: 0, prefix: '', suffix: '' })
    expect(formatLike(p, 1234)).toBe('1234')
    const d = parseLocaleNumber(12.5)!
    expect(formatLike(d, 12.5)).toBe('12.5')
    expect(formatLike(d, 3)).toBe('3.0')
  })

  it("'R$ 1.234,50' preserva prefixo, milhar com ponto e 2 casas", () => {
    const p = parseLocaleNumber('R$ 1.234,50')!
    expect(p).toMatchObject({ value: 1234.5, decimals: 2, prefix: 'R$ ', grouping: true })
    expect(formatLike(p, 1234.5)).toBe('R$ 1.234,50')
    expect(formatLike(p, 617.256)).toBe('R$ 617,26')
    expect(formatLike(p, 99999.9)).toBe('R$ 99.999,90')
  })

  it("'98%' preserva o sufixo", () => {
    const p = parseLocaleNumber('98%')!
    expect(formatLike(p, 98)).toBe('98%')
    expect(formatLike(p, 49)).toBe('49%')
  })

  it("'12,5 mil' preserva sufixo e casas decimais", () => {
    const p = parseLocaleNumber('12,5 mil')!
    expect(p).toMatchObject({ value: 12.5, decimals: 1, suffix: ' mil' })
    expect(formatLike(p, 12.5)).toBe('12,5 mil')
  })

  it("'-3,5%' mantém o sinal de menos", () => {
    const p = parseLocaleNumber('-3,5%')!
    expect(p.value).toBe(3.5)
    expect(formatLike(p, 3.5)).toBe('-3,5%')
  })

  it.each([['—'], [''], ['sem dados'], ['12.5'], ['1 a 2'], ['2026-10-18'], [undefined], [null]])(
    '%j não é número: sem contagem',
    (v) => {
      expect(parseLocaleNumber(v as never)).toBeNull()
    },
  )

  it('NaN, Infinity, expoente e elemento React não são contados', () => {
    expect(parseLocaleNumber(NaN)).toBeNull()
    expect(parseLocaleNumber(Infinity)).toBeNull()
    expect(parseLocaleNumber(1e21)).toBeNull()
    expect(parseLocaleNumber(<b>1</b>)).toBeNull()
  })
})
