/*
 * Edição pura do fluxo: acrescentar, mover, ligar, desligar e apagar blocos. Imutável, sem DOM.
 * Não é exportada pelo subcaminho `@rendra-ui/web/flow`: só o FlowEditor usa.
 */
import {
  FLOW_BLOCKS,
  FLOW_CARD_W,
  FLOW_GAP_X,
  FLOW_GAP_Y,
  FLOW_TYPE_NAME,
  branchName,
  estimateNodeHeight,
  isTrigger,
  outputIds,
} from './flow-blocks'
import {
  migrateFlow,
  nodeName,
  type Flow,
  type FlowBranch,
  type FlowEdge,
  type FlowNode,
  type FlowNodeType,
} from './flow'

export interface AddNodeOptions {
  label?: string
  /** Ids que já existiram neste fluxo (mesmo apagados): não voltam a ser usados. */
  reservedIds?: Iterable<string>
}

/** Acrescenta um bloco com id único e determinístico (`tipo-N`) e a configuração padrão do tipo. */
export function addNode(
  input: Flow,
  type: FlowNodeType,
  position: { x: number; y: number },
  options: AddNodeOptions = {},
): { flow: Flow; id: string } {
  const flow = migrateFlow(input)
  const taken = new Set([...flow.nodes.map((n) => n.id), ...(options.reservedIds ?? [])])
  let n = 1
  while (taken.has(`${type}-${n}`)) n++
  const id = `${type}-${n}`
  const config = FLOW_BLOCKS[type].defaultConfig()
  const node: FlowNode = {
    id,
    type,
    position: { x: position.x, y: position.y },
    data:
      Object.keys(config).length > 0
        ? { label: options.label ?? FLOW_TYPE_NAME[type], config }
        : { label: options.label ?? FLOW_TYPE_NAME[type] },
  }
  return { flow: { ...flow, nodes: [...flow.nodes, node] }, id }
}

const edgeId = (source: string, target: string, branch?: FlowBranch) =>
  branch ? `${source}:${branch}->${target}` : `${source}->${target}`

/** Blocos que `id` alcança e que nenhum outro caminho do gatilho alcança sem passar por ele. */
function exclusiveDescendants(flow: Flow, id: string): string[] {
  const reach = (starts: string[], skip?: string) => {
    const seen = new Set<string>()
    const stack = [...starts]
    while (stack.length) {
      const cur = stack.pop()!
      if (seen.has(cur) || cur === skip) continue
      seen.add(cur)
      for (const e of flow.edges) if (e.source === cur) stack.push(e.target)
    }
    return seen
  }
  const below = reach([id])
  below.delete(id)
  const triggers = flow.nodes.filter((n) => isTrigger(n.type) && n.id !== id).map((n) => n.id)
  const alive = reach(triggers, id)
  return flow.nodes.filter((n) => below.has(n.id) && !alive.has(n.id)).map((n) => n.id)
}

export type RemoveMode = 'so-este' | 'daqui-para-frente'

/**
 * Apaga o bloco. `so-este`: religa o anterior ao posterior quando o bloco tem uma entrada e uma
 * saída e não é condição. `daqui-para-frente`: apaga também tudo o que só existe por causa dele.
 */
export function removeNode(input: Flow, id: string, mode: RemoveMode = 'so-este'): Flow {
  const flow = migrateFlow(input)
  const node = flow.nodes.find((n) => n.id === id)
  if (!node) return flow
  const gone = new Set([
    id,
    ...(mode === 'daqui-para-frente' ? exclusiveDescendants(flow, id) : []),
  ])
  let edges = flow.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target))
  if (mode === 'so-este' && node.type !== 'condicao') {
    const into = flow.edges.filter((e) => e.target === id)
    const from = flow.edges.filter((e) => e.source === id)
    if (into.length === 1 && from.length === 1) {
      const a = into[0]!
      const b = from[0]!
      const bridged: FlowEdge = {
        id: edgeId(a.source, b.target, a.branch),
        source: a.source,
        target: b.target,
        ...(a.branch ? { branch: a.branch } : {}),
      }
      if (a.source !== b.target && !edges.some((e) => e.id === bridged.id))
        edges = [...edges, bridged]
    }
  }
  return { ...flow, nodes: flow.nodes.filter((n) => !gone.has(n.id)), edges }
}

export function removeEdge(flow: Flow, id: string): Flow {
  return { ...flow, edges: flow.edges.filter((e) => e.id !== id) }
}

/** Tira a ligação da saída `branch` de `source` (a única saída, nos blocos comuns). */
export function clearOutput(flow: Flow, source: string, branch?: FlowBranch): Flow {
  return {
    ...flow,
    edges: flow.edges.filter((e) => !(e.source === source && (e.branch ?? undefined) === branch)),
  }
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

export type ConnectResult =
  | { ok: true; flow: Flow; replaced?: { source: string; target: string; branch?: FlowBranch } }
  | { ok: false; reason: string }

/**
 * Liga dois blocos. A segunda ligação numa saída substitui a primeira e devolve a trocada em
 * `replaced`, para o editor avisar. Recusa, com o motivo, o que o fluxo nunca aceita.
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
  if (isTrigger(to.type))
    return { ok: false, reason: 'O gatilho começa o fluxo e não recebe ligação.' }
  if (from.type === 'condicao') {
    if (!branch) return { ok: false, reason: 'Escolha a saída da condição: uma regra ou "Senão".' }
    if (!outputIds(from).includes(branch))
      return { ok: false, reason: 'Essa saída não existe mais na condição.' }
  } else if (branch) return { ok: false, reason: 'Só a condição tem saídas por regra.' }
  const id = edgeId(source, target, branch)
  if (flow.edges.some((e) => e.id === id)) return { ok: false, reason: 'Essa ligação já existe.' }
  const sameOutput = (e: FlowEdge) => e.source === source && (e.branch ?? undefined) === branch
  const old = flow.edges.find(sameOutput)
  const edge: FlowEdge = branch ? { id, source, target, branch } : { id, source, target }
  return {
    ok: true,
    flow: { ...flow, edges: [...flow.edges.filter((e) => !sameOutput(e)), edge] },
    ...(old
      ? {
          replaced: {
            source: old.source,
            target: old.target,
            ...(old.branch ? { branch: old.branch } : {}),
          },
        }
      : {}),
  }
}

/** Blocos que `id` pode ter como próximo: nunca ele mesmo nem um gatilho. */
export function nextCandidates(flow: Flow, id: string): FlowNode[] {
  if (!flow.nodes.some((n) => n.id === id)) return []
  return flow.nodes.filter((n) => n.id !== id && !isTrigger(n.type))
}

export interface NodeLinks {
  anteriores: { node: FlowNode; saida?: string }[]
  posteriores: { node: FlowNode; saida?: string }[]
  /** Blocos que o modo `daqui-para-frente` apaga além do próprio. */
  descendentes: number
}

/** Onde o bloco está ligado: quem vem antes, quem vem depois e quantos cairiam junto. */
export function describeNodeLinks(flow: Flow, id: string): NodeLinks {
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  const self = byId.get(id)
  const anteriores: NodeLinks['anteriores'] = []
  const posteriores: NodeLinks['posteriores'] = []
  for (const e of flow.edges) {
    if (e.target === id) {
      const node = byId.get(e.source)
      if (node)
        anteriores.push({
          node,
          ...(e.branch ? { saida: branchName(node, e.branch) } : {}),
        })
    }
    if (e.source === id && self) {
      const node = byId.get(e.target)
      if (node)
        posteriores.push({
          node,
          ...(e.branch ? { saida: branchName(self, e.branch) } : {}),
        })
    }
  }
  return { anteriores, posteriores, descendentes: exclusiveDescendants(flow, id).length }
}

type Rect = { x: number; y: number; w: number; h: number }

/**
 * Primeira posição livre a partir de `from`: desce em passos de `FLOW_GAP_Y` e, se a coluna
 * estiver cheia, passa à coluna da direita. Usa o tamanho medido dos blocos quando há, senão
 * a estimativa. Determinística: o mesmo fluxo e o mesmo ponto dão sempre a mesma posição.
 */
export function findFreePosition(
  flow: Flow,
  size: { w: number; h: number },
  from: { x: number; y: number },
  measured: Record<string, { w: number; h: number }> = {},
): { x: number; y: number } {
  const rects: Rect[] = flow.nodes.map((n) => ({
    x: n.position.x,
    y: n.position.y,
    w: measured[n.id]?.w ?? FLOW_CARD_W,
    h: measured[n.id]?.h ?? estimateNodeHeight(n),
  }))
  const gap = FLOW_GAP_Y / 2
  const free = (x: number, y: number) =>
    rects.every(
      (r) =>
        x + size.w + gap <= r.x ||
        r.x + r.w + gap <= x ||
        y + size.h + gap <= r.y ||
        r.y + r.h + gap <= y,
    )
  for (let col = 0; col < 40; col++) {
    const x = from.x + col * (size.w + FLOW_GAP_X)
    for (let row = 0; row < 60; row++) {
      const y = from.y + row * FLOW_GAP_Y
      if (free(x, y)) return { x, y }
    }
  }
  return { x: from.x, y: from.y }
}

/** Aviso de troca: "A ligação anterior de "X" para "Y" foi trocada." */
export function replacedMessage(flow: Flow, replaced: { source: string; target: string }): string {
  const name = (id: string) => {
    const n = flow.nodes.find((x) => x.id === id)
    return n ? nodeName(n) : id
  }
  return `A ligação anterior de "${name(replaced.source)}" para "${name(replaced.target)}" foi trocada.`
}
