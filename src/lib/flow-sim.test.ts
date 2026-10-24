import { describe, expect, it } from 'vitest'
import {
  parseFlow,
  serializeFlow,
  validateFlow,
  type Flow,
  type FlowNode,
  type FlowNodeType,
  type FlowRule,
} from './flow'
import {
  evaluateRule,
  advanceSimulation,
  resetSimulation,
  simulateBlock,
  startSimulation,
} from './flow-sim'

const node = (
  id: string,
  type: FlowNodeType,
  label: string,
  config?: Record<string, unknown>,
): FlowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: config ? { label, config } : { label },
})

const mapping = [
  { from: 'cliente.nome', to: 'cliente.nome' },
  { from: 'cliente.telefone', to: 'cliente.telefone' },
  { from: 'cliente.plano', to: 'cliente.plano' },
  { from: 'pedido.valor', to: 'negocio.valor' },
]

/** O fluxo da vitrine: webhook, WhatsApp, condição (>500 -> webhook, plano pro -> tarefa). */
function demo(rules?: Record<string, unknown>[]): Flow {
  return {
    version: 2,
    nodes: [
      node('w', 'webhook-entrada', 'Receber webhook', {
        method: 'POST',
        path: '/hooks/novo-cliente',
        responseCode: 200,
        received: true,
        mapping,
      }),
      node('m', 'whatsapp', 'Enviar WhatsApp', {
        to: '{{cliente.telefone}}',
        message: 'Olá, {{cliente.nome}}! Seu pedido chegou.',
      }),
      node('c', 'condicao', 'Condição', {
        rules: rules ?? [
          { id: 'r1', field: 'pedido.valor', operator: 'maior', value: '500' },
          { id: 'r2', field: 'cliente.plano', operator: 'igual', value: 'pro' },
        ],
      }),
      node('s', 'webhook-saida', 'Enviar webhook', {
        method: 'POST',
        url: 'https://crm.exemplo/api',
        headers: [],
        body: [{ key: 'nome', value: '{{cliente.nome}}' }],
      }),
      node('t', 'tarefa', 'Criar tarefa', {
        title: 'Ligar para {{cliente.nome}}',
        assignee: 'Ana',
        dueDays: 1,
      }),
    ],
    edges: [
      { id: 'w->m', source: 'w', target: 'm' },
      { id: 'm->c', source: 'm', target: 'c' },
      { id: 'c:r1->s', source: 'c', target: 's', branch: 'r1' },
      { id: 'c:r2->t', source: 'c', target: 't', branch: 'r2' },
    ],
  }
}

function rodar(flow: Flow) {
  let s = startSimulation(flow)
  let guarda = 0
  while (s.status === 'running' && guarda++ < 50) s = advanceSimulation(flow, s)
  return s
}

describe('simulação', () => {
  it('a primeira regra que bate segue, e o passo diz qual', () => {
    const s = rodar(demo())
    expect(s.status).toBe('finished')
    expect(s.steps.map((x) => x.label)).toEqual([
      'Receber webhook',
      'Enviar WhatsApp',
      'Condição',
      'Enviar webhook',
    ])
    expect(s.steps[2]!.detail).toBe('Regra 1 bateu: pedido.valor é maior que 500, seguiu por ela')
  })

  it('trocar a regra para "maior que 5000" cai na regra 2 e, sem ela, em Senão', () => {
    const f = demo([
      { id: 'r1', field: 'pedido.valor', operator: 'maior', value: '5000' },
      { id: 'r2', field: 'cliente.plano', operator: 'igual', value: 'pro' },
    ])
    const s = rodar(f)
    expect(s.steps.map((x) => x.label).at(-1)).toBe('Criar tarefa')
    expect(s.steps[2]!.detail).toContain('Regra 2 bateu')
    const g = demo([{ id: 'r1', field: 'pedido.valor', operator: 'maior', value: '5000' }])
    g.edges = g.edges.filter((e) => e.id !== 'c:r2->t')
    g.nodes = g.nodes.filter((n) => n.id !== 't')
    const fim = rodar(g)
    expect(fim.status).toBe('finished')
    expect(fim.steps.at(-1)!.detail).toBe(
      'Nenhuma regra bateu, seguiu por Senão. Caminho encerrado',
    )
  })

  it('bloco sem saída termina com sucesso e diz que o caminho encerrou', () => {
    const s = rodar(demo())
    expect(s.steps.at(-1)!.detail).toMatch(/Caminho encerrado$/)
    expect(s.currentId).toBeNull()
  })

  it('fluxo inválido não inicia e devolve os problemas; reset volta ao repouso', () => {
    const ruim = demo([{ id: 'r1', field: '', operator: 'igual', value: '' }])
    const s = startSimulation(ruim)
    expect(s.status).toBe('error')
    expect(s.issues.map((i) => i.code)).toContain('regra-incompleta')
    expect(resetSimulation()).toEqual({ status: 'idle', steps: [], currentId: null, issues: [] })
    expect(advanceSimulation(demo(), resetSimulation())).toEqual(resetSimulation())
  })

  it('"fluxo-mudou": ligação para bloco que sumiu, ou bloco ativo que sumiu', () => {
    const f = demo()
    const s = startSimulation(f)
    const sem = { ...f, nodes: f.nodes.filter((n) => n.id !== 'm') }
    expect(advanceSimulation(sem, s).issues[0]!.code).toBe('fluxo-mudou')
    const semAtivo = { ...f, nodes: f.nodes.filter((n) => n.id !== 'w') }
    expect(advanceSimulation(semAtivo, s).status).toBe('error')
  })

  it('o texto de cada tipo usa os dados de exemplo', () => {
    const f = demo()
    expect(simulateBlock(f, 'm')!.detail).toBe(
      'Enviaria WhatsApp para +55 11 98888-0000: "Olá, Ana Souza! Seu pedido chegou."',
    )
    expect(simulateBlock(f, 's')!.detail).toBe(
      'Enviaria POST https://crm.exemplo/api com {"nome":"Ana Souza"}',
    )
    expect(simulateBlock(f, 't')!.detail).toBe(
      'Criaria a tarefa "Ligar para Ana Souza" para Ana com prazo de 1 dia',
    )
    expect(simulateBlock(f, 'w')!.detail).toBe('Receberia POST em /hooks/novo-cliente')
    expect(simulateBlock(f, 'c')!.detail).toContain('Regra 1 bateu')
    expect(simulateBlock(f, 'zz')).toBeNull()
  })

  it('demais tipos descrevem o que fariam', () => {
    const f: Flow = {
      version: 2,
      nodes: [
        node('g', 'agendamento', 'Agenda', { frequency: 'semanal', time: '08:30' }),
        node('r', 'registro-criado', 'Registro', { record: 'negocio' }),
        node('e', 'email', 'Mail', {
          to: 'a@b.c',
          subject: 'Oi {{agendamento.data}}',
          message: 'Texto',
        }),
        node('p', 'espera', 'Pausa', { duration: 2, unit: 'horas' }),
        node('x', 'acao', 'Livre'),
        node('t', 'tarefa', 'Tarefa', { title: 'T', assignee: '', dueDays: 3 }),
      ],
      edges: [],
    }
    expect(simulateBlock(f, 'g')!.detail).toBe('Iniciaria toda semana às 08:30')
    expect(simulateBlock(f, 'r')!.detail).toBe('Iniciaria quando um negócio fosse criado')
    expect(simulateBlock(f, 'e')!.detail).toBe(
      'Enviaria e-mail para a@b.c, assunto "Oi 24/10/2026": "Texto"',
    )
    expect(simulateBlock(f, 'p')!.detail).toBe('Aguardaria 2 horas')
    expect(simulateBlock(f, 'x')!.detail).toBe('Executaria o bloco')
    expect(simulateBlock(f, 't')!.detail).toContain('para ninguém com prazo de 3 dias')
  })
})

describe('evaluateRule', () => {
  const r = (operator: FlowRule['operator'], value = ''): FlowRule => ({
    id: 'x',
    field: 'f',
    operator,
    value,
  })
  it('os sete operadores', () => {
    expect(evaluateRule(r('igual', 'a'), { f: 'a' })).toBe(true)
    expect(evaluateRule(r('igual', 'a'), { f: 'b' })).toBe(false)
    expect(evaluateRule(r('diferente', 'a'), { f: 'b' })).toBe(true)
    expect(evaluateRule(r('maior', '5'), { f: '6' })).toBe(true)
    expect(evaluateRule(r('maior', '5'), { f: '5' })).toBe(false)
    expect(evaluateRule(r('menor', '5'), { f: '4' })).toBe(true)
    expect(evaluateRule(r('maior', '5'), { f: 'abc' })).toBe(false)
    expect(evaluateRule(r('menor', 'x'), { f: '4' })).toBe(false)
    expect(evaluateRule(r('maior', '5'), {})).toBe(false)
    expect(evaluateRule(r('contem', 'ol'), { f: 'bolo' })).toBe(true)
    expect(evaluateRule(r('contem', 'zz'), { f: 'bolo' })).toBe(false)
    expect(evaluateRule(r('vazio'), {})).toBe(true)
    expect(evaluateRule(r('vazio'), { f: 'a' })).toBe(false)
    expect(evaluateRule(r('nao-vazio'), { f: 'a' })).toBe(true)
    expect(evaluateRule(r('nao-vazio'), { f: '' })).toBe(false)
  })
})

/* Propriedade com semente fixa (sem dependência nova). */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CONFIG: Partial<Record<FlowNodeType, Record<string, unknown>>> = {
  whatsapp: { to: '+55 11 90000-0000', message: 'Oi {{cliente.nome}}' },
  email: { to: 'a@b.c', subject: 'S', message: 'M' },
  espera: { duration: 1, unit: 'horas' },
  tarefa: { title: 'T', assignee: '', dueDays: 1 },
  'webhook-saida': { method: 'POST', url: 'https://x.y', headers: [], body: [] },
}

/** Gera um fluxo válido em camadas: cada bloco aponta só para blocos mais à frente. */
function gerar(rand: () => number): Flow {
  const tipos: FlowNodeType[] = [
    'whatsapp',
    'email',
    'espera',
    'tarefa',
    'webhook-saida',
    'condicao',
  ]
  const meio = Math.floor(rand() * 6)
  const nodes: FlowNode[] = [node('n0', 'registro-criado', 'n0', { record: 'cliente' })]
  for (let i = 1; i <= meio + 1; i++) {
    const t = tipos[Math.floor(rand() * tipos.length)]!
    nodes.push(
      node(
        `n${i}`,
        t,
        `n${i}`,
        t === 'condicao'
          ? {
              rules: [
                {
                  id: 'r1',
                  field: 'cliente.nome',
                  operator: rand() < 0.5 ? 'igual' : 'contem',
                  value: 'Ana',
                },
              ],
            }
          : CONFIG[t],
      ),
    )
  }
  const ultimo = nodes.length - 1
  const edges: Flow['edges'] = []
  const alvo = (de: number) => `n${de + 1 + Math.floor(rand() * (ultimo - de))}`
  nodes.forEach((n, i) => {
    if (i === ultimo) return
    if (n.type === 'condicao') {
      edges.push({ id: `${n.id}:r1`, source: n.id, target: alvo(i), branch: 'r1' })
      if (rand() < 0.5)
        edges.push({ id: `${n.id}:senao`, source: n.id, target: alvo(i), branch: 'senao' })
    } else if (rand() < 0.9) edges.push({ id: `${n.id}:p`, source: n.id, target: alvo(i) })
  })
  // alcançabilidade: todo bloco recebe ao menos uma entrada
  for (let i = 1; i <= ultimo; i++) {
    if (edges.some((e) => e.target === `n${i}`)) continue
    const origem = nodes[i - 1]!
    const livre = !edges.some((e) => e.source === origem.id)
    if (origem.type === 'condicao')
      edges.push({ id: `${origem.id}:r1x`, source: origem.id, target: `n${i}`, branch: 'senao' })
    else if (livre) edges.push({ id: `${origem.id}:p`, source: origem.id, target: `n${i}` })
    else edges.find((x) => x.source === origem.id)!.target = `n${i}`
  }
  return { version: 2, nodes, edges }
}

describe('propriedades (200 fluxos com semente)', () => {
  it('todo fluxo gerado e válido termina em finished, e a ida e volta é estável', () => {
    const rand = mulberry32(2026)
    let validos = 0
    for (let i = 0; i < 200; i++) {
      const flow = gerar(rand)
      if (validateFlow(flow).length > 0) continue
      validos++
      expect(rodar(flow).status).toBe('finished')
      const lido = parseFlow(serializeFlow(flow))
      expect(lido.ok && serializeFlow(lido.flow)).toBe(serializeFlow(flow))
    }
    expect(validos).toBeGreaterThan(60)
  })
})
