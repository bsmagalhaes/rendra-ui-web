import { Columns3, Filter, Search, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ActionBar } from '@/components/ui/action-bar'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/cn'

/*
 * Barra de ferramentas de listagem. Fica dentro do mesmo card do conteúdo, acima dele.
 * Ordem: busca à esquerda; à direita, ações secundárias, Colunas, Filtros e, por último,
 * a ação principal (Novo). Abaixo, chips dos filtros. A ação principal da listagem mora
 * aqui, nunca solta acima do card.
 * Mobile: busca na largura total; embaixo, Filtros (30%) e a ação principal (70%).
 * Filtros, ordenação e colunas viram um único botão com contador, que abre um drawer.
 */

export interface FilterChip {
  id: string
  label: string
  onRemove: () => void
}

export interface ToolbarColumn {
  id: string
  label: string
  visible: boolean
  onToggle: (visible: boolean) => void
}

export interface DataToolbarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  /** Conteúdo dos filtros: popover no desktop, drawer em tela cheia no mobile. */
  filters?: ReactNode
  /** Quantos filtros estão aplicados (contador no botão). */
  filterCount?: number
  onClearFilters?: () => void
  /** Chips dos filtros aplicados. */
  chips?: FilterChip[]
  /** Ordenação (vai para o drawer no mobile). */
  sort?: ReactNode
  /** Colunas que o usuário pode mostrar ou ocultar. */
  columns?: ToolbarColumn[]
  /** Ações secundárias à direita (exportar etc.). No mobile, numa linha abaixo. */
  actions?: ReactNode
  /**
   * Resumo logo depois da busca (ex.: totais de um quadro). No desktop fica entre a busca e as
   * ações; no mobile, numa linha própria abaixo da busca. Sem ele, nada é desenhado.
   */
  summary?: ReactNode
  /** Ação principal da listagem (ex.: Novo cliente). Sempre a última à direita. */
  primaryAction?: ReactNode
  /** Substitui a barra quando há itens selecionados (ações em massa, só desktop). */
  selectionBar?: ReactNode
}

export function DataToolbar({
  search,
  filters,
  filterCount = 0,
  onClearFilters,
  chips = [],
  sort,
  columns,
  actions,
  summary,
  primaryAction,
  selectionBar,
}: DataToolbarProps) {
  const { isMobile } = useBreakpoint()
  const [drawer, setDrawer] = useState(false)
  const hasPanel = Boolean(filters || sort || columns?.length)

  const columnsMenu = columns?.length ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" icon={<Columns3 />}>
          Colunas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={c.visible}
            onCheckedChange={(v) => c.onToggle(v === true)}
            onSelect={(e) => e.preventDefault()}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  const filterButton = (onClick?: () => void) => (
    <Button variant="outline" icon={<Filter />} onClick={onClick}>
      Filtros
      {filterCount > 0 && (
        <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground tabular-nums">
          {filterCount}
        </span>
      )}
    </Button>
  )

  return (
    <div data-rendra="DTB-001" className="flex flex-col gap-3 border-b p-4">
      {selectionBar && !isMobile ? (
        <div className="flex min-h-control-md flex-wrap items-center gap-3">{selectionBar}</div>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {search && (
            <Input
              icon={<Search />}
              clearable
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder ?? 'Buscar'}
              aria-label={search.placeholder ?? 'Buscar'}
              type="search"
              className="md:w-3xs lg:w-sm"
            />
          )}

          {summary && (
            <div data-toolbar-summary className="flex flex-col gap-1 text-sm">
              {summary}
            </div>
          )}

          {isMobile ? (
            <>
              {(hasPanel || primaryAction) && (
                <div
                  className={cn(
                    'grid gap-3',
                    hasPanel && primaryAction ? 'grid-actions-2' : 'grid-cols-1',
                  )}
                >
                  {hasPanel && filterButton(() => setDrawer(true))}
                  {primaryAction}
                </div>
              )}
              {actions && <div className="flex flex-wrap gap-3 *:flex-1">{actions}</div>}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2 md:ml-auto">
              {actions}
              {columnsMenu}
              {sort}
              {filters && (
                <Popover>
                  <PopoverTrigger asChild>{filterButton()}</PopoverTrigger>
                  <PopoverContent align="end" className="flex flex-col">
                    <div className="max-h-command overflow-y-auto p-4">{filters}</div>
                    {onClearFilters && filterCount > 0 && (
                      <div className="border-t p-2">
                        <Button variant="ghost" size="sm" onClick={onClearFilters}>
                          Limpar filtros
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
              {primaryAction}
            </div>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-item border bg-muted py-1 pr-1 pl-2 text-xs font-medium"
            >
              {c.label}
              <button
                type="button"
                onClick={c.onRemove}
                aria-label={`Remover filtro ${c.label}`}
                className="flex size-6 cursor-pointer items-center justify-center rounded-item text-muted-foreground hover:bg-card hover:text-foreground max-md:-my-3 max-md:size-touch"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
          {onClearFilters && (
            <Button variant="link" size="sm" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {isMobile && hasPanel && (
        <Drawer
          open={drawer}
          onOpenChange={setDrawer}
          title="Filtros"
          icon={<Filter />}
          size="full"
          footer={
            <ActionBar
              cancel={onClearFilters ? { label: 'Limpar', onClick: onClearFilters } : undefined}
              primary={{ label: 'Ver resultados', onClick: () => setDrawer(false) }}
            />
          }
        >
          <div className="flex flex-col gap-8">
            {filters && <div className="flex flex-col gap-4">{filters}</div>}
            {sort && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Ordenar por</p>
                {sort}
              </div>
            )}
            {columns?.length ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">Campos no card</p>
                {columns.map((c) => (
                  <Switch
                    key={c.id}
                    label={c.label}
                    checked={c.visible}
                    onCheckedChange={c.onToggle}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </Drawer>
      )}
    </div>
  )
}
