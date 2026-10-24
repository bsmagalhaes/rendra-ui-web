import { describe, expect, it } from 'vitest'
import { validateFlow } from '@/lib/flow'
import { automationFlow, automationRuns, automationStatusLabel, automations } from './automations'

describe('mocks de automações', () => {
  it('6 automações com as três situações presentes', () => {
    expect(automations).toHaveLength(6)
    expect(new Set(automations.map((a) => a.status))).toEqual(
      new Set(Object.keys(automationStatusLabel)),
    )
    expect(automations.find((a) => a.status === 'rascunho')?.lastRunAt).toBeNull()
  })

  it('20 execuções entre 10/09/2026 e 23/09/2026, da mais recente para a mais antiga', () => {
    expect(automationRuns).toHaveLength(20)
    const times = automationRuns.map((r) => new Date(r.startedAt).getTime())
    expect(times).toEqual([...times].sort((a, b) => b - a))
    expect(times.at(-1)).toBeGreaterThanOrEqual(new Date('2026-09-10T00:00:00-03:00').getTime())
    expect(times[0]).toBeLessThan(new Date('2026-09-24T00:00:00-03:00').getTime())
  })

  it('cada execução tem passos, e as com erro têm um passo que falhou', () => {
    for (const r of automationRuns) {
      expect(r.steps.length).toBeGreaterThan(0)
      if (r.status === 'erro') expect(r.steps.some((s) => s.status === 'failed')).toBe(true)
      else expect(r.steps.every((s) => s.status === 'succeeded')).toBe(true)
    }
    expect(automationRuns.some((r) => r.status === 'erro')).toBe(true)
    expect(automationRuns.some((r) => r.status === 'sucesso')).toBe(true)
  })

  it('o fluxo de demonstração é válido, horizontal e sem bloco Fim', () => {
    expect(validateFlow(automationFlow)).toEqual([])
    expect(automationFlow.version).toBe(2)
    expect(automationFlow.nodes).toHaveLength(5)
    expect(automationFlow.edges).toHaveLength(4)
    expect(automationFlow.nodes.some((n) => n.type === 'fim')).toBe(false)
    const x = (id: string) => automationFlow.nodes.find((n) => n.id === id)!.position.x
    for (const e of automationFlow.edges) expect(x(e.target)).toBeGreaterThan(x(e.source))
  })
})
