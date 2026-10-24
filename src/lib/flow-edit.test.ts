import { describe, expect, it } from 'vitest'
import { validateFlow, type Flow, type FlowNode, type FlowNodeType } from './flow'
import {
  addNode,
  clearOutput,
  connectNodes,
  describeNodeLinks,
  findFreePosition,
  moveNode,
  nextCandidates,
  removeEdge,
  removeNode,
  updateNodeData,
} from './flow-edit'
import { estimateNodeHeight } from './flow-blocks'

const node = (id: string, type: FlowNodeType, config?: Record<string, unknown>): FlowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: config ? { label: id, config } : { label: id },
})

/** w -> a -> b -> c(r1 -> d, r2 -> e); losango: x -> d. */
function base(): Flow {
  return {
    version: 2,
    nodes: [
      node('w', 'webhook-entrada', { path: '/x' }),
      node('a', 'whatsapp', { to: '1', message: 'm' }),
      node('b', 'tarefa', { title: 't' }),
      node('c', 'condicao', {
        rules: [
          { id: 'r1', field: 'f', operator: 'igual', value: '1' },
          { id: 'r2', label: 'Vip', field: 'f', operator: 'igual', value: '2' },
        ],
      }),
      node('d', 'tarefa', { title: 'd' }),
      node('e', 'tarefa', { title: 'e' }),
    ],
    edges: [
      { id: 'w->a', source: 'w', target: 'a' },
      { id: 'a->b', source: 'a', target: 'b' },
      { id: 'b->c', source: 'b', target: 'c' },
      { id: 'c:r1->d', source: 'c', target: 'd', branch: 'r1' },
      { id: 'c:r2->e', source: 'c', target: 'e', branch: 'r2' },
    ],
  }
}

const ids = (f: Flow) => f.nodes.map((n) => n.id)
const edgeIds = (f: Flow) => f.edges.map((e) => e.id)

describe('addNode', () => {
  it('usa a configuração padrão, ids sem repetir e respeita os reservados', () => {
    const a = addNode(base(), 'espera', { x: 1, y: 2 })
    expect(a.id).toBe('espera-1')
    expect(a.flow.nodes.at(-1)).toMatchObject({
      position: { x: 1, y: 2 },
      data: { label: 'Esperar', config: { duration: 5, unit: 'minutos' } },
    })
    const b = addNode(a.flow, 'espera', { x: 0, y: 0 }, { reservedIds: ['espera-2'] })
    expect(b.id).toBe('espera-3')
    const c = addNode(base(), 'condicao', { x: 0, y: 0 })
    expect(c.flow.nodes.at(-1)!.data.config).toEqual({
      rules: [{ id: 'r1', field: '', operator: 'igual', value: '' }],
    })
    expect(addNode(base(), 'fim', { x: 0, y: 0 }, { label: 'X' }).flow.nodes.at(-1)!.data).toEqual({
      label: 'X',
    })
  })

  it('converte a entrada da 2.7.0 antes de acrescentar', () => {
    const r = addNode({ nodes: [], edges: [] }, 'whatsapp', { x: 0, y: 0 })
    expect(r.flow.version).toBe(2)
  })
})

describe('connectNodes', () => {
  it('liga e devolve a ligação trocada em "replaced"', () => {
    const livre = connectNodes(base(), 'a', 'd')
    expect(livre.ok && livre.replaced).toEqual({ source: 'a', target: 'b' })
    expect(livre.ok && edgeIds(livre.flow)).toContain('a->d')
    expect(livre.ok && edgeIds(livre.flow)).not.toContain('a->b')
    const novo = connectNodes(base(), 'd', 'e')
    expect(novo.ok && novo.replaced).toBeUndefined()
    const regra = connectNodes(base(), 'c', 'e', 'r1')
    expect(regra.ok && regra.replaced).toEqual({ source: 'c', target: 'd', branch: 'r1' })
    expect(regra.ok && regra.flow.edges.filter((e) => e.source === 'c')).toHaveLength(2)
    const senao = connectNodes(base(), 'c', 'a', 'senao')
    expect(senao.ok && senao.replaced).toBeUndefined()
  })

  it.each([
    ['bloco inexistente', 'a', 'zz', undefined, /não existe/],
    ['auto-laço', 'a', 'a', undefined, /ele mesmo/],
    ['entrada no gatilho', 'a', 'w', undefined, /gatilho/],
    ['condição sem saída', 'c', 'a', undefined, /Escolha a saída/],
    ['saída que não existe', 'c', 'a', 'r9', /não existe mais/],
    ['saída de regra em bloco comum', 'a', 'd', 'r1', /Só a condição/],
    ['ligação já existente', 'a', 'b', undefined, /já existe/],
  ])('recusa %s', (_n, s, t, branch, msg) => {
    const r = connectNodes(base(), s, t, branch)
    expect(!r.ok && r.reason).toMatch(msg)
  })
})

describe('removeNode', () => {
  it('"só este" religa anterior e posterior, mantendo o branch da entrada', () => {
    const f = removeNode(base(), 'a')
    expect(ids(f)).not.toContain('a')
    expect(edgeIds(f)).toContain('w->b')
    const dentro = removeNode(base(), 'd')
    expect(edgeIds(dentro)).not.toContain('c:r1->d')
    // d não tem saída: só remove
    const meio: Flow = {
      ...base(),
      edges: [...base().edges, { id: 'd->e', source: 'd', target: 'e' }].filter(
        (e) => e.id !== 'c:r2->e',
      ),
    }
    expect(edgeIds(removeNode(meio, 'd'))).toContain('c:r1->e')
    expect(removeNode(meio, 'd').edges.find((e) => e.id === 'c:r1->e')!.branch).toBe('r1')
  })

  it('condição removida não religa; o gatilho some sem religar; id inexistente não muda', () => {
    const f = removeNode(base(), 'c')
    expect(f.edges.map((e) => e.id)).toEqual(['w->a', 'a->b'])
    const g = removeNode(base(), 'w')
    expect(g.edges.some((e) => e.source === 'w')).toBe(false)
    expect(removeNode(base(), 'zz').nodes).toHaveLength(6)
  })

  it('"daqui para frente" leva só o que ficaria órfão (losango preserva quem tem outra entrada)', () => {
    const f = removeNode(base(), 'b', 'daqui-para-frente')
    expect(ids(f)).toEqual(['w', 'a'])
    const losango: Flow = {
      ...base(),
      edges: [...base().edges, { id: 'a->d', source: 'a', target: 'd' }],
    }
    // a agora tem duas saídas (válido para o teste puro): d continua vivo por a
    const g = removeNode(losango, 'b', 'daqui-para-frente')
    expect(ids(g)).toContain('d')
    expect(ids(g)).not.toContain('e')
    expect(ids(g)).not.toContain('c')
  })

  it('o número de blocos de describeNodeLinks é exatamente o que sai', () => {
    for (const id of ['w', 'a', 'b', 'c', 'd']) {
      const links = describeNodeLinks(base(), id)
      const depois = removeNode(base(), id, 'daqui-para-frente')
      expect(6 - depois.nodes.length).toBe(links.descendentes + 1)
    }
    expect(removeNode(base(), 'w', 'daqui-para-frente').nodes).toEqual([])
  })

  it('remover o gatilho com outro gatilho vivo preserva o que o outro alcança', () => {
    const f: Flow = {
      ...base(),
      nodes: [...base().nodes, node('g2', 'agendamento', { frequency: 'diario', time: '08:00' })],
      edges: [...base().edges, { id: 'g2->b', source: 'g2', target: 'b' }],
    }
    expect(ids(removeNode(f, 'w', 'daqui-para-frente')).sort()).toEqual(
      ['b', 'c', 'd', 'e', 'g2'].sort(),
    )
  })
})

describe('describeNodeLinks', () => {
  it('lista anteriores e posteriores com o nome da saída', () => {
    const c = describeNodeLinks(base(), 'c')
    expect(c.anteriores.map((x) => x.node.id)).toEqual(['b'])
    expect(c.posteriores.map((x) => [x.node.id, x.saida])).toEqual([
      ['d', 'Regra 1'],
      ['e', 'Vip'],
    ])
    const d = describeNodeLinks(base(), 'd')
    expect(d.anteriores[0]).toMatchObject({ saida: 'Regra 1' })
    expect(describeNodeLinks(base(), 'zz')).toEqual({
      anteriores: [],
      posteriores: [],
      descendentes: 0,
    })
  })
})

describe('demais edições', () => {
  it('removeEdge, clearOutput, moveNode, updateNodeData', () => {
    expect(edgeIds(removeEdge(base(), 'a->b'))).not.toContain('a->b')
    expect(edgeIds(clearOutput(base(), 'c', 'r2'))).not.toContain('c:r2->e')
    expect(edgeIds(clearOutput(base(), 'c', 'r2'))).toContain('c:r1->d')
    expect(edgeIds(clearOutput(base(), 'a'))).not.toContain('a->b')
    expect(moveNode(base(), 'a', { x: 5, y: 6 }).nodes[1]!.position).toEqual({ x: 5, y: 6 })
    expect(moveNode(base(), 'a', { x: 5, y: 6 }).nodes[0]!.position).toEqual({ x: 0, y: 0 })
    const u = updateNodeData(base(), 'a', { label: 'Novo', config: { to: '9', message: 'x' } })
    expect(u.nodes[1]!.data).toEqual({ label: 'Novo', config: { to: '9', message: 'x' } })
    expect(updateNodeData(base(), 'a', { label: 'Só rótulo' }).nodes[1]!.data.config).toEqual({
      to: '1',
      message: 'm',
    })
    expect(updateNodeData(base(), 'zz', { label: 'x' }).nodes).toEqual(base().nodes)
    expect(
      updateNodeData({ ...base(), nodes: [node('q', 'fim')] }, 'q', { label: 'Z' }).nodes[0]!.data,
    ).toEqual({
      label: 'Z',
    })
  })

  it('nextCandidates: nunca o próprio nem um gatilho', () => {
    expect(nextCandidates(base(), 'a').map((n) => n.id)).toEqual(['b', 'c', 'd', 'e'])
    expect(nextCandidates(base(), 'zz')).toEqual([])
  })
})

describe('findFreePosition', () => {
  it('12 blocos adicionados do mesmo ponto nunca se cruzam e o resultado é repetível', () => {
    const run = () => {
      let f: Flow = { version: 2, nodes: [], edges: [] }
      for (let i = 0; i < 12; i++) {
        const size = { w: 336, h: 160 }
        const at = findFreePosition(f, size, { x: 10, y: 10 })
        f = addNode(f, 'tarefa', at).flow
      }
      return f
    }
    const f = run()
    expect(run()).toEqual(f)
    const r = f.nodes.map((n) => ({ ...n.position, w: 336, h: estimateNodeHeight(n) }))
    for (let i = 0; i < r.length; i++)
      for (let j = i + 1; j < r.length; j++) {
        const a = r[i]!
        const b = r[j]!
        const cruza = a.x < b.x + 336 && b.x < a.x + 336 && a.y < b.y + 160 && b.y < a.y + 160
        expect(cruza).toBe(false)
      }
  })

  it('usa o tamanho medido quando há', () => {
    const f = base()
    const livre = findFreePosition(f, { w: 336, h: 100 }, { x: 0, y: 0 }, { w: { w: 600, h: 600 } })
    expect(livre.x >= 600 || livre.y >= 600 || livre.x < 0).toBe(true)
  })
})

describe('o fluxo editado segue válido', () => {
  it('ligar e religar não cria problema de ligação', () => {
    const r = connectNodes(base(), 'd', 'e')
    expect(r.ok && validateFlow(r.flow).some((i) => i.code === 'ligacao-invalida')).toBe(false)
  })
})
