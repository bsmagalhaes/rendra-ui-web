/*
 * Arrumação automática da esquerda para a direita (usada ao abrir um JSON da 2.7.0, que era
 * vertical). Pura e determinística: sem DOM, termina com ciclo, sem gatilho e com vários gatilhos.
 */
import {
  FLOW_CARD_W,
  FLOW_GAP_X,
  FLOW_GAP_Y,
  estimateNodeHeight,
  isTrigger,
  outputIds,
} from './flow-blocks'
import type { Flow, FlowEdge } from './flow'

/** Camada de cada bloco (maior distância do início sem passar pelas ligações que fecham ciclo). */
export function layoutFlow(flow: Flow): Flow {
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  const edges = flow.edges.filter((e) => byId.has(e.source) && byId.has(e.target))

  // Ligações de cada bloco na ordem de saída: as regras, depois "Senão".
  const out = new Map<string, FlowEdge[]>()
  for (const n of flow.nodes) {
    const mine = edges.filter((e) => e.source === n.id)
    const order = outputIds(n)
    mine.sort((a, b) => order.indexOf(a.branch) - order.indexOf(b.branch))
    out.set(n.id, mine)
  }

  const hasIncoming = new Set(edges.map((e) => e.target))
  let roots = flow.nodes.filter((n) => isTrigger(n.type)).map((n) => n.id)
  if (roots.length === 0) roots = flow.nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id)
  if (roots.length === 0 && flow.nodes[0]) roots = [flow.nodes[0].id]

  // Busca em profundidade: ordem de visita, ordem topológica e ligações que fecham ciclo.
  const state = new Map<string, 1 | 2>()
  const preorder = new Map<string, number>()
  const post: string[] = []
  const back = new Set<string>()
  const visit = (id: string) => {
    state.set(id, 1)
    preorder.set(id, preorder.size)
    for (const e of out.get(id) ?? []) {
      if (state.get(e.target) === 1) back.add(e.id)
      else if (!state.has(e.target)) visit(e.target)
    }
    state.set(id, 2)
    post.push(id)
  }
  for (const r of roots) if (!state.has(r)) visit(r)

  const layer = new Map<string, number>(roots.map((r) => [r, 0]))
  for (const id of [...post].reverse())
    for (const e of out.get(id) ?? [])
      if (!back.has(e.id))
        layer.set(e.target, Math.max(layer.get(e.target) ?? 0, layer.get(id)! + 1))

  const reached = Math.max(-1, ...layer.values())
  const unreachedLayer = reached + 1
  const columns = new Map<number, string[]>()
  const ordered = [...flow.nodes].sort((a, b) => {
    const pa = preorder.get(a.id) ?? Infinity
    const pb = preorder.get(b.id) ?? Infinity
    return pa === pb ? flow.nodes.indexOf(a) - flow.nodes.indexOf(b) : pa - pb
  })
  for (const n of ordered) {
    const l = layer.get(n.id) ?? unreachedLayer
    columns.set(l, [...(columns.get(l) ?? []), n.id])
  }

  const position = new Map<string, { x: number; y: number }>()
  for (const [l, ids] of columns) {
    let y = 0
    for (const id of ids) {
      position.set(id, { x: l * (FLOW_CARD_W + FLOW_GAP_X), y })
      y += estimateNodeHeight(byId.get(id)!) + FLOW_GAP_Y
    }
  }
  return { ...flow, nodes: flow.nodes.map((n) => ({ ...n, position: position.get(n.id)! })) }
}
