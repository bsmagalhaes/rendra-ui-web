import { describe, expect, it } from 'vitest'
import { getKanbanCardStatus, moveKanbanCard, type KanbanCard, type KanbanColumn } from './kanban'

const cards: KanbanCard[] = [
  { id: 'a', columnId: 'x', title: 'A' },
  { id: 'b', columnId: 'x', title: 'B' },
  { id: 'c', columnId: 'y', title: 'C' },
]
const order = (list: KanbanCard[], col: string) =>
  list.filter((c) => c.columnId === col).map((c) => c.id)

describe('moveKanbanCard', () => {
  it('move para outra coluna na posição pedida', () => {
    const r = moveKanbanCard(cards, 'a', 'y', 0)
    expect(order(r, 'y')).toEqual(['a', 'c'])
    expect(order(r, 'x')).toEqual(['b'])
  })
  it('move para o fim da coluna', () => {
    expect(order(moveKanbanCard(cards, 'a', 'y', 9), 'y')).toEqual(['c', 'a'])
  })
  it('reordena dentro da mesma coluna', () => {
    expect(order(moveKanbanCard(cards, 'b', 'x', 0), 'x')).toEqual(['b', 'a'])
  })
  it('move para coluna vazia', () => {
    expect(order(moveKanbanCard(cards, 'c', 'z', 0), 'z')).toEqual(['c'])
  })
})

describe('getKanbanCardStatus', () => {
  // Sábado, 24/10/2026, 10:00 (horário local).
  const hoje = new Date(2026, 9, 24, 10, 0)
  const dia = (offset: number, h = 12, m = 0) => new Date(2026, 9, 24 + offset, h, m)
  const coluna: KanbanColumn = { id: 'x', title: 'X', cadenceDays: 3 }
  const card = (over: Partial<KanbanCard>): KanbanCard => ({
    id: '1',
    columnId: 'x',
    title: 'A',
    ...over,
  })
  const atividade = (at: Date) => ({ type: 'Reunião', at })
  // Cadência vencida: entrou há 5 dias (limite 3). Em dia: entrou há 1 dia.
  const vencida = dia(-5)
  const emDia = dia(-1)

  it('tabela completa: cadência vencida ou não, contra cada situação da atividade', () => {
    const casos: [Date, KanbanCard['activity'], string, string][] = [
      [vencida, atividade(dia(2)), 'cadenceOverdue', 'onTime'],
      [vencida, atividade(dia(0, 15)), 'cadenceOverdue', 'today'],
      [vencida, atividade(dia(-2)), 'critical', 'late'],
      [vencida, undefined, 'critical', 'none'],
      [emDia, atividade(dia(2)), 'normal', 'onTime'],
      [emDia, atividade(dia(0, 15)), 'normal', 'today'],
      [emDia, atividade(dia(-2)), 'normal', 'late'],
      [emDia, undefined, 'noActivity', 'none'],
    ]
    for (const [entrou, activity, background, situacao] of casos) {
      const r = getKanbanCardStatus(card({ enteredColumnAt: entrou, activity }), coluna, hoje)
      expect([r.background, r.activity]).toEqual([background, situacao])
    }
  })

  it('exatamente na cadência não vence; um dia a mais vence', () => {
    const base = { activity: atividade(dia(2)) }
    expect(
      getKanbanCardStatus(card({ ...base, enteredColumnAt: dia(-3) }), coluna, hoje).background,
    ).toBe('normal')
    expect(
      getKanbanCardStatus(card({ ...base, enteredColumnAt: dia(-4) }), coluna, hoje).background,
    ).toBe('cadenceOverdue')
  })

  it('sem cadência na etapa, ou sem data de entrada, a cadência nunca vence', () => {
    const c = card({ enteredColumnAt: dia(-90), activity: atividade(dia(2)) })
    expect(getKanbanCardStatus(c, { id: 'x', title: 'X' }, hoje).background).toBe('normal')
    const semEntrada = getKanbanCardStatus(card({ activity: atividade(dia(2)) }), coluna, hoje)
    expect(semEntrada.background).toBe('normal')
    expect(semEntrada.daysInColumn).toBeNull()
    expect(getKanbanCardStatus(c, undefined, hoje).background).toBe('normal')
  })

  it('compara por dia: 00:01 e 23:59 de hoje são "hoje"; ontem às 23:59 está atrasada há 1 dia', () => {
    const status = (at: Date) =>
      getKanbanCardStatus(card({ activity: atividade(at) }), coluna, hoje)
    expect(status(dia(0, 0, 1)).activity).toBe('today')
    expect(status(dia(0, 23, 59)).activity).toBe('today')
    const ontem = status(dia(-1, 23, 59))
    expect(ontem.activity).toBe('late')
    expect(ontem.daysLate).toBe(1)
    expect(status(dia(-3)).daysLate).toBe(3)
    expect(status(dia(1, 0, 1)).activity).toBe('onTime')
    expect(status(dia(1, 0, 1)).daysLate).toBe(0)
  })

  it('a data de referência injetada decide o resultado', () => {
    const c = card({ enteredColumnAt: dia(-1), activity: atividade(dia(2)) })
    expect(getKanbanCardStatus(c, coluna, hoje).background).toBe('normal')
    const depois = new Date(2026, 9, 30, 10, 0)
    const r = getKanbanCardStatus(c, coluna, depois)
    expect(r.background).toBe('critical')
    expect(r.daysInColumn).toBe(7)
    expect(r.activity).toBe('late')
  })
})
