import { describe, expect, it } from 'vitest'
import type { Flow, FlowNode, FlowNodeType } from './flow'
import {
  FLOW_BLOCKS,
  FLOW_BLOCK_GROUPS,
  FLOW_SAMPLE_PAYLOAD,
  buildWebhookRequest,
  describeWait,
  edgeLabel,
  estimateNodeHeight,
  flattenPayload,
  flowSampleData,
  flowVariables,
  formatWait,
  isRuleComplete,
  nextRuleId,
  renderTemplate,
  ruleSummary,
  splitVariables,
  summarizeConfig,
  branchName,
  outputIds,
} from './flow-blocks'

const node = (id: string, type: FlowNodeType, config?: Record<string, unknown>): FlowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: config ? { label: id, config } : { label: id },
})
const flowOf = (...nodes: FlowNode[]): Flow => ({ version: 2, nodes, edges: [] })

describe('catálogo', () => {
  it('5 grupos com os 9 blocos novos e os legados fora da barra', () => {
    expect(FLOW_BLOCK_GROUPS.map((g) => g.name)).toEqual([
      'Gatilhos',
      'Mensagens',
      'Condicionais',
      'Integrações',
      'Ações internas',
    ])
    const tipos = FLOW_BLOCK_GROUPS.flatMap((g) => g.types)
    expect(tipos).toHaveLength(9)
    expect(tipos.every((t) => !FLOW_BLOCKS[t].hidden)).toBe(true)
    expect(['gatilho', 'acao', 'fim'].every((t) => FLOW_BLOCKS[t as FlowNodeType].hidden)).toBe(
      true,
    )
  })

  it('cada configuração padrão devolve um objeto novo', () => {
    expect(FLOW_BLOCKS.whatsapp.defaultConfig()).not.toBe(FLOW_BLOCKS.whatsapp.defaultConfig())
  })
})

describe('espera', () => {
  it('formata singular, plural e config sem duração', () => {
    expect(formatWait({ duration: 1, unit: 'dias' })).toBe('1 dia')
    expect(formatWait({ duration: 3, unit: 'horas' })).toBe('3 horas')
    expect(formatWait({})).toBeNull()
    expect(formatWait({ duration: 2, unit: 'anos' })).toBeNull()
    expect(describeWait({ duration: 5, unit: 'minutos' })).toBe('Aguardaria 5 minutos')
    expect(describeWait(undefined)).toBe('Aguardaria o tempo definido no bloco')
  })
})

describe('variáveis e dados de exemplo', () => {
  it('webhook de entrada: as mapeadas, com o nome do campo do sistema', () => {
    const f = flowOf(
      node('w', 'webhook-entrada', {
        mapping: [
          { from: 'cliente.nome', to: 'cliente.nome' },
          { from: 'pedido.valor', to: 'negocio.valor' },
          { from: 'cliente.email', to: '' },
          { from: 'x.y', to: 'campo.desconhecido' },
        ],
      }),
    )
    expect(flowVariables(f)).toEqual([
      { id: 'cliente.nome', label: 'Cliente › Nome' },
      { id: 'pedido.valor', label: 'Negócio › Valor' },
      { id: 'x.y', label: 'campo.desconhecido' },
    ])
    expect(flowSampleData(f)).toEqual({
      'cliente.nome': 'Ana Souza',
      'pedido.valor': '1250',
      'x.y': '',
    })
  })

  it('registro criado por tipo, agendamento, legado e sem gatilho', () => {
    expect(
      flowVariables(flowOf(node('r', 'registro-criado', { record: 'pedido' }))).map((v) => v.id),
    ).toEqual(['pedido.id', 'pedido.valor', 'cliente.nome'])
    expect(
      flowVariables(flowOf(node('r', 'registro-criado', { record: 'negocio' }))).map((v) => v.id),
    ).toEqual(['negocio.titulo', 'negocio.valor', 'cliente.nome'])
    expect(
      flowVariables(flowOf(node('r', 'registro-criado', { record: 'x' }))).map((v) => v.id),
    ).toContain('cliente.telefone')
    expect(flowVariables(flowOf(node('a', 'agendamento', {})))).toEqual([
      { id: 'agendamento.data', label: 'Agendamento › Data' },
    ])
    expect(flowVariables(flowOf(node('g', 'gatilho')))).toEqual([])
    expect(flowVariables(flowOf(node('t', 'tarefa')))).toEqual([])
    expect(flowSampleData(flowOf(node('a', 'agendamento', {})))).toEqual({
      'agendamento.data': '24/10/2026',
    })
  })

  it('achata o JSON de exemplo em caminhos', () => {
    expect(flattenPayload(FLOW_SAMPLE_PAYLOAD).map((e) => e.path)).toEqual([
      'cliente.nome',
      'cliente.email',
      'cliente.telefone',
      'cliente.plano',
      'pedido.id',
      'pedido.valor',
      'pedido.criado_em',
    ])
  })

  it('splitVariables e renderTemplate', () => {
    expect(splitVariables('Olá, {{cliente.nome}}! {{ x }}')).toEqual([
      { kind: 'text', value: 'Olá, ' },
      { kind: 'var', value: 'cliente.nome' },
      { kind: 'text', value: '! ' },
      { kind: 'var', value: 'x' },
    ])
    expect(splitVariables('')).toEqual([])
    expect(renderTemplate('Oi {{a}} e {{b}}', { a: 'Ana' })).toBe('Oi Ana e {{b}}')
  })
})

describe('regras', () => {
  it('resumo, completude, nomes das saídas e id novo', () => {
    const r = { id: 'r1', field: 'pedido.valor', operator: 'maior' as const, value: '500' }
    expect(ruleSummary(r)).toBe('pedido.valor é maior que 500')
    expect(ruleSummary({ ...r, operator: 'vazio', value: '' })).toBe('pedido.valor está vazio')
    expect(ruleSummary({ ...r, field: '' })).toBe('Regra incompleta')
    expect(isRuleComplete({ ...r, value: ' ' })).toBe(false)
    expect(nextRuleId([{ id: 'r1' }, { id: 'r3' }])).toBe('r2')
    const c = node('c', 'condicao', { rules: [r, { ...r, id: 'r2', label: 'Vip' }] })
    expect(branchName(c, 'r1')).toBe('Regra 1')
    expect(branchName(c, 'r2')).toBe('Vip')
    expect(branchName(c, 'senao')).toBe('Senão')
    expect(branchName(c, 'sumiu')).toBe('sumiu')
    expect(outputIds(c)).toEqual(['r1', 'r2', 'senao'])
    expect(outputIds(node('a', 'tarefa'))).toEqual([undefined])
  })

  it('rótulo da ligação que sai da condição', () => {
    const base = { id: 'x', source: 'c', target: 't' }
    const rules = [
      { id: 'r1', field: 'v', operator: 'maior', value: '500' },
      { id: 'r2', field: 'p', operator: 'igual', value: 'pro' },
      { id: 'r3', field: 'p', operator: 'vazio', value: '' },
      { id: 'r4', field: '', operator: 'igual', value: '' },
    ]
    const f = flowOf(node('c', 'condicao', { rules }), node('t', 'tarefa'))
    expect(edgeLabel(f, { ...base, branch: 'r1' })).toBe('> 500')
    expect(edgeLabel(f, { ...base, branch: 'r2' })).toBe('= pro')
    expect(edgeLabel(f, { ...base, branch: 'r3' })).toBe('vazio')
    expect(edgeLabel(f, { ...base, branch: 'r4' })).toBe('Regra 4')
    expect(edgeLabel(f, { ...base, branch: 'senao' })).toBe('Senão')
    expect(edgeLabel(f, { ...base, branch: 'r9' })).toBeNull()
    expect(edgeLabel(f, base)).toBeNull()
    expect(edgeLabel(f, { id: 'y', source: 't', target: 'c' })).toBeNull()
  })
})

describe('resumo do card', () => {
  it('uma linha por campo, com as variáveis em {{ }}', () => {
    const w = summarizeConfig(
      node('w', 'webhook-entrada', {
        method: 'POST',
        path: '/hooks/x',
        mapping: [
          { from: 'cliente.nome', to: 'cliente.nome' },
          { from: 'a.b', to: '' },
        ],
      }),
    )
    expect(w).toEqual([
      { label: 'Método e endereço', value: 'POST /hooks/x' },
      { label: 'Campos mapeados', value: '{{cliente.nome}}' },
    ])
    expect(
      summarizeConfig(node('a', 'agendamento', { frequency: 'mensal', time: '09:00' })),
    ).toEqual([
      { label: 'Frequência', value: 'Mensal' },
      { label: 'Horário', value: '09:00' },
    ])
    expect(summarizeConfig(node('r', 'registro-criado', { record: 'pedido' }))).toEqual([
      { label: 'Registro', value: 'Pedido' },
    ])
    expect(summarizeConfig(node('m', 'whatsapp', { to: '1', message: 'x' }))).toHaveLength(2)
    expect(
      summarizeConfig(node('e', 'email', { to: '1', subject: 's', message: 'x' })),
    ).toHaveLength(3)
    expect(summarizeConfig(node('p', 'espera', { duration: 5, unit: 'minutos' }))).toEqual([
      { label: 'Tempo', value: '5 minutos' },
    ])
    expect(
      summarizeConfig(
        node('s', 'webhook-saida', {
          url: 'https://x',
          body: [
            { key: 'n', value: '{{a}}' },
            { key: 'q', value: '' },
          ],
        }),
      ),
    ).toEqual([
      { label: 'Método e endereço', value: 'POST https://x' },
      { label: 'Corpo', value: '{{a}}' },
    ])
    expect(
      summarizeConfig(node('t', 'tarefa', { title: 'T', assignee: 'Ana', dueDays: 1 }))[2],
    ).toEqual({
      label: 'Prazo',
      value: '1 dia',
    })
    expect(summarizeConfig(node('t', 'tarefa', {}))[2]).toEqual({ label: 'Prazo', value: '0 dias' })
    expect(summarizeConfig(node('c', 'condicao'))).toEqual([])
    expect(summarizeConfig(node('g', 'webhook-entrada'))[0]!.value).toBe('POST')
  })

  it('altura estimada cresce com as regras e as linhas do resumo', () => {
    const uma = estimateNodeHeight(node('c', 'condicao', { rules: [{ id: 'r1' }] }))
    const duas = estimateNodeHeight(node('c', 'condicao', { rules: [{ id: 'r1' }, { id: 'r2' }] }))
    expect(duas).toBeGreaterThan(uma)
    expect(estimateNodeHeight(node('e', 'email'))).toBeGreaterThan(
      estimateNodeHeight(node('p', 'espera')),
    )
  })

  it('requisição simulada do webhook de saída', () => {
    expect(
      buildWebhookRequest(
        {
          method: 'PUT',
          url: 'https://x',
          body: [
            { key: 'nome', value: '{{cliente.nome}}' },
            { key: '', value: 'x' },
          ],
        },
        { 'cliente.nome': 'Ana' },
      ),
    ).toEqual({ method: 'PUT', url: 'https://x', body: { nome: 'Ana' } })
    expect(buildWebhookRequest(undefined, {})).toEqual({ method: 'POST', url: '', body: {} })
  })
})
