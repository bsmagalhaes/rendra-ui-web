// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Chart } from '@/components/ui/chart'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Drawer } from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Kanban } from '@/components/ui/kanban'
import { List } from '@/components/ui/list'
import { Modal } from '@/components/ui/modal'
import { OtpInput } from '@/components/ui/otp-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { Switch } from '@/components/ui/switch'
import { Table, type TableColumn } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { Timeline } from '@/components/ui/timeline'
import { Tooltip } from '@/components/ui/tooltip'
import { Upload } from '@/components/ui/upload'
import { Wizard } from '@/components/ui/wizard'
import { renderApp } from '@/test/render'

/*
 * Ancoragem do caminho `off` (motion desligado, o padrão): o HTML de cada componente, gravado
 * antes de qualquer mudança da frente de motion, nunca é regenerado. Qualquer diferença nestes
 * arquivos em `__snapshots__/off/` é regressão do caminho `off`, que precisa continuar idêntico.
 * Os ids de `useId` são normalizados, porque dependem da ordem de montagem.
 */

const dir = (name: string) => `./__snapshots__/off/${name}.html`
// `style="animation-duration: 0s;"` aparece e some conforme o instante em que o Presence do Radix
// lê o estilo do painel (ruído de temporização do Radix, sem relação com o Rendra).
const normalize = (html: string) =>
  html
    .replace(/«r[0-9a-z]+»|_r_[0-9a-z]+_|:r[0-9a-z]+:|radix-[«:_a-z0-9]+/gi, 'ID')
    .replace(/ style="animation-duration: 0s;"| style=""/g, '')
const snap = async (name: string, html: string) =>
  expect(normalize(html)).toMatchFileSnapshot(dir(name))

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
})

const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)
afterEach(() => setViewportWidth(1280))

interface Row {
  id: string
  nome: string
  valor: number
}
const rows: Row[] = [
  { id: '1', nome: 'Carla', valor: 300 },
  { id: '2', nome: 'Ana', valor: 1250.5 },
]
const columns: TableColumn<Row>[] = [
  { id: 'nome', header: 'Nome', accessor: (r) => r.nome, sortable: true, mobile: 'primary' },
  { id: 'valor', header: 'Valor', accessor: (r) => r.valor, kind: 'currency' },
]

describe('identidade do caminho off', () => {
  it('modal aberto', async () => {
    renderApp(<Modal open onOpenChange={() => {}} title="Excluir" description="Sem volta." />)
    await snap('modal', document.body.innerHTML)
  })

  it('drawer aberto', async () => {
    renderApp(
      <Drawer open onOpenChange={() => {}} title="Cliente">
        <p>Corpo</p>
      </Drawer>,
    )
    await snap('drawer', document.body.innerHTML)
  })

  it('popover aberto', async () => {
    renderApp(
      <Popover defaultOpen>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PopoverContent>Conteúdo</PopoverContent>
      </Popover>,
    )
    await snap('popover', document.body.innerHTML)
  })

  it('dropdown-menu aberto com submenu', async () => {
    renderApp(
      <DropdownMenu>
        <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Editar</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mais</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Exportar</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ações' }))
    await screen.findByRole('menuitem', { name: 'Editar' })
    await snap('dropdown-menu', document.body.innerHTML)
  })

  it('tooltip aberto', async () => {
    renderApp(
      <Tooltip content="Dica">
        <button type="button">Alvo</button>
      </Tooltip>,
    )
    await userEvent.hover(screen.getByRole('button', { name: 'Alvo' }))
    await screen.findByRole('tooltip')
    await snap('tooltip', document.body.innerHTML)
  })

  it('select aberto (desktop)', async () => {
    renderApp(
      <Select
        label="Estado"
        options={[
          { value: 'sp', label: 'São Paulo' },
          { value: 'rj', label: 'Rio de Janeiro' },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'Estado' }))
    await screen.findByRole('option', { name: /Rio de Janeiro/ })
    await snap('select', document.body.innerHTML)
  })

  it('select aberto (mobile, bottom sheet)', async () => {
    setViewportWidth(360)
    renderApp(<Select label="Estado" options={[{ value: 'sp', label: 'São Paulo' }]} />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Estado' }))
    await screen.findByRole('option', { name: /São Paulo/ })
    await snap('select-mobile', document.body.innerHTML)
  })

  it('date-picker aberto', async () => {
    // O calendário mostra o mês e o dia de hoje: congela a data para o HTML não envelhecer.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 12))
    try {
      renderApp(<DatePicker label="Data" dropdowns={false} />)
      await userEvent.click(screen.getByRole('button', { name: 'Selecione a data' }))
      await screen.findByRole('grid')
      await snap('date-picker', document.body.innerHTML)
    } finally {
      vi.useRealTimers()
    }
  })

  it('tabs com troca de aba', async () => {
    renderApp(
      <Tabs
        aria-label="Seções"
        items={[
          { value: 'a', label: 'A', content: <p>Painel A</p> },
          { value: 'b', label: 'B', count: 3, content: <p>Painel B</p> },
        ]}
      />,
    )
    const antes = document.body.innerHTML
    await userEvent.click(screen.getByRole('tab', { name: /^B/ }))
    await snap('tabs', `${antes}\n----\n${document.body.innerHTML}`)
  })

  it('accordion fechado e aberto', async () => {
    renderApp(
      <Accordion
        items={[
          { value: 'a', title: 'Item A', content: 'Texto A' },
          { value: 'b', title: 'Item B', content: 'Texto B' },
        ]}
      />,
    )
    const fechado = document.body.innerHTML
    await userEvent.click(screen.getByRole('button', { name: 'Item A' }))
    await snap('accordion', `${fechado}\n----\n${document.body.innerHTML}`)
  })

  it('wizard na etapa 2', async () => {
    renderApp(
      <Wizard
        steps={[
          { id: 'a', title: 'Dados' },
          { id: 'b', title: 'Revisão' },
        ]}
      >
        <p>Etapa 1</p>
        <p>Etapa 2</p>
      </Wizard>,
    )
    const primeira = document.body.innerHTML
    await userEvent.click(screen.getByRole('button', { name: /Avançar/ }))
    await screen.findByText('Etapa 2')
    await snap('wizard', `${primeira}\n----\n${document.body.innerHTML}`)
  })

  it('kanban', async () => {
    renderApp(
      <Kanban
        aria-label="Funil"
        columns={[
          { id: 'novo', title: 'Novo' },
          { id: 'ganho', title: 'Ganho' },
        ]}
        cards={[
          { id: '1', columnId: 'novo', title: 'Empresa X' },
          { id: '2', columnId: 'novo', title: 'Empresa Y' },
        ]}
        onCardMove={() => {}}
      />,
    )
    await snap('kanban', document.body.innerHTML)
  })

  it('list', async () => {
    renderApp(
      <List
        items={[
          { id: '1', title: 'Cliente A' },
          { id: '2', title: 'Cliente B' },
        ]}
        onReorder={() => {}}
      />,
    )
    await snap('list', document.body.innerHTML)
  })

  it('table com linha expandida', async () => {
    renderApp(
      <Table<Row>
        aria-label="Clientes"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        expandable={(r) => <p>Detalhes de {r.nome}</p>}
      />,
    )
    const antes = document.body.innerHTML
    await userEvent.click(screen.getAllByRole('button', { name: 'Expandir linha' })[0]!)
    await snap('table', `${antes}\n----\n${document.body.innerHTML}`)
  })

  it('timeline', async () => {
    renderApp(
      <Timeline
        events={[
          { id: '1', title: 'Criado', date: '18/10/2026 10:00', status: 'succeeded' },
          { id: '2', title: 'Enviado', date: '18/10/2026 11:00' },
        ]}
      />,
    )
    await snap('timeline', document.body.innerHTML)
  })

  it('button comum e asChild', async () => {
    renderApp(
      <>
        <Button>Salvar</Button>
        <Button loading>Salvando</Button>
        <Button asChild>
          <a href="/x">Link</a>
        </Button>
      </>,
    )
    await snap('button', document.body.innerHTML)
  })

  it('switch ligado e desligado', async () => {
    renderApp(
      <>
        <Switch label="Ativo" />
        <Switch label="Ligado" defaultChecked />
      </>,
    )
    await snap('switch', document.body.innerHTML)
  })

  it('checkbox desmarcado, marcado e indeterminado', async () => {
    renderApp(
      <>
        <Checkbox label="A" />
        <Checkbox label="B" defaultChecked />
        <Checkbox label="C" checked="indeterminate" />
      </>,
    )
    const antes = document.body.innerHTML
    await userEvent.click(screen.getByRole('checkbox', { name: 'A' }))
    await snap('checkbox', `${antes}\n----\n${document.body.innerHTML}`)
  })

  it('radio-group', async () => {
    renderApp(
      <RadioGroup
        aria-label="Plano"
        defaultValue="a"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    await snap('radio-group', document.body.innerHTML)
  })

  it('otp-input preenchido', async () => {
    renderApp(<OtpInput value="123" onChange={() => {}} />)
    await snap('otp-input', document.body.innerHTML)
  })

  it('upload com dois arquivos', async () => {
    const { container } = renderApp(<Upload />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [
          new File(['a'], 'a.pdf', { type: 'application/pdf' }),
          new File(['b'], 'b.pdf', { type: 'application/pdf' }),
        ],
      },
    })
    await screen.findByText('a.pdf')
    await snap('upload', document.body.innerHTML)
  })

  it('stat-card com valor e com loading', async () => {
    renderApp(
      <>
        <StatCard label="Receita" value="R$ 1.250,00" change={12.5} />
        <StatCard label="Custo" value={1234} loading />
      </>,
    )
    await snap('stat-card', document.body.innerHTML)
  })

  it('chart de barras, gauge e funnel', async () => {
    renderApp(
      <>
        <Chart
          type="bar"
          aria-label="Vendas"
          data={[
            { mes: 'Jan', valor: 10 },
            { mes: 'Fev', valor: 12 },
          ]}
          xKey="mes"
          series={[{ key: 'valor', label: 'Valor' }]}
        />
        <Chart type="gauge" aria-label="Meta" value={80} max={100} />
        <Chart
          type="funnel"
          aria-label="Funil"
          stages={[
            { label: 'Topo', value: 100 },
            { label: 'Fundo', value: 20 },
          ]}
        />
      </>,
    )
    await snap('chart', document.body.innerHTML)
  })

  it('empty-state', async () => {
    renderApp(<EmptyState title="Nada aqui" description="Sem dados." />)
    await snap('empty-state', document.body.innerHTML)
  })
})
