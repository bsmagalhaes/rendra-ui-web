import { ThumbsDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Inline, Stack } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { ChatComposer, ChatThread, ConversationList, type ChatMessage } from '@/components/ui/chat'
import { DocumentViewer } from '@/components/ui/document-viewer'
import { ImageViewer } from '@/components/ui/image-viewer'
import {
  Kanban,
  moveKanbanCard,
  type KanbanCard,
  type KanbanDropTarget,
} from '@/components/ui/kanban'
import { toast } from '@/components/ui/toast'
import { demoTickets } from '@/mocks/chat'
import { demoTargetMessage, kanbanDemoTargets } from '@/mocks/kanban-targets'
import { demoCards, demoEvents, pipelineColumns, pipelineValues } from '@/mocks/planning'
import { Demo, Row } from './demo'

const dropTargets: KanbanDropTarget[] = [
  ...kanbanDemoTargets,
  {
    id: 'arquivar',
    label: 'Arquivar',
    icon: <ThumbsDown />,
    tone: 'neutral',
    disabled: true,
    disabledReason: 'Só depois de ganho ou perdido',
  },
]

// PDF mínimo válido, embutido como data: URL, para a vitrine funcionar sem depender de rede.
const SAMPLE_PDF =
  'data:application/pdf;base64,JVBERi0xLjEKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMjAwIDIwMF0+PmVuZG9iagp0cmFpbGVyPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgolJUVPRg=='

/* Vitrine: calendário, kanban, atendimento (chat), visualizador de imagens e de documentos. */
export function PlanningSection() {
  const events = useMemo(() => demoEvents(), [])
  const [cards, setCards] = useState<KanbanCard[]>(() => demoCards())
  const [targetCards, setTargetCards] = useState<KanbanCard[]>(() => demoCards())
  const [image, setImage] = useState<number | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const tickets = useMemo(() => demoTickets().slice(0, 3), [])
  const [activeTicket, setActiveTicket] = useState<string | null>(tickets[0]?.id ?? null)
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => tickets[0]?.messages.slice(0, 3) ?? [],
  )
  const images = useMemo(() => {
    const files = import.meta.glob<string>('../../../docs/images/safira-*.webp', {
      eager: true,
      query: '?url',
      import: 'default',
    })
    return Object.entries(files)
      .slice(0, 4)
      .map(([path, src]) => {
        const name = path.split('/').pop()?.replace('.webp', '') ?? ''
        return { src, alt: `Captura ${name.replace('-', ': ')}` }
      })
  }, [])

  return (
    <>
      <Demo
        id="calendario"
        title="Calendar"
        description="Um componente para calendário e agenda: mês, semana, dia e lista são a prop view. No celular, o mês vira compacto com a lista do dia e a semana vira o dia com a faixa dos 7 dias."
        props="events, view (month, week, day, agenda), views, date, onDateChange, onEventClick, onDateClick, hours"
        code="CAL-001"
        bare
      >
        <Calendar
          aria-label="Exemplo de calendário"
          events={events}
          onEventClick={(e) => toast.info(e.title)}
        />
      </Demo>
      <Demo
        id="kanban"
        title="Kanban"
        description="Colunas com cards. Arraste no computador; no toque e no teclado, o menu do card move para outra coluna. No celular, uma coluna por vez. A cadência da etapa e a próxima atividade colorem o card pela situação, o calendário mostra os detalhes num hint e a barra do quadro traz busca, filtros, totais, Customizar e Novo card."
        props="columns (id, title, tone, limit, cadenceDays), cards (title, description, tags, assignee, dueDate, meta, values, activity, enteredColumnAt), valueFields, toolbar, onNewCard, storageKey, referenceDate, onCardMove, onCardClick, onAddCard, renderCard"
        code="KANB-001"
        bare
      >
        <Kanban
          aria-label="Exemplo de kanban"
          columns={pipelineColumns}
          cards={cards}
          valueFields={pipelineValues}
          toolbar
          storageKey="rendra-kanban-vitrine"
          onCardMove={(id, to, index) => setCards((l) => moveKanbanCard(l, id, to, index))}
          onAddCard={() => toast.info('Novo card')}
          onNewCard={() => toast.info('Novo card')}
        />
      </Demo>
      <Demo
        id="kanban-destinos"
        title="Kanban com destinos de arraste"
        description="Além de mudar de coluna, o card pode ir para uma ação (lixeira, congelar, perder, ganhar). O rodapé flutuante aparece durante o arraste, com descrição e realce, e cada destino pode pedir confirmação (com motivo, no caso de perder). O menu 'Mover para' lista os mesmos destinos, com o desabilitado mostrando o motivo."
        props="dropTargets (id, label, hint, icon, tone, disabled, disabledReason, confirm: title, description, confirmLabel, destructive, reasons), onDropTarget (cardId, targetId, reason)"
        code="KANB-002"
        bare
      >
        <Kanban
          aria-label="Funil com destinos de arraste"
          columns={pipelineColumns}
          cards={targetCards}
          valueFields={pipelineValues}
          dropTargets={dropTargets}
          onDropTarget={(cardId, targetId, reason) => {
            setTargetCards((l) => l.filter((c) => c.id !== cardId))
            toast.info(demoTargetMessage(targetId, reason))
          }}
        />
      </Demo>
      <Demo
        id="atendimento"
        title="Atendimento (chat)"
        description="Três peças do atendimento omnichannel: a lista de conversas, as mensagens e o campo de mensagem, que cresce com o texto e aceita anexos por botão, arrastar e soltar ou colar. A tela Atendimento junta as três na altura da tela."
        props="ConversationList (items, activeId, onSelect, empty) · ChatThread (messages, onReply, onReact, onEdit, onDelete) · ChatComposer (onSend, placeholder, disabled, accept, quickReplies)"
      >
        <Row label="Lista de conversas" code="CHAT-001" block>
          <ConversationList items={tickets} activeId={activeTicket} onSelect={setActiveTicket} />
        </Row>
        <Row label="Mensagens e campo de mensagem" code={['CHAT-002', 'CHAT-003']} block>
          <Stack gap="0">
            <ChatThread messages={messages} />
            <ChatComposer
              onSend={({ text }) =>
                setMessages((list) => [
                  ...list,
                  { id: `vitrine-${list.length}`, from: 'agent', text, time: new Date() },
                ])
              }
            />
          </Stack>
        </Row>
      </Demo>
      <Demo
        id="visualizador"
        title="ImageViewer"
        description="Abre imagens por cima da tela, sem sair da página. Setas e Esc no teclado, arrastar para o lado e pinça no celular."
        props="images (src, alt, caption), index, onIndexChange"
        code="IMG-001"
      >
        <Button variant="outline" onClick={() => setImage(0)} disabled={!images.length}>
          Abrir galeria de exemplo
        </Button>
        <ImageViewer images={images} index={image} onIndexChange={setImage} />
      </Demo>

      <Demo
        id="documentos"
        title="DocumentViewer"
        description="Abre um PDF sem sair da tela: ajusta à largura, tem zoom e navegação de página (some quando o documento só tem uma). url null é o estado vazio; uma falha (CORS, arquivo inválido) aparece declarada, com o link para abrir em nova aba."
        props="url (string | null), title, emptyTitle, errorTitle, openInNewTabLabel"
        code="DOC-001"
      >
        <Stack gap="3">
          <Inline gap="2">
            <Button variant="outline" onClick={() => setPdfUrl(SAMPLE_PDF)}>
              Abrir PDF de exemplo
            </Button>
            <Button
              variant="outline"
              onClick={() => setPdfUrl('https://exemplo.invalido/nao-existe.pdf')}
            >
              Simular falha
            </Button>
            <Button variant="ghost" onClick={() => setPdfUrl(null)}>
              Limpar
            </Button>
          </Inline>
          <DocumentViewer url={pdfUrl} title="Contrato de exemplo" />
        </Stack>
      </Demo>
    </>
  )
}
