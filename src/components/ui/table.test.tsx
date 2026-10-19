// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RendraProvider, type RendraLinkProps } from '@/components/rendra-provider'
import { renderApp } from '@/test/render'
import { Table, type TableColumn, type TableQuery } from './table'
import { MotionProvider } from '@/lib/motion'

/** Link falso, sem react-router: prova que a Table só depende do RendraProvider. */
function FakeLink({ to, children }: RendraLinkProps) {
  return <a href={`fake:${to}`}>{children}</a>
}

interface Row {
  id: string
  nome: string
  cidade: string
  valor: number
}

const rows: Row[] = [
  { id: '1', nome: 'Carla', cidade: 'Recife', valor: 300 },
  { id: '2', nome: 'Ana', cidade: 'São Paulo', valor: 1250.5 },
  { id: '3', nome: 'Bruno', cidade: 'Curitiba', valor: 90 },
]
const columns: TableColumn<Row>[] = [
  { id: 'nome', header: 'Nome', accessor: (r) => r.nome, sortable: true, mobile: 'primary' },
  { id: 'cidade', header: 'Cidade', accessor: (r) => r.cidade },
  { id: 'valor', header: 'Valor', accessor: (r) => r.valor, kind: 'currency', sortable: true },
]

const renderTable = (props: Partial<Parameters<typeof Table<Row>>[0]> = {}) =>
  renderApp(
    <Table<Row>
      aria-label="Clientes"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      {...props}
    />,
  )

/** Nomes na ordem em que aparecem nas linhas do corpo. */
const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).queryAllByRole('cell')[0]?.textContent ?? '')

const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)
afterEach(() => setViewportWidth(1280))

describe('Table', () => {
  it('mostra as linhas e formata moeda', () => {
    const { container } = renderTable()
    expect(names()).toEqual(['Carla', 'Ana', 'Bruno'])
    expect(
      screen.getByText('R$ 1.250,50', { normalizer: (t) => t.replace(/\s/g, ' ') }),
    ).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="TAB-001"]')).toBeInTheDocument()
  })

  it('ordena ao clicar no cabeçalho, e inverte no segundo clique', async () => {
    renderTable()
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    expect(names()).toEqual(['Ana', 'Bruno', 'Carla'])
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    expect(names()).toEqual(['Carla', 'Bruno', 'Ana'])
  })

  it('busca em todas as colunas', () => {
    renderTable({ globalFilter: 'curitiba' })
    expect(names()).toEqual(['Bruno'])
  })

  it('pagina conforme pageSize', async () => {
    renderTable({ pageSize: 2 })
    expect(names()).toHaveLength(2)
    await userEvent.click(screen.getAllByRole('button', { name: /Próxima/ })[0]!)
    expect(names()).toEqual(['Bruno'])
  })

  it('seleção entrega as linhas escolhidas às ações em massa', async () => {
    const bulk = vi.fn()
    renderTable({
      selectable: true,
      toolbar: {},
      bulkActions: (selected) => (
        <button type="button" onClick={() => bulk(selected.map((r) => r.id))}>
          Arquivar
        </button>
      ),
    })
    const [, first, second] = screen.getAllByRole('checkbox')
    await userEvent.click(first!)
    await userEvent.click(second!)
    await userEvent.click(screen.getByRole('button', { name: 'Arquivar' }))
    expect(bulk).toHaveBeenCalledWith(['1', '2'])
  })

  it('ação da linha recebe a própria linha', async () => {
    const onClick = vi.fn()
    renderTable({ rowActions: [{ label: 'Editar', onClick }] })
    await userEvent.click(screen.getAllByRole('button', { name: /Editar/ })[1]!)
    expect(onClick).toHaveBeenCalledWith(rows[1])
  })

  it('mostra o estado vazio', () => {
    renderTable({ data: [], empty: { title: 'Nenhum cliente ainda' } })
    expect(screen.getByText('Nenhum cliente ainda')).toBeInTheDocument()
  })

  it('modo remoto: pede ao servidor só a página, com a busca', async () => {
    const source = vi.fn(async (q: TableQuery) => ({
      rows: rows.filter((r) => r.nome.toLowerCase().includes(q.search.toLowerCase())),
      total: 42,
    }))
    renderTable({ data: undefined, source, globalFilter: 'ana', pageSize: 25 })
    await waitFor(() => expect(names()).toEqual(['Ana']))
    expect(source).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 25, search: 'ana' }),
    )
  })

  it('no celular vira cartões, sem tabela e com o mesmo conteúdo', () => {
    setViewportWidth(360)
    renderTable()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
  })

  it('expande a linha e mostra o conteúdo; recolhe e ele some', async () => {
    renderTable({ expandable: (row) => <p>Detalhes de {row.nome}</p> })
    expect(screen.queryByText('Detalhes de Carla')).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Expandir linha' })[0]!)
    expect(screen.getByText('Detalhes de Carla')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Recolher linha' }))
    expect(screen.queryByText('Detalhes de Carla')).not.toBeInTheDocument()
  })

  it('coluna com hidden inicial não aparece, e o menu Colunas alterna a visibilidade', async () => {
    renderTable({
      columns: [columns[0]!, { ...columns[1]!, hidden: true }, columns[2]!],
      columnVisibility: true,
    })
    expect(screen.queryByRole('columnheader', { name: 'Cidade' })).not.toBeInTheDocument()
    expect(screen.queryByText('Recife')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Colunas' }))
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Cidade' }))
    expect(screen.getByText('Recife')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Cidade' }))
    expect(screen.queryByText('Recife')).not.toBeInTheDocument()
  })

  it('selecionar todos marca só as linhas da página, e o contador reflete a página', async () => {
    renderTable({ selectable: true, pageSize: 2, toolbar: {} })
    const [selectAll] = screen.getAllByRole('checkbox', {
      name: 'Selecionar todas as linhas da página',
    })
    await userEvent.click(selectAll!)
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: 'Selecionar linha' })
    expect(rowCheckboxes).toHaveLength(2)
    rowCheckboxes.forEach((c) => expect(c).toBeChecked())
    expect(screen.getByText('2 selecionados')).toBeInTheDocument()
  })

  it('ordena numérico e data pelo valor, não pelo texto', async () => {
    interface Item {
      id: string
      nome: string
      idade: number
      nascimento: Date
    }
    const itemRows: Item[] = [
      { id: '1', nome: 'Dez', idade: 10, nascimento: new Date('2020-01-01') },
      { id: '2', nome: 'Dois', idade: 2, nascimento: new Date('2021-06-15') },
      { id: '3', nome: 'Cinco', idade: 5, nascimento: new Date('1999-03-10') },
    ]
    const itemColumns: TableColumn<Item>[] = [
      { id: 'nome', header: 'Nome', accessor: (r) => r.nome },
      { id: 'idade', header: 'Idade', accessor: (r) => r.idade, kind: 'number', sortable: true },
      {
        id: 'nascimento',
        header: 'Nascimento',
        accessor: (r) => r.nascimento,
        kind: 'date',
        sortable: true,
      },
    ]
    renderApp(
      <Table<Item>
        aria-label="Itens"
        data={itemRows}
        columns={itemColumns}
        getRowId={(r) => r.id}
      />,
    )
    // Coluna numérica: o primeiro clique ordena decrescente (padrão do TanStack Table
    // para valores não textuais); o segundo, crescente pelo valor, não pelo texto.
    await userEvent.click(screen.getByRole('button', { name: /Idade/ }))
    expect(names()).toEqual(['Dez', 'Cinco', 'Dois'])
    await userEvent.click(screen.getByRole('button', { name: /Idade/ }))
    expect(names()).toEqual(['Dois', 'Cinco', 'Dez'])
    await userEvent.click(screen.getByRole('button', { name: /Nascimento/ }))
    expect(names()).toEqual(['Dois', 'Dez', 'Cinco'])
  })

  it('remoto: ordenar troca a lista pela resposta simulada e volta para a primeira página', async () => {
    const source = vi.fn(async (q: TableQuery) => {
      const sorted = [...rows].sort((a, b) => {
        if (!q.sort) return 0
        const dir = q.sort.desc ? -1 : 1
        return q.sort.id === 'nome' ? a.nome.localeCompare(b.nome) * dir : 0
      })
      const start = (q.page - 1) * q.pageSize
      return { rows: sorted.slice(start, start + q.pageSize), total: sorted.length }
    })
    renderTable({ data: undefined, source, pageSize: 2 })
    await waitFor(() => expect(names()).toEqual(['Carla', 'Ana']))
    await userEvent.click(screen.getAllByRole('button', { name: /Próxima/ })[0]!)
    await waitFor(() => expect(names()).toEqual(['Bruno']))
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    await waitFor(() => expect(names()).toEqual(['Ana', 'Bruno']))
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('remoto: carregar mais soma linhas ao card, mantendo as que já apareciam', async () => {
    setViewportWidth(360)
    const many: Row[] = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      nome: `Cliente ${i + 1}`,
      cidade: 'Recife',
      valor: 10,
    }))
    const source = vi.fn(async (q: TableQuery) => {
      const start = (q.page - 1) * q.pageSize
      return { rows: many.slice(start, start + q.pageSize), total: many.length }
    })
    renderTable({ data: undefined, source, pageSize: 2, mobilePagination: 'loadMore' })
    await waitFor(() => expect(screen.getByText('Cliente 1')).toBeInTheDocument())
    expect(screen.getByText('Cliente 2')).toBeInTheDocument()
    expect(screen.queryByText('Cliente 3')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    await waitFor(() => expect(screen.getByText('Cliente 3')).toBeInTheDocument())
    expect(screen.getByText('Cliente 1')).toBeInTheDocument()
    expect(screen.getByText('Cliente 2')).toBeInTheDocument()
  })

  it('mostra o erro remoto e recarrega ao tentar de novo', async () => {
    const source = vi
      .fn<(q: TableQuery) => Promise<{ rows: Row[]; total: number }>>()
      .mockRejectedValueOnce(new Error('Falha de rede'))
      .mockResolvedValueOnce({ rows, total: rows.length })
    renderTable({ data: undefined, source })
    await waitFor(() => expect(screen.getByText('Falha de rede')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.queryByText('Falha de rede')).not.toBeInTheDocument())
    expect(names()).toEqual(['Carla', 'Ana', 'Bruno'])
  })

  it('local sem pageSize mostra todas as linhas, sem paginação', () => {
    renderTable({ pageSize: 0 })
    expect(names()).toEqual(['Carla', 'Ana', 'Bruno'])
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument()
  })

  it('local no celular com loadMore mostra a primeira fatia e soma a seguinte', async () => {
    setViewportWidth(360)
    renderTable({ pageSize: 2, mobilePagination: 'loadMore' })
    expect(screen.getByText('Carla')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.queryByText('Bruno')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    expect(screen.getByText('Bruno')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
  })

  it('sem react-router: coluna com href usa o linkComponent do RendraProvider', () => {
    render(
      <RendraProvider
        linkComponent={FakeLink}
        useCurrentPath={() => '/clientes'}
        navigate={() => {}}
        goBack={() => {}}
      >
        <Table<Row>
          aria-label="Clientes"
          data={rows}
          getRowId={(r) => r.id}
          columns={[{ ...columns[0]!, href: (r) => `/clientes/${r.id}` }, ...columns.slice(1)]}
        />
      </RendraProvider>,
    )
    expect(screen.getByRole('link', { name: 'Carla' })).toHaveAttribute('href', 'fake:/clientes/1')
  })
})

describe('Table com motion', () => {
  const emOn = (props: Partial<Parameters<typeof Table<Row>>[0]> = {}) =>
    renderApp(
      <MotionProvider mode="on">
        <Table<Row>
          aria-label="Clientes"
          data={rows}
          columns={columns}
          getRowId={(r) => r.id}
          {...props}
        />
      </MotionProvider>,
    )

  it('em on, as linhas aparecem na mesma ordem e a ordenação continua funcionando', async () => {
    emOn()
    expect(names()).toEqual(['Carla', 'Ana', 'Bruno'])
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    expect(names()).toEqual(['Ana', 'Bruno', 'Carla'])
  })

  it('em on, expandir mostra o conteúdo e recolher o tira do DOM', async () => {
    emOn({ expandable: (row) => <p>Detalhes de {row.nome}</p> })
    expect(screen.queryByText('Detalhes de Carla')).not.toBeInTheDocument()
    const [primeiro] = screen.getAllByRole('button', { name: 'Expandir linha' })
    await userEvent.click(primeiro!)
    expect(await screen.findByText('Detalhes de Carla')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Recolher linha' }))
    await waitFor(() => expect(screen.queryByText('Detalhes de Carla')).not.toBeInTheDocument())
  })

  it('em on, selecionar e ordenar preserva data-state=selected nas linhas certas', async () => {
    emOn({ selectable: true })
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Selecionar linha' })[0]!)
    const selecionadas = () =>
      screen
        .getAllByRole('row')
        .filter((r) => r.getAttribute('data-state') === 'selected')
        .map((r) => within(r).queryAllByRole('cell')[1]?.textContent)
    expect(selecionadas()).toEqual(['Carla'])
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    const ordem = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).queryAllByRole('cell')[1]?.textContent)
    expect(ordem).toEqual(['Ana', 'Bruno', 'Carla'])
    expect(selecionadas()).toEqual(['Carla'])
  })

  it('em on no celular, "Ver detalhes" abre o bloco e "Ocultar detalhes" o tira do DOM', async () => {
    setViewportWidth(360)
    emOn({
      columns: [
        { id: 'nome', header: 'Nome', accessor: (r) => r.nome, mobile: 'primary' },
        { id: 'cidade', header: 'Cidade', accessor: (r) => r.cidade, mobile: 'secondary' },
      ],
    })
    expect(screen.queryByText('Recife', { selector: 'dd *, dd' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /Ver detalhes/ })[0]!)
    expect(await screen.findByText('Cidade')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /Ocultar detalhes/ })[0]!)
    await waitFor(() => expect(screen.queryByText('Cidade')).not.toBeInTheDocument())
  })
})
