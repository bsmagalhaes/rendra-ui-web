import { CheckCircle2 } from 'lucide-react'
import { ActionBar } from '@/components/ui/action-bar'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FlowPanelShell } from '@/components/ui/flow-sidebar'
import { Timeline, type TimelineEvent } from '@/components/ui/timeline'
import { nodeName, type Flow, type FlowIssue } from '@/lib/flow'
import {
  advanceSimulation,
  startSimulation,
  type SimulationState,
  type SimulationStep,
} from '@/lib/flow-sim'

/*
 * Peças internas do FlowEditor, na barra lateral: o teste do fluxo (um passo por vez, sem executar
 * nada) e a validação. A condição escolhe sozinha a saída, avaliando as regras contra os dados
 * de exemplo do gatilho, e o passo diz qual regra bateu.
 */

function IssueList({
  flow,
  issues,
  onViewBlock,
}: {
  flow: Flow
  issues: FlowIssue[]
  onViewBlock: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {issues.map((i, k) => {
        const node = flow.nodes.find((n) => n.id === i.nodeId)
        return (
          <li
            key={`${i.code}-${i.nodeId ?? i.edgeId ?? k}-${k}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-control border bg-card px-3 py-2 text-sm"
          >
            <span>{i.message}</span>
            {i.nodeId && (
              <Button
                size="sm"
                variant="outline"
                aria-label={`Ver bloco ${node ? nodeName(node) : i.nodeId}`}
                onClick={() => onViewBlock(i.nodeId!)}
              >
                Ver bloco
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export interface FlowSimulationPanelProps {
  flow: Flow
  sim: SimulationState
  /** Resultado de rodar só um bloco (o play do card); aparece enquanto não há teste completo. */
  blockStep: SimulationStep | null
  onSim: (sim: SimulationState) => void
  onClose: () => void
  onViewBlock: (id: string) => void
}

export function FlowSimulationPanel({
  flow,
  sim,
  blockStep,
  onSim,
  onClose,
  onViewBlock,
}: FlowSimulationPanelProps) {
  const steps = sim.steps.length === 0 && blockStep ? [blockStep] : sim.steps
  const events: TimelineEvent[] = steps.map((s, i) => ({
    id: `${i}-${s.nodeId}`,
    title: s.label,
    description: s.detail,
    date: blockStep && sim.steps.length === 0 ? 'Só este bloco' : `Passo ${i + 1}`,
    status: s.status,
  }))
  return (
    <FlowPanelShell title="Teste do fluxo" onClose={onClose} closeLabel="Fechar teste">
      <ActionBar
        primary={{
          label: 'Avançar',
          disabled: sim.status !== 'running',
          onClick: () => onSim(advanceSimulation(flow, sim)),
        }}
        cancel={{ label: 'Reiniciar', onClick: () => onSim(startSimulation(flow)) }}
      />
      {sim.status === 'error' && (
        <div className="flex flex-col gap-3">
          <Alert type="error" title="O fluxo precisa de ajustes antes do teste" />
          <IssueList flow={flow} issues={sim.issues} onViewBlock={onViewBlock} />
        </div>
      )}
      {sim.status === 'finished' && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm font-medium text-success-soft-foreground"
        >
          <CheckCircle2 className="size-icon-md" aria-hidden />
          Fluxo concluído
        </p>
      )}
      {events.length > 0 && <Timeline events={events} />}
      {events.length === 0 && sim.status !== 'error' && (
        <p className="text-sm text-muted-foreground">Nenhum passo executado ainda.</p>
      )}
    </FlowPanelShell>
  )
}

export interface FlowValidationPanelProps {
  flow: Flow
  issues: FlowIssue[]
  onClose: () => void
  onViewBlock: (id: string) => void
}

export function FlowValidationPanel({
  flow,
  issues,
  onClose,
  onViewBlock,
}: FlowValidationPanelProps) {
  return (
    <FlowPanelShell title="Validação do fluxo" onClose={onClose} closeLabel="Fechar validação">
      <div aria-live="polite" className="flex flex-col gap-3">
        {issues.length === 0 ? (
          <Alert type="success" title="Fluxo válido" />
        ) : (
          <>
            <Alert
              type="error"
              title={
                issues.length === 1
                  ? '1 problema encontrado'
                  : `${issues.length} problemas encontrados`
              }
            />
            <IssueList flow={flow} issues={issues} onViewBlock={onViewBlock} />
          </>
        )}
      </div>
    </FlowPanelShell>
  )
}
