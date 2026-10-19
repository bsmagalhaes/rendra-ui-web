// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { bindNativeEvents, splitNativeEvents } from './native-events'

describe('splitNativeEvents', () => {
  it('separa as quatro chaves em conflito com o Motion e deixa o resto', () => {
    const onDragStart = vi.fn()
    const onClick = vi.fn()
    const { native, rest } = splitNativeEvents({
      onDragStart,
      onDrag: undefined,
      onClick,
      title: 'x',
    })
    expect(native.onDragStart).toBe(onDragStart)
    expect(rest).toEqual({ onClick, title: 'x' })
    expect('onDragStart' in rest).toBe(false)
  })
})

describe('bindNativeEvents', () => {
  it('liga e desliga os ouvintes nativos, entregando o evento nativo ao manipulador', () => {
    const el = document.createElement('button')
    const onDragStart = vi.fn()
    const onAnimationStart = vi.fn()
    const unbind = bindNativeEvents(el, { onDragStart, onAnimationStart, onDragEnd: undefined })
    el.dispatchEvent(new Event('dragstart'))
    el.dispatchEvent(new Event('animationstart'))
    el.dispatchEvent(new Event('dragend'))
    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(onDragStart.mock.calls[0]![0]).toBeInstanceOf(Event)
    expect(onAnimationStart).toHaveBeenCalledTimes(1)
    unbind()
    el.dispatchEvent(new Event('dragstart'))
    expect(onDragStart).toHaveBeenCalledTimes(1)
  })
})
