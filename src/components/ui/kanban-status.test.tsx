// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Kanban, type KanbanCard, type KanbanColumn, type KanbanValueField } from './kanban'

// Sábado, 24/10/2026, 10:00 (horário local): o "hoje" de todos os testes.
const hoje = new Date(2026, 9, 24, 10, 0)
const dia = (offset: number, h = 12, m = 0) => new Date(2026, 9, 24 + offset, h, m)

const columns: KanbanColumn[] = [
  { id: 'a', title: 'Etapa A', cadenceDays: 3 },
  { id: 'b', title: 'Etapa B', cadenceDays: 3 },
]

const fourCards: KanbanCard[] = [
  { id: 'crit', columnId: 'a', title: 'Crítico SA', enteredColumnAt: dia(-5) },
  {
    id: 'cad',
    columnId: 'a',
    title: 'Vencido SA',
    enteredColumnAt: dia(-5),
    activity: { type: 'Ligação', at: dia(2) },
  },
  { id: 'sem', columnId: 'a', title: 'Sem SA', enteredColumnAt: dia(-1) },
  {
    id: 'norm',
    columnId: 'a',
    title: 'Normal SA',
    enteredColumnAt: dia(-1),
    activity: { type: 'Reunião', at: dia(2, 15, 0), with: 'Maria Souza' },
    assignee: 'Bruno Costa',
  },
]

const li = (title: string) => screen.getByText(title).closest('li')!
const depois = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

const valueFields: KanbanValueField[] = [
  { key: 'ps', label: 'P&S' },
  { key: 'mrr', label: 'MRR' },
]

function board(cards: KanbanCard[], extra: Partial<Parameters<typeof Kanban>[0]> = {}) {
  return (
    <Kanban aria-label="Funil" columns={columns} cards={cards} referenceDate={hoje} {...extra} />
  )
}

describe('Kanban: fundo por status', () => {
  it('cada situação pinta o <li> e avisa o leitor de tela em texto; o normal não escreve nada', () => {
    renderApp(board(fourCards))
    expect(li('Crítico SA')).toHaveClass('bg-critical-soft')
    expect(
      within(li('Crítico SA')).getByText(/^Situação: crítico, cadência vencida e sem próxima/),
    ).toHaveClass('sr-only')
    expect(li('Vencido SA')).toHaveClass('bg-destructive-soft')
    expect(within(li('Vencido SA')).getByText('Situação: cadência vencida')).toBeInTheDocument()
    expect(li('Sem SA')).toHaveClass('bg-warning-soft')
    expect(within(li('Sem SA')).getByText('Situação: sem atividade')).toBeInTheDocument()
    expect(li('Normal SA')).toHaveClass('bg-card')
    expect(within(li('Normal SA')).queryByText(/^Situação:/)).not.toBeInTheDocument()
  })

  it('crítico por atividade atrasada diz "atividade atrasada"', () => {
    renderApp(
      board([
        {
          id: 'x',
          columnId: 'a',
          title: 'Atrasado SA',
          enteredColumnAt: dia(-5),
          activity: { type: 'Reunião', at: dia(-2) },
        },
      ]),
    )
    expect(li('Atrasado SA')).toHaveClass('bg-critical-soft')
    expect(
      screen.getByText('Situação: crítico, cadência vencida e atividade atrasada'),
    ).toBeInTheDocument()
  })

  it('quadro sem cadência e sem atividade: nenhum fundo de status e nenhum texto de situação', () => {
    renderApp(
      <Kanban
        aria-label="Funil"
        columns={[{ id: 'a', title: 'Etapa A' }]}
        cards={[
          { id: '1', columnId: 'a', title: 'Empresa X', dueDate: dia(3) },
          { id: '2', columnId: 'a', title: 'Empresa Y' },
        ]}
        referenceDate={hoje}
      />,
    )
    for (const t of ['Empresa X', 'Empresa Y']) {
      expect(li(t)).toHaveClass('bg-card')
      expect(li(t).className).not.toMatch(/bg-(critical|destructive|warning)-soft/)
    }
    expect(screen.queryByText(/^Situação:/)).not.toBeInTheDocument()
    // O dueDate segue como sempre foi.
    expect(screen.getByText('27/10/2026')).toBeInTheDocument()
    expect(screen.queryByText('Sem atividade')).not.toBeInTheDocument()
  })

  it('a data de referência injetada muda o fundo do mesmo card', () => {
    const card: KanbanCard = {
      id: '1',
      columnId: 'a',
      title: 'Empresa X',
      enteredColumnAt: dia(-1),
      activity: { type: 'Reunião', at: dia(20) },
    }
    const { rerender } = renderApp(board([card]))
    expect(li('Empresa X')).toHaveClass('bg-card')
    rerender(board([card], { referenceDate: new Date(2026, 9, 30, 10, 0) }))
    expect(li('Empresa X')).toHaveClass('bg-destructive-soft')
    expect(screen.getByText('Situação: cadência vencida')).toBeInTheDocument()
  })

  it('renderCard: o <li> ainda recebe o fundo, o corpo é o do renderCard e não há rodapé do padrão', () => {
    renderApp(
      board(fourCards.slice(0, 1), {
        renderCard: (c) => <span>Corpo próprio de {c.title}</span>,
        valueFields,
      }),
    )
    expect(li('Corpo próprio de Crítico SA')).toHaveClass('bg-critical-soft')
    expect(screen.queryByText('P&S:')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sem atividade/ })).not.toBeInTheDocument()
  })
})

describe('Kanban: rodapé de valores', () => {
  const withValues: KanbanCard = {
    id: '1',
    columnId: 'a',
    title: 'Empresa X',
    assignee: 'Ana Souza',
    dueDate: dia(3),
    values: { ps: 1250, mrr: 590 },
  }

  it('P&S em cima e MRR embaixo, depois da linha de data e responsável, com o valor ao lado', () => {
    renderApp(
      <Kanban
        aria-label="Funil"
        columns={[{ id: 'a', title: 'Etapa A' }]}
        cards={[withValues]}
        valueFields={valueFields}
        referenceDate={hoje}
      />,
    )
    const card = li('Empresa X')
    const ps = within(card).getByText('P&S:')
    const mrr = within(card).getByText('MRR:')
    expect(depois(ps, mrr)).toBe(true)
    // O valor está na mesma linha do rótulo.
    expect(ps.parentElement).toHaveTextContent(/P&S:\s*R\$\s1\.250,00/)
    expect(mrr.parentElement).toHaveTextContent(/MRR:\s*R\$\s590,00/)
    // Abaixo da data e do responsável.
    expect(depois(within(card).getByText('27/10/2026'), ps)).toBe(true)
    expect(depois(within(card).getByTitle('Ana Souza'), ps)).toBe(true)
  })

  it('só valores (sem data nem responsável): o rodapé de valores continua aparecendo', () => {
    renderApp(
      <Kanban
        aria-label="Funil"
        columns={[{ id: 'a', title: 'Etapa A' }]}
        cards={[{ id: '1', columnId: 'a', title: 'Empresa X', values: { ps: 10, mrr: 5 } }]}
        valueFields={valueFields}
      />,
    )
    expect(within(li('Empresa X')).getByText('P&S:')).toBeInTheDocument()
  })
})

describe('Kanban: calendário e hint', () => {
  it('mostra a data ao lado do ícone e o tipo da atividade só no hint', async () => {
    renderApp(board(fourCards))
    const card = li('Normal SA')
    expect(within(card).getByText('26/10/2026')).toBeInTheDocument()
    expect(screen.queryByText(/Reunião/)).not.toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: /^26\/10\/2026/ }))
    expect(await screen.findByText(/Reunião · 26\/10\/2026 às 15:00/)).toBeInTheDocument()
    expect(screen.getByText('Com: Maria Souza')).toBeInTheDocument()
    expect(screen.getByText('Responsável: Bruno Costa')).toBeInTheDocument()
    expect(screen.getByText('Em dia')).toBeInTheDocument()
  })

  it('hover do mouse abre; tirar o mouse fecha; o hint fica aberto se o mouse passa para ele', async () => {
    renderApp(board(fourCards))
    const trigger = within(li('Normal SA')).getByRole('button', { name: /^26\/10\/2026/ })
    await userEvent.hover(trigger)
    const hint = await screen.findByText('Em dia')
    // Do gatilho para o conteúdo: não fecha.
    await userEvent.unhover(trigger)
    await userEvent.hover(hint)
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.getByText('Em dia')).toBeInTheDocument()
    await userEvent.unhover(hint)
    await waitFor(() => expect(screen.queryByText('Em dia')).not.toBeInTheDocument())
  })

  it('Tab abre sem tirar o foco do gatilho; Escape fecha', async () => {
    renderApp(board(fourCards.slice(3)))
    const trigger = screen.getByRole('button', { name: /^26\/10\/2026/ })
    await userEvent.tab()
    expect(trigger).toHaveFocus()
    expect(await screen.findByText('Em dia')).toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Em dia')).not.toBeInTheDocument())
  })

  it('atrasada há 2 dias: círculo vermelho e texto do atraso; hoje: círculo amarelo e "Hoje 15:00"', async () => {
    renderApp(
      board([
        {
          id: 'late',
          columnId: 'a',
          title: 'Atrasada SA',
          enteredColumnAt: dia(-1),
          activity: { type: 'Ligação', at: dia(-2, 9, 0) },
        },
        {
          id: 'today',
          columnId: 'a',
          title: 'Hoje SA',
          enteredColumnAt: dia(-1),
          activity: { type: 'Reunião', at: dia(0, 15, 0) },
        },
      ]),
    )
    const late = within(li('Atrasada SA')).getByRole('button', { name: /^22\/10\/2026/ })
    expect(late.querySelector('span')).toHaveClass('bg-destructive', 'text-destructive-foreground')
    await userEvent.click(late)
    expect(await screen.findByText('Atrasada há 2 dias')).toBeInTheDocument()

    const todayBtn = within(li('Hoje SA')).getByRole('button', { name: /^Hoje 15:00/ })
    expect(todayBtn).toHaveTextContent('Hoje 15:00')
    expect(todayBtn.querySelector('span')).toHaveClass('bg-warning-mid')
    await userEvent.click(todayBtn)
    expect(await screen.findByText('Vence hoje')).toBeInTheDocument()
    expect(screen.getByText('Reunião · Hoje às 15:00')).toBeInTheDocument()
  })

  it('no singular: atrasada há 1 dia', async () => {
    renderApp(
      board([
        {
          id: 'late',
          columnId: 'a',
          title: 'Atrasada SA',
          enteredColumnAt: dia(-1),
          activity: { type: 'Ligação', at: dia(-1, 23, 59) },
        },
      ]),
    )
    await userEvent.click(screen.getByRole('button', { name: /^23\/10\/2026/ }))
    expect(await screen.findByText('Atrasada há 1 dia')).toBeInTheDocument()
  })

  it('sem atividade: texto "Sem atividade" visível e o hint "Sem atividade agendada"', async () => {
    renderApp(board(fourCards.slice(2, 3)))
    const trigger = within(li('Sem SA')).getByRole('button', { name: /^Sem atividade/ })
    expect(trigger).toHaveTextContent('Sem atividade')
    expect(trigger.querySelector('span')).toHaveClass('border-dashed')
    await userEvent.click(trigger)
    expect(await screen.findByText('Sem atividade agendada')).toBeInTheDocument()
  })

  it('status ligado e card com dueDate e sem activity: mostra "Sem atividade", não a data', () => {
    renderApp(
      board([
        { id: '1', columnId: 'a', title: 'Com data SA', dueDate: dia(5), enteredColumnAt: dia(-1) },
        fourCards[3]!,
      ]),
    )
    expect(within(li('Com data SA')).getByText('Sem atividade')).toBeInTheDocument()
    expect(within(li('Com data SA')).queryByText('29/10/2026')).not.toBeInTheDocument()
  })

  it('o gatilho abre o hint sem acionar o clique do card; clicar fora do gatilho aciona', async () => {
    const onCardClick = vi.fn()
    const { container } = renderApp(board(fourCards.slice(3), { onCardClick }))
    expect(container.querySelector('button button')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /^26\/10\/2026/ }))
    expect(await screen.findByText('Em dia')).toBeInTheDocument()
    expect(onCardClick).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('Normal SA'))
    expect(onCardClick).toHaveBeenCalledTimes(1)
  })

  it('nunca há botão dentro de botão, com ou sem onCardClick', () => {
    for (const onCardClick of [undefined, vi.fn()]) {
      const { container, unmount } = renderApp(board(fourCards, { onCardClick, valueFields }))
      expect(container.querySelector('button button')).toBeNull()
      unmount()
    }
  })

  it('mouse: entrar, apertar e clicar no mesmo instante (sem redesenhar no meio) deixa o hint aberto', async () => {
    renderApp(board(fourCards.slice(3)))
    const trigger = screen.getByRole('button', { name: /^26\/10\/2026/ })
    act(() => {
      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
      fireEvent.pointerDown(trigger, { pointerType: 'mouse' })
      fireEvent.focus(trigger)
      fireEvent.click(trigger)
    })
    expect(await screen.findByText('Em dia')).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('toque: o segundo toque no gatilho fecha o hint aberto', async () => {
    renderApp(board(fourCards.slice(3)))
    const trigger = screen.getByRole('button', { name: /^26\/10\/2026/ })
    const tap = () => {
      fireEvent.pointerDown(trigger, { pointerType: 'touch' })
      fireEvent.click(trigger)
    }
    tap()
    expect(await screen.findByText('Em dia')).toBeInTheDocument()
    tap()
    await waitFor(() => expect(screen.queryByText('Em dia')).not.toBeInTheDocument())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('apertar o próprio gatilho com o hint aberto não o fecha antes do clique (o gatilho não é "fora")', async () => {
    renderApp(board(fourCards.slice(3)))
    const trigger = screen.getByRole('button', { name: /^26\/10\/2026/ })
    await userEvent.hover(trigger)
    expect(await screen.findByText('Em dia')).toBeInTheDocument()
    await userEvent.pointer({ target: trigger, keys: '[MouseLeft>]' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Em dia')).toBeInTheDocument()
  })

  it('status ligado só por activity, sem cadenceDays em nenhuma coluna', () => {
    renderApp(
      <Kanban
        aria-label="Funil"
        columns={[{ id: 'a', title: 'Etapa A' }]}
        cards={[
          {
            id: '1',
            columnId: 'a',
            title: 'Com atividade SA',
            activity: { type: 'Reunião', at: dia(2) },
          },
          { id: '2', columnId: 'a', title: 'Sem atividade SA' },
        ]}
        referenceDate={hoje}
      />,
    )
    // O quadro traz atividade: o status liga, e o card sem atividade fica amarelo.
    expect(li('Sem atividade SA')).toHaveClass('bg-warning-soft')
    expect(within(li('Sem atividade SA')).getByText('Situação: sem atividade')).toBeInTheDocument()
    expect(li('Com atividade SA')).toHaveClass('bg-card')
    expect(
      within(li('Com atividade SA')).getByRole('button', { name: /^26\/10\/2026/ }),
    ).toBeInTheDocument()
  })

  it('toque: pointerdown de toque e clique abrem o hint e ele fica aberto', async () => {
    renderApp(board(fourCards.slice(3)))
    const trigger = screen.getByRole('button', { name: /^26\/10\/2026/ })
    fireEvent.pointerDown(trigger, { pointerType: 'touch' })
    fireEvent.focus(trigger)
    fireEvent.click(trigger)
    expect(await screen.findByText('Em dia')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.getByText('Em dia')).toBeInTheDocument()
  })
})
