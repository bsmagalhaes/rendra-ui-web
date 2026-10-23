import { describe, expect, it } from 'vitest'
import {
  addNode,
  advanceSimulation,
  connectNodes,
  describeWait,
  formatWait,
  moveNode,
  nextCandidates,
  parseFlow,
  removeEdge,
  removeNode,
  resetSimulation,
  serializeFlow,
  setNext,
  startSimulation,
  updateNodeData,
  validateFlow,
  type Flow,
  type FlowNode,
  type FlowNodeType,
} from './flow'

const node = (
  id: string,
  type: FlowNodeType,
  label = id,
  config?: Record<string, unknown>,
): FlowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: config ? { label, config } : { label },
})

/** Fluxo válido: gatilho, ação, condição (sim -> espera -> fim, não -> fim). */
function valido(): Flow {
  return {
    nodes: [
      node('g', 'gatilho', 'Novo pedido'),
      node('a', 'acao', 'Enviar e-mail'),
      node('c', 'condicao', 'Pedido pago?'),
      node('e', 'espera', 'Esperar', { duration: 5, unit: 'minutos' }),
      node('f1', 'fim', 'Fim feliz'),
      node('f2', 'fim', 'Fim triste'),
    ],
    edges: [
      { id: 'g->a', source: 'g', target: 'a' },
      { id: 'a->c', source: 'a', target: 'c' },
      { id: 'c:sim->e', source: 'c', target: 'e', branch: 'sim' },
      { id: 'c:nao->f2', source: 'c', target: 'f2', branch: 'nao' },
      { id: 'e->f1', source: 'e', target: 'f1' },
    ],
  }
}

const codes = (flow: Flow) => validateFlow(flow).map((i) => i.code)

function congelar<T>(valor: T): T {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

describe('validateFlow', () => {
  it('fluxo válido não tem problema', () => {
    expect(validateFlow(valido())).toEqual([])
  })

  it('fluxo mínimo (gatilho e fim) é válido', () => {
    const flow: Flow = {
      nodes: [node('g', 'gatilho'), node('f', 'fim')],
      edges: [{ id: 'g->f', source: 'g', target: 'f' }],
    }
    expect(validateFlow(flow)).toEqual([])
  })

  it('fluxo vazio acusa a falta do gatilho', () => {
    expect(codes({ nodes: [], edges: [] })).toEqual(['sem-gatilho'])
  })

  it('exige exatamente um gatilho', () => {
    const dois = valido()
    dois.nodes.push(node('g2', 'gatilho', 'Outro'))
    dois.edges.push({ id: 'g2->f1', source: 'g2', target: 'f1' })
    const issues = validateFlow(dois)
    expect(issues.map((i) => i.code)).toContain('varios-gatilhos')
    expect(issues.find((i) => i.code === 'varios-gatilhos')?.message).toMatch(/2 gatilhos/)

    const zero = valido()
    zero.nodes = zero.nodes.filter((n) => n.id !== 'g')
    zero.edges = zero.edges.filter((e) => e.source !== 'g')
    expect(codes(zero)).toContain('sem-gatilho')
  })

  it('a condição precisa das saídas "sim" e "não"', () => {
    const semSim = valido()
    semSim.edges = semSim.edges.filter((e) => e.id !== 'c:sim->e')
    semSim.nodes = semSim.nodes.filter((n) => n.id !== 'e')
    semSim.edges = semSim.edges.filter((e) => e.source !== 'e')
    const i1 = validateFlow(semSim)
    expect(i1.map((i) => i.code)).toContain('condicao-sem-sim')
    expect(i1.find((i) => i.code === 'condicao-sem-sim')?.message).toContain('Pedido pago?')
    expect(i1.find((i) => i.code === 'condicao-sem-sim')?.nodeId).toBe('c')

    const semNao = valido()
    semNao.edges = semNao.edges.filter((e) => e.id !== 'c:nao->f2')
    semNao.nodes = semNao.nodes.filter((n) => n.id !== 'f2')
    expect(codes(semNao)).toContain('condicao-sem-nao')
    expect(codes(semNao)).not.toContain('condicao-sem-sim')

    const nenhuma = valido()
    nenhuma.edges = nenhuma.edges.filter((e) => e.source !== 'c')
    expect(codes(nenhuma)).toEqual(expect.arrayContaining(['condicao-sem-sim', 'condicao-sem-nao']))

    const duasSim = valido()
    duasSim.edges.push({ id: 'c:sim->f2', source: 'c', target: 'f2', branch: 'sim' })
    expect(codes(duasSim)).toContain('condicao-saida-repetida')
  })

  it('bloco que não é fim precisa de saída', () => {
    const flow = valido()
    flow.edges = flow.edges.filter((e) => e.id !== 'a->c')
    const issues = validateFlow(flow)
    const semSaida = issues.find((i) => i.code === 'sem-saida')
    expect(semSaida?.nodeId).toBe('a')
    expect(semSaida?.message).toContain('Enviar e-mail')
  })

  it('o fim não pode ter saída', () => {
    const flow = valido()
    flow.edges.push({ id: 'f1->f2', source: 'f1', target: 'f2' })
    expect(validateFlow(flow).find((i) => i.code === 'fim-com-saida')?.nodeId).toBe('f1')
  })

  it('bloco inalcançável a partir do gatilho é acusado', () => {
    const flow = valido()
    flow.nodes.push(node('solto', 'acao', 'Solto'), node('f3', 'fim', 'Outro fim'))
    flow.edges.push({ id: 'solto->f3', source: 'solto', target: 'f3' })
    const issues = validateFlow(flow).filter((i) => i.code === 'inalcancavel')
    expect(issues.map((i) => i.nodeId)).toEqual(['solto', 'f3'])
  })

  it('ciclos são acusados, inclusive auto-laço e ciclo de dois blocos', () => {
    const laco = valido()
    laco.edges = laco.edges.map((e) => (e.id === 'e->f1' ? { ...e, target: 'e' } : e))
    expect(codes(laco)).toContain('ciclo')

    const dois: Flow = {
      nodes: [node('g', 'gatilho'), node('a', 'acao', 'A'), node('b', 'acao', 'B')],
      edges: [
        { id: '1', source: 'g', target: 'a' },
        { id: '2', source: 'a', target: 'b' },
        { id: '3', source: 'b', target: 'a' },
      ],
    }
    const issue = validateFlow(dois).find((i) => i.code === 'ciclo')
    expect(issue?.message).toContain('A')
    expect(issue?.message).toContain('B')
  })

  it('ligação com origem ou destino inexistente é fluxo malformado', () => {
    const flow = valido()
    flow.edges.push({ id: 'x', source: 'c', target: 'fantasma', branch: 'sim' })
    const issue = validateFlow(flow).find((i) => i.code === 'ligacao-invalida')
    expect(issue?.edgeId).toBe('x')
    const origem = valido()
    origem.edges.push({ id: 'y', source: 'fantasma', target: 'f1' })
    expect(validateFlow(origem).find((i) => i.code === 'ligacao-invalida')?.edgeId).toBe('y')
  })

  it('"sim"/"não" só saem de condição, e a condição exige o ramo', () => {
    const flow = valido()
    flow.edges = flow.edges.map((e) => (e.id === 'a->c' ? { ...e, branch: 'sim' as const } : e))
    expect(validateFlow(flow).find((i) => i.code === 'ramo-invalido')?.edgeId).toBe('a->c')

    const semRamo = valido()
    semRamo.edges = semRamo.edges.map((e) =>
      e.id === 'c:sim->e' ? { id: e.id, source: e.source, target: e.target } : e,
    )
    expect(codes(semRamo)).toContain('ramo-invalido')
  })

  it('bloco comum com duas saídas é fluxo malformado', () => {
    const flow = valido()
    flow.edges.push({ id: 'a->f1', source: 'a', target: 'f1' })
    expect(codes(flow)).toContain('varias-saidas')
  })

  it('a ordem dos problemas é estável', () => {
    const flow = valido()
    flow.edges = flow.edges.filter((e) => e.source !== 'c')
    expect(validateFlow(flow)).toEqual(validateFlow(flow))
  })

  it('usa o tipo do bloco quando o rótulo está vazio', () => {
    const flow: Flow = {
      nodes: [node('g', 'gatilho', '  '), node('f', 'fim')],
      edges: [],
    }
    expect(validateFlow(flow).find((i) => i.code === 'sem-saida')?.message).toContain('Gatilho')
  })
})

describe('serializeFlow e parseFlow', () => {
  it('ida e volta devolve o mesmo fluxo, e a saída é estável', () => {
    const flow = valido()
    const texto = serializeFlow(flow)
    expect(serializeFlow(flow)).toBe(texto)
    const lido = parseFlow(texto)
    expect(lido.ok).toBe(true)
    if (lido.ok) {
      expect(lido.flow).toEqual(flow)
      expect(serializeFlow(lido.flow)).toBe(texto)
    }
  })

  it('a ordem das chaves do config não muda a saída', () => {
    const a: Flow = {
      nodes: [node('e', 'espera', 'E', { unit: 'horas', duration: 2 })],
      edges: [],
    }
    const b: Flow = {
      nodes: [node('e', 'espera', 'E', { duration: 2, unit: 'horas' })],
      edges: [],
    }
    expect(serializeFlow(a)).toBe(serializeFlow(b))
  })

  it.each([
    ['JSON inválido', '{nao e json', /JSON/],
    ['raiz que não é objeto', '[]', /objeto/],
    ['raiz nula', 'null', /objeto/],
    ['nodes faltando', '{"edges":[]}', /nodes/],
    ['edges faltando', '{"nodes":[]}', /edges/],
  ])('recusa %s', (_nome, texto, esperado) => {
    const r = parseFlow(texto)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toMatch(esperado)
  })

  const base = () => JSON.parse(serializeFlow(valido())) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

  it('recusa bloco com tipo desconhecido, posição sem números, id duplicado e campos faltando', () => {
    const tipo = base()
    tipo.nodes[0].type = 'robo'
    expect(parseFlow(JSON.stringify(tipo))).toMatchObject({ ok: false })

    const pos = base()
    pos.nodes[0].position = { x: 'a', y: 1 }
    expect(parseFlow(JSON.stringify(pos))).toMatchObject({ ok: false })

    const infinito =
      '{"nodes":[{"id":"a","type":"fim","position":{"x":1e999,"y":0},"data":{"label":"a"}}],"edges":[]}'
    expect(parseFlow(infinito).ok).toBe(false)

    const dup = base()
    dup.nodes[1].id = dup.nodes[0].id
    const r = parseFlow(JSON.stringify(dup))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/repetido|duplicad/)

    const semRotulo = base()
    delete semRotulo.nodes[0].data.label
    expect(parseFlow(JSON.stringify(semRotulo)).ok).toBe(false)

    const semData = base()
    delete semData.nodes[0].data
    expect(parseFlow(JSON.stringify(semData)).ok).toBe(false)

    const semId = base()
    delete semId.nodes[0].id
    expect(parseFlow(JSON.stringify(semId)).ok).toBe(false)

    const configRuim = base()
    configRuim.nodes[3].data.config = 'texto'
    expect(parseFlow(JSON.stringify(configRuim)).ok).toBe(false)
  })

  it('recusa ligação com ramo fora de sim|nao, campos faltando e id repetido', () => {
    const ramo = base()
    ramo.edges[2].branch = 'talvez'
    expect(parseFlow(JSON.stringify(ramo)).ok).toBe(false)

    const semAlvo = base()
    delete semAlvo.edges[0].target
    expect(parseFlow(JSON.stringify(semAlvo)).ok).toBe(false)

    const dup = base()
    dup.edges[1].id = dup.edges[0].id
    expect(parseFlow(JSON.stringify(dup)).ok).toBe(false)

    const naoObjeto = base()
    naoObjeto.edges[0] = 3
    expect(parseFlow(JSON.stringify(naoObjeto)).ok).toBe(false)
    const blocoNaoObjeto = base()
    blocoNaoObjeto.nodes[0] = 'x'
    expect(parseFlow(JSON.stringify(blocoNaoObjeto)).ok).toBe(false)
  })

  it('ignora campos extras e aceita config livre sem validar o conteúdo', () => {
    const flow = base()
    flow.extra = 1
    flow.nodes[0].cor = 'azul'
    flow.nodes[3].data.config = { qualquer: { coisa: [1, 2] } }
    const r = parseFlow(JSON.stringify(flow))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.flow.nodes[3]?.data.config).toEqual({ qualquer: { coisa: [1, 2] } })
      expect(r.flow.nodes[0]).not.toHaveProperty('cor')
    }
  })

  it('nunca lança, mesmo com entrada estranha', () => {
    for (const texto of ['', ' ', '{', 'undefined', '"x"', '1', '{"nodes":{},"edges":1}'])
      expect(() => parseFlow(texto)).not.toThrow()
  })
})

describe('edição pura', () => {
  it('addNode gera id único, rótulo padrão e não reaproveita id reservado', () => {
    const flow = valido()
    const { flow: f1, id } = addNode(flow, 'acao', { x: 10, y: 20 })
    expect(f1.nodes).toHaveLength(flow.nodes.length + 1)
    expect(flow.nodes.some((n) => n.id === id)).toBe(false)
    const novo = f1.nodes.find((n) => n.id === id)!
    expect(novo.type).toBe('acao')
    expect(novo.data.label).toBe('Ação')
    expect(novo.position).toEqual({ x: 10, y: 20 })

    const { flow: f2, id: id2 } = addNode(f1, 'acao', { x: 0, y: 0 })
    expect(id2).not.toBe(id)
    // apagado e adicionado de novo no mesmo fluxo: o id apagado, reservado, não volta
    const semUltimo = removeNode(f2, id2)
    const { id: id3 } = addNode(semUltimo, 'acao', { x: 0, y: 0 }, { reservedIds: [id, id2] })
    expect([id, id2]).not.toContain(id3)
    // determinístico
    expect(addNode(flow, 'espera', { x: 1, y: 1 }).id).toBe(
      addNode(flow, 'espera', { x: 1, y: 1 }).id,
    )
  })

  it('addNode da espera já traz um config padrão e o rótulo pode ser dado', () => {
    const { flow, id } = addNode(
      { nodes: [], edges: [] },
      'espera',
      { x: 0, y: 0 },
      { label: 'Aguardar' },
    )
    const n = flow.nodes.find((x) => x.id === id)!
    expect(n.data.label).toBe('Aguardar')
    expect(n.data.config).toEqual({ duration: 5, unit: 'minutos' })
  })

  it('removeNode leva as ligações junto e não altera o original', () => {
    const flow = congelar(valido())
    const r = removeNode(flow, 'c')
    expect(r.nodes.some((n) => n.id === 'c')).toBe(false)
    expect(r.edges.every((e) => e.source !== 'c' && e.target !== 'c')).toBe(true)
    expect(flow.nodes).toHaveLength(6)
    expect(removeNode(flow, 'nao-existe')).toEqual(flow)
  })

  it('removeEdge tira só a ligação', () => {
    const flow = congelar(valido())
    const r = removeEdge(flow, 'a->c')
    expect(r.edges.some((e) => e.id === 'a->c')).toBe(false)
    expect(r.nodes).toHaveLength(6)
  })

  it('moveNode muda só a posição do bloco', () => {
    const flow = congelar(valido())
    const r = moveNode(flow, 'a', { x: 5, y: 7 })
    expect(r.nodes.find((n) => n.id === 'a')?.position).toEqual({ x: 5, y: 7 })
    expect(flow.nodes.find((n) => n.id === 'a')?.position).toEqual({ x: 0, y: 0 })
    expect(r.edges).toBe(flow.edges)
  })

  it('updateNodeData troca rótulo e config sem tocar no resto', () => {
    const flow = congelar(valido())
    const r = updateNodeData(flow, 'e', {
      label: 'Aguardar',
      config: { duration: 2, unit: 'horas' },
    })
    const e = r.nodes.find((n) => n.id === 'e')!
    expect(e.data).toEqual({ label: 'Aguardar', config: { duration: 2, unit: 'horas' } })
    expect(flow.nodes.find((n) => n.id === 'e')?.data.label).toBe('Esperar')
    expect(
      updateNodeData(flow, 'a', { label: 'Novo' }).nodes.find((n) => n.id === 'a')?.data,
    ).toEqual({
      label: 'Novo',
    })
  })

  describe('connectNodes', () => {
    const livre = (): Flow => ({
      nodes: [
        node('g', 'gatilho'),
        node('a', 'acao', 'A'),
        node('b', 'acao', 'B'),
        node('c', 'condicao', 'C'),
        node('f', 'fim'),
      ],
      edges: [],
    })

    it('liga dois blocos', () => {
      const r = connectNodes(livre(), 'g', 'a')
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.flow.edges).toEqual([{ id: 'g->a', source: 'g', target: 'a' }])
    })

    it('recusa auto-laço, duplicata, saída de fim e entrada em gatilho, com motivo', () => {
      const flow = congelar(livre())
      for (const [s, t, motivo] of [
        ['a', 'a', /ele mesmo/],
        ['f', 'a', /fim/i],
        ['a', 'g', /gatilho/i],
        ['x', 'a', /não existe/],
        ['a', 'x', /não existe/],
      ] as const) {
        const r = connectNodes(flow, s, t)
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.reason).toMatch(motivo)
      }
      const ligado = connectNodes(flow, 'a', 'b')
      expect(ligado.ok).toBe(true)
      if (ligado.ok) {
        const dup = connectNodes(ligado.flow, 'a', 'b')
        expect(dup.ok).toBe(false)
        if (!dup.ok) expect(dup.reason).toMatch(/já existe/)
      }
    })

    it('a segunda saída de um bloco comum substitui a primeira', () => {
      const a = connectNodes(livre(), 'a', 'b')
      if (!a.ok) throw new Error('esperava ligar')
      const b = connectNodes(a.flow, 'a', 'f')
      expect(b.ok).toBe(true)
      if (b.ok) expect(b.flow.edges.map((e) => e.target)).toEqual(['f'])
    })

    it('a condição aceita uma ligação por ramo e exige o ramo', () => {
      const sem = connectNodes(livre(), 'c', 'a')
      expect(sem.ok).toBe(false)
      if (!sem.ok) expect(sem.reason).toMatch(/sim|não/i)
      const sim = connectNodes(livre(), 'c', 'a', 'sim')
      if (!sim.ok) throw new Error('esperava ligar')
      const nao = connectNodes(sim.flow, 'c', 'b', 'nao')
      if (!nao.ok) throw new Error('esperava ligar')
      expect(nao.flow.edges).toHaveLength(2)
      const troca = connectNodes(nao.flow, 'c', 'f', 'sim')
      expect(troca.ok).toBe(true)
      if (troca.ok) {
        expect(troca.flow.edges.filter((e) => e.branch === 'sim')).toHaveLength(1)
        expect(troca.flow.edges.find((e) => e.branch === 'sim')?.target).toBe('f')
      }
    })

    it('ramo em bloco que não é condição é recusado', () => {
      const r = connectNodes(livre(), 'a', 'b', 'sim')
      expect(r.ok).toBe(false)
    })

    it('o id da ligação é determinístico e não colide', () => {
      const r = connectNodes(livre(), 'c', 'a', 'nao')
      if (r.ok) expect(r.flow.edges[0]?.id).toBe('c:nao->a')
    })
  })

  describe('setNext e nextCandidates', () => {
    const base = (): Flow => ({
      nodes: [
        node('g', 'gatilho'),
        node('a', 'acao', 'A'),
        node('c', 'condicao', 'C'),
        node('f', 'fim'),
      ],
      edges: [{ id: 'g->a', source: 'g', target: 'a' }],
    })

    it('liga, troca e remove o próximo bloco', () => {
      const f1 = setNext(base(), 'a', 'f')
      expect(f1.edges.find((e) => e.source === 'a')?.target).toBe('f')
      const f2 = setNext(f1, 'a', 'c')
      expect(f2.edges.filter((e) => e.source === 'a')).toHaveLength(1)
      expect(f2.edges.find((e) => e.source === 'a')?.target).toBe('c')
      const f3 = setNext(f2, 'a', null)
      expect(f3.edges.filter((e) => e.source === 'a')).toHaveLength(0)
    })

    it('na condição mexe só no ramo pedido', () => {
      const f1 = setNext(base(), 'c', 'f', 'sim')
      const f2 = setNext(f1, 'c', 'a', 'nao')
      expect(f2.edges.filter((e) => e.source === 'c')).toHaveLength(2)
      const f3 = setNext(f2, 'c', null, 'sim')
      expect(f3.edges.filter((e) => e.source === 'c').map((e) => e.branch)).toEqual(['nao'])
    })

    it('uma ligação recusada devolve o fluxo como estava', () => {
      const flow = congelar(base())
      expect(setNext(flow, 'f', 'a')).toBe(flow)
    })

    it('os candidatos não incluem o próprio bloco nem o gatilho', () => {
      const ids = nextCandidates(base(), 'a').map((n) => n.id)
      expect(ids).toEqual(['c', 'f'])
      expect(nextCandidates(base(), 'f')).toEqual([])
    })
  })
})

describe('simulação', () => {
  it('percorre gatilho, ação, espera e fim, um passo por avanço', () => {
    const flow: Flow = {
      nodes: [
        node('g', 'gatilho', 'Início'),
        node('a', 'acao', 'Enviar'),
        node('e', 'espera', 'Esperar', { duration: 5, unit: 'minutos' }),
        node('f', 'fim', 'Fim'),
      ],
      edges: [
        { id: '1', source: 'g', target: 'a' },
        { id: '2', source: 'a', target: 'e' },
        { id: '3', source: 'e', target: 'f' },
      ],
    }
    let s = startSimulation(flow)
    expect(s.status).toBe('running')
    expect(s.currentId).toBe('g')
    expect(s.steps).toEqual([])
    const vistos: string[] = []
    while (s.status === 'running') {
      s = advanceSimulation(flow, s)
      vistos.push(s.steps.map((p) => p.nodeId).join(','))
    }
    expect(vistos).toEqual(['g', 'g,a', 'g,a,e', 'g,a,e,f'])
    expect(s.status).toBe('finished')
    expect(s.currentId).toBeNull()
    expect(s.steps.every((p) => p.status === 'succeeded')).toBe(true)
    expect(s.steps[2]?.detail).toBe('Aguardaria 5 minutos')
    expect(s.steps.map((p) => p.type)).toEqual(['gatilho', 'acao', 'espera', 'fim'])
  })

  it('a condição pausa e só continua com a escolha; o outro ramo fica fora do registro', () => {
    const flow = valido()
    let s = startSimulation(flow)
    s = advanceSimulation(flow, s) // g
    s = advanceSimulation(flow, s) // a
    expect(s.status).toBe('waiting-choice')
    expect(s.currentId).toBe('c')
    const parado = advanceSimulation(flow, s)
    expect(parado).toEqual(s)
    expect(advanceSimulation(flow, s, 'talvez' as 'sim')).toEqual(s)

    const nao = advanceSimulation(flow, s, 'nao')
    expect(nao.steps.at(-1)).toMatchObject({ nodeId: 'c', status: 'succeeded' })
    expect(nao.steps.at(-1)?.detail).toBe('Escolha: Não')
    expect(nao.currentId).toBe('f2')
    const fim = advanceSimulation(flow, nao)
    expect(fim.status).toBe('finished')
    const ids = fim.steps.map((p) => p.nodeId)
    expect(ids).toEqual(['g', 'a', 'c', 'f2'])
    expect(ids).not.toContain('e')

    const sim = advanceSimulation(flow, s, 'sim')
    expect(sim.currentId).toBe('e')
    expect(sim.status).toBe('running')
  })

  it('a espera descreve o tempo sem esperar, com singular e plural', () => {
    expect(describeWait({ duration: 1, unit: 'dias' })).toBe('Aguardaria 1 dia')
    expect(describeWait({ duration: 3, unit: 'horas' })).toBe('Aguardaria 3 horas')
    expect(describeWait({ duration: 1, unit: 'segundos' })).toBe('Aguardaria 1 segundo')
    expect(formatWait({ duration: 2, unit: 'dias' })).toBe('2 dias')
    expect(formatWait({ unit: 'dias' })).toBeNull()
    expect(describeWait(undefined)).toBe('Aguardaria o tempo definido no bloco')
    expect(describeWait({ duration: 'x', unit: 'minutos' })).toBe(
      'Aguardaria o tempo definido no bloco',
    )
  })

  it('fluxo inválido não inicia e traz os problemas', () => {
    const flow = valido()
    flow.edges = flow.edges.filter((e) => e.id !== 'a->c')
    const s = startSimulation(flow)
    expect(s.status).toBe('error')
    expect(s.steps).toEqual([])
    expect(s.currentId).toBeNull()
    expect(s.issues.length).toBeGreaterThan(0)
    expect(advanceSimulation(flow, s)).toEqual(s)
  })

  it('avançar depois do fim é inofensivo e reiniciar volta ao começo', () => {
    const flow: Flow = {
      nodes: [node('g', 'gatilho'), node('f', 'fim')],
      edges: [{ id: '1', source: 'g', target: 'f' }],
    }
    let s = startSimulation(flow)
    s = advanceSimulation(flow, advanceSimulation(flow, s))
    expect(s.status).toBe('finished')
    expect(advanceSimulation(flow, s)).toEqual(s)
    const r = resetSimulation()
    expect(r).toEqual({ status: 'idle', steps: [], currentId: null, issues: [] })
  })

  it('não muda o fluxo e é determinística', () => {
    const flow = congelar(valido())
    const rodar = () => {
      let s = startSimulation(flow)
      while (s.status === 'running' || s.status === 'waiting-choice')
        s = advanceSimulation(flow, s, 'sim')
      return s
    }
    expect(rodar()).toEqual(rodar())
    expect(rodar().status).toBe('finished')
  })

  it('um bloco da simulação que sumiu do fluxo vira erro, não exceção', () => {
    const flow = valido()
    let s = startSimulation(flow)
    s = advanceSimulation(flow, s)
    const mutilado = removeNode(flow, 'a')
    const r = advanceSimulation(mutilado, s)
    expect(r.status).toBe('error')
    expect(r.issues.length).toBeGreaterThan(0)
  })
})

/* Propriedades com semente fixa (sem dependência nova). */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Gera um fluxo válido em camadas: cada bloco aponta só para blocos mais à frente. */
function gerarValido(rand: () => number): Flow {
  const tipos: FlowNodeType[] = ['acao', 'espera', 'condicao']
  const meio = Math.floor(rand() * 6)
  const nodes: FlowNode[] = [node('n0', 'gatilho')]
  for (let i = 1; i <= meio; i++) nodes.push(node(`n${i}`, tipos[Math.floor(rand() * 3)]!))
  nodes.push(node(`n${meio + 1}`, 'fim'))
  const ultimo = nodes.length - 1
  const edges: Flow['edges'] = []
  const alvo = (de: number) => de + 1 + Math.floor(rand() * (ultimo - de))
  nodes.forEach((n, i) => {
    if (n.type === 'fim') return
    if (n.type === 'condicao') {
      edges.push({ id: `${n.id}:sim`, source: n.id, target: `n${alvo(i)}`, branch: 'sim' })
      edges.push({ id: `${n.id}:nao`, source: n.id, target: `n${alvo(i)}`, branch: 'nao' })
    } else edges.push({ id: `${n.id}:p`, source: n.id, target: `n${alvo(i)}` })
  })
  // garante alcançabilidade: todo bloco intermediário recebe ao menos uma entrada
  for (let i = 1; i <= ultimo; i++) {
    if (edges.some((e) => e.target === `n${i}`)) continue
    const origem = nodes[i - 1]!
    if (origem.type === 'condicao' || origem.type === 'fim') continue
    const e = edges.find((x) => x.source === origem.id)!
    e.target = `n${i}`
  }
  return { nodes, edges }
}

describe('propriedades (200 fluxos com semente)', () => {
  it('fluxo sem problema termina em finished para qualquer sequência de escolhas', () => {
    const rand = mulberry32(2026)
    let validos = 0
    for (let i = 0; i < 200; i++) {
      const flow = gerarValido(rand)
      if (validateFlow(flow).length > 0) continue // a geração pode deixar um bloco solto
      validos++
      let s = startSimulation(flow)
      let guarda = 0
      while ((s.status === 'running' || s.status === 'waiting-choice') && guarda++ < 100)
        s = advanceSimulation(flow, s, rand() < 0.5 ? 'sim' : 'nao')
      expect(s.status).toBe('finished')
      // a ida e volta da serialização mantém o fluxo
      const lido = parseFlow(serializeFlow(flow))
      expect(lido.ok && lido.flow).toEqual(flow)
    }
    expect(validos).toBeGreaterThan(60)
  })

  it('removeNode nunca deixa ligação pendurada e moveNode mantém a validade', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 200; i++) {
      const flow = gerarValido(rand)
      const alvo = flow.nodes[Math.floor(rand() * flow.nodes.length)]!
      const r = removeNode(flow, alvo.id)
      const ids = new Set(r.nodes.map((n) => n.id))
      expect(r.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(true)
      const movido = moveNode(flow, alvo.id, { x: 3, y: 4 })
      expect(validateFlow(movido)).toEqual(validateFlow(flow))
    }
  })

  it('um fluxo com problema nunca inicia a simulação', () => {
    const rand = mulberry32(99)
    for (let i = 0; i < 200; i++) {
      const flow = gerarValido(rand)
      const quebrado = removeNode(
        flow,
        flow.nodes[1 + Math.floor(rand() * (flow.nodes.length - 1))]!.id,
      )
      if (validateFlow(quebrado).length === 0) continue
      expect(startSimulation(quebrado).status).toBe('error')
    }
  })
})
