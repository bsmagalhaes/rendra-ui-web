// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { forwardRef, useState, type ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { List, type ListItem } from '@/components/ui/list'
import { MotionProvider } from '@/lib/motion'
import { renderApp } from '@/test/render'
import { motionOn } from '@/test/motion'

/*
 * O `layout` do Motion não deixa marca no DOM do jsdom (não há geometria), então a regra "layout
 * desligado durante o arraste" é conferida na prop que o item recebe. O `m.li` real continua
 * montado por baixo: só registramos as props de cada render.
 */
const seen = vi.hoisted(() => ({ layout: [] as unknown[] }))
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  const Li = forwardRef<HTMLLIElement, ComponentProps<typeof actual.m.li>>((props, ref) => {
    seen.layout.push(props.layout)
    return <actual.m.li ref={ref} {...props} />
  })
  Li.displayName = 'LiRegistrado'
  return { ...actual, m: new Proxy(actual.m, { get: (t, k) => (k === 'li' ? Li : t[k as 'div']) }) }
})

const tres: ListItem[] = [
  { id: '1', title: 'Cliente A' },
  { id: '2', title: 'Cliente B' },
  { id: '3', title: 'Cliente C' },
]

function Controlada({ mode }: { mode: 'off' | typeof motionOn }) {
  const [items, setItems] = useState(tres)
  return (
    <MotionProvider mode={mode}>
      <List items={items} onReorder={setItems} />
    </MotionProvider>
  )
}

describe('regra do layout na List', () => {
  it('em on o layout fica ligado em repouso, desliga durante o arraste e volta ao soltar', async () => {
    renderApp(<Controlada mode={motionOn} />)
    // antes de o chunk do domMax chegar o layout fica desligado; depois, ligado em repouso
    expect(seen.layout[0]).toBe(false)
    await waitFor(() => expect(seen.layout.at(-1)).toBe(true))

    seen.layout.length = 0
    const handle = screen.getByRole('button', { name: 'Reordenar Cliente A' })
    fireEvent.pointerDown(handle, { pointerId: 1 })
    // durante o arraste: nenhum item com layout ligado
    expect(seen.layout.length).toBeGreaterThan(0)
    expect(seen.layout.every((v) => v === false)).toBe(true)

    seen.layout.length = 0
    fireEvent.pointerUp(window, { pointerId: 1 })
    expect(seen.layout.length).toBeGreaterThan(0)
    expect(seen.layout.every((v) => v === true)).toBe(true)
  })

  it('em off nenhum item vira m.li e o layout nunca liga', () => {
    seen.layout.length = 0
    renderApp(<Controlada mode="off" />)
    expect(seen.layout).toHaveLength(0)
  })
})
