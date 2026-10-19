import type { Meta, StoryObj } from '@storybook/react-vite'
import { Eye, Pencil, Trash2, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Accordion } from '@/components/ui/accordion'
import { ActionBar } from '@/components/ui/action-bar'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Chart } from '@/components/ui/chart'
import { DataToolbar, type ToolbarColumn } from '@/components/ui/data-toolbar'
import { Field } from '@/components/ui/field'
import { ImageViewer, type ViewerImage } from '@/components/ui/image-viewer'
import { Input } from '@/components/ui/input'
import { List } from '@/components/ui/list'
import { Pagination } from '@/components/ui/pagination'
import { QrCode } from '@/components/ui/qr-code'
import { Switch } from '@/components/ui/switch'
import { StatCard } from '@/components/ui/stat-card'
import { Table } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { Timeline } from '@/components/ui/timeline'
import { WidgetGrid } from '@/components/ui/widget-grid'
import { Stepper, Wizard } from '@/components/ui/wizard'
import { formatCurrency } from '@/lib/masks'
import { bySegment, clients, monthly, statusTone, type Client } from '@/mocks/clients'
import { clientColumns } from '@/pages/app/client-columns'

/* ------------------------------------------------ Table (componente central) */

const meta = {
  title: 'Dados/Table, navegação e dados',
  component: Table<Client>,
  args: {
    'aria-label': 'Clientes',
    data: clients,
    columns: clientColumns,
    getRowId: (c: Client) => c.id,
    selectable: true,
    columnVisibility: true,
    density: 'default',
    loading: false,
    pageSize: 8,
  },
  argTypes: {
    density: { control: 'inline-radio', options: ['compact', 'default', 'comfortable'] },
    mobilePagination: { control: 'inline-radio', options: ['pages', 'loadMore'] },
    data: { control: false },
    columns: { control: false },
  },
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div className="p-4">
      <Table<Client>
        {...args}
        rowActions={[
          { label: 'Ver', icon: <Eye />, onClick: () => {} },
          { label: 'Editar', icon: <Pencil />, onClick: () => {} },
          { label: 'Excluir', icon: <Trash2 />, destructive: true, onClick: () => {} },
        ]}
        bulkMenu={[{ label: 'Arquivar', onClick: () => {} }]}
      />
    </div>
  ),
} satisfies Meta<typeof Table<Client>>
export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}
export const Carregando: Story = { args: { loading: true } }
export const Vazia: Story = {
  args: { data: [], empty: { title: 'Nenhum cliente ainda', description: 'Cadastre o primeiro.' } },
}
export const ComErro: Story = {
  args: { error: 'O servidor não respondeu a tempo.', onRetry: () => {} },
}
export const Compacta: Story = { args: { density: 'compact' } }
export const Expansivel: Story = {
  args: { expandable: (c: Client) => <p className="text-sm">{c.notes}</p> },
}
export const CarregarMaisNoMobile: Story = { args: { mobilePagination: 'loadMore' } }

/* ------------------------------------------------ DataToolbar */

function ToolbarDemo() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string[]>([])
  const [cols, setCols] = useState([
    { id: 'email', label: 'E-mail', visible: true },
    { id: 'telefone', label: 'Telefone', visible: true },
  ])
  const columns: ToolbarColumn[] = cols.map((c) => ({
    ...c,
    onToggle: (v: boolean) =>
      setCols((prev) => prev.map((p) => (p.id === c.id ? { ...p, visible: v } : p))),
  }))
  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (!status.length || status.includes(c.status)),
  )
  return (
    <Card>
      <DataToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Buscar cliente' }}
        columns={columns}
        filterCount={status.length}
        onClearFilters={status.length ? () => setStatus([]) : undefined}
        chips={status.map((s) => ({
          id: s,
          label: `Situação: ${s}`,
          onRemove: () => setStatus(status.filter((x) => x !== s)),
        }))}
        filters={
          <div className="flex flex-col gap-3">
            {(['Ativo', 'Inadimplente'] as const).map((s) => (
              <Switch
                key={s}
                label={s}
                checked={status.includes(s)}
                onCheckedChange={(v) =>
                  setStatus(v ? [...status, s] : status.filter((x) => x !== s))
                }
              />
            ))}
          </div>
        }
        primaryAction={<Button>Novo cliente</Button>}
      />
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {filtered.slice(0, 5).map((c) => (
            <li key={c.id}>
              {c.name}
              {cols.find((col) => col.id === 'email')?.visible && ` · ${c.email}`}
              {cols.find((col) => col.id === 'telefone')?.visible && ` · ${c.phone}`}
            </li>
          ))}
          {!filtered.length && (
            <li className="text-muted-foreground">Nenhum cliente encontrado.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
export const BarraDeFerramentas: Story = {
  name: 'DataToolbar',
  render: () => <ToolbarDemo />,
}

/* ------------------------------------------------ Navegação */

export const Abas: Story = {
  name: 'Tabs (linha e pílula)',
  render: () => (
    <div className="flex flex-col gap-8">
      <Tabs
        aria-label="Seções"
        items={['Resumo', 'Contratos', 'Histórico'].map((l) => ({
          value: l,
          label: l,
          content: <p className="text-sm">{l}</p>,
        }))}
      />
      <Tabs
        variant="pill"
        aria-label="Período"
        items={['Hoje', 'Semana', 'Mês'].map((l) => ({
          value: l,
          label: l,
          content: <p className="text-sm">{l}</p>,
        }))}
      />
      <Tabs
        aria-label="Muitas abas"
        items={[
          'Dados gerais',
          'Endereços',
          'Contatos',
          'Contratos',
          'Faturas',
          'Documentos',
          'Histórico',
        ].map((l) => ({ value: l, label: l, content: <p className="text-sm">{l}</p> }))}
      />
    </div>
  ),
}
export const Trilha: Story = {
  name: 'Breadcrumb',
  render: () => (
    <Breadcrumb
      items={[
        { label: 'Painel', to: '/' },
        { label: 'Clientes', to: '/clientes' },
        { label: 'Detalhe' },
      ]}
    />
  ),
}

function PaginationDemo() {
  const [p, setP] = useState(3)
  return (
    <Pagination
      page={p}
      pageSize={10}
      total={243}
      onPageChange={setP}
      onPageSizeChange={() => {}}
    />
  )
}
export const Paginacao: Story = { name: 'Pagination', render: () => <PaginationDemo /> }
export const Etapas: Story = {
  name: 'Stepper (concluída, com erro, atual, pendente)',
  render: () => (
    <Stepper
      current={2}
      errors={[1]}
      steps={[
        { id: '1', title: 'Dados' },
        { id: '2', title: 'Endereço' },
        { id: '3', title: 'Contrato' },
        { id: '4', title: 'Revisão' },
      ]}
    />
  ),
}

function WizardDemo({ rotulosEPular }: { rotulosEPular?: boolean }) {
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const extras = rotulosEPular
    ? ({
        nextLabel: 'Seguir',
        backLabel: 'Anterior',
        cancelLabel: 'Sair',
        onCancel: () => undefined,
        onSkip: () => undefined,
        skipLabel: 'Pular etapa',
      } as const)
    : {}
  return (
    <Wizard
      {...extras}
      steps={[
        { id: 'dados', title: 'Dados', description: 'Nome e cidade' },
        { id: 'revisao', title: 'Revisão', description: 'Confira antes de concluir' },
      ]}
      onValidateStep={(index) => index !== 0 || nome.trim().length > 0}
      onFinish={() => undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" required>
          <Input value={nome} onChange={setNome} />
        </Field>
        <Field label="Cidade">
          <Input value={cidade} onChange={setCidade} />
        </Field>
      </div>
      <p className="text-sm">
        Revisão: {nome || '(sem nome)'} · {cidade || '(sem cidade)'}
      </p>
    </Wizard>
  )
}
export const Assistente: Story = {
  name: 'Wizard (etapas com validação)',
  render: () => <WizardDemo />,
}
export const AssistenteComRotulosEPular: Story = {
  name: 'Wizard (rótulos próprios e Pular em "Mais ações")',
  render: () => <WizardDemo rotulosEPular />,
}

/* ------------------------------------------------ Dados */

export const Indicadores: Story = {
  name: 'StatCard',
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        highlight
        label="Receita do mês"
        value={formatCurrency(61300)}
        change={4.4}
        changeLabel="vs. agosto"
        icon={<Wallet />}
      />
      <StatCard
        label="Clientes ativos"
        value="1.284"
        change={-2.1}
        changeLabel="vs. agosto"
        icon={<Users />}
      />
    </div>
  ),
}
export const Cartao: Story = {
  name: 'Card',
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Contrato 1042</CardTitle>
        <CardDescription>Vigente até 31/12/2026</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Plano mensal.</p>
      </CardContent>
      <CardFooter>
        <ActionBar cancel={{ label: 'Ver histórico' }} primary={{ label: 'Renovar' }} />
      </CardFooter>
    </Card>
  ),
}
function WidgetGridDemo() {
  const [editable, setEditable] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <Button variant="outline" onClick={() => setEditable((v) => !v)}>
        {editable ? 'Concluir ajustes' : 'Ajustar painel'}
      </Button>
      <WidgetGrid
        editable={editable}
        storageKey="story-widget-grid"
        widgets={[
          {
            id: 'receita',
            w: 4,
            h: 3,
            content: (
              <StatCard
                className="h-full"
                label="Receita do mês"
                value={formatCurrency(61300)}
                change={4.4}
                changeLabel="vs. agosto"
                icon={<Wallet />}
              />
            ),
          },
          {
            id: 'ativos',
            w: 4,
            h: 3,
            content: (
              <StatCard
                className="h-full"
                label="Clientes ativos"
                value="1.284"
                change={2.1}
                changeLabel="vs. agosto"
                icon={<Users />}
              />
            ),
          },
          {
            id: 'grafico',
            w: 8,
            h: 7,
            minH: 5,
            content: (
              <Card className="h-full overflow-hidden">
                <CardHeader>
                  <CardTitle>Receita e meta</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 flex-1">
                  <Chart
                    aria-label="Receita e meta por mês"
                    type="area"
                    height="fill"
                    data={monthly}
                    xKey="mes"
                    series={[
                      { key: 'receita', label: 'Receita' },
                      { key: 'meta', label: 'Meta', color: 3 },
                    ]}
                  />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
export const GradeDeWidgets: Story = {
  name: 'WidgetGrid',
  render: () => <WidgetGridDemo />,
}

export const Etiquetas: Story = {
  name: 'Badge',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Neutro</Badge>
      <Badge tone="success" dot>
        Ativo
      </Badge>
      <Badge tone="warning" dot>
        Em análise
      </Badge>
      <Badge tone="error" solid>
        Atrasado
      </Badge>
      <Badge tone="info">Novo</Badge>
    </div>
  ),
}
export const Avatares: Story = {
  name: 'Avatar e grupo',
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar name="Ana Ribeiro" size="lg" />
      <AvatarGroup
        people={['Ana Ribeiro', 'Bruno Costa', 'Carla Mendes', 'Diego Lima', 'Elisa Souza'].map(
          (name) => ({ name }),
        )}
        max={3}
      />
    </div>
  ),
}
export const Lista: Story = {
  render: () => (
    <List
      items={clients.slice(0, 4).map((c) => ({
        id: c.id,
        title: c.name,
        description: c.city,
        leading: <Avatar name={c.name} />,
        trailing: (
          <Badge tone={statusTone[c.status]} dot>
            {c.status}
          </Badge>
        ),
        to: `/clientes/${c.id}`,
      }))}
    />
  ),
}

function ListaReordenavelDemo() {
  const [order, setOrder] = useState(() => clients.slice(0, 4))
  return (
    <List
      items={order.map((c) => ({
        id: c.id,
        title: c.name,
        description: c.city,
        tone: c.status === 'Ativo' ? 'success' : c.status === 'Inadimplente' ? 'error' : 'neutral',
      }))}
      onReorder={(items) =>
        setOrder(items.map((it) => order.find((c) => c.id === it.id)!).filter(Boolean))
      }
    />
  )
}
export const ListaReordenavel: Story = {
  name: 'List: sortable + tone',
  render: () => <ListaReordenavelDemo />,
}

export const LinhaDoTempo: Story = {
  name: 'Timeline',
  render: () => (
    <Timeline
      events={[
        { id: '1', title: 'Contrato assinado', date: '22/09/2026', status: 'succeeded' },
        { id: '2', title: 'Proposta enviada', date: '18/09/2026', tone: 'info' },
        { id: '3', title: 'Cobrança recusada', date: '15/09/2026', status: 'failed' },
        { id: '4', title: 'Lembrete ignorado', date: '13/09/2026', status: 'skipped' },
        { id: '5', title: 'Cadastro', date: '02/09/2026' },
      ]}
    />
  ),
}
export const Acordeao: Story = {
  name: 'Accordion',
  render: () => (
    <Accordion
      items={[
        { value: '1', title: 'Pergunta um', content: 'Resposta um.' },
        { value: '2', title: 'Pergunta dois', content: 'Resposta dois.' },
      ]}
    />
  ),
}
export const GraficoArea: Story = {
  name: 'Chart: área',
  render: () => (
    <Chart
      aria-label="Receita"
      type="area"
      data={monthly}
      xKey="mes"
      series={[
        { key: 'receita', label: 'Receita' },
        { key: 'meta', label: 'Meta', color: 3 },
      ]}
    />
  ),
}
export const GraficoBarra: Story = {
  name: 'Chart: barra',
  render: () => (
    <Chart
      aria-label="Receita"
      type="bar"
      data={monthly}
      xKey="mes"
      series={[{ key: 'receita', label: 'Receita' }]}
    />
  ),
}
export const GraficoLinha: Story = {
  name: 'Chart: linha',
  render: () => (
    <Chart
      aria-label="Receita"
      type="line"
      data={monthly}
      xKey="mes"
      series={[
        { key: 'receita', label: 'Receita' },
        { key: 'meta', label: 'Meta', color: 3 },
      ]}
    />
  ),
}
export const GraficoPizza: Story = {
  name: 'Chart: pizza',
  render: () => (
    <Chart
      aria-label="Segmentos"
      type="pie"
      data={bySegment}
      xKey="segmento"
      series={[{ key: 'clientes', label: 'Clientes' }]}
    />
  ),
}

export const CodigoQR: Story = {
  name: 'QrCode',
  render: () => (
    <QrCode value="https://rendra.example.com/clientes/42" aria-label="Código QR de exemplo" />
  ),
}
export const CodigoQRVazio: Story = {
  name: 'QrCode: vazio',
  render: () => <QrCode value="" />,
}

// PNGs mínimos (1x1) em cores diferentes, embutidos como data: URL, para a story funcionar
// sem depender de rede.
const GALERIA: ViewerImage[] = [
  {
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    alt: 'Foto da fachada',
    caption: 'Fachada da loja',
  },
  {
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfz0AEYBxVSF+FABJDAwPgeGSvAAAAAElFTkSuQmCC',
    alt: 'Foto do interior',
    caption: 'Interior da loja',
  },
]

function GaleriaDemo() {
  const [index, setIndex] = useState<number | null>(null)
  return (
    <>
      <Button variant="outline" onClick={() => setIndex(0)}>
        Abrir galeria
      </Button>
      <ImageViewer images={GALERIA} index={index} onIndexChange={setIndex} />
    </>
  )
}
export const Galeria: Story = {
  name: 'ImageViewer',
  render: () => <GaleriaDemo />,
}
