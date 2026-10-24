/*
 * Simulação do fluxo, um passo por vez e sem executar nada: a espera só diz quanto aguardaria e
 * as mensagens só dizem o que enviariam, com os dados de exemplo do gatilho. Pura, sem DOM.
 */
import {
  buildWebhookRequest,
  describeWait,
  flowSampleData,
  isTrigger,
  renderTemplate,
  rulesOf,
  ruleSummary,
} from './flow-blocks'
import {
  migrateFlow,
  nodeName,
  validateFlow,
  type Flow,
  type FlowIssue,
  type FlowNode,
  type FlowNodeType,
  type FlowRule,
} from './flow'

export interface SimulationStep {
  nodeId: string
  type: FlowNodeType
  label: string
  status: 'succeeded' | 'failed' | 'skipped'
  detail?: string
}

export interface SimulationState {
  status: 'idle' | 'running' | 'finished' | 'error'
  steps: SimulationStep[]
  /** Bloco que o próximo avanço executa (o bloco ativo); `null` fora da simulação. */
  currentId: string | null
  issues: FlowIssue[]
}

export function resetSimulation(): SimulationState {
  return { status: 'idle', steps: [], currentId: null, issues: [] }
}

/** Começa no gatilho. Fluxo inválido não inicia: devolve `error` com os problemas. */
export function startSimulation(input: Flow): SimulationState {
  const flow = migrateFlow(input)
  const issues = validateFlow(flow)
  if (issues.length > 0) return { status: 'error', steps: [], currentId: null, issues }
  const trigger = flow.nodes.find((n) => isTrigger(n.type))!
  return { status: 'running', steps: [], currentId: trigger.id, issues: [] }
}

/** Avalia uma regra contra os dados de exemplo; campo que não existe conta como vazio. */
export function evaluateRule(rule: FlowRule, data: Record<string, string>): boolean {
  const actual = data[rule.field] ?? ''
  const wanted = rule.value
  switch (rule.operator) {
    case 'igual':
      return actual === wanted
    case 'diferente':
      return actual !== wanted
    case 'maior':
    case 'menor': {
      const a = Number(actual)
      const b = Number(wanted)
      if (actual.trim() === '' || wanted.trim() === '' || Number.isNaN(a) || Number.isNaN(b))
        return false
      return rule.operator === 'maior' ? a > b : a < b
    }
    case 'contem':
      return actual.includes(wanted)
    case 'vazio':
      return actual === ''
    case 'nao-vazio':
      return actual !== ''
  }
}

const FREQUENCY: Record<string, string> = {
  diario: 'todo dia',
  semanal: 'toda semana',
  mensal: 'todo mês',
}
const RECORD: Record<string, string> = { cliente: 'cliente', pedido: 'pedido', negocio: 'negócio' }
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** A regra que bate primeiro (ou `null`, e o caminho segue por "Senão"). */
function matchedRule(node: FlowNode, data: Record<string, string>) {
  const rules = rulesOf(node)
  const index = rules.findIndex((r) => evaluateRule(r, data))
  return { rule: index < 0 ? null : rules[index]!, index }
}

function conditionDetail(node: FlowNode, data: Record<string, string>) {
  const { rule, index } = matchedRule(node, data)
  return rule
    ? `Regra ${index + 1} bateu: ${ruleSummary(rule)}, seguiu por ela`
    : 'Nenhuma regra bateu, seguiu por Senão'
}

function blockDetail(node: FlowNode, data: Record<string, string>): string {
  const c = node.data.config
  switch (node.type) {
    case 'webhook-entrada':
      return `Receberia ${str(c?.method) || 'POST'} em ${str(c?.path)}`
    case 'agendamento':
      return `Iniciaria ${FREQUENCY[str(c?.frequency)] ?? ''} às ${str(c?.time)}`.replace('  ', ' ')
    case 'registro-criado':
      return `Iniciaria quando um ${RECORD[str(c?.record)] ?? 'registro'} fosse criado`
    case 'whatsapp':
      return `Enviaria WhatsApp para ${renderTemplate(str(c?.to), data)}: "${renderTemplate(str(c?.message), data)}"`
    case 'email':
      return `Enviaria e-mail para ${renderTemplate(str(c?.to), data)}, assunto "${renderTemplate(str(c?.subject), data)}": "${renderTemplate(str(c?.message), data)}"`
    case 'espera':
      return describeWait(c)
    case 'webhook-saida': {
      const r = buildWebhookRequest(c, data)
      return `Enviaria ${r.method} ${r.url} com ${JSON.stringify(r.body)}`
    }
    case 'tarefa': {
      const days = typeof c?.dueDays === 'number' ? c.dueDays : 0
      return `Criaria a tarefa "${renderTemplate(str(c?.title), data)}" para ${str(c?.assignee) || 'ninguém'} com prazo de ${days} ${days === 1 ? 'dia' : 'dias'}`
    }
    case 'condicao':
      return conditionDetail(node, data)
    default:
      return 'Executaria o bloco'
  }
}

const stepOf = (node: FlowNode, detail: string): SimulationStep => ({
  nodeId: node.id,
  type: node.type,
  label: nodeName(node),
  status: 'succeeded',
  detail,
})

/** Roda só um bloco, com os mesmos dados de exemplo, e devolve o passo (o play do card). */
export function simulateBlock(input: Flow, nodeId: string): SimulationStep | null {
  const flow = migrateFlow(input)
  const node = flow.nodes.find((n) => n.id === nodeId)
  return node ? stepOf(node, blockDetail(node, flowSampleData(flow))) : null
}

/** Executa o bloco ativo (um passo) e passa ao próximo. A condição escolhe sozinha a saída. */
export function advanceSimulation(input: Flow, state: SimulationState): SimulationState {
  if (state.status !== 'running' || !state.currentId) return state
  const flow = migrateFlow(input)
  const node = flow.nodes.find((n) => n.id === state.currentId)
  const fail = (): SimulationState => ({
    ...state,
    status: 'error',
    currentId: null,
    issues: [
      {
        code: 'fluxo-mudou',
        message: 'O fluxo mudou durante o teste. Reinicie para testar de novo.',
      },
    ],
  })
  if (!node) return fail()

  const data = flowSampleData(flow)
  let output: string | undefined
  if (node.type === 'condicao') output = matchedRule(node, data).rule?.id ?? 'senao'
  const edge = flow.edges.find((e) => e.source === node.id && (e.branch ?? undefined) === output)
  const target = edge ? flow.nodes.find((n) => n.id === edge.target) : undefined
  if (edge && !target) return fail()

  const detail = blockDetail(node, data)
  const step = stepOf(node, target ? detail : `${detail}. Caminho encerrado`)
  const steps = [...state.steps, step]
  if (!target) return { status: 'finished', steps, currentId: null, issues: [] }
  return { status: 'running', steps, currentId: target.id, issues: [] }
}
