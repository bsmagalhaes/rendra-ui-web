import { differenceInCalendarDays, format } from 'date-fns'
import {
  ArrowRightLeft,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  GripVertical,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Settings2,
  User,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { ActionBar } from '@/components/ui/action-bar'
import { Avatar } from '@/components/ui/avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { Drawer } from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Modal } from '@/components/ui/modal'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useFillHeight } from '@/hooks/use-fill-height'
import { cn } from '@/lib/cn'
import {
  layoutEnabled,
  useLayoutReady,
  useMotionLib,
  useMotionMode,
  useMotionPresets,
} from '@/lib/motion'
import { bindPointerDrag, findDragTarget, resolveDropIndex } from '@/lib/sortable'

/*
 * Kanban único: colunas e cards por props; a tela guarda o estado e recebe onCardMove.
 * Desktop: colunas lado a lado; arraste o card para outra coluna ou outra posição.
 * Toque e teclado: o menu do card tem "Mover para" (arrastar nunca é o único caminho).
 * Mobile (< 768px): uma coluna por vez, escolhida pelas abas com contador, sem rolagem
 * lateral; os cards mudam de coluna pelo mesmo menu.
 * Altura: o quadro ocupa o que sobra da tela abaixo dele e nunca passa disso; cada etapa rola
 * por dentro e vai mostrando mais cards ao chegar no fim (rolagem infinita).
 */

/** Marca o fim da lista: ao aparecer na rolagem da etapa, pede mais cards. */
function LoadMore({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLLIElement>(null)
  const cb = useRef(onVisible)
  cb.current = onVisible
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && cb.current(),
      { root: el.closest('[data-kanban-scroll]'), rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <li ref={ref} className="py-2 text-center text-xs text-muted-foreground">
      Carregando mais cards...
    </li>
  )
}

export interface KanbanColumn {
  id: string
  title: string
  /** Cor do marcador da coluna. */
  tone?: BadgeProps['tone']
  /** Limite de cards (WIP). Passando dele, o contador fica em alerta. */
  limit?: number
  /**
   * Dias máximos de um card nesta etapa. Passando disso (pela `enteredColumnAt` do card), a
   * cadência está vencida. Sem ela, a etapa nunca vence. Aparece no cabeçalho da coluna.
   */
  cadenceDays?: number
}

/** Contador de quadros, só para o `layoutId` dos cards em `on` (um prefixo por instância). */
let boardsCreated = 0

/** Próxima atividade agendada do card: tipo, data com hora e com quem. */
export interface KanbanActivity {
  /** Ex.: "Reunião", "Ligação". Só aparece no hint do calendário. */
  type: string
  /** Data e hora da atividade. */
  at: Date
  /** Com quem (pessoa de contato). */
  with?: string
}

export interface KanbanCard {
  id: string
  columnId: string
  /** Empresa ou pessoa. */
  title: string
  /** Linha abaixo do título: CNPJ da empresa ou CPF da pessoa. */
  subtitle?: string
  description?: string
  /** Pessoa de contato: nome, telefone e e-mail. */
  contact?: { name?: string; phone?: string; email?: string }
  tags?: { label: string; tone?: BadgeProps['tone'] }[]
  /** Nome do responsável (vira avatar com iniciais). */
  assignee?: string
  dueDate?: Date
  /** Valor ou informação curta à direita do rodapé (ex.: "R$ 12.500,00"). */
  meta?: string
  /** Valores numéricos do card, pelas chaves de valueFields (ex.: { ps: 4800, mrr: 590 }). */
  values?: Record<string, number>
  /**
   * Próxima atividade. Com ela (ou com `cadenceDays` em alguma etapa) o quadro passa a
   * colorir o card pela situação e a mostrar o calendário no lugar do `dueDate`.
   */
  activity?: KanbanActivity
  /**
   * Quando o card entrou na etapa atual. Quem usa o componente atualiza esta data ao mover
   * o card, para a contagem da cadência recomeçar.
   */
  enteredColumnAt?: Date
}

/** Valor somado no cabeçalho da coluna e mostrado no card (ex.: P&S e MRR). */
export interface KanbanValueField {
  key: string
  label: string
}

/** Confirmação opcional de um destino de arraste: abre um modal antes de agir. */
export interface KanbanDropConfirm {
  title: string
  description: string
  /** Texto do botão. Padrão: o `label` do destino. */
  confirmLabel?: string
  /** Botão destrutivo (ex.: Perder). */
  destructive?: boolean
  /** Motivos a escolher; o escolhido chega como terceiro argumento de `onDropTarget`. */
  reasons?: { value: string; label: string }[]
}

/**
 * Destino de arraste (etapa A14): uma ação para onde o card vai, diferente de "outra
 * coluna" (ex.: "Marcar como ganho", "Arquivar"). Aparece numa barra durante o arraste e
 * como opção do menu "Mover para" (equivalente por teclado, sempre disponível).
 */
export interface KanbanDropTarget {
  id: string
  label: string
  /** Texto curto de apoio, mostrado abaixo do rótulo na barra. */
  hint?: string
  icon?: ReactNode
  tone?: BadgeProps['tone']
  disabled?: boolean
  /** Motivo mostrado quando desabilitado; o destino recusa o solto. */
  disabledReason?: string
  /** Sem ela, o destino age na hora. Com ela, abre a confirmação (mouse, toque e menu). */
  confirm?: KanbanDropConfirm
}

export interface KanbanProps {
  columns: KanbanColumn[]
  cards: KanbanCard[]
  /** Card movido: coluna de destino e posição dentro dela (0 = topo). */
  onCardMove?: (cardId: string, toColumnId: string, toIndex: number) => void
  onCardClick?: (card: KanbanCard) => void
  /** Botão (+) no título de cada etapa. */
  onAddCard?: (columnId: string) => void
  /** Cards mostrados por vez em cada etapa; ao rolar até o fim, mostra mais. Padrão: 20. */
  pageSize?: number
  /**
   * Busca mais cards no servidor quando a etapa chega ao fim do que já foi carregado.
   * Sem ela, a rolagem infinita só vai revelando os cards recebidos em cards.
   */
  onLoadMore?: (columnId: string) => void
  /** A etapa ainda tem cards no servidor (usado com onLoadMore). */
  hasMore?: (columnId: string) => boolean
  /** Etapas visíveis por vez no desktop; as demais pela rolagem lateral. Padrão: 5. */
  visibleColumns?: number
  /** Conteúdo próprio do card, no lugar do padrão (substitui também calendário e valores). */
  renderCard?: (card: KanbanCard) => ReactNode
  /**
   * Valores do card (até 2, empilhados no rodapé) e o total de cada um na coluna, com o
   * percentual sobre o total do quadro. Ex.: [{ key: 'ps', label: 'P&S' }, { key: 'mrr', label: 'MRR' }].
   */
  valueFields?: KanbanValueField[]
  /** Formato dos valores. Padrão: moeda (R$ 1.250,00). */
  formatValue?: (n: number) => string
  /**
   * Destinos de arraste além das colunas (ex.: "Marcar como ganho"). Com eles, mostra uma
   * barra durante o arraste e o menu "Mover para" passa a listar estes destinos.
   */
  dropTargets?: KanbanDropTarget[]
  /**
   * Card solto num destino da barra (ou escolhido no menu "Mover para"). `reason` é o motivo
   * escolhido na confirmação (destinos com `confirm.reasons`).
   */
  onDropTarget?: (cardId: string, targetId: string, reason?: string) => void
  /** Data de hoje, para o status e a cadência (injetável em teste). Padrão: agora. */
  referenceDate?: Date
  /** Liga a barra do quadro: busca, filtros, totais, Customizar e Novo card. */
  toolbar?: boolean
  /** "Novo card" da barra do quadro (sem coluna; o (+) da coluna segue com `onAddCard`). */
  onNewCard?: () => void
  /**
   * Chave do `localStorage` em que o Customizar guarda os campos escondidos (por navegador).
   * Sem ela, a escolha vale só enquanto o quadro está montado.
   */
  storageKey?: string
  'aria-label'?: string
  className?: string
}

const dotTone: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-info',
  outline: 'bg-border',
}

const targetIconTone: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'text-muted-foreground',
  primary: 'text-primary-text',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  info: 'text-info',
  outline: 'text-foreground',
}

/** Fundo claro de cada destino do rodapé flutuante, pela cor da ação. */
const targetSoft: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-muted',
  primary: 'bg-primary-soft',
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  error: 'bg-destructive-soft',
  info: 'bg-info-soft',
  outline: 'bg-card',
}

/** Destino realçado (card por cima): fundo forte com o `-foreground` dele em tudo. */
const targetStrong: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
  outline: 'bg-muted text-foreground',
}

// ---------------------------------------------------------------- status do card

export interface KanbanCardStatus {
  /** Fundo do card: crítico, cadência vencida, sem atividade ou normal. */
  background: 'critical' | 'cadenceOverdue' | 'noActivity' | 'normal'
  /** Situação do calendário: em dia, vence hoje, atrasada ou sem atividade. */
  activity: 'onTime' | 'today' | 'late' | 'none'
  /** Dias de calendário na etapa; `null` sem `enteredColumnAt`. */
  daysInColumn: number | null
  /** Dias de atraso da atividade (0 fora de `late`). */
  daysLate: number
}

/**
 * Situação do card a partir da próxima atividade e da cadência da etapa. Compara por dia de
 * calendário; `referenceDate` é o "hoje" (injetável para teste).
 */
export function getKanbanCardStatus(
  card: KanbanCard,
  column: KanbanColumn | undefined,
  referenceDate: Date,
): KanbanCardStatus {
  const daysInColumn = card.enteredColumnAt
    ? differenceInCalendarDays(referenceDate, card.enteredColumnAt)
    : null
  const cadenceOverdue =
    column?.cadenceDays !== undefined && daysInColumn !== null && daysInColumn > column.cadenceDays
  const ahead = card.activity ? differenceInCalendarDays(card.activity.at, referenceDate) : null
  const activity = ahead === null ? 'none' : ahead < 0 ? 'late' : ahead === 0 ? 'today' : 'onTime'
  const background =
    cadenceOverdue && (activity === 'late' || activity === 'none')
      ? 'critical'
      : cadenceOverdue
        ? 'cadenceOverdue'
        : activity === 'none'
          ? 'noActivity'
          : 'normal'
  return {
    background,
    activity,
    daysInColumn,
    daysLate: ahead !== null && ahead < 0 ? -ahead : 0,
  }
}

/** Classes literais completas (nada de classe montada por string). */
const statusBackground: Record<KanbanCardStatus['background'], string> = {
  critical: 'bg-critical-soft',
  cadenceOverdue: 'bg-destructive-soft',
  noActivity: 'bg-warning-soft',
  normal: 'bg-card',
}

const activityIcon: Record<
  KanbanCardStatus['activity'],
  { icon: typeof CalendarDays; circle: string }
> = {
  onTime: { icon: CalendarDays, circle: 'bg-info-soft text-info-soft-foreground' },
  today: { icon: CalendarClock, circle: 'bg-warning-mid text-warning-mid-foreground' },
  late: { icon: CalendarX2, circle: 'bg-destructive text-destructive-foreground' },
  none: {
    icon: CalendarDays,
    circle: 'border border-dashed border-muted-foreground text-muted-foreground',
  },
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function situationText(status: KanbanCardStatus) {
  if (status.activity === 'onTime') return 'Em dia'
  if (status.activity === 'today') return 'Vence hoje'
  if (status.activity === 'late') {
    return `Atrasada há ${plural(status.daysLate, 'dia', 'dias')}`
  }
  return 'Sem atividade agendada'
}

/** Texto para o leitor de tela: a cor do fundo nunca é a única informação. */
function backgroundLabel(status: KanbanCardStatus) {
  if (status.background === 'critical') {
    return `Situação: crítico, cadência vencida e ${
      status.activity === 'late' ? 'atividade atrasada' : 'sem próxima atividade'
    }`
  }
  if (status.background === 'cadenceOverdue') return 'Situação: cadência vencida'
  if (status.background === 'noActivity') return 'Situação: sem atividade'
  return null
}

function whenText(at: Date, status: KanbanCardStatus) {
  return status.activity === 'today'
    ? `Hoje às ${format(at, 'HH:mm')}`
    : `${format(at, 'dd/MM/yyyy')} às ${format(at, 'HH:mm')}`
}

// ---------------------------------------------------------------- campos do Customizar

const baseFields = [
  { id: 'tags', label: 'Tags' },
  { id: 'document', label: 'CNPJ ou CPF' },
  { id: 'description', label: 'Descrição' },
  { id: 'contact', label: 'Contato' },
  { id: 'phone', label: 'Telefone' },
  { id: 'email', label: 'E-mail' },
  { id: 'activity', label: 'Atividade' },
  { id: 'assignee', label: 'Responsável' },
] as const

type HiddenFields = Record<string, boolean>

/** Lê os campos escondidos; qualquer falha do armazenamento cai no padrão (tudo visível). */
function readHidden(storageKey?: string): HiddenFields {
  if (!storageKey) return {}
  try {
    const raw = localStorage.getItem(storageKey)
    const list: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(list)
      ? Object.fromEntries(list.filter((f) => typeof f === 'string').map((f) => [f, true]))
      : {}
  } catch {
    return {}
  }
}

function writeHidden(storageKey: string | undefined, hidden: HiddenFields) {
  if (!storageKey) return
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.keys(hidden).filter((k) => hidden[k])))
  } catch {
    // Armazenamento indisponível: a escolha segue só em memória.
  }
}

// ---------------------------------------------------------------- calendário com hint

const HINT_CLOSE_DELAY = 150

/**
 * Calendário do card: ícone de situação, data ao lado e hint (tipo, quando, com quem,
 * responsável e situação). Abre por clique, toque, foco por teclado e mouse; o gatilho é um
 * botão fora do botão de clique do card.
 */
function ActivityHint({ card, status }: { card: KanbanCard; status: KanbanCardStatus }) {
  const [open, setOpen] = useState(false)
  const pressed = useRef(false)
  const lastPointer = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { icon: Icon, circle } = activityIcon[status.activity]
  const activity = card.activity
  const visible = activity
    ? status.activity === 'today'
      ? `Hoje ${format(activity.at, 'HH:mm')}`
      : format(activity.at, 'dd/MM/yyyy')
    : 'Sem atividade'
  const cancelClose = () => clearTimeout(timer.current)
  const scheduleClose = () => {
    cancelClose()
    timer.current = setTimeout(() => setOpen(false), HINT_CLOSE_DELAY)
  }
  useEffect(() => cancelClose, [])
  return (
    <Popover open={open} onOpenChange={(next) => !next && setOpen(false)}>
      {/* Âncora, não `PopoverTrigger`: o Radix alternaria o hint a cada clique, e quem abre e
          fecha aqui é o hover, o foco e o clique, cada um com a sua regra. */}
      <PopoverAnchor asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${visible}. ${situationText(status)}`}
          className="relative z-10 -ml-1 inline-flex cursor-pointer items-center gap-1 rounded-item px-1 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-touch"
          onPointerDown={(e) => {
            pressed.current = true
            lastPointer.current = e.pointerType
          }}
          onPointerEnter={(e) => {
            if (e.pointerType !== 'mouse') return
            cancelClose()
            setOpen(true)
          }}
          onPointerLeave={(e) => e.pointerType === 'mouse' && scheduleClose()}
          onFocus={() => {
            if (!pressed.current) setOpen(true)
          }}
          onBlur={() => {
            pressed.current = false
            setOpen(false)
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            pressed.current = false
            // Mouse: o hover já abriu; o clique não fecha. Toque e teclado alternam. O ponteiro é
            // lido antes do `setOpen`: a função dele roda depois, já com o ref limpo.
            const byMouse = lastPointer.current === 'mouse'
            lastPointer.current = ''
            setOpen((o) => byMouse || !o)
          }}
        >
          <span
            aria-hidden
            className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', circle)}
          >
            <Icon className="size-3" />
          </span>
          {visible}
        </button>
      </PopoverAnchor>
      <PopoverContent
        width="sm"
        align="start"
        className="flex flex-col gap-1 p-3 text-xs"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
      >
        {activity ? (
          <>
            <p className="text-sm font-medium">
              {activity.type} · {whenText(activity.at, status)}
            </p>
            {activity.with && <p>Com: {activity.with}</p>}
          </>
        ) : null}
        {card.assignee && <p>Responsável: {card.assignee}</p>}
        <p className="font-medium">{situationText(status)}</p>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------- corpo e rodapé do card

function CardBody({
  card,
  show,
  withHandle,
}: {
  card: KanbanCard
  /** Campo visível? (o Customizar esconde; Empresa fica sempre). */
  show: (field: string) => boolean
  /** Reserva o espaço da alça de arraste no toque, à esquerda do título. */
  withHandle?: boolean
}) {
  return (
    <>
      {show('tags') && card.tags && card.tags.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {card.tags.map((t) => (
            <Badge key={t.label} tone={t.tone ?? 'neutral'}>
              {t.label}
            </Badge>
          ))}
        </span>
      )}
      {/* Só o título reserva o espaço do botão de ações (e da alça, no toque). */}
      <span className={cn('flex flex-col pr-8', withHandle && 'pl-8')}>
        <span className="line-clamp-2 text-sm font-medium">{card.title}</span>
        {show('document') && card.subtitle && (
          <span className="text-xs text-muted-foreground tabular-nums">{card.subtitle}</span>
        )}
      </span>
      {show('description') && card.description && (
        <span className="line-clamp-2 text-xs text-muted-foreground">{card.description}</span>
      )}
      {card.contact && (
        <span className="flex flex-col gap-1 text-xs text-muted-foreground">
          {show('contact') && card.contact.name && (
            <span className="flex min-w-0 items-center gap-1 text-foreground">
              <User className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{card.contact.name}</span>
            </span>
          )}
          {show('phone') && card.contact.phone && (
            <span className="flex min-w-0 items-center gap-1 tabular-nums">
              <Phone className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{card.contact.phone}</span>
            </span>
          )}
          {show('email') && card.contact.email && (
            <span className="flex min-w-0 items-center gap-1">
              <Mail className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{card.contact.email}</span>
            </span>
          )}
        </span>
      )}
    </>
  )
}

/**
 * Rodapé do card, fora do botão de clique: linha de calendário, meta e responsável e, depois
 * de uma divisória, os valores empilhados. Sem `renderCard` apenas.
 */
function cardFooter({
  card,
  status,
  show,
  valueFields,
  formatValue,
}: {
  card: KanbanCard
  /** `null` quando o quadro não traz atividade nem cadência: o card fica como sempre foi. */
  status: KanbanCardStatus | null
  show: (field: string) => boolean
  valueFields: KanbanValueField[]
  formatValue: (n: number) => string
}): ReactNode {
  const calendar = show('activity') ? (
    status ? (
      <ActivityHint card={card} status={status} />
    ) : (
      card.dueDate && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <CalendarDays className="size-3" aria-hidden />
          {format(card.dueDate, 'dd/MM/yyyy')}
        </span>
      )
    )
  ) : null
  const assignee = show('assignee') ? card.assignee : undefined
  const values = valueFields.slice(0, 2).filter((f) => show(`value:${f.key}`))
  const hasRow = Boolean(calendar || assignee || card.meta)
  if (!hasRow && values.length === 0) return null
  return (
    <>
      {hasRow && (
        <span className="flex items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
          {calendar}
          {card.meta && (
            <span className="font-medium text-foreground tabular-nums">{card.meta}</span>
          )}
          {assignee && (
            <span className="ml-auto" title={assignee}>
              <Avatar name={assignee} size="sm" />
            </span>
          )}
        </span>
      )}
      {values.length > 0 && (
        <span className="flex flex-col gap-1 border-t pt-2 text-xs">
          {values.map((f) => (
            <span key={f.key} className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground">{f.label}:</span>
              <span className="truncate font-semibold text-foreground tabular-nums">
                {formatValue(card.values?.[f.key] ?? 0)}
              </span>
            </span>
          ))}
        </span>
      )}
    </>
  )
}

/** Sem acento e sem diferença de maiúscula, para a busca. */
function normalize(text: string) {
  const marks = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g')
  return text.normalize('NFD').replace(marks, '').toLowerCase()
}

/**
 * Posição, na lista completa da coluna, de um índice da lista desenhada (que pode ser só uma
 * parte dela, por busca, filtro ou paginação). Fim da lista desenhada = logo depois do último
 * card desenhado; sem card desenhado = fim da lista completa.
 */
function toFullIndex(full: KanbanCard[], drawn: KanbanCard[], drawnIndex: number) {
  if (drawn.length === 0) return full.length
  if (drawnIndex < drawn.length) return full.indexOf(drawn[drawnIndex]!)
  return full.indexOf(drawn[drawn.length - 1]!) + 1
}

const situationOptions = [
  { value: 'critical', label: 'Crítico' },
  { value: 'cadenceOverdue', label: 'Cadência vencida' },
  { value: 'noActivity', label: 'Sem atividade' },
  { value: 'late', label: 'Atividade atrasada' },
]

export function Kanban({
  columns,
  cards,
  onCardMove,
  onCardClick,
  onAddCard,
  renderCard,
  valueFields,
  formatValue = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  pageSize = 20,
  visibleColumns = 5,
  onLoadMore,
  hasMore,
  dropTargets,
  onDropTarget,
  referenceDate,
  toolbar,
  onNewCard,
  storageKey,
  className,
  ...aria
}: KanbanProps) {
  const code = resolveCatalogCode('Kanban', { hasDropTargets: Boolean(dropTargets?.length) })
  const { isMobile } = useBreakpoint()
  const motion = useMotionMode()
  const lib = useMotionLib()
  const ready = useLayoutReady()
  const presets = useMotionPresets()
  // Prefixo do layoutId dos cards: dois quadros na mesma tela não trocam cards entre si. Sem
  // `useId`, que consumiria a sequência de ids do React também em `off`.
  const [boardId] = useState(() => `rendra-kanban-${++boardsCreated}`)
  const boardRef = useFillHeight()
  // Touchpad: o gesto lateral leva o quadro para o mesmo lado dos dedos (esquerda move o
  // quadro para a esquerda). A rolagem vertical segue normal dentro de cada etapa.
  useEffect(() => {
    const el = boardRef.current
    if (!el || isMobile) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft -= e.deltaX
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [boardRef, isMobile])
  const [shown, setShown] = useState<Record<string, number>>({})
  const limitOf = (id: string) => shown[id] ?? pageSize
  const [active, setActive] = useState(columns[0]?.id ?? '')
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<{ column: string; index: number } | null>(null)
  // Destino da barra sob o mouse (o do toque vem de `touchDrag.overTargetId`).
  const [overTarget, setOverTarget] = useState<string | null>(null)
  // Arraste por toque (motor de src/lib/sortable.ts): reordena dentro da coluna sem
  // dropTargets, ou solta num destino da barra quando dropTargets está presente.
  const [touchDrag, setTouchDrag] = useState<{
    cardId: string
    overTargetId: string | null
  } | null>(null)
  // Destino com `confirm`: o card volta ao lugar e o modal espera a decisão.
  const [pendingDrop, setPendingDrop] = useState<{ cardId: string; targetId: string } | null>(null)
  const [reason, setReason] = useState('')

  // Barra do quadro: busca, filtros e Customizar. Sem `toolbar`, nada disso é usado.
  const [query, setQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)
  const [customizing, setCustomizing] = useState(false)
  // Por que não `boardId`: ele muda a cada montagem (F24) e não serve de chave guardada.
  const [hidden, setHidden] = useState<HiddenFields>(() => readHidden(storageKey))
  const changeHidden = (next: HiddenFields) => {
    setHidden(next)
    writeHidden(storageKey, next)
  }
  const show = (field: string) => !hidden[field]

  const today = referenceDate ?? new Date()
  const statusEnabled =
    columns.some((c) => c.cadenceDays !== undefined) || cards.some((c) => c.activity)
  const statusOf = (card: KanbanCard) =>
    statusEnabled
      ? getKanbanCardStatus(
          card,
          columns.find((c) => c.id === card.columnId),
          today,
        )
      : null

  const filtering = toolbar && (query.trim() !== '' || assigneeFilter || situationFilter)
  const matches = (card: KanbanCard) => {
    const q = normalize(query.trim())
    if (
      q &&
      ![card.title, card.subtitle, card.contact?.name].some((t) => t && normalize(t).includes(q))
    )
      return false
    if (assigneeFilter && card.assignee !== assigneeFilter) return false
    if (situationFilter) {
      const status = statusOf(card)
      if (!status) return false
      if (
        situationFilter === 'late'
          ? status.activity !== 'late'
          : status.background !== situationFilter
      )
        return false
    }
    return true
  }
  const visibleCards = filtering ? cards.filter(matches) : cards

  /** Lista completa da coluna: a única fonte do índice que sai em `onCardMove`. */
  const inColumn = (id: string) => cards.filter((c) => c.columnId === id)
  /** Lista visível (busca e filtros): cards desenhados, contagem, totais, paginação e abas. */
  const visibleInColumn = (id: string) => visibleCards.filter((c) => c.columnId === id)

  const drop = (columnId: string, index: number) => {
    if (dragging) {
      // O mouse trabalha com o índice da lista desenhada; `onCardMove` quer o da completa.
      const drawn = visibleInColumn(columnId).slice(0, limitOf(columnId))
      onCardMove?.(dragging, columnId, toFullIndex(inColumn(columnId), drawn, index))
    }
    setDragging(null)
    setOver(null)
    setOverTarget(null)
  }

  const draggingCardId = dragging ?? touchDrag?.cardId ?? null
  const showTargetBar = Boolean(dropTargets?.length) && draggingCardId !== null

  const dropOnTarget = (cardId: string, targetId: string) => {
    const target = dropTargets?.find((t) => t.id === targetId)
    if (!target || target.disabled) return
    if (target.confirm) {
      setReason(target.confirm.reasons?.[0]?.value ?? '')
      setPendingDrop({ cardId, targetId })
      return
    }
    onDropTarget?.(cardId, targetId)
  }

  const startTouchDrag = (card: KanbanCard, e: ReactPointerEvent<HTMLElement>) => {
    const hasTargets = Boolean(dropTargets?.length && onDropTarget)
    if (!onCardMove && !hasTargets) return
    // Variável comum (não estado): guarda o destino sob o dedo para o onEnd ler direto,
    // sem efeito colateral dentro do updater do setState (StrictMode chamaria duas vezes).
    let overTargetId: string | null = null
    setTouchDrag({ cardId: card.id, overTargetId: null })
    bindPointerDrag(e.currentTarget, e, {
      onMove: (x, y) => {
        // A barra de destinos continua reconhecendo colunas por baixo: o toque só usa
        // a barra quando o dedo está de fato sobre ela, nunca no lugar da coluna.
        const targetHit = hasTargets ? findDragTarget(x, y, 'data-kanban-target') : null
        overTargetId = targetHit?.id ?? null
        if (targetHit) {
          setTouchDrag({ cardId: card.id, overTargetId: targetHit.id })
          return
        }
        if (hasTargets) setTouchDrag({ cardId: card.id, overTargetId: null })
        if (!onCardMove) return
        const found = findDragTarget(x, y, 'data-kanban-card')
        if (found && found.id !== card.id) {
          // O alvo achado na tela já dá o índice da lista completa (ids de `inColumn`).
          const list = inColumn(card.columnId)
          const toIndex = resolveDropIndex(
            list.map((c) => c.id),
            found,
          )
          onCardMove(card.id, card.columnId, toIndex)
        }
      },
      onEnd: () => {
        setTouchDrag(null)
        if (overTargetId) dropOnTarget(card.id, overTargetId)
      },
    })
  }

  const moveMenu = (card: KanbanCard) => {
    const hasTargets = Boolean(dropTargets?.length && onDropTarget)
    const otherColumns = onCardMove ? columns.filter((c) => c.id !== card.columnId) : []
    if (otherColumns.length === 0 && !hasTargets) return null
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Ações do card ${card.title}`}
            className="shrink-0"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {otherColumns.length > 0 && (
            <>
              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
              {otherColumns.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onSelect={() => onCardMove?.(card.id, c.id, inColumn(c.id).length)}
                >
                  <ArrowRightLeft />
                  {c.title}
                </DropdownMenuItem>
              ))}
            </>
          )}
          {otherColumns.length > 0 && hasTargets && <DropdownMenuSeparator />}
          {hasTargets &&
            dropTargets!.map((t) => (
              <DropdownMenuItem
                key={t.id}
                disabled={t.disabled}
                onSelect={() => dropOnTarget(card.id, t.id)}
              >
                {t.icon ?? <ArrowRightLeft />}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{t.label}</span>
                  {t.disabled && t.disabledReason && (
                    <span className="truncate text-xs text-muted-foreground">
                      {t.disabledReason}
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  /** Rodapé flutuante de destinos, mostrado durante o arraste (mouse ou toque). */
  const highlightedTarget = overTarget ?? touchDrag?.overTargetId ?? null
  const targetBar = showTargetBar && (
    <div
      aria-label="Soltar em"
      className="fixed inset-x-4 bottom-4 z-30 grid grid-cols-2 gap-2 rounded-surface border bg-card p-2 shadow-lg md:flex md:justify-center md:overflow-x-auto"
    >
      {dropTargets!.map((t) => {
        const tone = t.tone ?? 'neutral'
        const highlighted = !t.disabled && highlightedTarget === t.id
        return (
          <div
            key={t.id}
            data-kanban-target={t.id}
            data-over={highlighted ? 'true' : undefined}
            onDragEnter={() => {
              if (dragging && !t.disabled) setOverTarget(t.id)
            }}
            onDragOver={(e) => {
              if (dragging && !t.disabled) {
                e.preventDefault()
                setOverTarget(t.id)
              }
            }}
            onDragLeave={(e) => {
              // Passar do chip para o ícone ou o texto dentro dele não é sair do chip.
              if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))
                return
              setOverTarget((id) => (id === t.id ? null : id))
            }}
            onDrop={(e) => {
              e.preventDefault()
              setOverTarget(null)
              if (dragging) {
                dropOnTarget(dragging, t.id)
                setDragging(null)
              }
            }}
            className={cn(
              'flex min-w-24 flex-col items-center gap-1 rounded-block border p-2 text-center text-xs transition-colors',
              t.disabled
                ? 'cursor-not-allowed bg-muted opacity-50'
                : highlighted
                  ? cn(targetStrong[tone], 'ring-2 ring-ring')
                  : targetSoft[tone],
            )}
          >
            {t.icon && (
              <span aria-hidden className={highlighted ? undefined : targetIconTone[tone]}>
                {t.icon}
              </span>
            )}
            <span className="font-medium">{t.label}</span>
            {t.hint && !t.disabled && (
              <span className={highlighted ? undefined : 'text-muted-foreground'}>{t.hint}</span>
            )}
            {t.disabled && t.disabledReason && (
              <span className="text-muted-foreground">{t.disabledReason}</span>
            )}
          </div>
        )
      })}
    </div>
  )

  const canTouchDrag = Boolean(onCardMove) || Boolean(dropTargets?.length && onDropTarget)
  const showHandle = isMobile && canTouchDrag

  const cardItem = (card: KanbanCard, index: number) => {
    const dragStart = (dataTransfer: DataTransfer | null) => {
      setDragging(card.id)
      if (!dataTransfer) return
      dataTransfer.effectAllowed = 'move'
      dataTransfer.setData('text/plain', card.id)
    }
    const dragEnd = () => {
      setDragging(null)
      setOver(null)
      setOverTarget(null)
    }
    const status = statusOf(card)
    const label = status && backgroundLabel(status)
    const common = {
      'data-kanban-card': card.id,
      draggable: !isMobile && Boolean(onCardMove),
      onDragOver: (e: ReactDragEvent<HTMLLIElement>) => {
        if (!dragging) return
        e.preventDefault()
        e.stopPropagation()
        const r = e.currentTarget.getBoundingClientRect()
        const after = e.clientY > r.top + r.height / 2
        setOver({ column: card.columnId, index: index + (after ? 1 : 0) })
      },
      onDrop: (e: ReactDragEvent<HTMLLIElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (over) drop(over.column, over.index)
      },
      className: cn(
        'relative flex rounded-block border',
        status ? statusBackground[status.background] : 'bg-card',
        'p-3 shadow-sm transition-[box-shadow,opacity]',
        !isMobile && onCardMove && 'cursor-grab active:cursor-grabbing',
        (dragging === card.id || touchDrag?.cardId === card.id) && 'opacity-50',
        over?.column === card.columnId &&
          over.index === index &&
          dragging !== card.id &&
          'ring-2 ring-ring ring-offset-2 ring-offset-muted',
      ),
    }
    const content = renderCard ? (
      renderCard(card)
    ) : (
      <CardBody card={card} show={show} withHandle={showHandle} />
    )
    // Sem rodapé (card só com título, descrição e contato), a estrutura é a de sempre; com
    // rodapé, o corpo e o rodapé viram irmãos num envoltório (o calendário é um botão e não
    // pode ficar dentro do botão de clique do card).
    const footer = renderCard
      ? null
      : cardFooter({
          card,
          status,
          show,
          valueFields: valueFields ?? [],
          formatValue,
        })
    const main = onCardClick ? (
      <button
        type="button"
        onClick={() => onCardClick(card)}
        className={
          footer
            ? 'flex min-w-0 cursor-pointer flex-col gap-2 rounded-block text-left outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring'
            : 'flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-block text-left outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring'
        }
      >
        {content}
      </button>
    ) : (
      <div
        className={footer ? 'flex min-w-0 flex-col gap-2' : 'flex min-w-0 flex-1 flex-col gap-2'}
      >
        {content}
      </div>
    )
    const body = (
      <>
        {footer ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {main}
            {footer}
          </div>
        ) : (
          main
        )}
        {label && <span className="sr-only">{label}</span>}
        {showHandle && (
          <button
            type="button"
            aria-label={`Arrastar ${card.title}`}
            className="absolute top-2 left-2 z-10 flex size-touch touch-none items-center justify-center rounded-item text-muted-foreground active:cursor-grabbing"
            onPointerDown={(e) => startTouchDrag(card, e)}
          >
            <GripVertical className="size-icon-sm" aria-hidden />
          </button>
        )}
        <span className="absolute top-2 right-2 z-10">{moveMenu(card)}</span>
      </>
    )

    if (lib) {
      const layout = layoutEnabled({ mode: motion, ready, dragging: touchDrag !== null })
      // O Motion toma `onDragStart`/`onDragEnd` para o gesto de arraste dele e os tira do DOM.
      // O arraste nativo (HTML5) do desktop segue por ouvintes `dragstart`/`dragend` ligados
      // direto no elemento; o layout só liga fora do arraste por toque (o arraste nativo não
      // muda a ordem até soltar, e ao soltar o layout anima o resultado).
      return (
        <lib.m.li
          key={card.id}
          ref={(el) => {
            if (!el) return
            const onStart = (e: DragEvent) => dragStart(e.dataTransfer)
            el.addEventListener('dragstart', onStart)
            el.addEventListener('dragend', dragEnd)
            return () => {
              el.removeEventListener('dragstart', onStart)
              el.removeEventListener('dragend', dragEnd)
            }
          }}
          layout={layout}
          layoutId={layout ? `${boardId}-${card.id}` : undefined}
          transition={presets.settle}
          {...common}
        >
          {body}
        </lib.m.li>
      )
    }
    return (
      <li
        key={card.id}
        onDragStart={(e) => dragStart(e.dataTransfer)}
        onDragEnd={dragEnd}
        {...common}
      >
        {body}
      </li>
    )
  }

  const totalFields = (valueFields ?? []).slice(0, 2)
  const sumOf = (list: KanbanCard[], key: string) =>
    list.reduce((sum, c) => sum + (c.values?.[key] ?? 0), 0)
  // Total do quadro visível: só os cards de etapas que o quadro mostra.
  const boardCards = visibleCards.filter((c) => columns.some((col) => col.id === c.columnId))
  const totals = (col: KanbanColumn) =>
    totalFields.map((f) => {
      const total = sumOf(visibleInColumn(col.id), f.key)
      const board = sumOf(boardCards, f.key)
      return { ...f, total, percent: board === 0 ? 0 : Math.round((total / board) * 100) }
    })

  const columnHeader = (col: KanbanColumn, count: number) => (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn('size-2 rounded-full', dotTone[col.tone ?? 'neutral'])} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{col.title}</h3>
        <Badge tone={col.limit && count > col.limit ? 'warning' : 'neutral'}>
          {col.limit ? `${count}/${col.limit}` : count}
        </Badge>
        {onAddCard && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Adicionar card em ${col.title}`}
            onClick={() => onAddCard(col.id)}
            className="-my-1 -mr-1 rounded-full"
          >
            <Plus />
          </Button>
        )}
      </div>
      {col.cadenceDays !== undefined && (
        <p className="text-xs text-muted-foreground">
          Cadência: {plural(col.cadenceDays, 'dia', 'dias')}
        </p>
      )}
      {valueFields && valueFields.length > 0 && (
        <div className="grid grid-cols-2 divide-x rounded-block bg-card text-xs">
          {totals(col).map((t) => (
            <span key={t.key} className="flex min-w-0 flex-col px-2 py-1">
              <span className="text-muted-foreground">Total {t.label}</span>
              <span className="truncate font-semibold tabular-nums">{formatValue(t.total)}</span>
              <span className="text-muted-foreground tabular-nums">({t.percent}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const columnList = (col: KanbanColumn) => {
    const all = visibleInColumn(col.id)
    const list = all.slice(0, limitOf(col.id))
    const more = all.length > list.length || Boolean(hasMore?.(col.id))
    return (
      <div
        data-kanban-scroll
        className="min-h-0 flex-1 scrollbar-subtle overflow-y-auto overscroll-y-contain"
      >
        <ol
          // Remonta uma vez quando o domMax chega: o layout só vale para cards criados depois.
          key={String(ready)}
          aria-label={`Cards em ${col.title}`}
          onDragOver={(e) => {
            if (!dragging) return
            e.preventDefault()
            setOver({ column: col.id, index: list.length })
          }}
          onDrop={(e) => {
            e.preventDefault()
            drop(col.id, over?.column === col.id ? over.index : list.length)
          }}
          className={cn(
            'flex min-h-24 flex-col gap-2 rounded-surface p-2 transition-colors',
            over?.column === col.id && 'bg-primary-soft/60',
          )}
        >
          {list.map((c, i) => cardItem(c, i))}
          {list.length === 0 && (
            <li className="flex min-h-16 items-center justify-center rounded-item border border-dashed text-xs text-muted-foreground">
              Nenhum card
            </li>
          )}
          {more && (
            <LoadMore
              onVisible={() => {
                if (all.length > list.length)
                  setShown((s) => ({ ...s, [col.id]: limitOf(col.id) + pageSize }))
                else onLoadMore?.(col.id)
              }}
            />
          )}
        </ol>
      </div>
    )
  }

  // ------------------------------------------------------------ barra do quadro

  const assignees = [...new Set(cards.map((c) => c.assignee).filter((a): a is string => !!a))].sort(
    (a, b) => a.localeCompare(b, 'pt-BR'),
  )
  const filterCount = (assigneeFilter ? 1 : 0) + (situationFilter ? 1 : 0)
  const hasFilters = assignees.length > 0 || statusEnabled
  const toolbarNode = toolbar && (
    <DataToolbar
      search={{ value: query, onChange: setQuery, placeholder: 'Buscar card' }}
      filters={
        hasFilters ? (
          <div className="flex flex-col gap-4">
            {assignees.length > 0 && (
              <Select
                label="Responsável"
                placeholder="Todos"
                clearable
                options={assignees.map((a) => ({ value: a, label: a }))}
                value={assigneeFilter}
                onChange={setAssigneeFilter}
              />
            )}
            {statusEnabled && (
              <Select
                label="Situação"
                placeholder="Todas"
                clearable
                options={situationOptions}
                value={situationFilter}
                onChange={setSituationFilter}
              />
            )}
          </div>
        ) : undefined
      }
      filterCount={filterCount}
      onClearFilters={() => {
        setAssigneeFilter(null)
        setSituationFilter(null)
      }}
      summary={
        totalFields.length > 0
          ? totalFields.map((f) => (
              <span key={f.key} className="flex items-baseline gap-1">
                <span className="text-muted-foreground">Total {f.label}:</span>
                <span className="font-semibold tabular-nums">
                  {formatValue(sumOf(boardCards, f.key))}
                </span>
              </span>
            ))
          : undefined
      }
      actions={
        <Button variant="outline" icon={<Settings2 />} onClick={() => setCustomizing(true)}>
          Customizar
        </Button>
      }
      primaryAction={
        onNewCard ? (
          <Button icon={<Plus />} onClick={() => onNewCard()}>
            Novo card
          </Button>
        ) : undefined
      }
    />
  )

  const customizeFields = [
    ...baseFields.map((f) => ({ id: f.id as string, label: f.label as string })),
    ...totalFields.map((f) => ({ id: `value:${f.key}`, label: f.label })),
  ]
  const customizeDrawer = toolbar && (
    <Drawer
      open={customizing}
      onOpenChange={setCustomizing}
      title="Customizar"
      icon={<Settings2 />}
      footer={
        <ActionBar
          cancel={{ label: 'Restaurar', onClick: () => changeHidden({}) }}
          primary={{ label: 'Pronto', onClick: () => setCustomizing(false) }}
        />
      }
    >
      <div className="flex flex-col gap-1">
        {customizeFields.map((f) => (
          <Checkbox
            key={f.id}
            label={f.label}
            checked={show(f.id)}
            onCheckedChange={(checked) => changeHidden({ ...hidden, [f.id]: !checked })}
          />
        ))}
      </div>
    </Drawer>
  )

  // ------------------------------------------------------------ confirmação do destino

  const pendingTarget = pendingDrop && dropTargets?.find((t) => t.id === pendingDrop.targetId)
  const pendingCard = pendingDrop && cards.find((c) => c.id === pendingDrop.cardId)
  // O card saiu do quadro por outro caminho com o modal aberto: fecha sem agir.
  useEffect(() => {
    if (pendingDrop && !pendingCard) setPendingDrop(null)
  }, [pendingDrop, pendingCard])
  const confirmation =
    pendingDrop && pendingTarget?.confirm && pendingCard ? (
      <Modal
        open
        onOpenChange={(next) => !next && setPendingDrop(null)}
        type={pendingTarget.confirm.destructive ? 'destructive' : 'confirm'}
        title={pendingTarget.confirm.title}
        description={pendingTarget.confirm.description}
        confirmLabel={pendingTarget.confirm.confirmLabel ?? pendingTarget.label}
        onConfirm={() =>
          onDropTarget?.(pendingDrop.cardId, pendingDrop.targetId, reason || undefined)
        }
      >
        <dl className="flex w-full flex-col gap-1 rounded-block bg-muted p-3 text-left text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Empresa</dt>
            <dd className="font-medium">{pendingCard.title}</dd>
          </div>
          {pendingCard.subtitle && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Documento</dt>
              <dd className="tabular-nums">{pendingCard.subtitle}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Etapa</dt>
            <dd>{columns.find((c) => c.id === pendingCard.columnId)?.title}</dd>
          </div>
          {totalFields.map((f) => (
            <div key={f.key} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{f.label}:</dt>
              <dd className="font-semibold tabular-nums">
                {formatValue(pendingCard.values?.[f.key] ?? 0)}
              </dd>
            </div>
          ))}
        </dl>
        {pendingTarget.confirm.reasons && (
          <div className="flex w-full flex-col gap-1 text-left">
            <span className="text-sm font-medium">Motivo</span>
            <Select
              label="Motivo"
              options={pendingTarget.confirm.reasons}
              value={reason}
              onChange={(value) => setReason(value ?? '')}
            />
          </div>
        )}
      </Modal>
    ) : null

  if (isMobile) {
    const board = (
      <div
        ref={boardRef}
        className={cn('flex h-board min-w-0 flex-col gap-3', className)}
        aria-label={aria['aria-label']}
        data-rendra={code}
      >
        {targetBar}
        <Tabs
          variant="pill"
          aria-label="Colunas"
          value={active}
          onChange={setActive}
          items={columns.map((col) => ({
            value: col.id,
            label: col.title,
            count: visibleInColumn(col.id).length,
            content: null,
          }))}
        />
        {columns
          .filter((col) => col.id === active)
          .map((col) => (
            <div
              key={col.id}
              className="flex min-h-0 flex-1 flex-col gap-2 rounded-surface bg-muted p-2"
            >
              {columnHeader(col, visibleInColumn(col.id).length)}
              {columnList(col)}
            </div>
          ))}
      </div>
    )
    return (
      <>
        {toolbar ? (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-surface border bg-card">{toolbarNode}</div>
            {board}
          </div>
        ) : (
          board
        )}
        {customizeDrawer}
        {confirmation}
      </>
    )
  }

  const board = (
    <section
      ref={boardRef}
      aria-label={aria['aria-label'] ?? 'Quadro kanban'}
      data-rendra={code}
      data-allow-overflow
      style={{ '--kanban-cols': Math.min(visibleColumns, columns.length) } as CSSProperties}
      className={cn('flex h-board min-w-0 scrollbar-subtle gap-4 overflow-x-auto', className)}
    >
      {targetBar}
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex min-h-0 w-kanban-col flex-col gap-2 rounded-surface bg-muted p-2"
        >
          <div className="pt-1">{columnHeader(col, visibleInColumn(col.id).length)}</div>
          {columnList(col)}
        </div>
      ))}
    </section>
  )
  return (
    <>
      {toolbar ? (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-surface border bg-card">{toolbarNode}</div>
          {board}
        </div>
      ) : (
        board
      )}
      {customizeDrawer}
      {confirmation}
    </>
  )
}

/** Move um card na lista (para usar no onCardMove): devolve a lista nova. */
export function moveKanbanCard(
  cards: KanbanCard[],
  cardId: string,
  toColumnId: string,
  toIndex: number,
) {
  const card = cards.find((c) => c.id === cardId)
  if (!card) return cards
  const rest = cards.filter((c) => c.id !== cardId)
  const target = rest.filter((c) => c.columnId === toColumnId)
  const before = target[Math.min(toIndex, target.length)]
  const moved = { ...card, columnId: toColumnId }
  if (!before) {
    const lastIndex = rest.map((c) => c.columnId).lastIndexOf(toColumnId)
    const at = lastIndex === -1 ? rest.length : lastIndex + 1
    return [...rest.slice(0, at), moved, ...rest.slice(at)]
  }
  const at = rest.indexOf(before)
  return [...rest.slice(0, at), moved, ...rest.slice(at)]
}
