// @vitest-environment jsdom
import { format } from 'date-fns'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { DatePicker } from './date-picker'
import { MotionProvider } from '@/lib/motion'

describe('DatePicker', () => {
  it('o gatilho usa o código do catálogo e abrir o campo mostra o calendário', async () => {
    renderApp(<DatePicker label="Data" />)
    const gatilho = screen.getByRole('button', { name: 'Selecione a data' })
    expect(gatilho).toHaveAttribute('data-rendra', 'DTP-001')
    await userEvent.click(gatilho)
    expect(await screen.findByRole('grid')).toBeInTheDocument()
  })

  it('escolher hoje preenche o campo em DD/MM/AAAA e fecha o calendário', async () => {
    function Demo() {
      const [value, setValue] = useState<Date | null>(null)
      return <DatePicker label="Data" value={value} onChange={setValue} dropdowns={false} />
    }
    renderApp(<Demo />)
    await userEvent.click(screen.getByRole('button', { name: 'Selecione a data' }))
    await screen.findByRole('grid')
    await userEvent.click(screen.getByRole('button', { name: /^Hoje,/ }))
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    const hoje = format(new Date(), 'dd/MM/yyyy')
    expect(screen.getByRole('button', { name: hoje })).toBeInTheDocument()
  })

  it('navegar de mês troca o mês mostrado no cabeçalho do calendário', async () => {
    renderApp(<DatePicker label="Data" dropdowns={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Selecione a data' }))
    await screen.findByRole('grid')
    const cabecalho = screen.getByRole('status')
    const mesInicial = cabecalho.textContent
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o próximo mês' }))
    expect(screen.getByRole('status').textContent).not.toBe(mesInicial)
  })

  it('com o campo desabilitado, clicar não abre o calendário', async () => {
    renderApp(<DatePicker label="Data" disabled />)
    const gatilho = screen.getByRole('button', { name: 'Selecione a data' })
    expect(gatilho).toBeDisabled()
    await userEvent.click(gatilho)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })
})

describe('DatePicker com motion', () => {
  it('em on: abre o calendário, escolhe hoje e o calendário sai do DOM', async () => {
    function Demo() {
      const [value, setValue] = useState<Date | null>(null)
      return (
        <MotionProvider mode="on">
          <DatePicker label="Data" value={value} onChange={setValue} dropdowns={false} />
        </MotionProvider>
      )
    }
    renderApp(<Demo />)
    await userEvent.click(screen.getByRole('button', { name: 'Selecione a data' }))
    await screen.findByRole('grid')
    await userEvent.click(screen.getByRole('button', { name: /^Hoje,/ }))
    await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument())
    expect(
      screen.getByRole('button', { name: format(new Date(), 'dd/MM/yyyy') }),
    ).toBeInTheDocument()
  })
})
