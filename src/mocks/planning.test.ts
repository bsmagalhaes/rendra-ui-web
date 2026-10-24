import { describe, expect, it } from 'vitest'
import { getKanbanCardStatus } from '@/components/ui/kanban'
import { demoCards, pipelineColumns } from './planning'

// O relógio fixo do teste visual.
const hoje = new Date('2026-09-23T10:00:00-03:00')

describe('demoCards (status do Kanban)', () => {
  const cards = demoCards(hoje)
  const status = cards.map((c) =>
    getKanbanCardStatus(
      c,
      pipelineColumns.find((col) => col.id === c.columnId),
      hoje,
    ),
  )

  it('mostra os quatro fundos e as quatro situações do calendário', () => {
    expect(new Set(status.map((s) => s.background))).toEqual(
      new Set(['critical', 'cadenceOverdue', 'noActivity', 'normal']),
    )
    expect(new Set(status.map((s) => s.activity))).toEqual(
      new Set(['onTime', 'today', 'late', 'none']),
    )
  })

  it('os oito primeiros cards cobrem as combinações combinadas no design', () => {
    const byId = (id: string) => status[cards.findIndex((c) => c.id === id)]!
    expect(byId('k1').background).toBe('normal')
    expect(byId('k2').background).toBe('cadenceOverdue')
    expect(byId('k3').background).toBe('critical')
    expect(byId('k5')).toMatchObject({ background: 'critical', activity: 'late' })
    expect(byId('k6').activity).toBe('today')
    expect(byId('k7')).toMatchObject({ background: 'normal', activity: 'late', daysLate: 1 })
  })

  it('tem pelo menos dois responsáveis e cadência em todas as etapas abertas', () => {
    expect(new Set(cards.map((c) => c.assignee)).size).toBeGreaterThanOrEqual(2)
    for (const col of pipelineColumns) {
      expect(col.cadenceDays !== undefined).toBe(col.id !== 'fechado' && col.id !== 'perdido')
    }
  })

  it('mantém os 44 cards e os valores', () => {
    expect(cards).toHaveLength(44)
    expect(cards.every((c) => typeof c.values?.ps === 'number')).toBe(true)
  })
})
