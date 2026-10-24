/*
 * Fluxos de automação: contrato do JSON (formato v2), validação, leitura, escrita e conversão da
 * 2.7.0. Funções puras e imutáveis, com tipos próprios do Rendra: nada daqui importa o React Flow,
 * então o item `core` do registry não depende dele. A edição está em `flow-edit.ts`, a simulação
 * em `flow-sim.ts`, o catálogo de blocos em `flow-blocks.ts` e a arrumação em `flow-layout.ts`.
 */
import { FLOW_BLOCKS, FLOW_TYPE_NAME, isRuleComplete, isTrigger, rulesOf } from './flow-blocks'
import { layoutFlow } from './flow-layout'

export type FlowNodeType =
  | 'webhook-entrada'
  | 'agendamento'
  | 'registro-criado'
  | 'whatsapp'
  | 'email'
  | 'condicao'
  | 'espera'
  | 'webhook-saida'
  | 'tarefa'
  // legados da 2.7.0: `gatilho` e `acao` seguem válidos; `fim` só existe na leitura da 2.7.0
  | 'gatilho'
  | 'acao'
  | 'fim'
/** Id da regra da condição, ou `'senao'`. */
export type FlowBranch = string
export type FlowWaitUnit = 'segundos' | 'minutos' | 'horas' | 'dias'
export type FlowRuleOperator =
  'igual' | 'diferente' | 'maior' | 'menor' | 'contem' | 'vazio' | 'nao-vazio'

export interface FlowRule {
  id: string
  label?: string
  field: string
  operator: FlowRuleOperator
  /** Vazio nos operadores `vazio` e `nao-vazio`. */
  value: string
}

export interface FlowNode {
  id: string
  type: FlowNodeType
  position: { x: number; y: number }
  data: { label: string; config?: Record<string, unknown> }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  /** Só a saída de uma condição usa o ramo: o id da regra ou `senao`. */
  branch?: FlowBranch
}

export interface Flow {
  /** Ausente = formato da 2.7.0 (convertido ao ler). */
  version?: 2
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface FlowIssue {
  code: string
  message: string
  nodeId?: string
  edgeId?: string
}

const V2_TYPES: readonly string[] = [
  'webhook-entrada',
  'agendamento',
  'registro-criado',
  'whatsapp',
  'email',
  'condicao',
  'espera',
  'webhook-saida',
  'tarefa',
  'gatilho',
  'acao',
]
const LEGACY_TYPES: readonly string[] = ['gatilho', 'acao', 'condicao', 'espera', 'fim']

/** Nome do bloco para mensagens e rótulos: o rótulo, ou o tipo quando ele está vazio. */
export const nodeName = (n: Pick<FlowNode, 'type' | 'data'>) =>
  n.data.label.trim() || FLOW_TYPE_NAME[n.type]

/* ---------------------------------------------------------------- conversão da 2.7.0 */

function renameEdge(e: FlowEdge): FlowEdge {
  return {
    id: `${e.source}:senao->${e.target}`,
    source: e.source,
    target: e.target,
    branch: 'senao',
  }
}

/**
 * Leva um fluxo da 2.7.0 (sem `version`) ao formato v2: tira os blocos Fim, a condição vira uma
 * regra "Sim" mais "Senão", e os blocos são arrumados da esquerda para a direita. Quem já é v2
 * volta igual.
 */
export function migrateFlow(flow: Flow): Flow {
  if (flow.version === 2) return flow
  const fim = new Set(flow.nodes.filter((n) => n.type === 'fim').map((n) => n.id))
  const nodes = flow.nodes
    .filter((n) => !fim.has(n.id))
    .map((n) =>
      n.type === 'condicao' && !Array.isArray(n.data.config?.rules)
        ? {
            ...n,
            data: {
              ...n.data,
              config: {
                ...n.data.config,
                rules: [{ id: 'sim', label: 'Sim', field: '', operator: 'igual', value: '' }],
              },
            },
          }
        : n,
    )
  const edges = flow.edges
    .filter((e) => !fim.has(e.source) && !fim.has(e.target))
    .map((e) => (e.branch === 'nao' ? renameEdge(e) : e))
  return layoutFlow({ version: 2, nodes, edges })
}

/* ------------------------------------------------------------------------ validação */

/** Ligações que saem de cada bloco, na ordem do fluxo. */
function outgoing(flow: Flow) {
  const map = new Map<string, FlowEdge[]>()
  for (const e of flow.edges) map.set(e.source, [...(map.get(e.source) ?? []), e])
  return map
}

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== ''

/** Problemas do fluxo, em ordem estável: a mesma entrada dá sempre a mesma lista. */
export function validateFlow(input: Flow): FlowIssue[] {
  const flow = migrateFlow(input)
  const issues: FlowIssue[] = []
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  const out = outgoing(flow)

  const triggers = flow.nodes.filter((n) => isTrigger(n.type))
  if (triggers.length === 0)
    issues.push({ code: 'sem-gatilho', message: 'O fluxo precisa de um gatilho para começar.' })
  else if (triggers.length > 1)
    issues.push({
      code: 'varios-gatilhos',
      message: `O fluxo tem ${triggers.length} gatilhos, mas deve ter só um.`,
    })

  // Integridade: ligações apontando para o que não existe, ou com a saída errada.
  const sound: FlowEdge[] = []
  for (const e of flow.edges) {
    const from = byId.get(e.source)
    const to = byId.get(e.target)
    if (!from || !to) {
      issues.push({
        code: 'ligacao-invalida',
        message: 'Há uma ligação que aponta para um bloco que não existe.',
        edgeId: e.id,
      })
      continue
    }
    const validBranch =
      from.type === 'condicao'
        ? !!e.branch && (e.branch === 'senao' || rulesOf(from).some((r) => r.id === e.branch))
        : !e.branch
    if (!validBranch) {
      issues.push({
        code: 'ramo-invalido',
        message:
          from.type === 'condicao'
            ? `Uma saída da condição "${nodeName(from)}" não corresponde a nenhuma regra nem ao "Senão".`
            : `A ligação que sai de "${nodeName(from)}" não pode ter saída de regra: isso só vale para condição.`,
        nodeId: from.id,
        edgeId: e.id,
      })
      continue
    }
    sound.push(e)
  }

  for (const n of flow.nodes) {
    const edges = out.get(n.id) ?? []
    const name = nodeName(n)
    const cfg = n.data.config
    if (n.type === 'condicao') {
      const rules = rulesOf(n)
      if (rules.length === 0)
        issues.push({
          code: 'condicao-sem-regra',
          message: `A condição "${name}" precisa de ao menos uma regra.`,
          nodeId: n.id,
        })
      rules.forEach((r, i) => {
        if (!isRuleComplete(r))
          issues.push({
            code: 'regra-incompleta',
            message: `A regra ${i + 1} da condição "${name}" precisa de campo, operador e valor.`,
            nodeId: n.id,
          })
      })
      const seen = new Set<string>()
      let repeated = false
      for (const e of edges) {
        if (!e.branch) continue
        if (seen.has(e.branch)) repeated = true
        seen.add(e.branch)
      }
      if (repeated)
        issues.push({
          code: 'condicao-saida-repetida',
          message: `A condição "${name}" tem mais de uma ligação na mesma saída.`,
          nodeId: n.id,
        })
    } else if (edges.length > 1) {
      issues.push({
        code: 'varias-saidas',
        message: `O bloco "${name}" tem mais de uma saída; só a condição pode ter.`,
        nodeId: n.id,
      })
    }
    for (const f of FLOW_BLOCKS[n.type].required)
      if (!filled(cfg?.[f.key]))
        issues.push({
          code: 'config-obrigatoria-vazia',
          message: `O bloco "${name}" precisa do campo "${f.label}".`,
          nodeId: n.id,
        })
    if (n.type === 'espera' && !(typeof cfg?.duration === 'number' && cfg.duration > 0))
      issues.push({
        code: 'config-obrigatoria-vazia',
        message: `O bloco "${name}" precisa de uma duração maior que zero.`,
        nodeId: n.id,
      })
  }

  const next = new Map<string, string[]>()
  for (const e of sound) next.set(e.source, [...(next.get(e.source) ?? []), e.target])

  // Alcançáveis a partir do gatilho (sem gatilho, nada é acusado: o problema já é outro).
  if (triggers.length > 0) {
    const seen = new Set<string>()
    const stack = triggers.map((t) => t.id)
    while (stack.length) {
      const id = stack.pop()!
      if (seen.has(id)) continue
      seen.add(id)
      stack.push(...(next.get(id) ?? []))
    }
    for (const n of flow.nodes)
      if (!seen.has(n.id))
        issues.push({
          code: 'inalcancavel',
          message: `O bloco "${nodeName(n)}" não é alcançado a partir do gatilho.`,
          nodeId: n.id,
        })
  }

  // Ciclos: busca em profundidade, uma queixa por laço encontrado.
  const state = new Map<string, 1 | 2>()
  const path: string[] = []
  const visit = (id: string) => {
    state.set(id, 1)
    path.push(id)
    for (const t of next.get(id) ?? []) {
      if (state.get(t) === 1) {
        const loop = [...path.slice(path.indexOf(t)), t].map((x) => `"${nodeName(byId.get(x)!)}"`)
        issues.push({
          code: 'ciclo',
          message: `O fluxo volta para um bloco por onde já passou: ${loop.join(' → ')}.`,
          nodeId: t,
        })
      } else if (!state.has(t)) visit(t)
    }
    path.pop()
    state.set(id, 2)
  }
  for (const n of flow.nodes) if (!state.has(n.id)) visit(n.id)

  return issues
}

/* ---------------------------------------------------------------- serialização */

const sortKeys = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    )
  return v
}

/**
 * JSON do fluxo (sempre no formato v2, com `version` na primeira chave) e a ordem das chaves
 * fixa: o mesmo fluxo dá sempre o mesmo texto. Um fluxo da 2.7.0 é convertido antes.
 */
export function serializeFlow(input: Flow): string {
  const flow = migrateFlow(input)
  const nodes = flow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
    data: n.data.config
      ? { label: n.data.label, config: sortKeys(n.data.config) }
      : { label: n.data.label },
  }))
  const edges = flow.edges.map((e) =>
    e.branch
      ? { id: e.id, source: e.source, target: e.target, branch: e.branch }
      : { id: e.id, source: e.source, target: e.target },
  )
  return JSON.stringify({ version: 2, nodes, edges }, null, 2)
}

export type ParseResult = { ok: true; flow: Flow } | { ok: false; errors: string[] }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Lê o JSON de um fluxo. Nunca lança; campos que o contrato não conhece são ignorados. Texto sem
 * `version` é lido pelas regras da 2.7.0 e convertido; `version: 2` segue as regras do formato novo.
 */
export function parseFlow(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['O texto não é um JSON válido.'] }
  }
  if (!isObject(raw)) return { ok: false, errors: ['O JSON do fluxo precisa ser um objeto.'] }
  if (raw.version !== undefined && raw.version !== 2)
    return { ok: false, errors: ['Versão do formato não suportada (use 2 ou deixe sem versão).'] }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    const falta = !Array.isArray(raw.nodes) ? 'nodes' : 'edges'
    return { ok: false, errors: [`O campo "${falta}" precisa ser uma lista.`] }
  }
  const v2 = raw.version === 2
  const types = v2 ? V2_TYPES : LEGACY_TYPES

  const errors: string[] = []
  const nodes: FlowNode[] = []
  const ids = new Set<string>()
  raw.nodes.forEach((item, i) => {
    const at = `Bloco ${i + 1}`
    if (!isObject(item)) return void errors.push(`${at}: precisa ser um objeto.`)
    const { id, type, position, data } = item
    let ok = true
    if (typeof id !== 'string' || id === '') {
      errors.push(`${at}: falta o "id".`)
      ok = false
    } else if (ids.has(id)) {
      errors.push(`${at}: o id "${id}" está repetido.`)
      ok = false
    } else ids.add(id)
    if (!types.includes(type as string)) {
      errors.push(`${at}: tipo desconhecido (${String(type)}).`)
      ok = false
    }
    const pos = isObject(position) ? position : null
    if (
      !pos ||
      typeof pos.x !== 'number' ||
      typeof pos.y !== 'number' ||
      !Number.isFinite(pos.x) ||
      !Number.isFinite(pos.y)
    ) {
      errors.push(`${at}: "position" precisa ter "x" e "y" numéricos.`)
      ok = false
    }
    if (!isObject(data) || typeof data.label !== 'string') {
      errors.push(`${at}: "data.label" precisa ser um texto.`)
      ok = false
    } else if (data.config !== undefined && !isObject(data.config)) {
      errors.push(`${at}: "data.config" precisa ser um objeto.`)
      ok = false
    }
    if (ok) {
      const d = data as { label: string; config?: Record<string, unknown> }
      nodes.push({
        id: id as string,
        type: type as FlowNodeType,
        position: { x: (pos as { x: number }).x, y: (pos as { y: number }).y },
        data: d.config ? { label: d.label, config: d.config } : { label: d.label },
      })
    }
  })

  const edges: FlowEdge[] = []
  const edgeIds = new Set<string>()
  raw.edges.forEach((item, i) => {
    const at = `Ligação ${i + 1}`
    if (!isObject(item)) return void errors.push(`${at}: precisa ser um objeto.`)
    const { id, source, target, branch } = item
    let ok = true
    for (const [campo, v] of [
      ['id', id],
      ['source', source],
      ['target', target],
    ] as const)
      if (typeof v !== 'string' || v === '') {
        errors.push(`${at}: falta o campo "${campo}".`)
        ok = false
      }
    if (ok && edgeIds.has(id as string)) {
      errors.push(`${at}: o id "${id as string}" está repetido.`)
      ok = false
    }
    if (branch !== undefined) {
      const valid = v2
        ? typeof branch === 'string' && branch !== ''
        : branch === 'sim' || branch === 'nao'
      if (!valid) {
        errors.push(
          v2
            ? `${at}: "branch" precisa ser o id de uma regra ou "senao".`
            : `${at}: "branch" só pode ser "sim" ou "nao".`,
        )
        ok = false
      }
    }
    if (ok) {
      edgeIds.add(id as string)
      edges.push(
        branch
          ? {
              id: id as string,
              source: source as string,
              target: target as string,
              branch: branch as FlowBranch,
            }
          : { id: id as string, source: source as string, target: target as string },
      )
    }
  })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, flow: migrateFlow(v2 ? { version: 2, nodes, edges } : { nodes, edges }) }
}
