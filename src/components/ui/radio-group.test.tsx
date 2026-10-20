// @vitest-environment jsdom
import { screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { RadioGroup } from './radio-group'
import { useState, type ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'

describe('RadioGroup', () => {
  it('escolhe uma opção', async () => {
    const onChange = vi.fn()
    renderApp(
      <RadioGroup
        aria-label="Plano"
        options={[
          { value: 'basico', label: 'Básico' },
          { value: 'pro', label: 'Profissional' },
        ]}
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole('radio', { name: /Profissional/ }))
    expect(onChange).toHaveBeenCalledWith('pro')
    expect(screen.getByRole('radiogroup', { name: 'Plano' })).toHaveAttribute(
      'data-rendra',
      'RDO-001',
    )
  })

  it('variant="cards" usa o código de catálogo RDO-002', () => {
    renderApp(
      <RadioGroup
        aria-label="Plano"
        variant="cards"
        options={[{ value: 'basico', label: 'Básico' }]}
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Plano' })).toHaveAttribute(
      'data-rendra',
      'RDO-002',
    )
  })
})

describe('RadioGroup com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
  const options = [
    { value: 'a', label: 'Plano A' },
    { value: 'b', label: 'Plano B' },
  ]
  /** A bolinha interna de cada opção: escala 1 quando marcada, 0,9 (e opacidade 0) quando não. */
  const dot = (name: string) =>
    screen.getByRole('radio', { name }).querySelector<HTMLElement>('.size-2')!

  it('em on: escolher marca a opção, avisa onChange e a bolinha anima nos dois sentidos', async () => {
    const onChange = vi.fn()
    emOn(<RadioGroup aria-label="Plano" options={options} onChange={onChange} />)
    expect(screen.getByRole('radiogroup', { name: 'Plano' })).toHaveAttribute(
      'data-rendra',
      'RDO-001',
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Plano A' }))
    expect(onChange).toHaveBeenLastCalledWith('a')
    await waitFor(() => expect(dot('Plano A').style.transform).toBe('none'))
    await userEvent.click(screen.getByRole('radio', { name: 'Plano B' }))
    expect(onChange).toHaveBeenLastCalledWith('b')
    await waitFor(() => expect(dot('Plano B').style.transform).toBe('none'))
    await waitFor(() => expect(dot('Plano A').style.transform).toContain('scale(0.9)'))
  })

  it('em on: defaultValue nasce marcado e value controlado segue o pai', async () => {
    function Controlado() {
      const [v, setV] = useState('b')
      return (
        <>
          <RadioGroup aria-label="Plano" options={options} value={v} onChange={setV} />
          <button type="button" onClick={() => setV('a')}>
            escolher A
          </button>
        </>
      )
    }
    emOn(<Controlado />)
    expect(screen.getByRole('radio', { name: 'Plano B' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'escolher A' }))
    expect(screen.getByRole('radio', { name: 'Plano A' })).toHaveAttribute('aria-checked', 'true')
    cleanup()
    emOn(<RadioGroup aria-label="Plano" options={options} defaultValue="a" />)
    expect(screen.getByRole('radio', { name: 'Plano A' })).toHaveAttribute('aria-checked', 'true')
  })

  it('em on, o modo cards também anima a bolinha e mantém o código RDO-002', async () => {
    const { container } = emOn(
      <RadioGroup aria-label="Plano" variant="cards" options={options} defaultValue="a" />,
    )
    expect(container.querySelector('[data-rendra="RDO-002"]')).toBeInTheDocument()
    await waitFor(() => expect(dot('Plano A').style.transform).toBe('none'))
  })
})
