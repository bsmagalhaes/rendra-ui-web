import type { TableColumn } from '@/components/ui/table'
import { automationStatusLabel, automationStatusTone, type Automation } from '@/mocks/automations'

/* Colunas da tabela de automações. Todas as linhas abrem a mesma automação de demonstração. */
export const automationColumns: TableColumn<Automation>[] = [
  {
    id: 'name',
    header: 'Automação',
    accessor: (a) => a.name,
    href: () => '/automacoes/nova',
    mobile: 'primary',
    hideable: false,
    width: 'md',
    lines: 2,
  },
  { id: 'trigger', header: 'Gatilho', accessor: (a) => a.trigger, mobile: 'secondary' },
  {
    id: 'status',
    header: 'Situação',
    accessor: (a) => automationStatusLabel[a.status],
    kind: 'badge',
    badgeTone: (a) => automationStatusTone[a.status],
    mobile: 'primary',
  },
  {
    id: 'lastRunAt',
    header: 'Última execução',
    accessor: (a) => a.lastRunAt,
    kind: 'date',
    mobile: 'secondary',
  },
  {
    id: 'runs',
    header: 'Execuções',
    accessor: (a) => a.runs,
    kind: 'number',
    mobile: 'secondary',
  },
]
