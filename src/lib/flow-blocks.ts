/*
 * Catálogo dos blocos de automação: nomes, grupos, configuração padrão, campos obrigatórios,
 * variáveis `{{x}}`, dados de exemplo e resumos de card. Funções puras; nada daqui importa o
 * React Flow nem valores de `flow.ts` (só tipos), para o item `core` do registry não depender
 * dele e para não haver ciclo de módulos.
 */
import type {
  Flow,
  FlowEdge,
  FlowNode,
  FlowNodeType,
  FlowRule,
  FlowRuleOperator,
  FlowWaitUnit,
} from './flow'

/* ----------------------------------------------------------------------- medidas */

/** Largura do card do bloco em px (igual a `w-flow-node`, 20rem). */
export const FLOW_CARD_W = 320
export const FLOW_GAP_X = 96
export const FLOW_GAP_Y = 32
/** Altura mínima de uma linha de saída da condição em px (alvo de toque, `min-h-touch`). */
const ROW_H = 44

/* ------------------------------------------------------------------------ espera */

export const FLOW_WAIT_UNITS: readonly FlowWaitUnit[] = ['segundos', 'minutos', 'horas', 'dias']

const WAIT_SINGULAR: Record<FlowWaitUnit, string> = {
  segundos: 'segundo',
  minutos: 'minuto',
  horas: 'hora',
  dias: 'dia',
}

const isUnit = (v: unknown): v is FlowWaitUnit =>
  typeof v === 'string' && (FLOW_WAIT_UNITS as readonly string[]).includes(v)

/** A duração do bloco de espera ("5 minutos"), ou `null` se o config não a define. */
export function formatWait(config: Record<string, unknown> | undefined): string | null {
  const duration = config?.duration
  const unit = config?.unit
  if (typeof duration !== 'number' || !Number.isFinite(duration) || !isUnit(unit)) return null
  return `${duration} ${duration === 1 ? WAIT_SINGULAR[unit] : unit}`
}

/** Texto da espera simulada: nunca espera de verdade. */
export function describeWait(config: Record<string, unknown> | undefined): string {
  const wait = formatWait(config)
  return wait ? `Aguardaria ${wait}` : 'Aguardaria o tempo definido no bloco'
}

/* ------------------------------------------------------------------------ blocos */

export type FlowBlockGroupId = 'gatilhos' | 'mensagens' | 'condicionais' | 'integracoes' | 'acoes'

export interface FlowBlockDef {
  type: FlowNodeType
  group: FlowBlockGroupId
  name: string
  /** Texto curto do card. */
  description: string
  /** Dica usada na busca da barra de blocos. */
  hint: string
  defaultConfig: () => Record<string, unknown>
  /** Campos de `config` que não podem ficar vazios. */
  required: { key: string; label: string }[]
  /** Fora da barra de blocos (tipos legados). */
  hidden?: boolean
}

const none = () => ({})

export const FLOW_BLOCKS: Record<FlowNodeType, FlowBlockDef> = {
  'webhook-entrada': {
    type: 'webhook-entrada',
    group: 'gatilhos',
    name: 'Receber webhook',
    description: 'Inicia o fluxo quando outro sistema envia dados.',
    hint: 'dados de outro sistema, endereço e mapeamento de campos',
    defaultConfig: () => ({
      method: 'POST',
      path: '/hooks/novo-evento',
      responseCode: 200,
      received: false,
      mapping: [],
    }),
    required: [{ key: 'path', label: 'Endereço' }],
  },
  agendamento: {
    type: 'agendamento',
    group: 'gatilhos',
    name: 'Agendamento',
    description: 'Inicia o fluxo em dia e horário definidos.',
    hint: 'diário, semanal ou mensal, em um horário',
    defaultConfig: () => ({ frequency: 'diario', time: '09:00' }),
    required: [{ key: 'time', label: 'Horário' }],
  },
  'registro-criado': {
    type: 'registro-criado',
    group: 'gatilhos',
    name: 'Registro criado',
    description: 'Inicia o fluxo quando um registro novo é criado.',
    hint: 'cliente, pedido ou negócio criado',
    defaultConfig: () => ({ record: 'cliente' }),
    required: [],
  },
  whatsapp: {
    type: 'whatsapp',
    group: 'mensagens',
    name: 'Enviar WhatsApp',
    description: 'Envia uma mensagem de WhatsApp.',
    hint: 'mensagem de texto para um telefone',
    defaultConfig: () => ({ to: '', message: '' }),
    required: [
      { key: 'to', label: 'Para' },
      { key: 'message', label: 'Mensagem' },
    ],
  },
  email: {
    type: 'email',
    group: 'mensagens',
    name: 'Enviar e-mail',
    description: 'Envia um e-mail.',
    hint: 'mensagem com assunto para um endereço',
    defaultConfig: () => ({ to: '', subject: '', message: '' }),
    required: [
      { key: 'to', label: 'Para' },
      { key: 'subject', label: 'Assunto' },
      { key: 'message', label: 'Mensagem' },
    ],
  },
  condicao: {
    type: 'condicao',
    group: 'condicionais',
    name: 'Condição',
    description: 'Escolhe o caminho pelas regras.',
    hint: 'regras com campo, operador e valor, e a saída Senão',
    defaultConfig: () => ({ rules: [{ id: 'r1', field: '', operator: 'igual', value: '' }] }),
    required: [],
  },
  espera: {
    type: 'espera',
    group: 'condicionais',
    name: 'Esperar',
    description: 'Aguarda um tempo antes de seguir.',
    hint: 'pausa por segundos, minutos, horas ou dias',
    defaultConfig: () => ({ duration: 5, unit: 'minutos' }),
    required: [],
  },
  'webhook-saida': {
    type: 'webhook-saida',
    group: 'integracoes',
    name: 'Enviar webhook',
    description: 'Envia dados para outro sistema.',
    hint: 'requisição com corpo montado das variáveis',
    defaultConfig: () => ({ method: 'POST', url: '', headers: [], body: [] }),
    required: [{ key: 'url', label: 'Endereço' }],
  },
  tarefa: {
    type: 'tarefa',
    group: 'acoes',
    name: 'Criar tarefa',
    description: 'Cria uma tarefa para uma pessoa.',
    hint: 'título, responsável e prazo em dias',
    defaultConfig: () => ({ title: '', assignee: '', dueDays: 1 }),
    required: [{ key: 'title', label: 'Título' }],
  },
  gatilho: {
    type: 'gatilho',
    group: 'gatilhos',
    name: 'Gatilho personalizado',
    description: 'Gatilho sem configuração.',
    hint: '',
    defaultConfig: none,
    required: [],
    hidden: true,
  },
  acao: {
    type: 'acao',
    group: 'acoes',
    name: 'Ação personalizada',
    description: 'Ação sem configuração.',
    hint: '',
    defaultConfig: none,
    required: [],
    hidden: true,
  },
  fim: {
    type: 'fim',
    group: 'acoes',
    name: 'Fim',
    description: 'Encerra o caminho.',
    hint: '',
    defaultConfig: none,
    required: [],
    hidden: true,
  },
}

export const FLOW_BLOCK_GROUPS: { id: FlowBlockGroupId; name: string; types: FlowNodeType[] }[] = [
  {
    id: 'gatilhos',
    name: 'Gatilhos',
    types: ['webhook-entrada', 'agendamento', 'registro-criado'],
  },
  { id: 'mensagens', name: 'Mensagens', types: ['whatsapp', 'email'] },
  { id: 'condicionais', name: 'Condicionais', types: ['condicao', 'espera'] },
  { id: 'integracoes', name: 'Integrações', types: ['webhook-saida'] },
  { id: 'acoes', name: 'Ações internas', types: ['tarefa'] },
]

/** Nome do tipo de bloco, como aparece na interface. */
export const FLOW_TYPE_NAME = Object.fromEntries(
  (Object.keys(FLOW_BLOCKS) as FlowNodeType[]).map((t) => [t, FLOW_BLOCKS[t].name]),
) as Record<FlowNodeType, string>

/** Gatilho é todo bloco do grupo Gatilhos (inclui o legado `gatilho`). */
export const isTrigger = (type: FlowNodeType) => FLOW_BLOCKS[type].group === 'gatilhos'

/* --------------------------------------------------------------------- campos e dados */

export const FLOW_SYSTEM_FIELDS: { value: string; label: string }[] = [
  { value: 'cliente.nome', label: 'Cliente › Nome' },
  { value: 'cliente.email', label: 'Cliente › E-mail' },
  { value: 'cliente.telefone', label: 'Cliente › Telefone' },
  { value: 'cliente.plano', label: 'Cliente › Plano' },
  { value: 'negocio.valor', label: 'Negócio › Valor' },
  { value: 'pedido.id', label: 'Pedido › Número' },
]

/** O JSON de exemplo que "chega" no Receber webhook (simulado). */
export const FLOW_SAMPLE_PAYLOAD = {
  cliente: {
    nome: 'Ana Souza',
    email: 'ana@exemplo.com',
    telefone: '+55 11 98888-0000',
    plano: 'pro',
  },
  pedido: { id: 'PED-1042', valor: 1250, criado_em: '2026-10-24' },
}

/** Resposta de exemplo do Enviar webhook (simulado). */
export const FLOW_SAMPLE_RESPONSE = '200 OK { "id": "crm-88" }'

/** Achata o JSON em caminhos (`cliente.nome`) e valores em texto, na ordem de leitura. */
export function flattenPayload(payload: unknown, prefix = ''): { path: string; value: string }[] {
  if (payload && typeof payload === 'object' && !Array.isArray(payload))
    return Object.entries(payload).flatMap(([k, v]) =>
      flattenPayload(v, prefix ? `${prefix}.${k}` : k),
    )
  return [{ path: prefix, value: String(payload) }]
}

const SAMPLE_VALUES: Record<string, string> = {
  ...Object.fromEntries(flattenPayload(FLOW_SAMPLE_PAYLOAD).map((e) => [e.path, e.value])),
  'negocio.titulo': 'Proposta Plano Pro',
  'negocio.valor': '1250',
  'agendamento.data': '24/10/2026',
}

const RECORD_VARIABLES: Record<string, string[]> = {
  cliente: ['cliente.nome', 'cliente.email', 'cliente.telefone'],
  pedido: ['pedido.id', 'pedido.valor', 'cliente.nome'],
  negocio: ['negocio.titulo', 'negocio.valor', 'cliente.nome'],
}

const VARIABLE_LABEL: Record<string, string> = {
  ...Object.fromEntries(FLOW_SYSTEM_FIELDS.map((f) => [f.value, f.label])),
  'pedido.valor': 'Pedido › Valor',
  'negocio.titulo': 'Negócio › Título',
  'agendamento.data': 'Agendamento › Data',
}

export interface FlowVariable {
  /** O que vai entre chaves: `{{id}}`. */
  id: string
  label: string
}

const asList = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    : []

/** Variáveis que os blocos podem usar: as do gatilho do fluxo (sem escopo por caminho). */
export function flowVariables(flow: Flow): FlowVariable[] {
  const trigger = flow.nodes.find((n) => isTrigger(n.type))
  if (!trigger) return []
  const cfg = trigger.data.config
  if (trigger.type === 'webhook-entrada')
    return asList(cfg?.mapping)
      .filter((m) => typeof m.from === 'string' && typeof m.to === 'string' && m.to !== '')
      .map((m) => ({
        id: m.from as string,
        label: VARIABLE_LABEL[m.to as string] ?? (m.to as string),
      }))
  if (trigger.type === 'registro-criado') {
    const ids = RECORD_VARIABLES[String(cfg?.record)] ?? RECORD_VARIABLES.cliente!
    return ids.map((id) => ({ id, label: VARIABLE_LABEL[id] ?? id }))
  }
  if (trigger.type === 'agendamento')
    return [{ id: 'agendamento.data', label: VARIABLE_LABEL['agendamento.data']! }]
  return []
}

/** Valores de exemplo de cada variável do fluxo (usados no teste e na simulação). */
export function flowSampleData(flow: Flow): Record<string, string> {
  return Object.fromEntries(flowVariables(flow).map((v) => [v.id, SAMPLE_VALUES[v.id] ?? '']))
}

export interface TemplatePart {
  kind: 'text' | 'var'
  value: string
}

const VARIABLE = /\{\{\s*([\w.]+)\s*\}\}/g

/** Parte o texto em trechos e variáveis `{{x}}` (as variáveis viram chips no card). */
export function splitVariables(text: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  let last = 0
  for (const m of text.matchAll(VARIABLE)) {
    if (m.index > last) parts.push({ kind: 'text', value: text.slice(last, m.index) })
    parts.push({ kind: 'var', value: m[1]! })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}

/** Troca cada `{{x}}` pelo valor de exemplo; variável sem valor fica como está. */
export function renderTemplate(text: string, data: Record<string, string>): string {
  return text.replace(VARIABLE, (whole, id: string) => data[id] ?? whole)
}

/* ------------------------------------------------------------------------ regras */

export const FLOW_RULE_OPERATORS: { value: FlowRuleOperator; label: string; symbol: string }[] = [
  { value: 'igual', label: 'é igual a', symbol: '=' },
  { value: 'diferente', label: 'é diferente de', symbol: '≠' },
  { value: 'maior', label: 'é maior que', symbol: '>' },
  { value: 'menor', label: 'é menor que', symbol: '<' },
  { value: 'contem', label: 'contém', symbol: 'contém' },
  { value: 'vazio', label: 'está vazio', symbol: 'vazio' },
  { value: 'nao-vazio', label: 'não está vazio', symbol: 'preenchido' },
]

/** Operadores que dispensam o valor. */
export const operatorHasValue = (op: FlowRuleOperator) => op !== 'vazio' && op !== 'nao-vazio'

const operatorOf = (op: FlowRuleOperator) => FLOW_RULE_OPERATORS.find((o) => o.value === op)

export const isRuleComplete = (rule: FlowRule) =>
  rule.field.trim() !== '' &&
  !!operatorOf(rule.operator) &&
  (!operatorHasValue(rule.operator) || rule.value.trim() !== '')

/** "pedido.valor é maior que 500". */
export function ruleSummary(rule: FlowRule): string {
  if (!isRuleComplete(rule)) return 'Regra incompleta'
  const op = operatorOf(rule.operator)!.label
  return operatorHasValue(rule.operator)
    ? `${rule.field} ${op} ${rule.value}`
    : `${rule.field} ${op}`
}

/** As regras do bloco condição (lista vazia se o config não as traz). */
export function rulesOf(node: Pick<FlowNode, 'data'>): FlowRule[] {
  return asList(node.data.config?.rules).map((r) => ({
    id: String(r.id ?? ''),
    ...(typeof r.label === 'string' ? { label: r.label } : {}),
    field: String(r.field ?? ''),
    operator: (operatorOf(r.operator as FlowRuleOperator)
      ? r.operator
      : 'igual') as FlowRuleOperator,
    value: String(r.value ?? ''),
  }))
}

/** Nome da saída: o rótulo da regra (ou "Regra N") e "Senão". */
export function branchName(node: Pick<FlowNode, 'data'>, branch: string): string {
  if (branch === 'senao') return 'Senão'
  const rules = rulesOf(node)
  const i = rules.findIndex((r) => r.id === branch)
  return i < 0 ? branch : rules[i]!.label || `Regra ${i + 1}`
}

/** Menor `rN` livre para uma regra nova. */
export function nextRuleId(rules: { id: string }[]): string {
  const taken = new Set(rules.map((r) => r.id))
  let n = 1
  while (taken.has(`r${n}`)) n++
  return `r${n}`
}

/** Texto curto na ligação que sai de uma condição ("> 500", "= pro", "Senão"). */
export function edgeLabel(flow: Flow, edge: FlowEdge): string | null {
  const from = flow.nodes.find((n) => n.id === edge.source)
  if (!from || from.type !== 'condicao' || !edge.branch) return null
  if (edge.branch === 'senao') return 'Senão'
  const rule = rulesOf(from).find((r) => r.id === edge.branch)
  if (!rule) return null
  if (!isRuleComplete(rule)) return branchName(from, edge.branch)
  const symbol = operatorOf(rule.operator)!.symbol
  return operatorHasValue(rule.operator) ? `${symbol} ${rule.value}` : symbol
}

/** Saídas de um bloco: as regras e "Senão" na condição; uma só nos demais. */
export function outputIds(node: Pick<FlowNode, 'type' | 'data'>): (string | undefined)[] {
  return node.type === 'condicao' ? [...rulesOf(node).map((r) => r.id), 'senao'] : [undefined]
}

/* ---------------------------------------------------------------------- resumo */

const FREQUENCY: Record<string, string> = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }
const RECORD: Record<string, string> = { cliente: 'Cliente', pedido: 'Pedido', negocio: 'Negócio' }
const text = (v: unknown) => (typeof v === 'string' ? v : '')

/** Linhas "rótulo e valor" do resumo no card (variáveis `{{x}}` viram chips). */
export function summarizeConfig(node: Pick<FlowNode, 'type' | 'data'>): {
  label: string
  value: string
}[] {
  const c = node.data.config
  switch (node.type) {
    case 'webhook-entrada': {
      const mapped = asList(c?.mapping)
        .filter((m) => text(m.to) !== '')
        .map((m) => `{{${text(m.from)}}}`)
        .join(' ')
      return [
        {
          label: 'Método e endereço',
          value: `${text(c?.method) || 'POST'} ${text(c?.path)}`.trim(),
        },
        { label: 'Campos mapeados', value: mapped },
      ]
    }
    case 'agendamento':
      return [
        { label: 'Frequência', value: FREQUENCY[text(c?.frequency)] ?? '' },
        { label: 'Horário', value: text(c?.time) },
      ]
    case 'registro-criado':
      return [{ label: 'Registro', value: RECORD[text(c?.record)] ?? '' }]
    case 'whatsapp':
      return [
        { label: 'Para', value: text(c?.to) },
        { label: 'Mensagem', value: text(c?.message) },
      ]
    case 'email':
      return [
        { label: 'Para', value: text(c?.to) },
        { label: 'Assunto', value: text(c?.subject) },
        { label: 'Mensagem', value: text(c?.message) },
      ]
    case 'espera':
      return [{ label: 'Tempo', value: formatWait(c) ?? '' }]
    case 'webhook-saida':
      return [
        {
          label: 'Método e endereço',
          value: `${text(c?.method) || 'POST'} ${text(c?.url)}`.trim(),
        },
        {
          label: 'Corpo',
          value: asList(c?.body)
            .map((b) => text(b.value))
            .filter(Boolean)
            .join(' '),
        },
      ]
    case 'tarefa': {
      const days = typeof c?.dueDays === 'number' ? c.dueDays : 0
      return [
        { label: 'Título', value: text(c?.title) },
        { label: 'Responsável', value: text(c?.assignee) },
        { label: 'Prazo', value: `${days} ${days === 1 ? 'dia' : 'dias'}` },
      ]
    }
    default:
      return []
  }
}

/** Requisição simulada do Enviar webhook, com os valores de exemplo no corpo. */
export function buildWebhookRequest(
  config: Record<string, unknown> | undefined,
  data: Record<string, string>,
): { method: string; url: string; body: Record<string, string> } {
  const body: Record<string, string> = {}
  for (const b of asList(config?.body))
    if (text(b.key) !== '') body[text(b.key)] = renderTemplate(text(b.value), data)
  return { method: text(config?.method) || 'POST', url: text(config?.url), body }
}

/** Altura estimada do card em px, usada enquanto o React Flow ainda não mediu o bloco. */
export function estimateNodeHeight(node: Pick<FlowNode, 'type' | 'data'>): number {
  if (node.type === 'condicao') return 88 + ROW_H * (rulesOf(node).length + 1)
  return 104 + 28 * summarizeConfig(node).length
}
