import { ChevronRight } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { useRendraLink } from '@/components/rendra-provider'
import { Badge } from '@/components/ui/badge'
import { SortableHandle } from '@/components/ui/sortable-handle'
import { cn } from '@/lib/cn'
import {
  layoutEnabled,
  useLayoutReady,
  useMotionLib,
  useMotionMode,
  useMotionPresets,
} from '@/lib/motion'
import { useSortable } from '@/lib/sortable'

export interface ListItem {
  id: string
  title: ReactNode
  description?: ReactNode
  /** Avatar, ícone ou imagem à esquerda. */
  leading?: ReactNode
  /** Valor, badge ou ação à direita. */
  trailing?: ReactNode
  /** Torna a linha navegável. */
  to?: string
  onClick?: () => void
  /** Selo textual de status da linha, com contraste AA (nunca só cor). */
  tone?: 'success' | 'error' | 'warning' | 'neutral'
}

export interface ListProps {
  items: ListItem[]
  /** Linhas separadas por borda (padrão) ou sem divisória. */
  divided?: boolean
  empty?: ReactNode
  className?: string
  /**
   * Reordena os itens por arraste (mouse e toque) e por teclado (setas ↑/↓ na alça).
   * Sem ela a lista é só leitura e a alça de arraste não aparece.
   */
  onReorder?: (items: ListItem[]) => void
  /** Nome acessível de cada item para a alça de arraste (ex.: "Cliente A"). Padrão: o título, em texto. */
  itemLabel?: (item: ListItem) => string
}

const toneLabel: Record<NonNullable<ListItem['tone']>, string> = {
  success: 'Sucesso',
  warning: 'Atenção',
  error: 'Erro',
  neutral: 'Neutro',
}

const toneBadge: Record<
  NonNullable<ListItem['tone']>,
  'success' | 'warning' | 'error' | 'neutral'
> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  neutral: 'neutral',
}

function defaultItemLabel(item: ListItem): string {
  return typeof item.title === 'string' ? item.title : item.id
}

/** Lista única: linhas com início, título, descrição e fim; navegável por prop; reordenável por prop. */
export function List({
  items,
  divided = true,
  empty,
  className,
  onReorder,
  itemLabel = defaultItemLabel,
}: ListProps) {
  const Link = useRendraLink()
  const sortable = useSortable<ListItem>({
    items: items.map((it) => ({ id: it.id, data: it })),
    onReorder: onReorder && ((sorted) => onReorder(sorted.map((s) => s.data))),
  })
  const sortableEnabled = Boolean(onReorder)
  const motion = useMotionMode()
  const lib = useMotionLib()
  const ready = useLayoutReady()
  const presets = useMotionPresets()
  // Em `on` o item anima o layout, mas só fora do arraste: sob o ponteiro a ordem muda a cada
  // passo e animar atrasaria a linha atrás do cursor. Pelo teclado (moveBy) o layout anima.
  const Item: ElementType = lib ? lib.m.li : 'li'
  const itemMotion =
    motion === 'on'
      ? {
          layout: layoutEnabled({ mode: motion, ready, dragging: sortable.draggingId !== null }),
          transition: presets.move,
        }
      : {}
  const code = resolveCatalogCode('List', { sortable: sortableEnabled })

  if (items.length === 0 && empty) return <>{empty}</>
  return (
    <ul
      // Remonta uma vez quando o domMax chega: o layout só vale para itens criados depois disso.
      key={String(ready)}
      data-rendra={code}
      className={cn('flex w-full min-w-0 flex-col', divided && 'divide-y', className)}
    >
      {items.map((it) => {
        const interactive = Boolean(it.to || it.onClick)
        const body = (
          <>
            {it.leading && <span className="flex shrink-0">{it.leading}</span>}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-medium">{it.title}</span>
              {it.description && (
                <span className="line-clamp-2 text-sm text-muted-foreground">{it.description}</span>
              )}
            </span>
            {it.tone && (
              <Badge tone={toneBadge[it.tone]} className="shrink-0">
                {toneLabel[it.tone]}
              </Badge>
            )}
            {it.trailing && <span className="flex shrink-0 items-center">{it.trailing}</span>}
            {interactive && (
              <ChevronRight className="size-icon-sm shrink-0 text-muted-foreground" aria-hidden />
            )}
          </>
        )
        const cls = cn(
          'flex min-h-touch w-full min-w-0 items-center gap-3 py-3 text-left',
          interactive && '-mx-2 rounded-item px-2 transition-colors hover:bg-accent',
        )
        const label = itemLabel(it)
        const handle = sortableEnabled && (
          <SortableHandle id={it.id} label={`Reordenar ${label}`} sortable={sortable} />
        )
        return (
          <Item
            key={it.id}
            {...(sortableEnabled ? sortable.itemProps(it.id) : {})}
            {...itemMotion}
            className={cn(
              'flex min-w-0 items-center gap-1',
              sortable.draggingId === it.id && 'opacity-50',
            )}
          >
            {handle}
            {it.to ? (
              <Link to={it.to} className={cls}>
                {body}
              </Link>
            ) : it.onClick ? (
              <button type="button" onClick={it.onClick} className={cls}>
                {body}
              </button>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </Item>
        )
      })}
    </ul>
  )
}
