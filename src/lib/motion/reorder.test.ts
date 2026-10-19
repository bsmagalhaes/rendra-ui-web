import { describe, expect, it } from 'vitest'
import { layoutEnabled } from './reorder'

describe('layoutEnabled', () => {
  it.each([
    ['on', false, true],
    ['on', true, false],
    ['off', false, false],
    ['off', true, false],
  ] as const)('modo %s, arrastando %s: layout %s', (mode, dragging, esperado) => {
    expect(layoutEnabled({ mode, dragging })).toBe(esperado)
  })
})
