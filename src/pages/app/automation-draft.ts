import type { AutomationStatus } from '@/mocks/automations'

/** Tudo o que a tela de automação edita fora do fluxo; vive na página para as abas não perderem dados. */
export interface AutomationDraft {
  name: string
  description: string
  module: string | null
  owner: string | null
  tags: string[]
  alertsOn: boolean
  alertRecipients: string[]
  alertEmail: boolean
  alertWhatsapp: boolean
  apply: 'daqui-para-frente' | 'retroativo'
  status: AutomationStatus
}

export const initialDraft: AutomationDraft = {
  name: 'Boas-vindas ao novo cliente',
  description: 'Avisa o cliente por WhatsApp e cria uma tarefa para o time comercial.',
  module: 'clientes',
  owner: 'ana',
  tags: ['onboarding'],
  alertsOn: true,
  alertRecipients: ['ana'],
  alertEmail: true,
  alertWhatsapp: false,
  apply: 'daqui-para-frente',
  status: 'rascunho',
}

export const modules = [
  { value: 'clientes', label: 'Clientes' },
  { value: 'funil', label: 'Funil de vendas' },
  { value: 'atendimento', label: 'Atendimento' },
]

export const people = [
  { value: 'ana', label: 'Ana Souza' },
  { value: 'bruno', label: 'Bruno Lima' },
  { value: 'carla', label: 'Carla Dias' },
]

export const tagOptions = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'cobranca', label: 'Cobrança' },
  { value: 'pos-venda', label: 'Pós-venda' },
]
