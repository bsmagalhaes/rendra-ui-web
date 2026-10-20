import { CalendarClock, TrendingUp, Users, Wallet } from 'lucide-react'
import { m } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { Container, Grid, PageHeader, Stack } from '@/components/layout'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Chart } from '@/components/ui/chart'
import { List } from '@/components/ui/list'
import { StatCard } from '@/components/ui/stat-card'
import { Timeline } from '@/components/ui/timeline'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/masks'
import {
  MotionModeScope,
  MotionProvider,
  RevealScope,
  useMotionMode,
  useMotionPresets,
  type MotionMode,
} from '@/lib/motion'
import { bySegment, clients, monthly, statusTone } from '@/mocks/clients'

/*
 * DASHBOARD COM MOTION (/dashboard-motion): um painel enxuto, com os mesmos mocks do painel
 * de /, para ver o motion carregando uma tela inteira. Em ligado: os indicadores contam até o
 * valor, os gráficos se desenham e os cartões entram em cascata (um por vez, de baixo para
 * cima). Em desligado, tudo aparece pronto, sem movimento nenhum.
 *
 * A grade é estática (`Grid`): o `WidgetGrid` não tem motion, porque disputa o `transform` com o
 * react-grid-layout. O `MotionProvider mode="on"` fica sempre montado e a chave só troca o modo
 * lido (`MotionModeScope`), como em /componentes-motion. Cada bloco troca de `div` para `m.div`
 * entre os modos, então a troca remonta o painel inteiro: religar a chave repete a entrada,
 * inclusive os gráficos, que só animam na primeira montagem. O teste de religar guarda isso.
 */

const modes = [
  { value: 'on', label: 'Ligado' },
  { value: 'off', label: 'Desligado' },
]

const mil = (n: number) =>
  `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`

const recentes = clients.slice(0, 5)

const eventos = [
  { id: '1', title: 'Contrato 1042 assinado', date: 'hoje, 14:30', tone: 'success' as const },
  {
    id: '2',
    title: 'Proposta enviada a Clínica Vida Plena',
    date: 'hoje, 09:10',
    tone: 'info' as const,
  },
  {
    id: '3',
    title: 'Fatura de agosto em atraso',
    description: 'Oficina Rota Sul 13',
    date: 'ontem',
    tone: 'error' as const,
  },
  { id: '4', title: '3 clientes cadastrados', date: '20/09/2026' },
]

/**
 * Um bloco da cascata. Em ligado entra com o reveal (600 ms, passo de 120 ms) e atraso pelo índice (na ordem visual);
 * em desligado é um `div` comum, sem `initial` nem `animate`.
 */
function Bloco({
  index,
  className,
  children,
}: {
  index: number
  className?: string
  children: ReactNode
}) {
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  if (!on) {
    return (
      <div data-bloco className={cn('min-w-0', className)}>
        {children}
      </div>
    )
  }
  const enter = presets.reveal('bottom')
  return (
    <m.div
      data-bloco
      className={cn('min-w-0', className)}
      initial={enter.initial}
      animate={enter.animate}
      transition={{ ...enter.transition, ...presets.staggerReveal(index) }}
    >
      {children}
    </m.div>
  )
}

function Painel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Conteudo() {
  return (
    <Grid cols={{ base: 1, md: 2, xl: 4 }} gap="4">
      <Bloco index={0}>
        <StatCard
          highlight
          className="h-full"
          label="Receita do mês"
          value={formatCurrency(61300)}
          change={4.4}
          changeLabel="vs. agosto"
          icon={<Wallet />}
        />
      </Bloco>
      <Bloco index={1}>
        <StatCard
          className="h-full"
          label="Clientes ativos"
          value="1.284"
          change={2.1}
          changeLabel="vs. agosto"
          icon={<Users />}
        />
      </Bloco>
      <Bloco index={2}>
        <StatCard
          className="h-full"
          label="Ticket médio"
          value={formatCurrency(478.4)}
          change={-1.2}
          changeLabel="vs. agosto"
          icon={<TrendingUp />}
        />
      </Bloco>
      <Bloco index={3}>
        <StatCard
          className="h-full"
          label="Vencem esta semana"
          value="23"
          change={0}
          changeLabel="contratos"
          icon={<CalendarClock />}
        />
      </Bloco>

      <Bloco index={4} className="md:col-span-2">
        <Painel title="Receita e meta" description="Faturado por mês comparado à meta.">
          <Chart
            aria-label="Receita e meta por mês"
            type="area"
            height="md"
            data={monthly}
            xKey="mes"
            series={[
              { key: 'receita', label: 'Receita' },
              { key: 'meta', label: 'Meta', color: 3 },
            ]}
            valueFormatter={mil}
          />
        </Painel>
      </Bloco>
      <Bloco index={5}>
        <Painel title="Clientes por segmento" description="Distribuição da carteira.">
          <Chart
            aria-label="Clientes por segmento"
            type="pie"
            height="md"
            data={bySegment}
            xKey="segmento"
            series={[{ key: 'clientes', label: 'Clientes' }]}
          />
        </Painel>
      </Bloco>
      <Bloco index={6}>
        <Painel title="Carteira por segmento" description="Uma cor por segmento.">
          <Chart
            aria-label="Clientes por segmento em barras coloridas"
            type="bar"
            height="md"
            colorByCategory
            data={bySegment}
            xKey="segmento"
            series={[{ key: 'clientes', label: 'Clientes' }]}
          />
        </Painel>
      </Bloco>

      <Bloco index={7} className="md:col-span-2">
        <Painel title="Clientes recentes">
          <List
            items={recentes.map((c) => ({
              id: c.id,
              title: c.name,
              description: `${c.city} · ${formatCurrency(c.revenue)}/mês`,
              leading: <Avatar name={c.name} />,
              trailing: (
                <Badge tone={statusTone[c.status]} dot>
                  {c.status}
                </Badge>
              ),
            }))}
          />
        </Painel>
      </Bloco>
      <Bloco index={8} className="md:col-span-2">
        <Painel title="Atividade">
          <Timeline events={eventos} />
        </Painel>
      </Bloco>
    </Grid>
  )
}

export function DashboardMotionPage() {
  const [mode, setMode] = useState<MotionMode>('on')

  return (
    <Container padded>
      <Stack gap="section">
        <PageHeader
          title="Dashboard com motion"
          description="Um painel que carrega com contagem, gráficos desenhando e cartões em cascata. Use a chave para ver sem motion."
          actions={
            <ButtonGroup
              aria-label="Motion"
              options={modes}
              value={mode}
              onChange={(v) => setMode(v as MotionMode)}
            />
          }
        />
        <MotionProvider mode="on">
          <MotionModeScope mode={mode}>
            {/* Chegada de painel: os gráficos desenham no tempo do reveal (900 ms), não no de rotina. */}
            <RevealScope>
              <Conteudo />
            </RevealScope>
          </MotionModeScope>
        </MotionProvider>
      </Stack>
    </Container>
  )
}
