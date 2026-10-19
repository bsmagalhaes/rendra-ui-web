// @vitest-environment jsdom
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Switch } from './switch'
import type { ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { reduceMotion } from '@/test/motion'

describe('Switch', () => {
  it('liga e desliga', async () => {
    const onCheckedChange = vi.fn()
    renderApp(<Switch label="Notificações" onCheckedChange={onCheckedChange} />)
    const sw = screen.getByRole('switch', { name: /Notificações/ })
    await userEvent.click(sw)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    expect(sw).toBeChecked()
    expect(sw).toHaveAttribute('data-rendra', 'SWT-001')
  })
})

describe('Switch com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)

  it('em on: liga e desliga, com o código do catálogo e o estado no data-state', async () => {
    const onCheckedChange = vi.fn()
    emOn(<Switch label="Notificações" onCheckedChange={onCheckedChange} />)
    const sw = screen.getByRole('switch', { name: /Notificações/ })
    expect(sw).toHaveAttribute('data-rendra', 'SWT-001')
    expect(sw).toHaveAttribute('data-touch', 'expanded')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sw)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(sw).toHaveAttribute('data-state', 'checked')
    await userEvent.click(sw)
    expect(sw).toHaveAttribute('data-state', 'unchecked')
  })

  it('em on, controlado e desabilitado seguem a regra de sempre', async () => {
    const onCheckedChange = vi.fn()
    emOn(<Switch label="Fixo" checked disabled onCheckedChange={onCheckedChange} />)
    const sw = screen.getByRole('switch', { name: /Fixo/ })
    expect(sw).toBeDisabled()
    await userEvent.click(sw)
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  it('em on, o toque no Root comprime o polegar (propagado por variants); reduzido, não', async () => {
    emOn(<Switch aria-label="Ativo" />)
    const sw = screen.getByRole('switch', { name: 'Ativo' })
    const thumb = sw.querySelector('span')!
    fireEvent.pointerDown(sw, { pointerId: 1, button: 0, isPrimary: true })
    await waitFor(() => expect(thumb.style.transform).toContain('scale('))
    expect(thumb.style.transform).not.toContain('scale(1)')
    fireEvent.pointerUp(sw, { pointerId: 1, button: 0, isPrimary: true })
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Switch aria-label="Ativo" />)
      const reduced = screen.getByRole('switch', { name: 'Ativo' })
      fireEvent.pointerDown(reduced, { pointerId: 1, button: 0, isPrimary: true })
      expect(reduced.querySelector('span')!.style.transform).not.toContain('scale(1.15)')
    } finally {
      restore()
    }
  })

  it('em on, o deslocamento CSS do polegar (translate) e o transform do Motion se compõem: as classes de deslocamento continuam no polegar', () => {
    emOn(<Switch aria-label="Ativo" defaultChecked />)
    const thumb = screen.getByRole('switch', { name: 'Ativo' }).querySelector('span')!
    expect(thumb.className).toContain('data-[state=checked]:translate-x-6')
  })
})
