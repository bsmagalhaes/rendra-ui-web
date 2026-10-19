// @vitest-environment jsdom
import { screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Tabs } from './tabs'
import type { ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, reduceMotion } from '@/test/motion'

const items = [
  { value: 'dados', label: 'Dados', content: <p>Conteúdo dos dados</p> },
  { value: 'contratos', label: 'Contratos', count: 3, content: <p>Lista de contratos</p> },
]

describe('Tabs', () => {
  it('troca o conteúdo ao escolher a aba', async () => {
    const onChange = vi.fn()
    const { container } = renderApp(<Tabs aria-label="Cliente" items={items} onChange={onChange} />)
    expect(screen.getByText('Conteúdo dos dados')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /Contratos/ }))
    expect(onChange).toHaveBeenCalledWith('contratos')
    expect(screen.getByText('Lista de contratos')).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="ABA-001"]')).toBeInTheDocument()
  })

  it('variant="pill" usa o código de catálogo ABA-002', () => {
    const { container } = renderApp(<Tabs aria-label="Cliente" items={items} variant="pill" />)
    expect(container.querySelector('[data-rendra="ABA-002"]')).toBeInTheDocument()
  })

  it('setas do teclado passam de aba', async () => {
    renderApp(<Tabs aria-label="Cliente" items={items} />)
    await userEvent.click(screen.getByRole('tab', { name: /Dados/ }))
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Contratos/ })).toHaveFocus()
  })
})

describe('Tabs com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
  const indicators = (root: ParentNode = document) => [
    ...root.querySelectorAll<HTMLElement>('[data-indicator="tabs"]'),
  ]

  it('em on há exatamente um indicador e ele fica dentro da aba ativa, também depois de trocar', async () => {
    emOn(<Tabs aria-label="Cliente" items={items} />)
    expect(indicators()).toHaveLength(1)
    expect(indicators()[0]!.closest('[role="tab"]')).toBe(
      screen.getByRole('tab', { name: /Dados/ }),
    )
    await userEvent.click(screen.getByRole('tab', { name: /Contratos/ }))
    expect(indicators()).toHaveLength(1)
    expect(indicators()[0]!.closest('[role="tab"]')).toBe(
      screen.getByRole('tab', { name: /Contratos/ }),
    )
  })

  it('em on, duas instâncias não dividem o indicador', async () => {
    emOn(
      <>
        <Tabs aria-label="Primeira" items={items} />
        <Tabs aria-label="Segunda" items={items} variant="pill" />
      </>,
    )
    const todos = indicators()
    expect(todos).toHaveLength(2)
    const [a, b] = screen.getAllByRole('tablist')
    expect(indicators(a!)).toHaveLength(1)
    expect(indicators(b!)).toHaveLength(1)
    await userEvent.click(screen.getAllByRole('tab', { name: /Contratos/ })[1]!)
    expect(indicators(a!)[0]!.closest('[role="tab"]')).toBe(
      screen.getAllByRole('tab', { name: /Dados/ })[0],
    )
    expect(indicators(b!)[0]!.closest('[role="tab"]')).toBe(
      screen.getAllByRole('tab', { name: /Contratos/ })[1],
    )
  })

  it('em on, o painel novo aparece, o antigo sai, e nenhum painel inativo fica no DOM com conteúdo', async () => {
    emOn(<Tabs aria-label="Cliente" items={items} />)
    expect(screen.getByText('Conteúdo dos dados')).toBeInTheDocument()
    expect(screen.queryByText('Lista de contratos')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /Contratos/ }))
    expect(await screen.findByText('Lista de contratos')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo dos dados')).not.toBeInTheDocument()
  })

  it('em off não existe indicador', () => {
    renderApp(<Tabs aria-label="Cliente" items={items} />)
    expect(indicators()).toHaveLength(0)
  })

  it('em on, o painel entra por transform e, com movimento reduzido, só por opacidade', async () => {
    emOn(<Tabs aria-label="Cliente" items={items} />)
    await expectSettled(screen.getByText('Conteúdo dos dados').parentElement!, 'none')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Tabs aria-label="Cliente" items={items} />)
      await expectSettled(screen.getByText('Conteúdo dos dados').parentElement!, 'absent')
    } finally {
      restore()
    }
  })
})
