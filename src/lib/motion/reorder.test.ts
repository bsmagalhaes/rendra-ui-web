import { describe, expect, it } from 'vitest'
import { layoutEnabled } from './reorder'

describe('layoutEnabled', () => {
  it.each([
    ['on', true, false, true],
    ['on', true, true, false],
    ['on', false, false, false],
    ['off', true, false, false],
    ['off', false, true, false],
  ] as const)(
    'modo %s, domMax pronto %s, arrastando %s: layout %s',
    (mode, ready, dragging, esperado) => {
      expect(layoutEnabled({ mode, ready, dragging })).toBe(esperado)
    },
  )
})
