import { addDays, setHours, setMinutes, startOfDay, startOfWeek } from 'date-fns'
import type { CalendarEvent } from '@/components/ui/calendar'
import type { KanbanCard, KanbanColumn } from '@/components/ui/kanban'

/* Dados fictícios de demonstração da agenda e do kanban, sempre em torno de hoje. */

const at = (base: Date, day: number, h: number, m = 0) =>
  setMinutes(setHours(addDays(base, day), h), m)

export function demoEvents(today = new Date()): CalendarEvent[] {
  const week = startOfWeek(startOfDay(today), { weekStartsOn: 0 })
  const list: Omit<CalendarEvent, 'id'>[] = [
    {
      title: 'Reunião de equipe',
      start: at(week, 1, 9),
      end: at(week, 1, 10),
      tone: 'primary',
      location: 'Sala 2',
    },
    {
      title: 'Visita: Padaria Bom Grão',
      start: at(week, 1, 14),
      end: at(week, 1, 15, 30),
      tone: 'success',
      location: 'Goiânia, GO',
    },
    { title: 'Revisar contratos', start: at(week, 2, 10), end: at(week, 2, 12), tone: 'info' },
    { title: 'Feriado municipal', start: at(week, 3, 0), allDay: true, tone: 'neutral' },
    {
      title: 'Apresentação de proposta',
      start: at(week, 3, 15),
      end: at(week, 3, 16),
      tone: 'warning',
      location: 'Online',
    },
    {
      title: 'Cobrança: Oficina Rota Sul',
      start: at(week, 4, 11),
      end: at(week, 4, 11, 30),
      tone: 'error',
    },
    {
      title: 'Treinamento da plataforma',
      start: at(week, 4, 14),
      end: at(week, 4, 17),
      tone: 'primary',
      location: 'Auditório',
    },
    {
      title: 'Almoço com parceiro',
      start: at(week, 5, 12),
      end: at(week, 5, 13, 30),
      tone: 'success',
    },
    { title: 'Fechamento do mês', start: at(week, 5, 16), end: at(week, 5, 18), tone: 'info' },
    {
      title: 'Planejamento da semana',
      start: at(week, 8, 9),
      end: at(week, 8, 10),
      tone: 'primary',
    },
    {
      title: 'Visita: Clínica Vida Plena',
      start: at(week, 9, 10),
      end: at(week, 9, 11),
      tone: 'success',
      location: 'Florianópolis, SC',
    },
    {
      title: 'Renovação de plano',
      start: at(week, 10, 15),
      end: at(week, 10, 16),
      tone: 'warning',
    },
    { title: 'Retrospectiva', start: at(week, 12, 16), end: at(week, 12, 17), tone: 'info' },
    { title: 'Workshop de vendas', start: at(week, -3, 9), end: at(week, -3, 12), tone: 'primary' },
    {
      title: 'Entrega do relatório',
      start: at(week, -5, 17),
      end: at(week, -5, 18),
      tone: 'error',
    },
  ]
  return list.map((e, i) => ({ ...e, id: `ev-${i + 1}` }))
}

/** Valores do funil comercial: P&S (produtos e serviços, uma vez) e MRR (recorrente mensal). */
export const pipelineValues = [
  { key: 'ps', label: 'P&S' },
  { key: 'mrr', label: 'MRR' },
]

export const pipelineColumns: KanbanColumn[] = [
  { id: 'lead', title: 'Novo contato', tone: 'neutral', cadenceDays: 3 },
  { id: 'qualificado', title: 'Qualificado', tone: 'info', cadenceDays: 5 },
  { id: 'proposta', title: 'Proposta', tone: 'warning', limit: 4, cadenceDays: 7 },
  { id: 'negociacao', title: 'Negociação', tone: 'primary', cadenceDays: 7 },
  { id: 'contrato', title: 'Contrato enviado', tone: 'info', cadenceDays: 5 },
  { id: 'fechado', title: 'Fechado', tone: 'success' },
  { id: 'perdido', title: 'Perdido', tone: 'error' },
]

const extraNames = [
  'Ótica Visão',
  'Pet Shop Amigo',
  'Academia Forma',
  'Livraria Saber',
  'Construtora Alicerce',
  'Studio Beleza',
  'Auto Center Pista',
  'Clínica Sorriso',
  'Hortifruti Verde',
  'Gráfica Cores',
]
const people = ['Ana Ribeiro', 'Bruno Costa', 'Carla Mendes']

export function demoCards(today = new Date()): KanbanCard[] {
  const d = (n: number) => addDays(startOfDay(today), n)
  // Muitos contatos novos e qualificados: mostram a rolagem de cada etapa.
  const extra: KanbanCard[] = Array.from({ length: 36 }, (_, i) => ({
    id: `x${i + 1}`,
    // Espalha os cards extras também pelas etapas novas, para ver a rolagem lateral.
    columnId: ['lead', 'lead', 'qualificado', 'negociacao', 'contrato', 'perdido'][i % 6] ?? 'lead',
    title: `${extraNames[i % extraNames.length]} ${i + 2}`,
    subtitle: `${String(10 + i).padStart(2, '0')}.${String(100 + i * 7).slice(-3)}.${String(200 + i * 13).slice(-3)}/0001-${String(10 + (i % 89)).padStart(2, '0')}`,
    contact: {
      name: people[(i + 1) % people.length],
      phone: `(11) 9${String(8000 + i * 37).slice(-4)}-${String(1000 + i * 91).slice(-4)}`,
    },
    assignee: people[i % people.length],
    dueDate: d((i % 9) + 1),
    values: { ps: 900 + ((i * 370) % 5200), mrr: 90 + ((i * 45) % 640) },
  }))
  return [...base(d), ...extra].map((c, i) => withStatus(c, i, today))
}

const activityTypes = ['Reunião', 'Ligação', 'Visita', 'Demonstração']

/**
 * Atividade e data de entrada na etapa dos cards de demonstração, sempre relativas a hoje.
 * Os oito primeiros cobrem as quatro combinações do fundo e as quatro situações do calendário;
 * os extras seguem uma regra simples para a rolagem infinita continuar com todas as situações.
 */
const baseStatus: Record<
  string,
  { ago: number; activity?: { type: string; day: number; h: number; m?: number } }
> = {
  // Em dia: cadência dentro do limite e atividade futura.
  k1: { ago: 1, activity: { type: 'Reunião', day: 2, h: 15 } },
  // Cadência vencida, atividade futura: vermelho claro.
  k2: { ago: 5, activity: { type: 'Ligação', day: 4, h: 10 } },
  // Cadência vencida e sem atividade: crítico.
  k3: { ago: 6 },
  k4: { ago: 2, activity: { type: 'Demonstração', day: 1, h: 9, m: 30 } },
  // Cadência vencida e atividade atrasada: crítico.
  k5: { ago: 8, activity: { type: 'Visita', day: -2, h: 10 } },
  // Vence hoje às 15:00.
  k6: { ago: 3, activity: { type: 'Reunião', day: 0, h: 15 } },
  // Atividade atrasada, mas a cadência está em dia: card normal com calendário vermelho.
  k7: { ago: 2, activity: { type: 'Ligação', day: -1, h: 16 } },
  k8: { ago: 12, activity: { type: 'Pós-venda', day: 10, h: 11 } },
}

function withStatus(card: KanbanCard, index: number, today: Date): KanbanCard {
  const day = startOfDay(today)
  const given = baseStatus[card.id]
  const closed = !pipelineColumns.find((c) => c.id === card.columnId)?.cadenceDays
  const i = index - Object.keys(baseStatus).length
  const spec = given ?? {
    ago: (i * 2) % 9,
    // Etapas encerradas não têm cadência: sempre com atividade, para não ficarem amarelas.
    activity:
      closed || i % 4 === 1
        ? { type: activityTypes[i % 4]!, day: (i % 9) + 1, h: 10 }
        : i % 4 === 2
          ? { type: activityTypes[i % 4]!, day: -((i % 3) + 1), h: 14 }
          : i % 4 === 3
            ? { type: activityTypes[i % 4]!, day: 0, h: 9 + (i % 8) }
            : undefined,
  }
  return {
    ...card,
    enteredColumnAt: addDays(day, -spec.ago),
    activity: spec.activity
      ? {
          type: spec.activity.type,
          at: at(day, spec.activity.day, spec.activity.h, spec.activity.m ?? 0),
          with: card.contact?.name,
        }
      : undefined,
  }
}

function base(d: (n: number) => Date): KanbanCard[] {
  return [
    {
      id: 'k1',
      columnId: 'lead',
      title: 'Mercado Central',
      subtitle: '12.345.678/0001-90',
      contact: {
        name: 'Marcos Lima',
        phone: '(11) 98888-1020',
        email: 'marcos@mercadocentral.com.br',
      },
      description: 'Pediu contato pelo site.',
      tags: [{ label: 'Varejo' }],
      assignee: 'Ana Ribeiro',
      dueDate: d(2),
      values: { ps: 4800, mrr: 590 },
    },
    {
      id: 'k2',
      columnId: 'lead',
      title: 'Farmácia Bem Estar',
      subtitle: '23.456.789/0001-01',
      contact: {
        name: 'Juliana Prado',
        phone: '(21) 97777-3040',
        email: 'juliana@bemestar.com.br',
      },
      tags: [{ label: 'Saúde', tone: 'info' }],
      assignee: 'Bruno Costa',
      dueDate: d(4),
      values: { ps: 2300, mrr: 320 },
    },
    {
      id: 'k3',
      columnId: 'lead',
      title: 'Café da Praça',
      subtitle: '529.982.247-25',
      contact: {
        name: 'Rafael Souza',
        phone: '(31) 96666-5060',
        email: 'rafael@cafedapraca.com.br',
      },
      description: 'Indicação de cliente.',
      assignee: 'Carla Mendes',
      values: { ps: 1200, mrr: 150 },
    },
    {
      id: 'k4',
      columnId: 'qualificado',
      title: 'Oficina Rota Sul',
      subtitle: '34.567.890/0001-12',
      contact: { name: 'Paulo Nunes', phone: '(51) 95555-7080', email: 'paulo@rotasul.com.br' },
      description: 'Quer integrar com o ERP atual.',
      tags: [{ label: 'Serviços' }, { label: 'Urgente', tone: 'error' }],
      assignee: 'Ana Ribeiro',
      dueDate: d(1),
      values: { ps: 9600, mrr: 1290 },
    },
    {
      id: 'k5',
      columnId: 'qualificado',
      title: 'Escola Saber',
      subtitle: '45.678.901/0001-23',
      contact: {
        name: 'Beatriz Alves',
        phone: '(41) 94444-9010',
        email: 'beatriz@escolasaber.com.br',
      },
      tags: [{ label: 'Educação', tone: 'primary' }],
      assignee: 'Bruno Costa',
      dueDate: d(6),
      values: { ps: 7100, mrr: 890 },
    },
    {
      id: 'k6',
      columnId: 'proposta',
      title: 'Clínica Vida Plena',
      subtitle: '56.789.012/0001-34',
      contact: {
        name: 'Dra. Helena Dias',
        phone: '(48) 93333-1122',
        email: 'helena@vidaplena.com.br',
      },
      description: 'Proposta enviada, aguardando retorno.',
      tags: [{ label: 'Saúde', tone: 'info' }],
      assignee: 'Carla Mendes',
      dueDate: d(3),
      values: { ps: 12500, mrr: 1650 },
    },
    {
      id: 'k7',
      columnId: 'proposta',
      title: 'Padaria Bom Grão',
      subtitle: '67.890.123/0001-45',
      contact: { name: 'Sérgio Ramos', phone: '(62) 92222-3344', email: 'sergio@bomgrao.com.br' },
      tags: [{ label: 'Alimentação' }],
      assignee: 'Ana Ribeiro',
      dueDate: d(-1),
      values: { ps: 3900, mrr: 480 },
    },
    {
      id: 'k8',
      columnId: 'fechado',
      title: 'Indústria Aço Forte',
      subtitle: '78.901.234/0001-56',
      contact: {
        name: 'Fernanda Rocha',
        phone: '(19) 91111-5566',
        email: 'fernanda@acoforte.com.br',
      },
      description: 'Contrato de 12 meses assinado.',
      tags: [{ label: 'Indústria', tone: 'success' }],
      assignee: 'Bruno Costa',
      values: { ps: 28000, mrr: 3200 },
    },
  ]
}
