import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { ChatComposer, ChatThread, ConversationList } from '@/components/ui/chat'
import { DocumentViewer } from '@/components/ui/document-viewer'
import {
  Kanban,
  moveKanbanCard,
  type KanbanCard,
  type KanbanDropTarget,
} from '@/components/ui/kanban'
import { demoTickets } from '@/mocks/chat'
import { kanbanDemoTargets } from '@/mocks/kanban-targets'
import { demoCards, demoEvents, pipelineColumns, pipelineValues } from '@/mocks/planning'

const dropTargets: KanbanDropTarget[] = [
  ...kanbanDemoTargets,
  {
    id: 'arquivar',
    label: 'Arquivar',
    tone: 'neutral',
    disabled: true,
    disabledReason: 'Só depois de ganho ou perdido',
  },
]

/* Calendar (calendário e agenda) e Kanban. */

const meta = {
  title: 'Planejamento/Calendar, Kanban e Chat',
  component: Calendar,
  args: { events: demoEvents(), 'aria-label': 'Calendário' },
  argTypes: {
    view: { control: 'inline-radio', options: ['month', 'week', 'day', 'agenda'] },
    events: { control: false },
  },
} satisfies Meta<typeof Calendar>
export default meta
type Story = StoryObj<typeof meta>

export const Mes: Story = { args: { view: 'month' } }
export const Semana: Story = { args: { view: 'week' } }
export const Dia: Story = { args: { view: 'day' } }
export const AgendaEmLista: Story = { args: { view: 'agenda' } }

function KanbanDemo() {
  const [cards, setCards] = useState<KanbanCard[]>(() => demoCards())
  return (
    <Kanban
      aria-label="Funil de vendas"
      columns={pipelineColumns}
      cards={cards}
      valueFields={pipelineValues}
      toolbar
      storageKey="rendra-kanban-story"
      onCardMove={(id, to, index) => setCards((l) => moveKanbanCard(l, id, to, index))}
      onAddCard={() => undefined}
      onNewCard={() => undefined}
    />
  )
}

export const QuadroKanban: Story = { render: () => <KanbanDemo /> }

function KanbanDropTargetsDemo() {
  const [cards, setCards] = useState<KanbanCard[]>(() => demoCards())
  return (
    <Kanban
      aria-label="Funil com destinos de arraste"
      columns={pipelineColumns}
      cards={cards}
      valueFields={pipelineValues}
      dropTargets={dropTargets}
      onDropTarget={(cardId) => setCards((l) => l.filter((c) => c.id !== cardId))}
    />
  )
}

export const KanbanComDestinosDeArraste: Story = {
  name: 'Kanban: dropTargets',
  render: () => <KanbanDropTargetsDemo />,
}

function ChatDemo() {
  const [messages, setMessages] = useState(() => demoTickets()[6]?.messages ?? [])
  return (
    <div className="flex h-chart-md min-h-0 flex-col overflow-hidden rounded-surface border">
      <ChatThread messages={messages} />
      <ChatComposer
        onSend={({ text }) =>
          setMessages((m) => [
            ...m,
            { id: String(Date.now()), from: 'agent', text, time: new Date(), status: 'sent' },
          ])
        }
      />
    </div>
  )
}

export const Chat: Story = { render: () => <ChatDemo /> }

function InboxDemo() {
  const tickets = useState(() => demoTickets())[0]
  const [activeId, setActiveId] = useState(tickets[0]?.id ?? null)
  const active = tickets.find((t) => t.id === activeId)
  return (
    <div className="flex h-chart-md min-h-0 overflow-hidden rounded-surface border">
      <div className="w-3xs shrink-0 overflow-y-auto border-r">
        <ConversationList items={tickets} activeId={activeId} onSelect={setActiveId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatThread messages={active?.messages ?? []} />
        <ChatComposer onSend={() => undefined} />
      </div>
    </div>
  )
}

export const CaixaDeEntrada: Story = {
  name: 'ConversationList: caixa de entrada',
  render: () => <InboxDemo />,
}

// PDF mínimo válido, embutido como data: URL, para a story funcionar sem depender de rede.
const SAMPLE_PDF =
  'data:application/pdf;base64,JVBERi0xLjEKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMjAwIDIwMF0+PmVuZG9iagp0cmFpbGVyPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgolJUVPRg=='

export const VisualizadorDeDocumentos: Story = {
  name: 'DocumentViewer',
  render: () => <DocumentViewer url={SAMPLE_PDF} title="Contrato de exemplo" />,
}
export const VisualizadorVazio: Story = {
  name: 'DocumentViewer: vazio',
  render: () => <DocumentViewer url={null} title="Contrato de exemplo" />,
}
export const VisualizadorComFalha: Story = {
  name: 'DocumentViewer: falha declarada',
  render: () => (
    <DocumentViewer url="https://exemplo.invalido/nao-existe.pdf" title="Contrato de exemplo" />
  ),
}
