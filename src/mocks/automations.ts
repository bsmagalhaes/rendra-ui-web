import type { BadgeProps } from '@/components/ui/badge'
import type { Flow } from '@/lib/flow'
import { layoutFlow } from '@/lib/flow-layout'

/*
 * Dados fictícios de demonstração das telas de automações e do FlowEditor. Nada daqui é
 * executado de verdade: troque por chamadas à sua API.
 */

export type AutomationStatus = 'rascunho' | 'ativo' | 'desativado'

export interface Automation {
  id: string
  name: string
  /** Nome do gatilho, como aparece na listagem. */
  trigger: string
  status: AutomationStatus
  /** ISO; `null` quando nunca rodou. */
  lastRunAt: string | null
  runs: number
}

export const automationStatusLabel: Record<AutomationStatus, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  desativado: 'Desativado',
}

export const automationStatusTone: Record<AutomationStatus, NonNullable<BadgeProps['tone']>> = {
  rascunho: 'neutral',
  ativo: 'success',
  desativado: 'warning',
}

export const automations: Automation[] = [
  {
    id: 'a1',
    name: 'Boas-vindas ao novo cliente',
    trigger: 'Receber webhook',
    status: 'ativo',
    lastRunAt: '2026-09-23T09:42:00-03:00',
    runs: 128,
  },
  {
    id: 'a2',
    name: 'Cobrança de fatura vencida',
    trigger: 'Agendamento',
    status: 'ativo',
    lastRunAt: '2026-09-23T08:00:00-03:00',
    runs: 312,
  },
  {
    id: 'a3',
    name: 'Aviso de novo pedido',
    trigger: 'Registro criado',
    status: 'ativo',
    lastRunAt: '2026-09-22T17:15:00-03:00',
    runs: 87,
  },
  {
    id: 'a4',
    name: 'Pesquisa de satisfação',
    trigger: 'Agendamento',
    status: 'desativado',
    lastRunAt: '2026-09-10T09:00:00-03:00',
    runs: 45,
  },
  {
    id: 'a5',
    name: 'Reativação de clientes inativos',
    trigger: 'Agendamento',
    status: 'rascunho',
    lastRunAt: null,
    runs: 0,
  },
  {
    id: 'a6',
    name: 'Lembrete de tarefa atrasada',
    trigger: 'Registro criado',
    status: 'desativado',
    lastRunAt: '2026-09-15T10:30:00-03:00',
    runs: 19,
  },
]

export interface AutomationRunStep {
  label: string
  status: 'succeeded' | 'failed' | 'skipped'
  detail: string
}

export interface AutomationRun {
  id: string
  /** ISO. */
  startedAt: string
  status: 'sucesso' | 'erro'
  durationMs: number
  trigger: string
  steps: AutomationRunStep[]
}

const OK_STEPS: AutomationRunStep[] = [
  { label: 'Receber webhook', status: 'succeeded', detail: 'Recebeu POST em /hooks/novo-cliente' },
  { label: 'Enviar WhatsApp', status: 'succeeded', detail: 'Enviou a mensagem de boas-vindas' },
  {
    label: 'Condição',
    status: 'succeeded',
    detail: 'Regra 1 bateu: pedido.valor é maior que 500, seguiu por ela',
  },
  { label: 'Enviar webhook', status: 'succeeded', detail: 'Respondeu 200 OK' },
]

const FAILED_STEPS: AutomationRunStep[] = [
  OK_STEPS[0]!,
  OK_STEPS[1]!,
  OK_STEPS[2]!,
  { label: 'Enviar webhook', status: 'failed', detail: 'O endereço remoto respondeu 500' },
]

const SKIPPED_STEPS: AutomationRunStep[] = [
  OK_STEPS[0]!,
  { label: 'Enviar WhatsApp', status: 'failed', detail: 'O telefone informado não é válido' },
  { label: 'Condição', status: 'skipped', detail: 'Não executado por causa do erro anterior' },
  {
    label: 'Enviar webhook',
    status: 'skipped',
    detail: 'Não executado por causa do erro anterior',
  },
]

const run = (
  id: number,
  startedAt: string,
  status: AutomationRun['status'],
  durationMs: number,
  steps: AutomationRunStep[],
): AutomationRun => ({
  id: `e${id}`,
  startedAt: `${startedAt}-03:00`,
  status,
  durationMs,
  trigger: 'Receber webhook',
  steps,
})

/** 20 execuções entre 10/09/2026 e 23/09/2026, da mais recente para a mais antiga. */
export const automationRuns: AutomationRun[] = [
  run(20, '2026-09-23T09:42:00', 'sucesso', 1240, OK_STEPS),
  run(19, '2026-09-23T08:15:00', 'sucesso', 1180, OK_STEPS),
  run(18, '2026-09-22T17:05:00', 'erro', 2310, FAILED_STEPS),
  run(17, '2026-09-22T14:30:00', 'sucesso', 1320, OK_STEPS),
  run(16, '2026-09-21T11:20:00', 'sucesso', 1090, OK_STEPS),
  run(15, '2026-09-20T16:45:00', 'erro', 890, SKIPPED_STEPS),
  run(14, '2026-09-19T10:10:00', 'sucesso', 1410, OK_STEPS),
  run(13, '2026-09-18T15:55:00', 'sucesso', 1270, OK_STEPS),
  run(12, '2026-09-17T09:30:00', 'sucesso', 1150, OK_STEPS),
  run(11, '2026-09-16T13:00:00', 'erro', 2480, FAILED_STEPS),
  run(10, '2026-09-15T18:20:00', 'sucesso', 1330, OK_STEPS),
  run(9, '2026-09-15T08:40:00', 'sucesso', 1210, OK_STEPS),
  run(8, '2026-09-14T12:05:00', 'sucesso', 1100, OK_STEPS),
  run(7, '2026-09-13T19:35:00', 'sucesso', 1380, OK_STEPS),
  run(6, '2026-09-12T10:50:00', 'erro', 760, SKIPPED_STEPS),
  run(5, '2026-09-12T09:00:00', 'sucesso', 1250, OK_STEPS),
  run(4, '2026-09-11T16:10:00', 'sucesso', 1170, OK_STEPS),
  run(3, '2026-09-11T08:25:00', 'sucesso', 1290, OK_STEPS),
  run(2, '2026-09-10T14:15:00', 'sucesso', 1140, OK_STEPS),
  run(1, '2026-09-10T09:05:00', 'sucesso', 1360, OK_STEPS),
]

/*
 * Fluxo de demonstração (o do rascunho aprovado): recebe o webhook, avisa por WhatsApp e escolhe o
 * caminho por duas regras; o "Senão" fica sem ligação, e quem não tem saída encerra o caminho.
 * Usado pela vitrine (/componentes), pelas stories e pela tela /automacoes/nova.
 */
export const automationFlow: Flow = layoutFlow({
  version: 2,
  nodes: [
    {
      id: 'webhook-entrada-1',
      type: 'webhook-entrada',
      position: { x: 0, y: 0 },
      data: {
        label: 'Receber webhook',
        config: {
          method: 'POST',
          path: '/hooks/novo-cliente',
          responseCode: 200,
          received: true,
          mapping: [
            { from: 'cliente.nome', to: 'cliente.nome' },
            { from: 'cliente.email', to: 'cliente.email' },
            { from: 'cliente.telefone', to: 'cliente.telefone' },
            { from: 'cliente.plano', to: 'cliente.plano' },
            { from: 'pedido.valor', to: 'negocio.valor' },
          ],
        },
      },
    },
    {
      id: 'whatsapp-1',
      type: 'whatsapp',
      position: { x: 0, y: 0 },
      data: {
        label: 'Enviar WhatsApp',
        config: {
          to: '{{cliente.telefone}}',
          message: 'Olá, {{cliente.nome}}! Seu pedido chegou.',
        },
      },
    },
    {
      id: 'condicao-1',
      type: 'condicao',
      position: { x: 0, y: 0 },
      data: {
        label: 'Condição',
        config: {
          rules: [
            { id: 'r1', field: 'pedido.valor', operator: 'maior', value: '500' },
            { id: 'r2', field: 'cliente.plano', operator: 'igual', value: 'pro' },
          ],
        },
      },
    },
    {
      id: 'webhook-saida-1',
      type: 'webhook-saida',
      position: { x: 0, y: 0 },
      data: {
        label: 'Enviar webhook',
        config: {
          method: 'POST',
          url: 'https://crm.exemplo/api',
          headers: [],
          body: [
            { key: 'nome', value: '{{cliente.nome}}' },
            { key: 'email', value: '{{cliente.email}}' },
            { key: 'valor', value: '{{pedido.valor}}' },
          ],
        },
      },
    },
    {
      id: 'tarefa-1',
      type: 'tarefa',
      position: { x: 0, y: 0 },
      data: {
        label: 'Criar tarefa',
        config: { title: 'Ligar para {{cliente.nome}}', assignee: 'Ana Souza', dueDays: 1 },
      },
    },
  ],
  edges: [
    { id: 'webhook-entrada-1->whatsapp-1', source: 'webhook-entrada-1', target: 'whatsapp-1' },
    { id: 'whatsapp-1->condicao-1', source: 'whatsapp-1', target: 'condicao-1' },
    {
      id: 'condicao-1:r1->webhook-saida-1',
      source: 'condicao-1',
      target: 'webhook-saida-1',
      branch: 'r1',
    },
    {
      id: 'condicao-1:r2->tarefa-1',
      source: 'condicao-1',
      target: 'tarefa-1',
      branch: 'r2',
    },
  ],
})
