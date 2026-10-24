// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import {
  Kanban,
  moveKanbanCard,
  type KanbanCard,
  type KanbanColumn,
  type KanbanProps,
  type KanbanValueField,
} from './kanban'

const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)

// Sábado, 24/10/2026, 10:00 (horário local).
const hoje = new Date(2026, 9, 24, 10, 0)
const dia = (offset: number, h = 12, m = 0) => new Date(2026, 9, 24 + offset, h, m)

const valueFields: KanbanValueField[] = [
  { key: 'ps', label: 'P&S' },
  { key: 'mrr', label: 'MRR' },
]

const columns: KanbanColumn[] = [
  { id: 'a', title: 'Etapa A', cadenceDays: 3 },
  { id: 'b', title: 'Etapa B', cadenceDays: 1 },
  { id: 'c', title: 'Etapa C' },
]

const cards: KanbanCard[] = [
  {
    id: 'a1',
    columnId: 'a',
    title: 'Alfa Ltda',
    subtitle: '12.345.678/0001-90',
    contact: { name: 'Ágata Moreira', phone: '(11) 90000-0001', email: 'agata@alfa.com' },
    assignee: 'Ana Souza',
    description: 'Plano anual',
    tags: [{ label: 'Quente' }],
    values: { ps: 300, mrr: 30 },
    enteredColumnAt: dia(-1),
    activity: { type: 'Reunião', at: dia(2) },
  },
  {
    id: 'b1',
    columnId: 'b',
    title: 'Beta SA',
    subtitle: '98.765.432/0001-10',
    contact: { name: 'Bruno Lima' },
    assignee: 'Caio Dias',
    values: { ps: 100, mrr: 10 },
    enteredColumnAt: dia(-5),
  },
]

const names = (listName: string) =>
  within(screen.getByRole('list', { name: listName }))
    .queryAllByText(/(Ltda|SA|Cia)$/)
    .map((el) => el.textContent)

function board(extra: Partial<KanbanProps> = {}, list: KanbanCard[] = cards) {
  return (
    <Kanban
      aria-label="Funil"
      columns={columns}
      cards={list}
      valueFields={valueFields}
      referenceDate={hoje}
      {...extra}
    />
  )
}

const search = (text: string) =>
  userEvent.type(screen.getByRole('searchbox', { name: 'Buscar card' }), text)
const summary = (container: HTMLElement) =>
  container.querySelector('[data-toolbar-summary]') as HTMLElement

beforeEach(() => localStorage.clear())
afterEach(() => {
  setViewportWidth(1280)
  vi.restoreAllMocks()
})

describe('Kanban: barra do quadro', () => {
  it('buscar pela empresa mostra só os que casam, e os totais da barra seguem a busca', async () => {
    const { container } = renderApp(board({ toolbar: true }))
    expect(summary(container)).toHaveTextContent(/Total P&S:\s*R\$\s400,00/)
    expect(summary(container)).toHaveTextContent(/Total MRR:\s*R\$\s40,00/)
    await search('beta')
    expect(screen.queryByText('Alfa Ltda')).not.toBeInTheDocument()
    expect(screen.getByText('Beta SA')).toBeInTheDocument()
    expect(summary(container)).toHaveTextContent(/Total P&S:\s*R\$\s100,00/)
    expect(summary(container)).toHaveTextContent(/Total MRR:\s*R\$\s10,00/)
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar card' }))
    expect(screen.getByText('Alfa Ltda')).toBeInTheDocument()
    expect(summary(container)).toHaveTextContent(/Total P&S:\s*R\$\s400,00/)
  })

  it('buscar por CNPJ e por nome de contato (sem acento nem maiúscula) acha o card', async () => {
    renderApp(board({ toolbar: true }))
    await search('98.765')
    expect(screen.queryByText('Alfa Ltda')).not.toBeInTheDocument()
    expect(screen.getByText('Beta SA')).toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar card' }))
    await search('AGATA')
    expect(screen.getByText('Alfa Ltda')).toBeInTheDocument()
    expect(screen.queryByText('Beta SA')).not.toBeInTheDocument()
  })

  it('filtros de responsável e de situação: só os do filtro aparecem; contador e "Limpar filtros"', async () => {
    renderApp(board({ toolbar: true }))
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(await screen.findByRole('combobox', { name: 'Responsável' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Ana Souza' }))
    expect(screen.getByText('Alfa Ltda')).toBeInTheDocument()
    expect(screen.queryByText('Beta SA')).not.toBeInTheDocument()

    await userEvent.click(await screen.findByRole('combobox', { name: 'Situação' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Crítico' }))
    // Ana Souza não tem card crítico: nada sobra.
    expect(screen.queryByText('Alfa Ltda')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filtros/ })).toHaveTextContent('2')

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(screen.getByText('Alfa Ltda')).toBeInTheDocument()
    expect(screen.getByText('Beta SA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filtros/ })).not.toHaveTextContent('2')
  })

  it('o filtro "Atividade atrasada" casa pela atividade, independente do fundo', async () => {
    const list: KanbanCard[] = [
      { ...cards[0]!, id: 'x', title: 'Atrasada Cia', activity: { type: 'Ligação', at: dia(-2) } },
      { ...cards[0]!, id: 'y', title: 'Em dia Cia' },
    ]
    renderApp(board({ toolbar: true }, list))
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(await screen.findByRole('combobox', { name: 'Situação' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Atividade atrasada' }))
    expect(screen.getByText('Atrasada Cia')).toBeInTheDocument()
    expect(screen.queryByText('Em dia Cia')).not.toBeInTheDocument()
  })

  it('"Novo card" chama onNewCard uma vez, sem argumento, e não o onAddCard; sem onNewCard o botão não existe', async () => {
    const onNewCard = vi.fn()
    const onAddCard = vi.fn()
    const { unmount } = renderApp(board({ toolbar: true, onNewCard, onAddCard }))
    await userEvent.click(screen.getByRole('button', { name: 'Novo card' }))
    expect(onNewCard).toHaveBeenCalledTimes(1)
    expect(onNewCard.mock.calls[0]).toEqual([])
    expect(onAddCard).not.toHaveBeenCalled()
    unmount()
    renderApp(board({ toolbar: true }))
    expect(screen.queryByRole('button', { name: 'Novo card' })).not.toBeInTheDocument()
  })

  it('sem toolbar o quadro é o de sempre: a raiz é a section com data-rendra e a className, sem busca nem Customizar', () => {
    const { container } = renderApp(board({ className: 'minha-classe' }))
    const root = container.firstElementChild!
    expect(root.tagName).toBe('SECTION')
    expect(root).toHaveAttribute('data-rendra', 'KANB-001')
    expect(root).toHaveClass('minha-classe')
    expect(root).toHaveAttribute('aria-label', 'Funil')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Customizar' })).not.toBeInTheDocument()
  })

  it('com toolbar o aria-label, o data-rendra e a className ficam no elemento do quadro, não no envoltório', () => {
    const { container } = renderApp(board({ toolbar: true, className: 'minha-classe' }))
    const section = screen.getByRole('region', { name: 'Funil' })
    expect(section).toHaveAttribute('data-rendra', 'KANB-001')
    expect(section).toHaveClass('minha-classe')
    expect(container.firstElementChild).not.toBe(section)
    expect(container.firstElementChild).not.toHaveAttribute('data-rendra')
  })

  it('celular: busca, "Filtros" e "Novo card" presentes e as abas contam só os visíveis', async () => {
    setViewportWidth(360)
    renderApp(board({ toolbar: true, onNewCard: () => {} }))
    expect(screen.getByRole('searchbox', { name: 'Buscar card' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filtros/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo card' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Etapa A/ })).toHaveTextContent('1')
    await search('beta')
    expect(screen.getByRole('tab', { name: /Etapa A/ })).toHaveTextContent('0')
    expect(screen.getByRole('tab', { name: /Etapa B/ })).toHaveTextContent('1')
  })
})

describe('Kanban: cabeçalho da coluna (percentual e cadência)', () => {
  it('cada total mostra o percentual sobre o total do quadro; com busca, sobre o total visível', async () => {
    renderApp(board({ toolbar: true }))
    const header = (title: string) =>
      screen.getByRole('heading', { name: title }).parentElement!.parentElement!
    expect(header('Etapa A')).toHaveTextContent('(75%)')
    expect(header('Etapa B')).toHaveTextContent('(25%)')
    expect(header('Etapa C')).toHaveTextContent('(0%)')
    await search('beta')
    expect(header('Etapa B')).toHaveTextContent('(100%)')
    expect(header('Etapa A')).toHaveTextContent('(0%)')
    expect(header('Etapa A')).toHaveTextContent(/Total P&S\s*R\$\s0,00/)
  })

  it('quadro de total zero mostra (0%)', () => {
    renderApp(board({}, [{ id: 'z', columnId: 'a', title: 'Zero Cia' }]))
    const header = screen.getByRole('heading', { name: 'Etapa A' }).parentElement!.parentElement!
    expect(header).toHaveTextContent('(0%)')
  })

  it('mostra a cadência no singular e no plural, e nada quando a etapa não tem', () => {
    renderApp(board())
    expect(screen.getByText('Cadência: 3 dias')).toBeInTheDocument()
    expect(screen.getByText('Cadência: 1 dia')).toBeInTheDocument()
    expect(screen.getAllByText(/^Cadência:/)).toHaveLength(2)
  })
})

describe('Kanban: lista visível e índice do onCardMove', () => {
  const bCards: KanbanCard[] = [
    { id: 'b1', columnId: 'b', title: 'B1 Cia' },
    { id: 'b2', columnId: 'b', title: 'B2 SA' },
    { id: 'b3', columnId: 'b', title: 'B3 Cia' },
    { id: 'b4', columnId: 'b', title: 'B4 SA' },
  ]
  const all: KanbanCard[] = [{ id: 'a1', columnId: 'a', title: 'A1 SA' }, ...bCards]
  const cols: KanbanColumn[] = [
    { id: 'a', title: 'Etapa A' },
    { id: 'b', title: 'Etapa B' },
  ]

  /** Arrasta o card A1 com o mouse sobre `over` (um card de B ou a lista) e solta. */
  function dragA1(over: HTMLElement, clientY: number) {
    const dataTransfer = { effectAllowed: '', setData: vi.fn() }
    fireEvent.dragStart(screen.getByText('A1 SA').closest('li')!, { dataTransfer })
    fireEvent.dragOver(over, { clientY })
    fireEvent.drop(over)
  }
  const renderB = (extra: Partial<KanbanProps> = {}) => {
    const onCardMove = vi.fn()
    renderApp(
      <Kanban
        aria-label="Funil"
        columns={cols}
        cards={all}
        onCardMove={onCardMove}
        toolbar
        {...extra}
      />,
    )
    return onCardMove
  }
  const order = (move: ReturnType<typeof vi.fn>) => {
    const [id, to, index] = move.mock.calls[0] as [string, string, number]
    return moveKanbanCard(all, id, to, index)
      .filter((c) => c.columnId === 'b' || c.id === 'a1')
      .map((c) => c.id)
  }

  it('com filtro, soltar antes do primeiro visível manda o índice da lista completa', async () => {
    const move = renderB()
    await search('SA')
    expect(names('Cards em Etapa B')).toEqual(['B2 SA', 'B4 SA'])
    dragA1(screen.getByText('B2 SA').closest('li')!, 0)
    expect(move).toHaveBeenCalledWith('a1', 'b', 1)
    expect(order(move)).toEqual(['b1', 'a1', 'b2', 'b3', 'b4'])
  })

  it('com filtro, soltar entre os visíveis manda o índice da lista completa', async () => {
    const move = renderB()
    await search('SA')
    dragA1(screen.getByText('B4 SA').closest('li')!, 0)
    expect(move).toHaveBeenCalledWith('a1', 'b', 3)
    expect(order(move)).toEqual(['b1', 'b2', 'b3', 'a1', 'b4'])
  })

  it('com filtro, soltar no fim da coluna manda logo depois do último visível', async () => {
    const move = renderB()
    await search('SA')
    dragA1(screen.getByRole('list', { name: 'Cards em Etapa B' }), 0)
    expect(move).toHaveBeenCalledWith('a1', 'b', 4)
    expect(order(move)).toEqual(['b1', 'b2', 'b3', 'b4', 'a1'])
  })

  it('com filtro que esconde a coluna inteira, soltar nela manda o fim da lista completa', async () => {
    const move = renderB()
    await search('A1')
    expect(screen.getByText('Nenhum card')).toBeInTheDocument()
    dragA1(screen.getByRole('list', { name: 'Cards em Etapa B' }), 0)
    expect(move).toHaveBeenCalledWith('a1', 'b', 4)
  })

  it('sem filtro e com paginação, soltar no fim manda o mesmo índice de sempre (o das desenhadas)', () => {
    const move = renderB({ pageSize: 2, toolbar: false })
    expect(names('Cards em Etapa B')).toEqual(['B1 Cia', 'B2 SA'])
    dragA1(screen.getByRole('list', { name: 'Cards em Etapa B' }), 0)
    expect(move).toHaveBeenCalledWith('a1', 'b', 2)
  })

  it('o menu "Mover para" com filtro ativo continua mandando o fim da lista completa', async () => {
    const move = renderB()
    await search('SA')
    await userEvent.click(screen.getByRole('button', { name: 'Ações do card B2 SA' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Etapa A' }))
    expect(move).toHaveBeenCalledWith('b2', 'a', 1)
    move.mockClear()
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ações do card A1 SA' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Etapa B' }))
    expect(move).toHaveBeenCalledWith('a1', 'b', 4)
  })

  it('com filtro, contagem do cabeçalho e paginação usam só os visíveis', async () => {
    const many: KanbanCard[] = Array.from({ length: 6 }, (_, i) => ({
      id: `m${i}`,
      columnId: 'b',
      title: `M${i} ${i % 2 ? 'SA' : 'Cia'}`,
    }))
    renderApp(<Kanban aria-label="Funil" columns={cols} cards={many} toolbar pageSize={2} />)
    const head = screen.getByRole('heading', { name: 'Etapa B' }).parentElement!
    expect(head).toHaveTextContent('6')
    await search('SA')
    expect(head).toHaveTextContent('3')
    expect(names('Cards em Etapa B')).toEqual(['M1 SA', 'M3 SA'])
  })
})

describe('Kanban: Customizar', () => {
  const full: KanbanCard[] = [
    {
      id: '1',
      columnId: 'a',
      title: 'Alfa Ltda',
      subtitle: '12.345.678/0001-90',
      description: 'Plano anual',
      tags: [{ label: 'Quente' }],
      contact: { name: 'Ágata Moreira', phone: '(11) 90000-0001', email: 'agata@alfa.com' },
      assignee: 'Ana Souza',
      dueDate: dia(3),
      values: { ps: 300, mrr: 30 },
    },
    {
      id: '2',
      columnId: 'a',
      title: 'Beta SA',
      contact: { phone: '(11) 90000-0002' },
      values: { ps: 1, mrr: 2 },
    },
  ]
  const one: KanbanColumn[] = [{ id: 'a', title: 'Etapa A' }]
  const mount = (extra: Partial<KanbanProps> = {}) => (
    <Kanban
      aria-label="Funil"
      columns={one}
      cards={full}
      valueFields={valueFields}
      toolbar
      {...extra}
    />
  )
  const open = () => userEvent.click(screen.getByRole('button', { name: 'Customizar' }))
  const toggle = async (name: string) => {
    await userEvent.click(await screen.findByRole('checkbox', { name }))
  }

  it('desmarcar Telefone some em todos os cards e a Empresa continua; desmarcar P&S some só essa linha', async () => {
    renderApp(mount())
    await open()
    expect(await screen.findByRole('dialog', { name: 'Customizar' })).toBeInTheDocument()
    await toggle('Telefone')
    expect(screen.queryByText('(11) 90000-0001')).not.toBeInTheDocument()
    expect(screen.queryByText('(11) 90000-0002')).not.toBeInTheDocument()
    expect(screen.getByText('Alfa Ltda')).toBeInTheDocument()
    await toggle('P&S')
    expect(screen.queryAllByText('P&S:')).toHaveLength(0)
    expect(screen.getAllByText('MRR:')).toHaveLength(2)
  })

  it('cada campo esconde o seu texto', async () => {
    renderApp(mount())
    await open()
    const gone: [string, string][] = [
      ['Tags', 'Quente'],
      ['CNPJ ou CPF', '12.345.678/0001-90'],
      ['Descrição', 'Plano anual'],
      ['Contato', 'Ágata Moreira'],
      ['E-mail', 'agata@alfa.com'],
      ['Atividade', '27/10/2026'],
    ]
    for (const [label, text] of gone) {
      expect(screen.getByText(text)).toBeInTheDocument()
      await toggle(label)
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    }
    await toggle('Responsável')
    expect(screen.queryByTitle('Ana Souza')).not.toBeInTheDocument()
  })

  it('desmarcar Atividade esconde o calendário (com status ligado) e o dueDate', async () => {
    renderApp(
      mount({
        columns: [{ id: 'a', title: 'Etapa A', cadenceDays: 3 }],
        cards: [
          { id: '1', columnId: 'a', title: 'Alfa Ltda', activity: { type: 'Reunião', at: dia(2) } },
        ],
        referenceDate: hoje,
      }),
    )
    expect(screen.getByRole('button', { name: /^26\/10\/2026/ })).toBeInTheDocument()
    await open()
    await toggle('Atividade')
    expect(screen.queryByRole('button', { name: /^26\/10\/2026/ })).not.toBeInTheDocument()
  })

  it('"Restaurar" faz tudo reaparecer e "Pronto" fecha a gaveta', async () => {
    renderApp(mount())
    await open()
    await toggle('Telefone')
    await toggle('Tags')
    expect(screen.queryByText('Quente')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
    expect(screen.getByText('Quente')).toBeInTheDocument()
    expect(screen.getByText('(11) 90000-0001')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Pronto' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Customizar' })).not.toBeInTheDocument(),
    )
  })

  it('com storageKey, a escolha sobrevive a desmontar e montar; quadros com chaves diferentes não se misturam', async () => {
    const { unmount } = renderApp(mount({ storageKey: 'quadro-1' }))
    await open()
    await toggle('Telefone')
    unmount()
    renderApp(mount({ storageKey: 'quadro-1' }))
    expect(screen.queryByText('(11) 90000-0001')).not.toBeInTheDocument()
    expect(screen.getByText('Alfa Ltda')).toBeInTheDocument()
    // Outra chave: tudo visível.
    renderApp(mount({ storageKey: 'quadro-2' }))
    expect(screen.getAllByText('(11) 90000-0001')).toHaveLength(1)
  })

  it('"Restaurar" regrava o padrão no armazenamento', async () => {
    const { unmount } = renderApp(mount({ storageKey: 'quadro-r' }))
    await open()
    await toggle('Telefone')
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
    unmount()
    renderApp(mount({ storageKey: 'quadro-r' }))
    expect(screen.getByText('(11) 90000-0001')).toBeInTheDocument()
  })

  it('sem storageKey, a escolha não sobrevive à remontagem', async () => {
    const { unmount } = renderApp(mount())
    await open()
    await toggle('Telefone')
    unmount()
    renderApp(mount())
    expect(screen.getByText('(11) 90000-0001')).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('armazenamento que falha: o quadro monta com tudo visível e marcar e desmarcar funciona', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio')
    })
    renderApp(mount({ storageKey: 'quadro-f' }))
    expect(screen.getByText('(11) 90000-0001')).toBeInTheDocument()
    await open()
    await toggle('Telefone')
    expect(screen.queryByText('(11) 90000-0001')).not.toBeInTheDocument()
    await toggle('Telefone')
    expect(screen.getByText('(11) 90000-0001')).toBeInTheDocument()
  })

  it('valor guardado corrompido ou que não é lista cai no padrão', () => {
    localStorage.setItem('quadro-x', '{nao e json')
    localStorage.setItem('quadro-y', '{"a":1}')
    const { unmount } = renderApp(mount({ storageKey: 'quadro-x' }))
    expect(screen.getByText('(11) 90000-0001')).toBeInTheDocument()
    unmount()
    renderApp(mount({ storageKey: 'quadro-y' }))
    expect(screen.getByText('(11) 90000-0001')).toBeInTheDocument()
  })
})
