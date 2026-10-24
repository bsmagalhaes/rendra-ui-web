// @vitest-environment jsdom
import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import {
  Kanban,
  moveKanbanCard,
  type KanbanCard,
  type KanbanColumn,
  type KanbanDropTarget,
} from './kanban'

const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)
afterEach(() => setViewportWidth(1280))

const columns: KanbanColumn[] = [
  { id: 'novo', title: 'Novo' },
  { id: 'ganho', title: 'Ganho' },
]
const cards: KanbanCard[] = [
  {
    id: '1',
    columnId: 'novo',
    title: 'Empresa X',
    subtitle: '12.345.678/0001-90',
    values: { ps: 1250, mrr: 590 },
  },
]
const valueFields = [
  { key: 'ps', label: 'P&S' },
  { key: 'mrr', label: 'MRR' },
]

const targets: KanbanDropTarget[] = [
  {
    id: 'lixeira',
    label: 'Lixeira',
    hint: 'Remove o card do funil',
    confirm: { title: 'Mover para a lixeira?', description: 'Pode ser restaurado por 30 dias.' },
  },
  { id: 'congelar', label: 'Congelar', hint: 'Pausa o card e a cadência', tone: 'info' },
  {
    id: 'perdido',
    label: 'Perder',
    hint: 'Encerra como perdido, com motivo',
    tone: 'error',
    confirm: {
      title: 'Marcar como perdido?',
      description: 'Encerra o card como perdido.',
      destructive: true,
      reasons: [
        { value: 'preco', label: 'Preço' },
        { value: 'concorrente', label: 'Escolheu concorrente' },
      ],
    },
  },
  {
    id: 'ganho',
    label: 'Ganhar',
    hint: 'Encerra como ganho',
    tone: 'success',
    confirm: {
      title: 'Marcar como ganho?',
      description: 'Encerra o card como ganho.',
      confirmLabel: 'Confirmar ganho',
    },
  },
  { id: 'arquivar', label: 'Arquivar', disabled: true, disabledReason: 'Só depois de ganho' },
]

function Controlled(props: {
  onDropTarget?: (cardId: string, targetId: string, reason?: string) => void
  dropTargets?: KanbanDropTarget[]
}) {
  const [list, setList] = useState(cards)
  return (
    <>
      <button type="button" onClick={() => setList([])}>
        Sumir por fora
      </button>
      <button type="button" onClick={() => setList(cards)}>
        Devolver por fora
      </button>
      <Kanban
        aria-label="Funil"
        columns={columns}
        cards={list}
        valueFields={valueFields}
        dropTargets={props.dropTargets ?? targets}
        onCardMove={(id, to, index) => setList((l) => moveKanbanCard(l, id, to, index))}
        onDropTarget={(cardId, targetId, reason) => {
          props.onDropTarget?.(cardId, targetId, reason)
          setList((l) => l.filter((c) => c.id !== cardId))
        }}
      />
    </>
  )
}

const startDrag = () =>
  fireEvent.dragStart(screen.getByText('Empresa X').closest('li')!, {
    dataTransfer: { effectAllowed: '', setData: vi.fn() },
  })
const chip = (id: string) =>
  screen.getByLabelText('Soltar em').querySelector(`[data-kanban-target="${id}"]`) as HTMLElement

describe('Kanban: rodapé flutuante', () => {
  it('durante o arraste mostra, em cada destino, o título e a descrição como texto', () => {
    renderApp(<Controlled />)
    startDrag()
    const bar = screen.getByLabelText('Soltar em')
    for (const [label, hint] of [
      ['Lixeira', 'Remove o card do funil'],
      ['Congelar', 'Pausa o card e a cadência'],
      ['Perder', 'Encerra como perdido, com motivo'],
      ['Ganhar', 'Encerra como ganho'],
    ]) {
      expect(within(bar).getByText(label!)).toBeInTheDocument()
      expect(within(bar).getByText(hint!)).toBeInTheDocument()
    }
    // Fundo claro pela cor da ação.
    expect(chip('congelar')).toHaveClass('bg-info-soft')
    expect(chip('perdido')).toHaveClass('bg-destructive-soft')
    expect(chip('ganho')).toHaveClass('bg-success-soft')
    expect(chip('lixeira')).toHaveClass('bg-muted')
  })

  it('mouse: dragEnter realça só aquele destino, com cor forte; dragLeave tira', () => {
    renderApp(<Controlled />)
    startDrag()
    fireEvent.dragEnter(chip('perdido'))
    expect(chip('perdido')).toHaveAttribute('data-over', 'true')
    expect(chip('perdido')).toHaveClass('bg-destructive', 'text-destructive-foreground', 'ring-2')
    for (const id of ['lixeira', 'congelar', 'ganho']) {
      expect(chip(id)).not.toHaveAttribute('data-over')
    }
    fireEvent.dragEnter(chip('ganho'))
    expect(chip('ganho')).toHaveAttribute('data-over', 'true')
    expect(chip('perdido')).not.toHaveAttribute('data-over')
    fireEvent.dragLeave(chip('ganho'))
    expect(chip('ganho')).not.toHaveAttribute('data-over')
  })

  it('mouse: passar do chip para um filho dele (dragLeave com relatedTarget dentro) não apaga o realce', () => {
    renderApp(<Controlled />)
    startDrag()
    fireEvent.dragEnter(chip('perdido'))
    const child = within(chip('perdido')).getByText('Perder')
    const leave = createEvent.dragLeave(chip('perdido'))
    Object.defineProperty(leave, 'relatedTarget', { value: child })
    fireEvent(chip('perdido'), leave)
    expect(chip('perdido')).toHaveAttribute('data-over', 'true')
    const out = createEvent.dragLeave(chip('perdido'))
    Object.defineProperty(out, 'relatedTarget', { value: document.body })
    fireEvent(chip('perdido'), out)
    expect(chip('perdido')).not.toHaveAttribute('data-over')
  })

  it('destino desabilitado não realça', () => {
    renderApp(<Controlled />)
    startDrag()
    fireEvent.dragEnter(chip('arquivar'))
    fireEvent.dragOver(chip('arquivar'))
    expect(chip('arquivar')).not.toHaveAttribute('data-over')
  })

  it('o realce não sobra para o arraste seguinte (ao soltar e cancelar)', async () => {
    renderApp(<Controlled />)
    startDrag()
    fireEvent.dragEnter(chip('perdido'))
    fireEvent.drop(chip('perdido'))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    startDrag()
    expect(chip('perdido')).not.toHaveAttribute('data-over')
  })

  it('o fim do arraste (dragEnd) apaga o realce', () => {
    renderApp(<Controlled />)
    const card = screen.getByText('Empresa X').closest('li')!
    startDrag()
    fireEvent.dragEnter(chip('ganho'))
    fireEvent.dragEnd(card)
    expect(screen.queryByLabelText('Soltar em')).not.toBeInTheDocument()
    startDrag()
    expect(chip('ganho')).not.toHaveAttribute('data-over')
  })

  it('toque: o dedo sobre o destino realça antes de soltar', () => {
    setViewportWidth(360)
    renderApp(<Controlled />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Arrastar Empresa X' }), {
      pointerId: 7,
    })
    const target = chip('ganho')
    document.elementFromPoint = (() => target) as typeof document.elementFromPoint
    fireEvent.pointerMove(window, { clientX: 0, clientY: 505, pointerId: 7 })
    expect(chip('ganho')).toHaveAttribute('data-over', 'true')
    expect(chip('ganho')).toHaveClass('bg-success', 'text-success-foreground')
    expect(chip('perdido')).not.toHaveAttribute('data-over')
    fireEvent.pointerUp(window, { pointerId: 7 })
  })
})

describe('Kanban: confirmação por destino', () => {
  it('mouse: soltar no destino com confirm abre o modal com os dados do card, o card fica na tela e nada é chamado', async () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    startDrag()
    fireEvent.drop(chip('perdido'))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Marcar como perdido?')
    expect(within(dialog).getByText('Encerra o card como perdido.')).toBeInTheDocument()
    expect(within(dialog).getByText('Empresa X')).toBeInTheDocument()
    expect(within(dialog).getByText('12.345.678/0001-90')).toBeInTheDocument()
    expect(within(dialog).getByText('Novo')).toBeInTheDocument()
    expect(within(dialog).getByText('P&S:').parentElement).toHaveTextContent(/R\$\s1\.250,00/)
    expect(within(dialog).getByText('MRR:').parentElement).toHaveTextContent(/R\$\s590,00/)
    expect(onDropTarget).not.toHaveBeenCalled()
    expect(
      within(screen.getByRole('list', { name: 'Cards em Novo', hidden: true })).getByText(
        'Empresa X',
      ),
    ).toBeInTheDocument()
    // O card voltou ao lugar (sem a opacidade do arraste) e a barra sumiu.
    expect(screen.getByText('Empresa X', { selector: 'li span' }).closest('li')).not.toHaveClass(
      'opacity-50',
    )
    expect(screen.queryByLabelText('Soltar em')).not.toBeInTheDocument()
  })

  it('confirmar chama onDropTarget uma vez com o motivo e o card some; trocar o motivo muda o enviado', async () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    startDrag()
    fireEvent.drop(chip('perdido'))
    const dialog = await screen.findByRole('dialog')
    // O primeiro motivo já vem escolhido.
    expect(within(dialog).getByRole('combobox', { name: 'Motivo' })).toHaveTextContent('Preço')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Motivo' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Escolheu concorrente' }))
    // Sem confirmLabel, o botão usa o título do destino.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Perder' }))
    await waitFor(() => expect(screen.queryByText('Empresa X')).not.toBeInTheDocument())
    expect(onDropTarget).toHaveBeenCalledTimes(1)
    expect(onDropTarget).toHaveBeenCalledWith('1', 'perdido', 'concorrente')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('o motivo padrão é o primeiro quando a pessoa não troca', async () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    startDrag()
    fireEvent.drop(chip('perdido'))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Perder' }),
    )
    expect(onDropTarget).toHaveBeenCalledWith('1', 'perdido', 'preco')
  })

  it('destino sem motivos confirma com o rótulo próprio e sem motivo', async () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    startDrag()
    fireEvent.drop(chip('ganho'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar ganho' }))
    expect(onDropTarget).toHaveBeenCalledWith('1', 'ganho', undefined)
  })

  it('Cancelar e Escape não chamam nada e o card continua', async () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    startDrag()
    fireEvent.drop(chip('ganho'))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    startDrag()
    fireEvent.drop(chip('lixeira'))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onDropTarget).not.toHaveBeenCalled()
    expect(screen.getByText('Empresa X')).toBeInTheDocument()
  })

  it('destino sem confirm age na hora; o desabilitado não abre modal', () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    startDrag()
    fireEvent.drop(chip('arquivar'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onDropTarget).not.toHaveBeenCalled()
    startDrag()
    fireEvent.drop(chip('congelar'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onDropTarget).toHaveBeenCalledWith('1', 'congelar', undefined)
    expect(screen.queryByText('Empresa X')).not.toBeInTheDocument()
  })

  it('toque: soltar no chip com confirm abre o modal e não chama; em StrictMode abre um só', async () => {
    setViewportWidth(360)
    const onDropTarget = vi.fn()
    renderApp(
      <StrictMode>
        <Controlled onDropTarget={onDropTarget} />
      </StrictMode>,
    )
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Arrastar Empresa X' }), {
      pointerId: 8,
    })
    const target = chip('perdido')
    document.elementFromPoint = (() => target) as typeof document.elementFromPoint
    fireEvent.pointerMove(window, { clientX: 0, clientY: 505, pointerId: 8 })
    fireEvent.pointerUp(window, { pointerId: 8 })
    expect(await screen.findAllByRole('dialog')).toHaveLength(1)
    expect(onDropTarget).not.toHaveBeenCalled()
    expect(screen.getByText('Empresa X', { selector: 'li span' })).toBeInTheDocument()
  })

  it('menu "Mover para": destino com confirm abre o modal; sem confirm age na hora', async () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ações do card Empresa X' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Ganhar' }))
    expect(await screen.findByRole('dialog', { name: 'Marcar como ganho?' })).toBeInTheDocument()
    expect(onDropTarget).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Ações do card Empresa X' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Congelar' }))
    expect(onDropTarget).toHaveBeenCalledWith('1', 'congelar', undefined)
  })

  it('Perder usa o botão destrutivo; Ganhar e Lixeira usam o primário', async () => {
    renderApp(<Controlled />)
    startDrag()
    fireEvent.drop(chip('perdido'))
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Perder' })).toHaveClass('bg-destructive')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    for (const id of ['ganho', 'lixeira']) {
      startDrag()
      fireEvent.drop(chip(id))
      dialog = await screen.findByRole('dialog')
      const confirm = within(dialog)
        .getAllByRole('button')
        .find((b) => b.className.includes('bg-primary'))
      expect(confirm).toBeDefined()
      expect(within(dialog).queryByRole('button', { name: 'Perder' })).not.toBeInTheDocument()
      expect(confirm!.className).not.toContain('bg-destructive')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
  })

  it('o card sai do quadro por outro caminho com o modal aberto: o modal fecha e nada é chamado', async () => {
    const onDropTarget = vi.fn()
    renderApp(<Controlled onDropTarget={onDropTarget} />)
    startDrag()
    fireEvent.drop(chip('ganho'))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Sumir por fora', hidden: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onDropTarget).not.toHaveBeenCalled()
  })

  it('se o card volta depois de sumir por fora, o modal antigo não reaparece', async () => {
    renderApp(<Controlled />)
    startDrag()
    fireEvent.drop(chip('ganho'))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Sumir por fora', hidden: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Devolver por fora' }))
    expect(await screen.findByText('Empresa X', { selector: 'li span' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
