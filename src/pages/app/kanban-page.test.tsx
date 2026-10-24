// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/toast'
import { renderApp } from '@/test/render'
import { KanbanPage } from './kanban-page'

const li = (title: string) => screen.getByText(title).closest('li')!

// A página monta 44 cards com modais e Selects: sob a suíte inteira, 5 s não bastam.
describe('KanbanPage', { timeout: 30_000 }, () => {
  it('arrastar um card até Ganhar, confirmar: o card sai do quadro e o aviso aparece', async () => {
    renderApp(
      <>
        <Toaster />
        <KanbanPage />
      </>,
    )
    expect(screen.getByText('Mercado Central')).toBeInTheDocument()
    fireEvent.dragStart(li('Mercado Central'), {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    })
    const chip = screen
      .getByLabelText('Soltar em')
      .querySelector('[data-kanban-target="ganho"]') as HTMLElement
    fireEvent.drop(chip)
    // Ainda na tela até confirmar.
    expect(
      within(screen.getByRole('list', { name: 'Cards em Novo contato', hidden: true })).getByText(
        'Mercado Central',
      ),
    ).toBeInTheDocument()
    const dialog = await screen.findByRole('dialog', { name: 'Marcar como ganho?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ganhar' }))
    await waitFor(() => expect(screen.queryByText('Mercado Central')).not.toBeInTheDocument())
    expect(await screen.findByText('Card ganho')).toBeInTheDocument()
  })

  it('Perder pede o motivo e o aviso traz o motivo escolhido', async () => {
    renderApp(
      <>
        <Toaster />
        <KanbanPage />
      </>,
    )
    fireEvent.dragStart(li('Farmácia Bem Estar'), {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    })
    fireEvent.drop(
      screen.getByLabelText('Soltar em').querySelector('[data-kanban-target="perdido"]')!,
    )
    const dialog = await screen.findByRole('dialog', { name: 'Marcar como perdido?' })
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Motivo' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Sem retorno' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Perder' }))
    expect(await screen.findByText('Card perdido. Motivo: Sem retorno')).toBeInTheDocument()
    expect(screen.queryByText('Farmácia Bem Estar')).not.toBeInTheDocument()
  })

  it('mover pelo menu "Mover para" recomeça a cadência: o card crítico deixa de ser crítico', async () => {
    renderApp(<KanbanPage />)
    expect(li('Café da Praça')).toHaveClass('bg-critical-soft')
    await userEvent.click(screen.getByRole('button', { name: 'Ações do card Café da Praça' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Qualificado' }))
    const moved = li('Café da Praça')
    expect(
      within(screen.getByRole('list', { name: 'Cards em Qualificado' })).getByText('Café da Praça'),
    ).toBeInTheDocument()
    expect(moved).not.toHaveClass('bg-critical-soft')
    expect(moved).not.toHaveClass('bg-destructive-soft')
  })

  it('o ajuda do cabeçalho abre a legenda com cada situação escrita', async () => {
    renderApp(<KanbanPage />)
    await userEvent.click(screen.getByRole('button', { name: /Sobre/ }))
    const dialog = await screen.findByRole('dialog')
    for (const text of [
      /Crítico \(vermelho forte\)/,
      /Cadência vencida \(vermelho claro\)/,
      /Sem atividade \(amarelo claro\)/,
      /Normal \(branco\)/,
      /Azul claro/,
      /Amarelo\./,
      /Vermelho escuro/,
      /Tracejado/,
      /máximo de dias que um card pode ficar/,
    ]) {
      expect(within(dialog).getByText(text)).toBeInTheDocument()
    }
  })

  it('traz a barra do quadro e o Novo card mostra o aviso', async () => {
    renderApp(
      <>
        <Toaster />
        <KanbanPage />
      </>,
    )
    expect(screen.getByRole('searchbox', { name: 'Buscar card' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Novo card' }))
    await waitFor(() =>
      expect(document.querySelector('[data-rendra="TST-001"]')).toHaveTextContent('Novo card'),
    )
  })
})
