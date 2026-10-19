// @vitest-environment jsdom
import { screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Checkbox, CheckboxGroup } from './checkbox'
import { useState, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, reduceMotion } from '@/test/motion'

describe('Checkbox e CheckboxGroup', () => {
  it('marca pelo rótulo', async () => {
    const onCheckedChange = vi.fn()
    const { container } = renderApp(
      <Checkbox label="Aceito os termos" onCheckedChange={onCheckedChange} />,
    )
    await userEvent.click(screen.getByText('Aceito os termos'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(container.querySelector('[data-rendra="CHK-001"]')).toBeInTheDocument()
  })

  it('grupo com selecionar todos', async () => {
    const onChange = vi.fn()
    const { container } = renderApp(
      <CheckboxGroup
        aria-label="Canais"
        selectAll
        options={[
          { value: 'email', label: 'E-mail' },
          { value: 'sms', label: 'SMS' },
        ]}
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: /E-mail/ }))
    expect(onChange).toHaveBeenLastCalledWith(['email'])
    await userEvent.click(screen.getByRole('checkbox', { name: /todos/i }))
    expect(onChange).toHaveBeenLastCalledWith(['email', 'sms'])
    expect(container.querySelector('[data-rendra="CHK-002"]')).toBeInTheDocument()
  })
})

describe('Checkbox com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
  const indicator = () => document.querySelector('[data-state="checked"] svg, svg.lucide-check')

  it('em on: marcar mostra o indicador, desmarcar o tira do DOM (não controlado)', async () => {
    emOn(<Checkbox label="Aceito" />)
    const box = screen.getByRole('checkbox', { name: 'Aceito' })
    expect(indicator()).toBeNull()
    await userEvent.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
    expect(indicator()).not.toBeNull()
    await userEvent.click(box)
    expect(box).toHaveAttribute('aria-checked', 'false')
    await waitFor(() => expect(indicator()).toBeNull())
  })

  it('em on: defaultChecked já nasce marcado e avisa onCheckedChange com booleano', async () => {
    const onCheckedChange = vi.fn()
    emOn(<Checkbox label="Aceito" defaultChecked onCheckedChange={onCheckedChange} />)
    expect(indicator()).not.toBeNull()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Aceito' }))
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
    await waitFor(() => expect(indicator()).toBeNull())
  })

  it('em on: controlado segue o valor do pai e indeterminate mostra o traço', async () => {
    function Controlado() {
      const [v, setV] = useState<boolean | 'indeterminate'>('indeterminate')
      return (
        <>
          <Checkbox label="Todos" checked={v} onCheckedChange={setV} />
          <button type="button" onClick={() => setV(true)}>
            marcar
          </button>
        </>
      )
    }
    emOn(<Controlado />)
    const box = screen.getByRole('checkbox', { name: 'Todos' })
    expect(box).toHaveAttribute('aria-checked', 'mixed')
    expect(document.querySelector('svg.lucide-minus')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'marcar' }))
    expect(box).toHaveAttribute('aria-checked', 'true')
    expect(document.querySelector('svg.lucide-check')).not.toBeNull()
  })

  it('em on, o grupo "Selecionar todos" marca todas as caixas', async () => {
    function Grupo() {
      const [value, setValue] = useState<string[]>([])
      return (
        <CheckboxGroup
          selectAll
          value={value}
          onChange={setValue}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />
      )
    }
    emOn(<Grupo />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }))
    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'B' })).toHaveAttribute('aria-checked', 'true')
  })

  it('renderToStaticMarkup (SSR, sem window) não lança em off nem em on', () => {
    expect(() => renderToStaticMarkup(<Checkbox label="A" defaultChecked />)).not.toThrow()
    expect(() =>
      renderToStaticMarkup(
        <MotionProvider mode="on">
          <Checkbox label="A" defaultChecked />
        </MotionProvider>,
      ),
    ).not.toThrow()
  })

  it('em on, o indicador entra com pop (transform final none); reduzido, sem transform', async () => {
    emOn(<Checkbox label="A" defaultChecked />)
    const icon = document.querySelector('svg.lucide-check')!
    await expectSettled(icon.parentElement as HTMLElement, 'none')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Checkbox label="A" defaultChecked />)
      await expectSettled(
        document.querySelector('svg.lucide-check')!.parentElement as HTMLElement,
        'absent',
      )
    } finally {
      restore()
    }
  })
})
