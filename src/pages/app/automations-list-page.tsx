import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Container, PageHeader, Stack } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Table } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { mockSource } from '@/mocks/api'
import {
  automationStatusLabel,
  automations as all,
  type Automation,
  type AutomationStatus,
} from '@/mocks/automations'
import { automationColumns } from './automation-columns'

// API de demonstração: pagina, busca em todos os registros e ordena no "servidor".
const automationsApi = mockSource(all, {
  searchIn: (a) => [a.name, a.trigger, automationStatusLabel[a.status]],
  sortBy: {
    name: (a) => a.name,
    trigger: (a) => a.trigger,
    status: (a) => automationStatusLabel[a.status],
    lastRunAt: (a) => a.lastRunAt ?? '',
    runs: (a) => a.runs,
  },
})

const statuses = Object.keys(automationStatusLabel) as AutomationStatus[]

/**
 * Listagem de automações, no padrão das listagens: título só no header, barra de ferramentas no
 * card da tabela (busca, Filtros e a ação principal), chips dos filtros e 15 por página. O nome
 * abre a automação; nada é executado de verdade.
 */
export function AutomationsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AutomationStatus | null>(null)
  const [toDelete, setToDelete] = useState<Automation | null>(null)

  const source = useMemo(() => automationsApi((a) => !status || a.status === status), [status])

  return (
    <Container padded>
      <Stack gap="section">
        <PageHeader
          title="Automações"
          help="Cada automação liga um gatilho a blocos de mensagem, condição, webhook e tarefa. Aqui tudo é simulado: nada é enviado de verdade."
        />
        <Table<Automation>
          aria-label="Automações"
          source={source}
          queryKey={status ?? ''}
          columns={automationColumns}
          getRowId={(a) => a.id}
          globalFilter={search}
          empty={{
            title: 'Nenhuma automação ainda',
            description: 'Crie a primeira automação para começar.',
            action: (
              <Button icon={<Plus />} onClick={() => navigate('/automacoes/nova')}>
                Nova automação
              </Button>
            ),
          }}
          rowActions={[
            {
              label: 'Excluir',
              icon: <Trash2 />,
              destructive: true,
              onClick: (a) => setToDelete(a),
            },
          ]}
          toolbar={{
            search: {
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por nome ou gatilho',
            },
            primaryAction: (
              <Button icon={<Plus />} onClick={() => navigate('/automacoes/nova')}>
                Nova automação
              </Button>
            ),
            filterCount: status ? 1 : 0,
            onClearFilters: status ? () => setStatus(null) : undefined,
            chips: status
              ? [
                  {
                    id: 'status',
                    label: `Situação: ${automationStatusLabel[status]}`,
                    onRemove: () => setStatus(null),
                  },
                ]
              : [],
            filters: (
              <Stack gap="4">
                <Field label="Situação">
                  <Select
                    label="Situação"
                    clearable
                    value={status}
                    onChange={(v) => setStatus(v as AutomationStatus | null)}
                    options={statuses.map((s) => ({ value: s, label: automationStatusLabel[s] }))}
                  />
                </Field>
              </Stack>
            ),
          }}
        />
      </Stack>
      <Modal
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        type="destructive"
        title={`Excluir ${toDelete?.name ?? 'automação'}?`}
        description="Esta ação não pode ser desfeita. O histórico de execuções também será removido."
        confirmLabel="Excluir automação"
        onConfirm={async () => {
          await new Promise((r) => window.setTimeout(r, 400))
          toast.error('Automação excluída')
        }}
      />
    </Container>
  )
}
