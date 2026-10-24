import { Search, X } from 'lucide-react'
import {
  useId,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FLOW_ICON, flowTone } from '@/components/ui/flow-viewer'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import type { FlowNodeType } from '@/lib/flow'
import { FLOW_BLOCKS, FLOW_BLOCK_GROUPS } from '@/lib/flow-blocks'

/*
 * Peças internas da barra lateral do FlowEditor (sem uso direto em tela): a lista de blocos com
 * busca e grupos, e o cabeçalho que os painéis de configuração, teste e validação dividem.
 */

const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export interface FlowBlockListProps {
  /** Clicar no bloco o acrescenta ao fluxo. */
  onAdd: (type: FlowNodeType) => void
  /** Arrastar o bloco até o canvas (só com montagem por mouse ou toque; ausente no celular). */
  onDragStart?: (e: ReactPointerEvent<HTMLButtonElement>, type: FlowNodeType) => void
  /** Vira `true` logo depois de um arraste, para o clique que o segue ser ignorado. */
  suppressClick?: RefObject<boolean>
}

export function FlowBlockList({ onAdd, onDragStart, suppressClick }: FlowBlockListProps) {
  const [query, setQuery] = useState('')
  const q = normalize(query.trim())
  const groups = FLOW_BLOCK_GROUPS.map((g) => ({
    ...g,
    types: g.types.filter((t) => {
      const def = FLOW_BLOCKS[t]
      return !def.hidden && (q === '' || normalize(`${def.name} ${def.hint}`).includes(q))
    }),
  })).filter((g) => g.types.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <Input
        icon={<Search />}
        value={query}
        onChange={setQuery}
        placeholder="Buscar gatilho ou ação"
        aria-label="Buscar bloco"
        clearable
      />
      {groups.length === 0 && (
        <EmptyState
          size="compact"
          title="Nenhum bloco encontrado"
          description="Nenhum bloco tem esse nome."
        />
      )}
      {groups.map((g) => (
        <section key={g.id} role="group" aria-label={g.name} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">{g.name}</h3>
          {g.types.map((type) => {
            const Icon = FLOW_ICON[type]
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                data-flow-block={type}
                className={cn('w-full justify-start', onDragStart && 'cursor-grab touch-none')}
                icon={
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-block',
                      flowTone(type),
                    )}
                  >
                    <Icon className="size-icon-sm" aria-hidden />
                  </span>
                }
                onPointerDown={onDragStart ? (e) => onDragStart(e, type) : undefined}
                onClick={() => {
                  if (suppressClick?.current) return
                  onAdd(type)
                }}
              >
                {FLOW_BLOCKS[type].name}
              </Button>
            )
          })}
        </section>
      ))}
    </div>
  )
}

export interface FlowPanelShellProps {
  title: string
  /** Fecha o painel e volta à lista de blocos. */
  onClose?: () => void
  closeLabel?: string
  children: ReactNode
  className?: string
}

/** Cabeçalho comum dos painéis da barra lateral: título e o botão de fechar. */
export function FlowPanelShell({
  title,
  onClose,
  closeLabel = 'Fechar painel',
  children,
  className,
}: FlowPanelShellProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={closeLabel}
            className="min-h-touch min-w-touch"
            icon={<X />}
            onClick={onClose}
          />
        )}
      </div>
      {children}
    </section>
  )
}
