import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { BrandFeedbackIcon } from '@/components/ui/brand-feedback-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorPage } from '@/components/ui/error-page'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Modal, type ModalType } from '@/components/ui/modal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { ClientDrawer } from '@/pages/app/client-drawer'

/* ------------------------------------------------ Alert */

const meta = {
  title: 'Feedback/Alerts, toasts, modal e drawer',
  component: Alert,
  args: {
    type: 'success',
    title: 'Cadastro salvo',
    description: 'O cliente já aparece na listagem.',
    animated: true,
  },
  argTypes: { type: { control: 'inline-radio', options: ['success', 'error', 'warning', 'info'] } },
} satisfies Meta<typeof Alert>
export default meta
type Story = StoryObj<typeof meta>

export const Sucesso: Story = {}
export const Erro: Story = {
  args: { type: 'error', title: 'Falha ao salvar', description: 'Tente de novo.' },
}
export const Atencao: Story = {
  args: { type: 'warning', title: 'Alterações pendentes', description: 'Salve antes de sair.' },
}
export const Informacao: Story = {
  args: {
    type: 'info',
    title: 'Exportação em andamento',
    description: 'O arquivo chega por e-mail.',
  },
}
export const ComAcaoEFechar: Story = {
  args: {
    action: (
      <Button size="sm" variant="outline">
        Desfazer
      </Button>
    ),
    onDismiss: () => {},
  },
}

/* ------------------------------------------------ Ícone de feedback, Toast */

export const IconesDeFeedback: Story = {
  name: 'BrandFeedbackIcon (animado)',
  render: () => (
    <div className="flex flex-wrap items-end gap-6">
      {(['success', 'error', 'warning', 'info'] as const).map((t) => (
        <BrandFeedbackIcon key={t} type={t} size="2xl" animated label={t} />
      ))}
    </div>
  ),
}
export const IconesDeFeedbackMarcaEEncaixe: Story = {
  name: 'BrandFeedbackIcon: cor da marca, selo ao lado e encaixe',
  render: () => (
    <div className="flex flex-wrap items-end gap-6">
      {(['success', 'error', 'warning', 'info'] as const).map((t) => (
        <BrandFeedbackIcon
          key={t}
          type={t}
          size="2xl"
          animated
          symbolTone="brand"
          statusBadge
          animation="encaixe"
          label={t}
        />
      ))}
    </div>
  ),
}
export const Avisos: Story = {
  name: 'Toast',
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.success('Cliente salvo')}>
        Sucesso
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error('Falha ao salvar', { description: 'Tente de novo.' })}
      >
        Erro
      </Button>
      <Button variant="outline" onClick={() => toast.warning('Sessão expira em 5 minutos')}>
        Atenção
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.info('Arquivado', { action: { label: 'Desfazer', onClick: () => {} } })
        }
      >
        Com ação
      </Button>
    </div>
  ),
}

/* ------------------------------------------------ Modal e Drawer */

function ModalDemo({ type, cancelLabel }: { type: ModalType; cancelLabel?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant={type === 'destructive' ? 'destructive' : 'outline'}
        onClick={() => setOpen(true)}
      >
        Abrir modal
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        type={type}
        cancelLabel={cancelLabel}
        title={
          type === 'destructive'
            ? 'Excluir cliente?'
            : type === 'form'
              ? 'Convidar pessoa'
              : 'Enviar proposta?'
        }
        description="Texto de apoio da confirmação."
        onConfirm={() => new Promise((r) => window.setTimeout(r, 800))}
      >
        {type === 'form' && (
          <>
            <Field label="Nome" required>
              <Input />
            </Field>
            <Field label="E-mail" required>
              <Input type="email" />
            </Field>
          </>
        )}
      </Modal>
    </>
  )
}
export const ModalConfirmacao: Story = {
  name: 'Modal: confirm',
  render: () => <ModalDemo type="confirm" />,
}
export const ModalDestrutivo: Story = {
  name: 'Modal: destructive',
  render: () => <ModalDemo type="destructive" />,
}
export const ModalInformativo: Story = {
  name: 'Modal: info',
  render: () => <ModalDemo type="info" />,
}
export const ModalInformativoComCancelar: Story = {
  name: 'Modal: info com cancelar (cancelLabel)',
  render: () => <ModalDemo type="info" cancelLabel="Voltar" />,
}
export const ModalFormulario: Story = {
  name: 'Modal: form (até 3 campos)',
  render: () => <ModalDemo type="form" />,
}

function DrawerDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button icon={<UserPlus />} onClick={() => setOpen(true)}>
        Abrir drawer
      </Button>
      <ClientDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}
export const DrawerComRodapeFixo: Story = {
  name: 'Drawer (rodapé fixo, 30/70, confirma descarte)',
  render: () => <DrawerDemo />,
}

/* ------------------------------------------------ Demais */

export const TextoOrientativo: Story = {
  name: 'Texto orientativo (InfoHint)',
  render: () => (
    <Card>
      <CardHeader actions={<Button variant="outline">Ligar</Button>}>
        <CardTitle help="Soma dos contratos faturados no mês, sem descontos.">
          Receita do mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">R$ 61.300,00</p>
      </CardContent>
    </Card>
  ),
}
export const PopoverETooltip: Story = {
  name: 'Popover e Tooltip',
  render: () => (
    <div className="flex gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Filtros</Button>
        </PopoverTrigger>
        <PopoverContent className="p-4">
          <p className="text-sm">Soma dos contratos faturados no mês.</p>
        </PopoverContent>
      </Popover>
      <Tooltip content="Complemento, nunca essencial">
        <Button variant="ghost">Passe o mouse</Button>
      </Tooltip>
    </div>
  ),
}
export const EstadoVazio: Story = {
  name: 'EmptyState',
  render: () => (
    <EmptyState
      title="Nenhum contrato ainda"
      description="Crie o primeiro contrato."
      actions={<Button>Criar contrato</Button>}
    />
  ),
}
export const EstadoVazioSemRespiro: Story = {
  name: 'EmptyState sem respiro vertical (className)',
  render: () => (
    <EmptyState
      title="Nenhum contrato ainda"
      description="Dentro de um card que já tem o próprio respiro."
      className="py-0 md:py-0"
    />
  ),
}
export const Erro404: Story = { name: 'ErrorPage 404', render: () => <ErrorPage code={404} /> }
export const Erro500: Story = { name: 'ErrorPage 500', render: () => <ErrorPage code={500} /> }
export const Erro404SemVoltar: Story = {
  name: 'ErrorPage 404 sem Voltar (back=false)',
  render: () => <ErrorPage code={404} back={false} />,
}
export const Carregamento: Story = {
  name: 'Progress, Skeleton e Spinner',
  render: () => (
    <div className="flex flex-col gap-4">
      <Progress value={64} showValue label="Importação" />
      <Progress value={40} tone="brand" label="Degradê" />
      <Progress value={null} label="Indeterminado" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-chart-sm w-full rounded-surface" />
      <div className="flex items-center gap-4">
        <Spinner size="sm" label="Carregando, pequeno" />
        <Spinner size="md" label="Carregando, médio" />
        <Spinner size="lg" label="Carregando, grande" />
      </div>
    </div>
  ),
}
