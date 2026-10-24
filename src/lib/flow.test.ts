import { describe, expect, it } from 'vitest'
import {
  migrateFlow,
  nodeName,
  parseFlow,
  serializeFlow,
  validateFlow,
  type Flow,
  type FlowNode,
  type FlowNodeType,
} from './flow'
import { FLOW_CARD_W, estimateNodeHeight } from './flow-blocks'
import { layoutFlow } from './flow-layout'

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

/** O fluxo da 2.7.0 (com `fim` e condição `sim`/`nao`, sem `version`). */
function legado(): Flow {
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

const rule = (id: string, over: object = {}) => ({
  id,
  field: 'pedido.valor',
  operator: 'maior',
  value: '500',
  ...over,
})

/** Fluxo v2 válido: webhook, WhatsApp, condição (regra 1 para tarefa, senão sem ligação). */
function valido(): Flow {
  return {
    version: 2,
    nodes: [
      node('w', 'webhook-entrada', 'Receber webhook', {
        method: 'POST',
        path: '/hooks/x',
        responseCode: 200,
        received: true,
        mapping: [{ from: 'pedido.valor', to: 'negocio.valor' }],
      }),
      node('m', 'whatsapp', 'Enviar WhatsApp', { to: '+55 11 90000-0000', message: 'Olá' }),
      node('c', 'condicao', 'Condição', { rules: [rule('r1')] }),
      node('t', 'tarefa', 'Criar tarefa', { title: 'Ligar', assignee: 'Ana', dueDays: 1 }),
    ],
    edges: [
      { id: 'w->m', source: 'w', target: 'm' },
      { id: 'm->c', source: 'm', target: 'c' },
      { id: 'c:r1->t', source: 'c', target: 't', branch: 'r1' },
    ],
  }
}

const codes = (flow: Flow) => validateFlow(flow).map((i) => i.code)
const withNode = (flow: Flow, id: string, patch: Partial<FlowNode['data']>): Flow => ({
  ...flow,
  nodes: flow.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
})
const cfg = (flow: Flow, id: string, patch: Record<string, unknown>) =>
  withNode(flow, id, { config: { ...flow.nodes.find((n) => n.id === id)!.data.config, ...patch } })

describe('migração da 2.7.0', () => {
  it('parseFlow converte: sem fim, condição com regra "Sim" e "senao", posições crescentes', () => {
    const r = parseFlow(JSON.stringify(legado()))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const f = r.flow
    expect(f.version).toBe(2)
    expect(f.nodes.map((n) => n.type)).not.toContain('fim')
    const c = f.nodes.find((n) => n.id === 'c')!
    expect(c.data.config).toEqual({
      rules: [{ id: 'sim', label: 'Sim', field: '', operator: 'igual', value: '' }],
    })
    expect(f.edges.map((e) => e.branch).filter(Boolean)).toEqual(['sim', 'senao'].slice(0, 1))
    // a ligação que ia para o fim some; quem apontava para ele fica sem saída
    expect(f.edges.some((e) => e.target === 'f1' || e.target === 'f2')).toBe(false)
    const x = (id: string) => f.nodes.find((n) => n.id === id)!.position.x
    for (const e of f.edges) expect(x(e.target)).toBeGreaterThan(x(e.source))
  })

  it('a condição "nao" vira "senao" quando o ramo não terminava em fim', () => {
    const base = legado()
    base.nodes.push(node('x', 'acao', 'Outra'))
    base.edges = base.edges.map((e) =>
      e.id === 'c:nao->f2' ? { ...e, id: 'c:nao->x', target: 'x' } : e,
    )
    const f = migrateFlow(base)
    expect(f.edges.find((e) => e.source === 'c' && e.target === 'x')).toMatchObject({
      branch: 'senao',
      id: 'c:senao->x',
    })
  })

  it('migrateFlow não mexe em quem já é v2', () => {
    const v = valido()
    expect(migrateFlow(v)).toBe(v)
  })

  it('serializeFlow e validateFlow aceitam o objeto da 2.7.0 direto', () => {
    const texto = serializeFlow(legado())
    const r = parseFlow(texto)
    expect(r.ok).toBe(true)
    expect(texto.indexOf('"version"')).toBeLessThan(texto.indexOf('"nodes"'))
    expect(codes(legado())).not.toContain('ramo-invalido')
    // a regra "Sim" vem vazia da conversão: a validação acusa até a pessoa preencher
    expect(codes(legado())).toContain('regra-incompleta')
  })

  it('parseFlow de um JSON da 2.7.0 com ciclo devolve resultado, não trava, e o layout é estável', () => {
    const ciclo = legado()
    ciclo.edges.push({ id: 'e->a', source: 'e', target: 'a' })
    const a = parseFlow(JSON.stringify(ciclo))
    const b = parseFlow(JSON.stringify(ciclo))
    expect(a.ok).toBe(true)
    expect(a).toEqual(b)
  })
})

describe('serializeFlow e parseFlow (v2)', () => {
  it('ida e volta idêntica e "version" é a primeira chave', () => {
    const texto = serializeFlow(valido())
    expect(texto.startsWith('{\n  "version": 2')).toBe(true)
    const r = parseFlow(texto)
    expect(r.ok && serializeFlow(r.flow)).toBe(texto)
    expect(r.ok && r.flow).toEqual(valido())
  })

  it('config com chaves ordenadas e sem "description" nem campos extras', () => {
    const f = cfg(valido(), 'm', { z: 1, a: 2 })
    const texto = serializeFlow(f)
    expect(texto.indexOf('"a": 2')).toBeLessThan(texto.indexOf('"z": 1'))
    const r = parseFlow(texto.replace('"label": "Olá"', '"label": "Olá"'))
    expect(r.ok).toBe(true)
  })

  it('versão 3 é recusada, e "fim" em version 2 também', () => {
    const v3 = parseFlow(JSON.stringify({ version: 3, nodes: [], edges: [] }))
    expect(!v3.ok && v3.errors[0]).toMatch(/versão do formato não suportada/i)
    const fim = parseFlow(
      JSON.stringify({ version: 2, nodes: [{ ...node('f', 'fim') }], edges: [] }),
    )
    expect(!fim.ok && fim.errors.join(' ')).toMatch(/tipo desconhecido \(fim\)/)
  })

  it('branch qualquer texto não vazio em v2; na 2.7.0 só sim|nao', () => {
    const ok = parseFlow(
      JSON.stringify({
        version: 2,
        nodes: [node('a', 'condicao', 'a', { rules: [] }), node('b', 'acao')],
        edges: [{ id: 'e', source: 'a', target: 'b', branch: 'qualquer' }],
      }),
    )
    expect(ok.ok).toBe(true)
    const vazio = parseFlow(
      JSON.stringify({
        version: 2,
        nodes: [node('a', 'acao'), node('b', 'acao')],
        edges: [{ id: 'e', source: 'a', target: 'b', branch: '' }],
      }),
    )
    expect(vazio.ok).toBe(false)
    const velho = parseFlow(
      JSON.stringify({
        nodes: [node('a', 'condicao'), node('b', 'acao')],
        edges: [{ id: 'e', source: 'a', target: 'b', branch: 'talvez' }],
      }),
    )
    expect(!velho.ok && velho.errors.join(' ')).toMatch(/sim.*nao/)
  })

  it('tipo novo sem version é recusado (formato da 2.7.0)', () => {
    const r = parseFlow(JSON.stringify({ nodes: [node('a', 'whatsapp')], edges: [] }))
    expect(!r.ok && r.errors[0]).toMatch(/tipo desconhecido \(whatsapp\)/)
  })

  it.each([
    ['texto que não é JSON', '{', /não é um JSON válido/],
    ['JSON que não é objeto', '[1]', /precisa ser um objeto/],
    ['sem lista de blocos', '{"edges":[]}', /"nodes" precisa ser uma lista/],
    ['sem lista de ligações', '{"nodes":[]}', /"edges" precisa ser uma lista/],
  ])('recusa %s', (_n, texto, msg) => {
    const r = parseFlow(texto)
    expect(!r.ok && r.errors[0]).toMatch(msg)
  })

  it('recusa bloco malformado, id repetido, posição ruim, label e config ruins', () => {
    const r = parseFlow(
      JSON.stringify({
        version: 2,
        nodes: [
          7,
          { id: '', type: 'acao', position: { x: 0, y: 0 }, data: { label: 'a' } },
          node('a', 'acao'),
          node('a', 'acao'),
          { id: 'p', type: 'acao', position: { x: 'a', y: 0 }, data: { label: 'p' } },
          { id: 'l', type: 'acao', position: { x: 0, y: 0 }, data: { label: 3 } },
          { id: 'k', type: 'acao', position: { x: 0, y: 0 }, data: { label: 'k', config: 5 } },
        ],
        edges: [
          1,
          { id: 'e', source: 'a', target: '' },
          { id: 'x', source: 'a', target: 'a' },
          { id: 'x', source: 'a', target: 'a' },
        ],
      }),
    )
    expect(r.ok).toBe(false)
    const t = !r.ok ? r.errors.join('\n') : ''
    for (const m of [
      'Bloco 1: precisa ser um objeto',
      'Bloco 2: falta o "id"',
      'Bloco 4: o id "a" está repetido',
      'Bloco 5: "position"',
      'Bloco 6: "data.label"',
      'Bloco 7: "data.config"',
      'Ligação 1: precisa ser um objeto',
      'Ligação 2: falta o campo "target"',
      'Ligação 4: o id "x" está repetido',
    ])
      expect(t).toContain(m)
  })
})

describe('validateFlow', () => {
  it('fluxo válido não tem problema e o mínimo (só o gatilho) também', () => {
    expect(validateFlow(valido())).toEqual([])
    const min = { version: 2 as const, nodes: [valido().nodes[0]!], edges: [] }
    expect(validateFlow(min)).toEqual([])
  })

  it('bloco sem saída é válido e a condição com "Senão" sem ligação também', () => {
    expect(codes(valido())).toEqual([])
  })

  it('sem gatilho e vários gatilhos', () => {
    const sem = { ...valido(), nodes: valido().nodes.slice(1), edges: [] }
    expect(codes(sem)).toContain('sem-gatilho')
    expect(codes(sem)).not.toContain('inalcancavel')
    const dois = valido()
    dois.nodes.push(node('a2', 'agendamento', 'Agendar', { frequency: 'diario', time: '08:00' }))
    expect(codes(dois)).toContain('varios-gatilhos')
  })

  it('o gatilho legado conta como gatilho', () => {
    expect(codes({ version: 2, nodes: [node('g', 'gatilho')], edges: [] })).toEqual([])
  })

  it('ligação para bloco que não existe', () => {
    const f = valido()
    f.edges.push({ id: 'x', source: 'w', target: 'sumiu' })
    expect(codes(f)).toContain('ligacao-invalida')
  })

  it('ramo inválido: bloco comum com saída de regra e condição com saída que não existe', () => {
    const a = valido()
    a.edges[0] = { ...a.edges[0]!, branch: 'r1' }
    expect(validateFlow(a).find((i) => i.code === 'ramo-invalido')?.nodeId).toBe('w')
    const b = valido()
    b.edges[2] = { ...b.edges[2]!, branch: 'r9' }
    expect(validateFlow(b).find((i) => i.code === 'ramo-invalido')?.nodeId).toBe('c')
    const c = valido()
    c.edges[2] = { id: 'c->t', source: 'c', target: 't' }
    expect(codes(c)).toContain('ramo-invalido')
  })

  it('"senao" é uma saída válida da condição', () => {
    const f = valido()
    f.edges.push({ id: 'c:senao->m', source: 'c', target: 'm', branch: 'senao' })
    expect(codes(f)).not.toContain('ramo-invalido')
    expect(codes(f)).toContain('ciclo')
  })

  it('bloco comum com duas saídas', () => {
    const f = valido()
    f.edges.push({ id: 'w->t', source: 'w', target: 't' })
    expect(codes(f)).toContain('varias-saidas')
  })

  it('condição com duas ligações na mesma saída', () => {
    const f = valido()
    f.edges.push({ id: 'c:r1->m', source: 'c', target: 'm', branch: 'r1' })
    expect(codes(f)).toContain('condicao-saida-repetida')
  })

  it('condição sem regra', () => {
    const f = cfg(valido(), 'c', { rules: [] })
    f.edges = f.edges.slice(0, 2)
    expect(codes(f)).toContain('condicao-sem-regra')
  })

  it('regra incompleta: campo, operador ou valor vazios; vazio e nao-vazio dispensam o valor', () => {
    for (const patch of [{ field: '' }, { value: '' }])
      expect(codes(cfg(valido(), 'c', { rules: [rule('r1', patch)] }))).toContain(
        'regra-incompleta',
      )
    for (const operator of ['vazio', 'nao-vazio'])
      expect(codes(cfg(valido(), 'c', { rules: [rule('r1', { operator, value: '' })] }))).toEqual(
        [],
      )
  })

  it.each([
    ['webhook-entrada', { path: '' }],
    ['whatsapp', { to: '' }],
    ['whatsapp', { message: '  ' }],
    ['tarefa', { title: '' }],
  ])('configuração obrigatória vazia em %s %j', (id, patch) => {
    const alvo = { 'webhook-entrada': 'w', whatsapp: 'm', tarefa: 't' }[id]!
    const issues = validateFlow(cfg(valido(), alvo, patch))
    expect(issues.map((i) => i.code)).toEqual(['config-obrigatoria-vazia'])
    expect(issues[0]!.nodeId).toBe(alvo)
    expect(issues[0]!.message).toMatch(/precisa do campo/)
  })

  it('e-mail, webhook de saída, agendamento e espera têm obrigatórios', () => {
    const f: Flow = {
      version: 2,
      nodes: [
        node('g', 'agendamento', 'Agendar', { frequency: 'diario', time: '' }),
        node('e', 'email', 'E-mail', { to: '', subject: '', message: '' }),
        node('s', 'webhook-saida', 'Saída', { method: 'POST', url: '', headers: [], body: [] }),
        node('p', 'espera', 'Esperar', { duration: 0, unit: 'horas' }),
      ],
      edges: [
        { id: 'g->e', source: 'g', target: 'e' },
        { id: 'e->s', source: 'e', target: 's' },
        { id: 's->p', source: 's', target: 'p' },
      ],
    }
    const msgs = validateFlow(f).map((i) => i.message)
    expect(msgs.filter((m) => m.includes('precisa do campo')).length).toBe(1 + 3 + 1)
    expect(msgs.some((m) => m.includes('duração maior que zero'))).toBe(true)
  })

  it('bloco que nenhum caminho alcança acusa inalcancavel com o nodeId', () => {
    const f = valido()
    f.nodes.push(node('x', 'tarefa', 'Solto', { title: 'x', assignee: '', dueDays: 1 }))
    const i = validateFlow(f).find((x) => x.code === 'inalcancavel')
    expect(i?.nodeId).toBe('x')
  })

  it('ciclo', () => {
    const f = valido()
    f.edges.push({ id: 't->m', source: 't', target: 'm' })
    expect(codes(f)).toContain('ciclo')
  })

  it('nodeName cai no nome do tipo quando o rótulo está vazio', () => {
    expect(nodeName(node('a', 'whatsapp', ' '))).toBe('Enviar WhatsApp')
    expect(nodeName(node('a', 'fim', 'Meu'))).toBe('Meu')
  })
})

describe('layoutFlow', () => {
  it('é determinístico e não sobrepõe dois blocos da mesma camada', () => {
    const f = valido()
    f.nodes.push(node('t2', 'tarefa', 'Outra', { title: 'x', assignee: '', dueDays: 1 }))
    f.edges.push({ id: 'c:senao->t2', source: 'c', target: 't2', branch: 'senao' })
    const a = layoutFlow(f)
    expect(layoutFlow(f)).toEqual(a)
    const t = a.nodes.find((n) => n.id === 't')!
    const t2 = a.nodes.find((n) => n.id === 't2')!
    expect(t.position.x).toBe(t2.position.x)
    // "Regra 1" fica acima do "Senão"
    expect(t.position.y).toBeLessThan(t2.position.y)
    expect(t2.position.y).toBeGreaterThanOrEqual(t.position.y + estimateNodeHeight(t))
  })

  it('sem gatilho: sem entrada na coluna 0; pura repetição de ciclo termina; inalcançável vai à última coluna', () => {
    const sem: Flow = {
      version: 2,
      nodes: [node('a', 'acao'), node('b', 'acao'), node('s', 'acao')],
      edges: [{ id: 'a->b', source: 'a', target: 'b' }],
    }
    const l = layoutFlow(sem)
    expect(l.nodes.find((n) => n.id === 'a')!.position.x).toBe(0)
    expect(l.nodes.find((n) => n.id === 'b')!.position.x).toBe(FLOW_CARD_W + 96)
    expect(l.nodes.find((n) => n.id === 's')!.position.x).toBe(0)
    const circulo: Flow = {
      version: 2,
      nodes: [node('a', 'acao'), node('b', 'acao')],
      edges: [
        { id: 'a->b', source: 'a', target: 'b' },
        { id: 'b->a', source: 'b', target: 'a' },
      ],
    }
    expect(layoutFlow(circulo).nodes.map((n) => n.position.x)).toEqual([0, FLOW_CARD_W + 96])
    const solto = valido()
    solto.nodes.push(node('z', 'acao'))
    const z = layoutFlow(solto).nodes.find((n) => n.id === 'z')!
    expect(z.position.x).toBeGreaterThan(
      layoutFlow(solto).nodes.find((n) => n.id === 't')!.position.x,
    )
    expect(layoutFlow({ version: 2, nodes: [], edges: [] }).nodes).toEqual([])
  })
})
