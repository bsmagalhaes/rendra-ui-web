import { format } from 'date-fns'
import { m } from 'motion/react'
import {
  ArrowRightLeft,
  CalendarDays,
  GripVertical,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
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
import { Avatar } from '@/components/ui/avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs } from '@/components/ui/tabs'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useFillHeight } from '@/hooks/use-fill-height'
import { cn } from '@/lib/cn'
import { layoutEnabled, useLayoutReady, useMotionMode, useMotionPresets } from '@/lib/motion'
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
}

/** Contador de quadros, só para o `layoutId` dos cards em `on` (um prefixo por instância). */
let boardsCreated = 0

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
}

/** Valor somado no cabeçalho da coluna e mostrado no card (ex.: P&S e MRR). */
export interface KanbanValueField {
  key: string
  label: string
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
  /** Conteúdo próprio do card, no lugar do padrão. */
  renderCard?: (card: KanbanCard) => ReactNode
  /**
   * Valores do card (até 2, lado a lado com divisória) e o total de cada um na coluna.
   * Ex.: [{ key: 'ps', label: 'P&S' }, { key: 'mrr', label: 'MRR' }].
   */
  valueFields?: KanbanValueField[]
  /** Formato dos valores. Padrão: moeda (R$ 1.250,00). */
  formatValue?: (n: number) => string
  /**
   * Destinos de arraste além das colunas (ex.: "Marcar como ganho"). Com eles, mostra uma
   * barra durante o arraste e o menu "Mover para" passa a listar estes destinos.
   */
  dropTargets?: KanbanDropTarget[]
  /** Card solto num destino da barra (ou escolhido no menu "Mover para"). */
  onDropTarget?: (cardId: string, targetId: string) => void
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

function CardBody({
  card,
  valueFields = [],
  formatValue,
  withHandle,
}: {
  card: KanbanCard
  valueFields?: KanbanValueField[]
  formatValue: (n: number) => string
  /** Reserva o espaço da alça de arraste no toque, à esquerda do título. */
  withHandle?: boolean
}) {
  const shown = valueFields.slice(0, 2)
  return (
    <>
      {card.tags && card.tags.length > 0 && (
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
        {card.subtitle && (
          <span className="text-xs text-muted-foreground tabular-nums">{card.subtitle}</span>
        )}
      </span>
      {card.description && (
        <span className="line-clamp-2 text-xs text-muted-foreground">{card.description}</span>
      )}
      {card.contact && (
        <span className="flex flex-col gap-1 text-xs text-muted-foreground">
          {card.contact.name && (
            <span className="flex min-w-0 items-center gap-1 text-foreground">
              <User className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{card.contact.name}</span>
            </span>
          )}
          {card.contact.phone && (
            <span className="flex min-w-0 items-center gap-1 tabular-nums">
              <Phone className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{card.contact.phone}</span>
            </span>
          )}
          {card.contact.email && (
            <span className="flex min-w-0 items-center gap-1">
              <Mail className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{card.contact.email}</span>
            </span>
          )}
        </span>
      )}
      {shown.length > 0 && (
        <span className="grid grid-cols-2 divide-x rounded-block bg-muted text-xs">
          {shown.map((f) => (
            <span key={f.key} className="flex min-w-0 flex-col px-2 py-1">
              <span className="text-muted-foreground">{f.label}:</span>
              <span className="truncate font-semibold text-foreground tabular-nums">
                {formatValue(card.values?.[f.key] ?? 0)}
              </span>
            </span>
          ))}
        </span>
      )}
      {(card.assignee || card.dueDate || card.meta) && (
        <span className="flex items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
          {card.dueDate && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarDays className="size-3" aria-hidden />
              {format(card.dueDate, 'dd/MM/yyyy')}
            </span>
          )}
          {card.meta && (
            <span className="font-medium text-foreground tabular-nums">{card.meta}</span>
          )}
          {card.assignee && (
            <span className="ml-auto" title={card.assignee}>
              <Avatar name={card.assignee} size="sm" />
            </span>
          )}
        </span>
      )}
    </>
  )
}

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
  className,
  ...aria
}: KanbanProps) {
  const code = resolveCatalogCode('Kanban', { hasDropTargets: Boolean(dropTargets?.length) })
  const { isMobile } = useBreakpoint()
  const motion = useMotionMode()
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
  // Arraste por toque (motor de src/lib/sortable.ts): reordena dentro da coluna sem
  // dropTargets, ou solta num destino da barra quando dropTargets está presente.
  const [touchDrag, setTouchDrag] = useState<{
    cardId: string
    overTargetId: string | null
  } | null>(null)

  const inColumn = (id: string) => cards.filter((c) => c.columnId === id)

  const drop = (columnId: string, index: number) => {
    if (dragging) onCardMove?.(dragging, columnId, index)
    setDragging(null)
    setOver(null)
  }

  const draggingCardId = dragging ?? touchDrag?.cardId ?? null
  const showTargetBar = Boolean(dropTargets?.length) && draggingCardId !== null

  const dropOnTarget = (cardId: string, targetId: string) => {
    const target = dropTargets?.find((t) => t.id === targetId)
    if (!target || target.disabled) return
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

  /** Barra de destinos, mostrada durante o arraste (mouse ou toque) quando há dropTargets. */
  const targetBar = showTargetBar && (
    <div
      aria-label="Soltar em"
      className="fixed inset-x-4 bottom-4 z-30 flex justify-center gap-2 overflow-x-auto rounded-surface border bg-card p-2 shadow-lg"
    >
      {dropTargets!.map((t) => (
        <div
          key={t.id}
          data-kanban-target={t.id}
          onDragOver={(e) => {
            if (dragging && !t.disabled) e.preventDefault()
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (dragging) {
              dropOnTarget(dragging, t.id)
              setDragging(null)
            }
          }}
          className={cn(
            'flex min-w-24 flex-col items-center gap-1 rounded-block border p-2 text-center text-xs transition-colors',
            t.disabled
              ? 'cursor-not-allowed opacity-50'
              : touchDrag?.overTargetId === t.id && 'bg-primary-soft/60 ring-2 ring-ring',
          )}
        >
          {t.icon && (
            <span aria-hidden className={targetIconTone[t.tone ?? 'neutral']}>
              {t.icon}
            </span>
          )}
          <span className="font-medium">{t.label}</span>
          {t.hint && !t.disabled && <span className="text-muted-foreground">{t.hint}</span>}
          {t.disabled && t.disabledReason && (
            <span className="text-muted-foreground">{t.disabledReason}</span>
          )}
        </div>
      ))}
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
    }
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
        'relative flex rounded-block border bg-card p-3 shadow-sm transition-[box-shadow,opacity]',
        !isMobile && onCardMove && 'cursor-grab active:cursor-grabbing',
        (dragging === card.id || touchDrag?.cardId === card.id) && 'opacity-50',
        over?.column === card.columnId &&
          over.index === index &&
          dragging !== card.id &&
          'ring-2 ring-ring ring-offset-2 ring-offset-muted',
      ),
    }
    const body = (
      <>
        {onCardClick ? (
          <button
            type="button"
            onClick={() => onCardClick(card)}
            className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-block text-left outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {renderCard ? (
              renderCard(card)
            ) : (
              <CardBody
                card={card}
                valueFields={valueFields}
                formatValue={formatValue}
                withHandle={showHandle}
              />
            )}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {renderCard ? (
              renderCard(card)
            ) : (
              <CardBody
                card={card}
                valueFields={valueFields}
                formatValue={formatValue}
                withHandle={showHandle}
              />
            )}
          </div>
        )}
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

    if (motion === 'on') {
      const layout = layoutEnabled({ mode: motion, ready, dragging: touchDrag !== null })
      // O Motion toma `onDragStart`/`onDragEnd` para o gesto de arraste dele e os tira do DOM.
      // O arraste nativo (HTML5) do desktop segue por ouvintes `dragstart`/`dragend` ligados
      // direto no elemento; o layout só liga fora do arraste por toque (o arraste nativo não
      // muda a ordem até soltar, e ao soltar o layout anima o resultado).
      return (
        <m.li
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
        </m.li>
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

  const totals = (col: KanbanColumn) =>
    (valueFields ?? []).slice(0, 2).map((f) => ({
      ...f,
      total: inColumn(col.id).reduce((sum, c) => sum + (c.values?.[f.key] ?? 0), 0),
    }))

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
      {valueFields && valueFields.length > 0 && (
        <div className="grid grid-cols-2 divide-x rounded-block bg-card text-xs">
          {totals(col).map((t) => (
            <span key={t.key} className="flex min-w-0 flex-col px-2 py-1">
              <span className="text-muted-foreground">Total {t.label}</span>
              <span className="truncate font-semibold tabular-nums">{formatValue(t.total)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const columnList = (col: KanbanColumn) => {
    const all = inColumn(col.id)
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

  if (isMobile) {
    return (
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
            count: inColumn(col.id).length,
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
              {columnHeader(col, inColumn(col.id).length)}
              {columnList(col)}
            </div>
          ))}
      </div>
    )
  }

  return (
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
          <div className="pt-1">{columnHeader(col, inColumn(col.id).length)}</div>
          {columnList(col)}
        </div>
      ))}
    </section>
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
