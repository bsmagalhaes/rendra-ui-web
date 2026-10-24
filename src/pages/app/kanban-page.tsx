import { useMemo, useState } from 'react'
import { Container, PageHeader, Stack } from '@/components/layout'
import { cn } from '@/lib/cn'
import { Kanban, moveKanbanCard, type KanbanCard } from '@/components/ui/kanban'
import { toast } from '@/components/ui/toast'
import { demoTargetMessage, kanbanDemoTargets } from '@/mocks/kanban-targets'
import { demoCards, pipelineColumns, pipelineValues } from '@/mocks/planning'

/** Amostra de cor da legenda: os mesmos tokens do card, com a frase ao lado (cor nunca é a única informação). */
function LegendRow({
  swatch,
  title,
  children,
}: {
  swatch: string
  title: string
  children: string
}) {
  return (
    <li className="flex items-start gap-3 text-left">
      <span aria-hidden className={cn('size-6 shrink-0 rounded-item border', swatch)} />
      <span className="text-sm">
        <span className="font-medium">{title}.</span> {children}
      </span>
    </li>
  )
}

const legend = (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">Cor do card</p>
      <ul className="flex flex-col gap-2">
        <LegendRow swatch="bg-critical-soft" title="Crítico (vermelho forte)">
          A cadência da etapa venceu e o card está sem próxima atividade ou com atividade atrasada.
        </LegendRow>
        <LegendRow swatch="bg-destructive-soft" title="Cadência vencida (vermelho claro)">
          O card ficou mais dias na etapa do que a cadência permite.
        </LegendRow>
        <LegendRow swatch="bg-warning-soft" title="Sem atividade (amarelo claro)">
          O card não tem próxima atividade agendada.
        </LegendRow>
        <LegendRow swatch="bg-card" title="Normal (branco)">
          Cadência em dia e com próxima atividade.
        </LegendRow>
      </ul>
    </div>
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">Calendário da próxima atividade</p>
      <ul className="flex flex-col gap-2">
        <LegendRow swatch="rounded-full bg-info-soft" title="Azul claro">
          Em dia, com a data no futuro.
        </LegendRow>
        <LegendRow swatch="rounded-full bg-warning-mid" title="Amarelo">
          Vence hoje.
        </LegendRow>
        <LegendRow swatch="rounded-full bg-destructive" title="Vermelho escuro">
          Atrasada.
        </LegendRow>
        <LegendRow swatch="rounded-full border-dashed border-muted-foreground" title="Tracejado">
          Sem atividade agendada.
        </LegendRow>
      </ul>
    </div>
    <p className="text-sm">
      A cadência é o máximo de dias que um card pode ficar em cada etapa. Ela aparece no cabeçalho
      da coluna e recomeça quando o card muda de etapa.
    </p>
  </div>
)

/**
 * Funil de vendas em kanban. Arraste os cards no computador; no toque ou no teclado,
 * use o menu do card ("Mover para"). No celular, uma coluna por vez, pelas abas. Arrastar
 * um card até o rodapé flutuante encerra ele (lixeira, congelar, perder ou ganhar), com
 * confirmação.
 */
export function KanbanPage() {
  const initial = useMemo(() => demoCards(), [])
  const [cards, setCards] = useState<KanbanCard[]>(initial)

  return (
    <Container padded>
      <Stack gap="section">
        <PageHeader title="Funil de vendas" help={legend} />
        <Kanban
          aria-label="Funil de vendas"
          columns={pipelineColumns}
          cards={cards}
          valueFields={pipelineValues}
          toolbar
          storageKey="rendra-kanban-funil"
          dropTargets={kanbanDemoTargets}
          onCardMove={(id, to, index) => {
            setCards((list) => {
              const from = list.find((c) => c.id === id)?.columnId
              const moved = moveKanbanCard(list, id, to, index)
              // Mudou de etapa: a contagem da cadência recomeça.
              return from === to
                ? moved
                : moved.map((c) => (c.id === id ? { ...c, enteredColumnAt: new Date() } : c))
            })
            const col = pipelineColumns.find((c) => c.id === to)
            if (col) toast.success(`Movido para ${col.title}`)
          }}
          onDropTarget={(cardId, targetId, reason) => {
            setCards((list) => list.filter((c) => c.id !== cardId))
            toast.info(demoTargetMessage(targetId, reason))
          }}
          onCardClick={(c) => toast.info(c.title, { description: c.description })}
          onAddCard={(col) =>
            toast.info('Novo card', {
              description: `Em ${pipelineColumns.find((c) => c.id === col)?.title}`,
            })
          }
          onNewCard={() => toast.info('Novo card')}
        />
      </Stack>
    </Container>
  )
}
