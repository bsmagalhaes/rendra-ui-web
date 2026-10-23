/*
 * Fluxos de automação: contrato do JSON, validação, edição, serialização e simulação.
 * Funções puras e imutáveis, com tipos próprios do Rendra: nada daqui importa o React Flow,
 * então o item `core` do registry não depende dele. A conversão para os nós da biblioteca
 * mora só dentro de FlowEditor e FlowViewer.
 */

export type FlowNodeType = 'gatilho' | 'acao' | 'condicao' | 'espera' | 'fim'
export type FlowBranch = 'sim' | 'nao'
export type FlowWaitUnit = 'segundos' | 'minutos' | 'horas' | 'dias'

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
  /** Só a saída de uma condição usa o ramo. */
  branch?: FlowBranch
}

export interface Flow {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface FlowIssue {
  code: string
  message: string
  nodeId?: string
  edgeId?: string
}

export interface SimulationStep {
  nodeId: string
  type: FlowNodeType
  label: string
  status: 'succeeded' | 'failed' | 'skipped'
  detail?: string
}

export interface SimulationState {
  status: 'idle' | 'running' | 'waiting-choice' | 'finished' | 'error'
  steps: SimulationStep[]
  /** Bloco que o próximo avanço executa (o bloco ativo); `null` fora da simulação. */
  currentId: string | null
  issues: FlowIssue[]
}

export const FLOW_NODE_TYPES: readonly FlowNodeType[] = [
  'gatilho',
  'acao',
  'condicao',
  'espera',
  'fim',
]

export const FLOW_WAIT_UNITS: readonly FlowWaitUnit[] = ['segundos', 'minutos', 'horas', 'dias']

/** Nome do tipo de bloco, como aparece na interface. */
export const FLOW_TYPE_NAME: Record<FlowNodeType, string> = {
  gatilho: 'Gatilho',
  acao: 'Ação',
  condicao: 'Condição',
  espera: 'Espera',
  fim: 'Fim',
}

const BRANCH_NAME: Record<FlowBranch, string> = { sim: 'Sim', nao: 'Não' }

const WAIT_SINGULAR: Record<FlowWaitUnit, string> = {
  segundos: 'segundo',
  minutos: 'minuto',
  horas: 'hora',
  dias: 'dia',
}

const DEFAULT_WAIT: { duration: number; unit: FlowWaitUnit } = { duration: 5, unit: 'minutos' }

const isUnit = (v: unknown): v is FlowWaitUnit =>
  typeof v === 'string' && (FLOW_WAIT_UNITS as readonly string[]).includes(v)

/** Texto da espera simulada: nunca espera de verdade. */
export function describeWait(config: Record<string, unknown> | undefined): string {
  const duration = config?.duration
  const unit = config?.unit
  if (typeof duration !== 'number' || !Number.isFinite(duration) || !isUnit(unit))
    return 'Aguardaria o tempo definido no bloco'
  return `Aguardaria ${duration} ${duration === 1 ? WAIT_SINGULAR[unit] : unit}`
}

const nameOf = (n: FlowNode) => n.data.label.trim() || FLOW_TYPE_NAME[n.type]

/** Ligações que saem de cada bloco, na ordem do fluxo. */
function outgoing(flow: Flow) {
  const map = new Map<string, FlowEdge[]>()
  for (const e of flow.edges) map.set(e.source, [...(map.get(e.source) ?? []), e])
  return map
}

/** Problemas do fluxo, em ordem estável: a mesma entrada dá sempre a mesma lista. */
export function validateFlow(flow: Flow): FlowIssue[] {
  const issues: FlowIssue[] = []
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  const out = outgoing(flow)

  const triggers = flow.nodes.filter((n) => n.type === 'gatilho')
  if (triggers.length === 0)
    issues.push({
      code: 'sem-gatilho',
      message: 'O fluxo precisa de um bloco Gatilho para começar.',
    })
  else if (triggers.length > 1)
    issues.push({
      code: 'varios-gatilhos',
      message: `O fluxo tem ${triggers.length} gatilhos, mas deve ter só um.`,
    })

  // Integridade: ligações apontando para o que não existe, ou com o ramo errado.
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
    if (from.type === 'condicao' ? !e.branch : e.branch) {
      issues.push({
        code: 'ramo-invalido',
        message:
          from.type === 'condicao'
            ? `Uma saída da condição "${nameOf(from)}" não diz se é "Sim" ou "Não".`
            : `A ligação que sai de "${nameOf(from)}" não pode ter "Sim" ou "Não": isso só vale para condição.`,
        nodeId: from.id,
        edgeId: e.id,
      })
      continue
    }
    sound.push(e)
  }

  for (const n of flow.nodes) {
    const edges = out.get(n.id) ?? []
    const name = nameOf(n)
    if (n.type === 'fim') {
      if (edges.length > 0)
        issues.push({
          code: 'fim-com-saida',
          message: `O bloco Fim "${name}" não pode ter saída.`,
          nodeId: n.id,
        })
    } else if (n.type === 'condicao') {
      const sim = edges.filter((e) => e.branch === 'sim').length
      const nao = edges.filter((e) => e.branch === 'nao').length
      if (sim === 0)
        issues.push({
          code: 'condicao-sem-sim',
          message: `A condição "${name}" precisa de uma saída "Sim".`,
          nodeId: n.id,
        })
      if (nao === 0)
        issues.push({
          code: 'condicao-sem-nao',
          message: `A condição "${name}" precisa de uma saída "Não".`,
          nodeId: n.id,
        })
      if (sim > 1 || nao > 1)
        issues.push({
          code: 'condicao-saida-repetida',
          message: `A condição "${name}" tem mais de uma saída para o mesmo ramo.`,
          nodeId: n.id,
        })
    } else if (edges.length === 0) {
      issues.push({
        code: 'sem-saida',
        message: `O bloco "${name}" não leva a nenhum próximo bloco.`,
        nodeId: n.id,
      })
    } else if (edges.length > 1) {
      issues.push({
        code: 'varias-saidas',
        message: `O bloco "${name}" tem mais de uma saída; só a condição pode ter.`,
        nodeId: n.id,
      })
    }
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
          message: `O bloco "${nameOf(n)}" não é alcançado a partir do gatilho.`,
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
        const loop = [...path.slice(path.indexOf(t)), t].map((x) => `"${nameOf(byId.get(x)!)}"`)
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

/** JSON do fluxo, com a ordem das chaves fixa: o mesmo fluxo dá sempre o mesmo texto. */
export function serializeFlow(flow: Flow): string {
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
  return JSON.stringify({ nodes, edges }, null, 2)
}

export type ParseResult = { ok: true; flow: Flow } | { ok: false; errors: string[] }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Lê o JSON de um fluxo. Nunca lança; campos que o contrato não conhece são ignorados. */
export function parseFlow(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['O texto não é um JSON válido.'] }
  }
  if (!isObject(raw)) return { ok: false, errors: ['O JSON do fluxo precisa ser um objeto.'] }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    const falta = !Array.isArray(raw.nodes) ? 'nodes' : 'edges'
    return { ok: false, errors: [`O campo "${falta}" precisa ser uma lista.`] }
  }

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
    if (!(FLOW_NODE_TYPES as readonly unknown[]).includes(type)) {
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
    if (branch !== undefined && branch !== 'sim' && branch !== 'nao') {
      errors.push(`${at}: "branch" só pode ser "sim" ou "nao".`)
      ok = false
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

  return errors.length > 0 ? { ok: false, errors } : { ok: true, flow: { nodes, edges } }
}

/* ---------------------------------------------------------------------- edição */

export interface AddNodeOptions {
  label?: string
  /** Ids que já existiram neste fluxo (mesmo apagados): não voltam a ser usados. */
  reservedIds?: Iterable<string>
}

/** Acrescenta um bloco com id único e determinístico (`tipo-N`). */
export function addNode(
  flow: Flow,
  type: FlowNodeType,
  position: { x: number; y: number },
  options: AddNodeOptions = {},
): { flow: Flow; id: string } {
  const taken = new Set([...flow.nodes.map((n) => n.id), ...(options.reservedIds ?? [])])
  let n = 1
  while (taken.has(`${type}-${n}`)) n++
  const id = `${type}-${n}`
  const node: FlowNode = {
    id,
    type,
    position: { x: position.x, y: position.y },
    data:
      type === 'espera'
        ? { label: options.label ?? FLOW_TYPE_NAME[type], config: { ...DEFAULT_WAIT } }
        : { label: options.label ?? FLOW_TYPE_NAME[type] },
  }
  return { flow: { ...flow, nodes: [...flow.nodes, node] }, id }
}

/** Apaga o bloco e as ligações que chegam ou saem dele. */
export function removeNode(flow: Flow, id: string): Flow {
  if (!flow.nodes.some((n) => n.id === id)) return flow
  return {
    nodes: flow.nodes.filter((n) => n.id !== id),
    edges: flow.edges.filter((e) => e.source !== id && e.target !== id),
  }
}

export function removeEdge(flow: Flow, id: string): Flow {
  return { ...flow, edges: flow.edges.filter((e) => e.id !== id) }
}

export function moveNode(flow: Flow, id: string, position: { x: number; y: number }): Flow {
  return {
    ...flow,
    nodes: flow.nodes.map((n) =>
      n.id === id ? { ...n, position: { x: position.x, y: position.y } } : n,
    ),
  }
}

/** Troca o rótulo e/ou o config do bloco (o config informado substitui o anterior). */
export function updateNodeData(
  flow: Flow,
  id: string,
  patch: { label?: string; config?: Record<string, unknown> },
): Flow {
  return {
    ...flow,
    nodes: flow.nodes.map((n) => {
      if (n.id !== id) return n
      const label = patch.label ?? n.data.label
      const config = patch.config ?? n.data.config
      return { ...n, data: config ? { label, config } : { label } }
    }),
  }
}

export type ConnectResult = { ok: true; flow: Flow } | { ok: false; reason: string }

const edgeId = (source: string, target: string, branch?: FlowBranch) =>
  branch ? `${source}:${branch}->${target}` : `${source}->${target}`

/**
 * Liga dois blocos. A segunda saída de um bloco comum (ou do mesmo ramo da condição) substitui
 * a primeira. Recusa, com o motivo, o que o fluxo nunca aceita.
 */
export function connectNodes(
  flow: Flow,
  source: string,
  target: string,
  branch?: FlowBranch,
): ConnectResult {
  const from = flow.nodes.find((n) => n.id === source)
  const to = flow.nodes.find((n) => n.id === target)
  if (!from || !to) return { ok: false, reason: 'Esse bloco não existe mais.' }
  if (source === target) return { ok: false, reason: 'Um bloco não pode ligar a ele mesmo.' }
  if (from.type === 'fim')
    return { ok: false, reason: 'O bloco Fim termina o fluxo e não tem saída.' }
  if (to.type === 'gatilho')
    return { ok: false, reason: 'O gatilho começa o fluxo e não recebe ligação.' }
  if (from.type === 'condicao' && !branch)
    return { ok: false, reason: 'Escolha a saída "Sim" ou "Não" da condição.' }
  if (from.type !== 'condicao' && branch)
    return { ok: false, reason: '"Sim" e "Não" só existem na condição.' }
  const id = edgeId(source, target, branch)
  if (flow.edges.some((e) => e.id === id)) return { ok: false, reason: 'Essa ligação já existe.' }
  const kept = flow.edges.filter(
    (e) => !(e.source === source && (from.type === 'condicao' ? e.branch === branch : true)),
  )
  const edge: FlowEdge = branch ? { id, source, target, branch } : { id, source, target }
  return { ok: true, flow: { ...flow, edges: [...kept, edge] } }
}

/**
 * Define (ou, com `target` nulo, tira) o próximo bloco de `id`; na condição, o do ramo dado.
 * Uma ligação recusada devolve o próprio fluxo, sem mudança.
 */
export function setNext(flow: Flow, id: string, target: string | null, branch?: FlowBranch): Flow {
  if (target === null)
    return {
      ...flow,
      edges: flow.edges.filter((e) => !(e.source === id && (branch ? e.branch === branch : true))),
    }
  const r = connectNodes(flow, id, target, branch)
  return r.ok ? r.flow : flow
}

/** Blocos que `id` pode ter como próximo: nunca ele mesmo nem o gatilho. */
export function nextCandidates(flow: Flow, id: string): FlowNode[] {
  const from = flow.nodes.find((n) => n.id === id)
  if (!from || from.type === 'fim') return []
  return flow.nodes.filter((n) => n.id !== id && n.type !== 'gatilho')
}

/* -------------------------------------------------------------------- simulação */

export function resetSimulation(): SimulationState {
  return { status: 'idle', steps: [], currentId: null, issues: [] }
}

/** Começa no gatilho. Fluxo inválido não inicia: devolve `error` com os problemas. */
export function startSimulation(flow: Flow): SimulationState {
  const issues = validateFlow(flow)
  if (issues.length > 0) return { status: 'error', steps: [], currentId: null, issues }
  const trigger = flow.nodes.find((n) => n.type === 'gatilho')!
  return { status: 'running', steps: [], currentId: trigger.id, issues: [] }
}

/**
 * Executa o bloco ativo (um passo) e passa ao próximo. Na condição é preciso escolher o ramo:
 * sem escolha válida nada anda. A espera é instantânea; só o texto diz quanto aguardaria.
 */
export function advanceSimulation(
  flow: Flow,
  state: SimulationState,
  choice?: FlowBranch,
): SimulationState {
  if ((state.status !== 'running' && state.status !== 'waiting-choice') || !state.currentId)
    return state
  const node = flow.nodes.find((n) => n.id === state.currentId)
  const edges = node ? flow.edges.filter((e) => e.source === node.id) : []
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

  let detail: string | undefined
  let target: string | undefined
  if (node.type === 'condicao') {
    if (choice !== 'sim' && choice !== 'nao') return state
    target = edges.find((e) => e.branch === choice)?.target
    detail = `Escolha: ${BRANCH_NAME[choice]}`
    if (!target) return fail()
  } else if (node.type !== 'fim') {
    target = edges[0]?.target
    if (node.type === 'espera') detail = describeWait(node.data.config)
    if (!target) return fail()
  }

  const step: SimulationStep = {
    nodeId: node.id,
    type: node.type,
    label: nameOf(node),
    status: 'succeeded',
    ...(detail ? { detail } : {}),
  }
  const steps = [...state.steps, step]
  if (!target) return { status: 'finished', steps, currentId: null, issues: [] }
  const next = flow.nodes.find((n) => n.id === target)
  if (!next) return fail()
  return {
    status: next.type === 'condicao' ? 'waiting-choice' : 'running',
    steps,
    currentId: target,
    issues: [],
  }
}
