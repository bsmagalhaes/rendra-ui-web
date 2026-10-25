import { format } from 'date-fns'
import { Eye } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Stack } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Table, type TableColumn } from '@/components/ui/table'
import { Timeline } from '@/components/ui/timeline'
import { mockSource } from '@/mocks/api'
import { automationRuns, type AutomationRun } from '@/mocks/automations'

const when = (r: AutomationRun) => format(new Date(r.startedAt), 'dd/MM/yyyy HH:mm')
const statusLabel = { sucesso: 'Sucesso', erro: 'Erro' } as const

const columns: TableColumn<AutomationRun>[] = [
  {
    id: 'startedAt',
    header: 'Data e hora',
    accessor: (r) => r.startedAt,
    cell: (r) => when(r),
    mobile: 'primary',
    hideable: false,
  },
  {
    id: 'status',
    header: 'Situação',
    accessor: (r) => statusLabel[r.status],
    kind: 'badge',
    badgeTone: (r) => (r.status === 'sucesso' ? 'success' : 'error'),
    mobile: 'primary',
  },
  {
    id: 'durationMs',
    header: 'Duração',
    accessor: (r) => r.durationMs,
    cell: (r) => `${(r.durationMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} s`,
    align: 'right',
    mobile: 'secondary',
  },
  { id: 'trigger', header: 'Gatilho', accessor: (r) => r.trigger, mobile: 'secondary' },
]

const runsApi = mockSource(automationRuns, {
  searchIn: (r) => [r.trigger, statusLabel[r.status]],
  sortBy: { startedAt: (r) => r.startedAt, durationMs: (r) => r.durationMs },
})

/** Aba Histórico de execuções: lista com filtro por situação e data, e o passo a passo de cada uma. */
export function AutomationHistoryTab() {
  const [status, setStatus] = useState<AutomationRun['status'] | null>(null)
  const [from, setFrom] = useState<Date | null>(null)
  const [detail, setDetail] = useState<AutomationRun | null>(null)

  const source = useMemo(
    () =>
      runsApi(
        (r) =>
          (!status || r.status === status) &&
          (!from || new Date(r.startedAt).getTime() >= new Date(from).setHours(0, 0, 0, 0)),
      ),
    [status, from],
  )
  const filterCount = (status ? 1 : 0) + (from ? 1 : 0)

  return (
    <Stack gap="section">
      <Table<AutomationRun>
        aria-label="Histórico de execuções"
        source={source}
        queryKey={`${status ?? ''}|${from?.toISOString() ?? ''}`}
        columns={columns}
        getRowId={(r) => r.id}
        empty={{ title: 'Nenhuma execução', description: 'Nenhuma execução bate com os filtros.' }}
        rowActions={[{ label: 'Passo a passo', icon: <Eye />, onClick: (r) => setDetail(r) }]}
        toolbar={{
          filterCount,
          onClearFilters: filterCount
            ? () => {
                setStatus(null)
                setFrom(null)
              }
            : undefined,
          chips: [
            ...(status
              ? [
                  {
                    id: 'status',
                    label: `Situação: ${statusLabel[status]}`,
                    onRemove: () => setStatus(null),
                  },
                ]
              : []),
            ...(from
              ? [
                  {
                    id: 'from',
                    label: `A partir de ${format(from, 'dd/MM/yyyy')}`,
                    onRemove: () => setFrom(null),
                  },
                ]
              : []),
          ],
          filters: (
            <Stack gap="4">
              <Field label="Situação">
                <Select
                  label="Situação"
                  clearable
                  value={status}
                  onChange={(v) => setStatus(v as AutomationRun['status'] | null)}
                  options={[
                    { value: 'sucesso', label: 'Sucesso' },
                    { value: 'erro', label: 'Erro' },
                  ]}
                />
              </Field>
              <Field label="A partir de">
                <DatePicker label="A partir de" clearable value={from} onChange={setFrom} />
              </Field>
            </Stack>
          ),
        }}
      />
      <Drawer
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail ? `Execução de ${when(detail)}` : 'Execução'}
        description={
          detail ? (
            <Badge tone={detail.status === 'sucesso' ? 'success' : 'error'}>
              {statusLabel[detail.status]}
            </Badge>
          ) : undefined
        }
      >
        {detail && (
          <Timeline
            events={detail.steps.map((s, i) => ({
              id: `${detail.id}-${i}`,
              title: s.label,
              description: s.detail,
              date: `Passo ${i + 1}`,
              status: s.status,
            }))}
          />
        )}
      </Drawer>
    </Stack>
  )
}
