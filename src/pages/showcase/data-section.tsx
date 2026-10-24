import { Download, Eye, Mail, Pencil, Trash2, TrendingUp, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Grid, Inline, Stack } from '@/components/layout'
import { Accordion } from '@/components/ui/accordion'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Field } from '@/components/ui/field'
import { FlowEditor } from '@/components/ui/flow-editor'
import { FlowViewer } from '@/components/ui/flow-viewer'
import { Input } from '@/components/ui/input'
import { List } from '@/components/ui/list'
import { QrCode } from '@/components/ui/qr-code'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { Table } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { clientColumns } from '@/pages/app/client-columns'
import { Timeline } from '@/components/ui/timeline'
import { toast } from '@/components/ui/toast'
import { WidgetGrid, type Widget } from '@/components/ui/widget-grid'
import { bySegment, clients, monthly, statusTone, type Client } from '@/mocks/clients'
import { serializeFlow, type Flow } from '@/lib/flow'
import { automationFlow } from '@/mocks/automations'
import { formatCurrency } from '@/lib/masks'
import { CatalogCode, Demo, GroupTitle, Row } from './demo'

/* Fluxo de exemplo da vitrine e da story (o mesmo da tela /automacoes/nova). */
export const demoFlow = automationFlow

/* Widgets de exemplo para a vitrine do WidgetGrid (cada um já é um card). */
const demoWidgets: Widget[] = [
  {
    id: 'receita',
    w: 4,
    h: 2,
    content: <StatCard label="Receita do mês" value={formatCurrency(61300)} change={4.4} />,
  },
  {
    id: 'clientes',
    w: 4,
    h: 2,
    content: <StatCard label="Clientes ativos" value="1.284" change={2.1} />,
  },
  {
    id: 'custo',
    w: 4,
    h: 2,
    content: (
      <StatCard label="Custo por cliente" value={formatCurrency(38.9)} change={-3.2} inverse />
    ),
  },
]

/** Demonstra List sortable: arraste a alça ou use as setas do teclado. */
function ListaReordenavel() {
  const [order, setOrder] = useState(() => clients.slice(0, 4))
  return (
    <List
      items={order.map((c) => ({ id: c.id, title: c.name, description: c.city }))}
      onReorder={(items) =>
        setOrder(items.map((it) => order.find((c) => c.id === it.id)!).filter(Boolean))
      }
    />
  )
}

export function DataSection() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string[]>([])
  const [state, setState] = useState<'data' | 'loading' | 'empty' | 'error'>('data')
  const [density, setDensity] = useState<'compact' | 'default' | 'comfortable'>('default')
  const [qrValue, setQrValue] = useState('https://rendra.example.com/clientes/42')
  const [flow, setFlow] = useState<Flow>(demoFlow)
  const data =
    state === 'empty' ? [] : clients.filter((c) => !status.length || status.includes(c.status))

  return (
    <>
      <GroupTitle
        id="grupo-dados"
        title="Dados"
        description="Tabela única que vira cards no celular, indicadores, listas, linha do tempo e gráficos com as cores do template."
      />

      <Demo
        id="table"
        title="Table"
        description="Barra de ferramentas (DataToolbar, prop toolbar) no mesmo card. Seleção na primeira coluna, ações na última com largura fixa, números à direita, datas curtas e texto com até 3 linhas. No celular vira cards com 'Ver detalhes' e ações em massa numa barra fixa no rodapé."
        props="columns (kind, mobile, lines, sortable, hideable), selectable, expandable, sortable, globalFilter, columnVisibility, bulkActions, rowActions, density, loading, error, empty, pageSize, mobilePagination, toolbar"
        code={['TAB-001', 'DTB-001']}
        bare
      >
        <Grid cols={{ base: 1, md: 2 }} gap="4">
          <Select
            label="Estado da tabela"
            value={state}
            onChange={(v) => v && setState(v as typeof state)}
            options={[
              { value: 'data', label: 'Com dados' },
              { value: 'loading', label: 'Carregando (skeleton)' },
              { value: 'empty', label: 'Vazia' },
              { value: 'error', label: 'Com erro' },
            ]}
          />
          <Select
            label="Densidade"
            value={density}
            onChange={(v) => v && setDensity(v as typeof density)}
            options={[
              { value: 'compact', label: 'Compacta' },
              { value: 'default', label: 'Padrão' },
              { value: 'comfortable', label: 'Confortável' },
            ]}
          />
        </Grid>
        <Table<Client>
          aria-label="Clientes"
          data={data}
          columns={clientColumns}
          getRowId={(c) => c.id}
          selectable
          columnVisibility
          globalFilter={search}
          density={density}
          loading={state === 'loading'}
          error={state === 'error' ? 'O servidor não respondeu a tempo.' : null}
          onRetry={() => setState('data')}
          empty={{
            title: 'Nenhum cliente ainda',
            description: 'Cadastre o primeiro cliente para começar.',
            action: <Button>Novo cliente</Button>,
          }}
          pageSize={8}
          expandable={(c) => (
            <p className="text-sm text-muted-foreground">
              Responsável: <strong className="font-medium text-foreground">{c.owner}</strong>.{' '}
              {c.notes}
            </p>
          )}
          rowActions={[
            { label: 'Ver', icon: <Eye />, onClick: (c) => toast.info(`Abrindo ${c.name}`) },
            { label: 'Editar', icon: <Pencil />, onClick: (c) => toast.info(`Editando ${c.name}`) },
            {
              label: 'Enviar e-mail',
              icon: <Mail />,
              onClick: (c) => toast.success('E-mail enviado', { description: c.email }),
            },
            {
              label: 'Excluir',
              icon: <Trash2 />,
              destructive: true,
              onClick: (c) => toast.error(`${c.name} excluído`),
            },
          ]}
          bulkMenu={[
            {
              label: 'Marcar como ativo',
              onClick: (sel, clear) => {
                toast.success(`${sel.length} marcados como ativos`)
                clear()
              },
            },
            {
              label: 'Enviar e-mail',
              icon: <Mail />,
              onClick: (sel) => toast.success(`E-mail enviado para ${sel.length}`),
            },
            {
              label: 'Arquivar',
              onClick: (sel, clear) => {
                toast.info(`${sel.length} arquivados`)
                clear()
              },
            },
          ]}
          bulkActions={(sel, clear) => (
            <>
              <Button
                size="sm"
                variant="outline"
                icon={<Download />}
                onClick={() => toast.success(`${sel.length} exportados`)}
              >
                Exportar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                icon={<Trash2 />}
                onClick={() => {
                  toast.error(`${sel.length} excluídos`)
                  clear()
                }}
              >
                Excluir
              </Button>
            </>
          )}
          toolbar={{
            search: { value: search, onChange: setSearch, placeholder: 'Buscar cliente' },
            filterCount: status.length,
            onClearFilters: status.length ? () => setStatus([]) : undefined,
            chips: status.map((s) => ({
              id: s,
              label: `Situação: ${s}`,
              onRemove: () => setStatus(status.filter((x) => x !== s)),
            })),
            filters: (
              <Stack gap="2">
                <span className="text-sm font-medium">Situação</span>
                <Select
                  multiple
                  label="Situação"
                  value={status}
                  onChange={setStatus}
                  options={['Ativo', 'Em análise', 'Inadimplente', 'Inativo'].map((s) => ({
                    value: s,
                    label: s,
                  }))}
                />
              </Stack>
            ),
            actions: (
              <Button
                variant="outline"
                size="sm"
                icon={<Download />}
                onClick={() => toast.info('Exportação iniciada')}
              >
                Exportar
              </Button>
            ),
          }}
        />
      </Demo>

      <Demo
        id="statcard"
        title="StatCard"
        description="Indicador com variação. No máximo um em destaque (degradê suave) por tela. Em grid: 1 coluna no celular, 2 para cards pequenos."
        props="label, value, change, changeLabel, inverse, icon, highlight, loading, footer"
        code="STAT-001"
      >
        <Grid cols={{ base: 1, sm: 2, xl: 4 }}>
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
            change={2.1}
            changeLabel="vs. agosto"
            icon={<Users />}
          />
          <StatCard
            label="Custo por cliente"
            value={formatCurrency(38.9)}
            change={-3.2}
            inverse
            changeLabel="vs. agosto"
            icon={<TrendingUp />}
          />
          <StatCard label="Carregando" value="" loading />
        </Grid>
      </Demo>

      <Demo
        id="card"
        title="Card"
        description="Agrupa conteúdo de página, com borda de 1px. Nunca card dentro de card nem rolagem dentro de card."
        props="CardHeader, CardTitle, CardDescription, CardContent, CardFooter"
        code="CARD-001"
      >
        <Grid cols={{ base: 1, md: 2 }}>
          <Card>
            <CardHeader>
              <CardTitle>Contrato 1042</CardTitle>
              <CardDescription>Vigente até 31/12/2026</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Plano mensal com renovação automática.</p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button size="sm" variant="ghost">
                Detalhes
              </Button>
            </CardFooter>
          </Card>
          <Card className="bg-gradient-soft">
            <CardHeader>
              <CardTitle>Destaque</CardTitle>
              <CardDescription>Com o degradê suave do template.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{formatCurrency(1250)}</p>
            </CardContent>
          </Card>
        </Grid>
      </Demo>

      <Demo
        id="badge"
        title="Badge"
        description="Tom semântico suave ou sólido, com bolinha opcional."
        props="tone (neutral, primary, success, warning, error, info, outline), solid, dot"
        code="BDG-001"
      >
        <Row label="Suaves">
          <Badge>Neutro</Badge>
          <Badge tone="primary">Primário</Badge>
          <Badge tone="success" dot>
            Ativo
          </Badge>
          <Badge tone="warning" dot>
            Em análise
          </Badge>
          <Badge tone="error" dot>
            Inadimplente
          </Badge>
          <Badge tone="info">Novo</Badge>
          <Badge tone="outline">Contorno</Badge>
        </Row>
        <Row label="Sólidos">
          <Badge tone="primary" solid>
            Primário
          </Badge>
          <Badge tone="success" solid>
            Pago
          </Badge>
          <Badge tone="warning" solid>
            Vence hoje
          </Badge>
          <Badge tone="error" solid>
            Atrasado
          </Badge>
          <Badge tone="info" solid>
            Info
          </Badge>
        </Row>
      </Demo>

      <Demo
        id="avatar"
        title="Avatar e grupo"
        description="Foto ou iniciais. O formato acompanha o template."
        props="Avatar (name, src, size) · AvatarGroup (people, max, size)"
      >
        <Row label="Tamanhos" code="AVT-001">
          <Avatar name="Ana Ribeiro" size="sm" />
          <Avatar name="Bruno Costa" />
          <Avatar name="Carla Mendes" size="lg" />
        </Row>
        <Row label="Em grupo, com o excedente" code="AVT-002">
          <AvatarGroup
            people={[
              { name: 'Ana Ribeiro' },
              { name: 'Bruno Costa' },
              { name: 'Carla Mendes' },
              { name: 'Diego Lima' },
              { name: 'Elisa Souza' },
              { name: 'Fábio Rocha' },
            ]}
          />
        </Row>
      </Demo>

      <Demo
        id="lista"
        title="Lista"
        description="Linhas com início, título, descrição e fim. Navegável por prop, reordenável por prop e com selo de status."
        props="items (title, description, leading, trailing, to, onClick, tone), divided, empty, onReorder, itemLabel"
        code={['LIST-001', 'LIST-002']}
      >
        <Row label="Padrão, com selo de status" code="LIST-001">
          <List
            items={clients.slice(0, 4).map((c, i) => ({
              id: c.id,
              title: c.name,
              description: `${c.city} · ${c.segment}`,
              leading: <Avatar name={c.name} />,
              trailing: (
                <Badge tone={statusTone[c.status]} dot>
                  {c.status}
                </Badge>
              ),
              to: `/clientes/${c.id}`,
              tone: i === 0 ? 'success' : i === 1 ? 'warning' : i === 2 ? 'error' : 'neutral',
            }))}
          />
        </Row>
        <Row label="Reordenável (arraste a alça ou use as setas)" code="LIST-002" block>
          <ListaReordenavel />
        </Row>
      </Demo>

      <Demo
        id="timeline"
        title="Timeline"
        description="Eventos em ordem, com tom semântico, data curta e resultado (status) com ícone e texto."
        props="events (title, description, date, tone, icon, status)"
        code="TLN-001"
      >
        <Timeline
          events={[
            {
              id: '1',
              title: 'Contrato assinado',
              description: 'Plano Profissional, 12 meses.',
              date: '22/09/2026 14:30',
              status: 'succeeded',
            },
            { id: '2', title: 'Proposta enviada', date: '18/09/2026 09:10', tone: 'info' },
            {
              id: '3',
              title: 'Cobrança automática',
              description: 'Cartão recusado pelo banco.',
              date: '15/09/2026',
              status: 'failed',
            },
            {
              id: '4',
              title: 'Lembrete de renovação',
              description: 'Cliente já tinha renovado antes.',
              date: '13/09/2026',
              status: 'skipped',
            },
            { id: '5', title: 'Cliente cadastrado', date: '02/09/2026' },
          ]}
        />
      </Demo>

      <Demo
        id="accordion"
        title="Accordion"
        description="Blocos recolhíveis com animação de altura."
        props="items (value, title, content, disabled), multiple, defaultValue"
        code="ACRN-001"
      >
        <Accordion
          defaultValue={['1']}
          items={[
            {
              value: '1',
              title: 'Como troco de template?',
              content:
                'Pelo menu do avatar, em Template. No código, editando theme.css e brand.config.ts.',
            },
            {
              value: '2',
              title: 'Posso usar só a paleta de outro template?',
              content: 'Sim: escolha o modelo e depois a paleta de cores.',
            },
            { value: '3', title: 'Item desabilitado', content: 'Não abre.', disabled: true },
          ]}
        />
      </Demo>

      <Demo
        id="chart"
        title="Chart"
        description="Linha, barra, área, pizza, combinado, velocímetro de meta e funil, com as cores do template. No celular: legenda abaixo, eixos simplificados e opção de ver os valores em lista."
        props="type (line, bar, area, pie, combo, gauge, funnel), data, xKey, series (key, label, color, kind), valueFormatter, height, listThreshold"
      >
        <Grid cols={{ base: 1, lg: 2 }} gap="8">
          <Stack gap="2">
            <Inline gap="2" align="center">
              <span className="text-sm font-medium">Área</span>
              <CatalogCode code="CHT-003" />
            </Inline>
            <Chart
              aria-label="Receita e meta por mês"
              type="area"
              data={monthly}
              xKey="mes"
              series={[
                { key: 'receita', label: 'Receita' },
                { key: 'meta', label: 'Meta' },
              ]}
              valueFormatter={(n) => `R$ ${(n / 1000).toLocaleString('pt-BR')} mil`}
            />
          </Stack>
          <Stack gap="2">
            <Inline gap="2" align="center">
              <span className="text-sm font-medium">Barras</span>
              <CatalogCode code="CHT-002" />
            </Inline>
            <Chart
              aria-label="Receita por mês"
              type="bar"
              data={monthly}
              xKey="mes"
              series={[{ key: 'receita', label: 'Receita' }]}
              valueFormatter={(n) => `${(n / 1000).toLocaleString('pt-BR')} mil`}
            />
          </Stack>
          <Stack gap="2">
            <Inline gap="2" align="center">
              <span className="text-sm font-medium">Linha</span>
              <CatalogCode code="CHT-001" />
            </Inline>
            <Chart
              aria-label="Receita e meta em linha"
              type="line"
              data={monthly}
              xKey="mes"
              series={[
                { key: 'receita', label: 'Receita' },
                { key: 'meta', label: 'Meta', color: 3 },
              ]}
              valueFormatter={(n) => `${(n / 1000).toLocaleString('pt-BR')} mil`}
            />
          </Stack>
          <Stack gap="2">
            <Inline gap="2" align="center">
              <span className="text-sm font-medium">Pizza</span>
              <CatalogCode code="CHT-004" />
            </Inline>
            <Chart
              aria-label="Clientes por segmento"
              type="pie"
              data={bySegment}
              xKey="segmento"
              series={[{ key: 'clientes', label: 'Clientes' }]}
            />
          </Stack>
          <Stack gap="2">
            <Inline gap="2" align="center">
              <span className="text-sm font-medium">Combinado (barra e linha)</span>
              <CatalogCode code="CHT-005" />
            </Inline>
            <Chart
              aria-label="Receita em barras e meta em linha"
              type="combo"
              data={monthly}
              xKey="mes"
              series={[
                { key: 'receita', label: 'Receita', kind: 'bar' },
                { key: 'meta', label: 'Meta', kind: 'line', color: 3 },
              ]}
              valueFormatter={(n) => `${(n / 1000).toLocaleString('pt-BR')} mil`}
            />
          </Stack>
          <Stack gap="2">
            <Inline gap="2" align="center">
              <span className="text-sm font-medium">Velocímetro de meta</span>
              <CatalogCode code="CHT-006" />
            </Inline>
            <Chart
              aria-label="Meta do mês"
              type="gauge"
              value={61300}
              max={80000}
              target={70000}
              label="Receita do mês"
              valueFormatter={formatCurrency}
            />
          </Stack>
          <Stack gap="2" className="md:col-span-2">
            <Inline gap="2" align="center">
              <span className="text-sm font-medium">Funil</span>
              <CatalogCode code="CHT-007" />
            </Inline>
            <Chart
              aria-label="Funil de vendas"
              type="funnel"
              stages={[
                { label: 'Visitas', value: 4200 },
                { label: 'Contatos', value: 1180 },
                { label: 'Propostas', value: 320 },
                { label: 'Fechados', value: 96 },
              ]}
            />
          </Stack>
        </Grid>
      </Demo>

      <Demo
        id="qrcode"
        title="QrCode"
        description="Código QR gerado por um codificador próprio, sem serviço externo. Valor vazio mostra o estado vazio; um valor grande demais para o nível de correção escolhido mostra a falha, sem quebrar a tela."
        props="value, size, errorCorrection (low, medium, quartile, high), aria-label"
        code="QRC-001"
      >
        <Grid cols={{ base: 1, md: 2 }} gap="8">
          <Field label="Valor codificado" help="O QR muda ao digitar.">
            <Input value={qrValue} onChange={setQrValue} />
          </Field>
          <Stack gap="2" align="center">
            <QrCode value={qrValue} size={160} aria-label="Código QR de exemplo" />
          </Stack>
        </Grid>
      </Demo>

      <Demo
        id="widgets"
        title="WidgetGrid"
        description="Painel em widgets que se encaixam sozinhos. Com editable, dá para arrastar e redimensionar, e a arrumação fica salva no navegador; no celular, os widgets empilham. A tela Painel mostra a edição com Ajustar dashboard."
        props="widgets (id, w, h, minW, minH, content), editable, storageKey"
        code="WDG-001"
        bare
      >
        <WidgetGrid widgets={demoWidgets} />
      </Demo>

      <Demo
        id="fluxo-editor"
        title="FlowEditor"
        description="Editor de fluxos de automação no estilo N8N: blocos agrupados na barra lateral, configuração por bloco, webhooks simulados, condição com várias regras e teste do caminho. Nada é executado de verdade. No celular a barra abre num Drawer. O JSON abaixo é o que a tela guarda."
        props="value (Flow), onChange, readOnly, toolbar, testOpen, onTestOpenChange"
        code="FLX-001"
        bare
      >
        <Stack gap="4">
          <FlowEditor value={flow} onChange={setFlow} />
          <Card>
            <CardHeader>
              <CardTitle>JSON do fluxo</CardTitle>
              <CardDescription>Só leitura: muda a cada alteração no editor.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                aria-label="JSON do fluxo"
                rows={8}
                value={serializeFlow(flow)}
                className="font-mono"
              />
            </CardContent>
          </Card>
        </Stack>
      </Demo>

      <Demo
        id="fluxo-viewer"
        title="FlowViewer"
        description="O mesmo fluxo só para ler: aproximar, afastar e mover o canvas, sem arrastar, ligar ou apagar. activeId destaca um bloco."
        props="value (Flow), activeId, issues, className"
        code="FLX-002"
        bare
      >
        <FlowViewer value={demoFlow} activeId="condicao-1" />
      </Demo>
    </>
  )
}
