import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  RotateCw,
} from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { Collapsible } from 'radix-ui'
import { Fragment, useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react'
import { useRendraLink } from '@/components/rendra-provider'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DataToolbar, type DataToolbarProps } from '@/components/ui/data-toolbar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'
import { formatCurrency } from '@/lib/masks'

/* ================================================================ tipos */

export interface TableColumn<T> {
  id: string
  header: string
  /** Valor da célula (para ordenar, buscar e formatar). */
  accessor: (row: T) => unknown
  /** Renderização própria da célula. */
  cell?: (row: T) => ReactNode
  /**
   * Linhas extras abaixo do valor, em texto menor (ex.: razão social e CNPJ abaixo do nome;
   * e-mail abaixo do telefone). Valores vazios são ignorados.
   */
  details?: (row: T) => (ReactNode | null | undefined)[]
  /** O valor vira link para esta rota (ex.: abrir o cadastro), com hover de clicável. */
  href?: (row: T) => string
  /**
   * Formato automático: number e currency alinham à direita; date vira DD/MM/AAAA;
   * badge usa badgeTone para escolher a cor.
   */
  kind?: 'text' | 'number' | 'currency' | 'date' | 'badge'
  badgeTone?: (row: T) => BadgeProps['tone']
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  /** Pode ser ocultada pelo menu Colunas. */
  hideable?: boolean
  /** Começa oculta (o usuário mostra pelo menu Colunas). */
  hidden?: boolean
  /** Linhas máximas do texto antes das reticências (máximo 3). */
  lines?: 1 | 2 | 3
  /**
   * No mobile, a tabela vira cards:
   *   primary   no topo do card (até 3; o primeiro é o título)
   *   secondary recolhido em "Ver detalhes"
   *   hidden    não aparece no card
   */
  mobile?: 'primary' | 'secondary' | 'hidden'
  /** Largura mínima no desktop. */
  width?: 'sm' | 'md' | 'lg'
}

export interface RowAction<T> {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  destructive?: boolean
  hidden?: (row: T) => boolean
}

/** O que a Table pede ao servidor em cada carregamento (modo remoto, prop source). */
export interface TableQuery {
  /** Página, começando em 1. */
  page: number
  pageSize: number
  /** Texto da busca, aplicado pelo servidor a todos os registros (não só à página). */
  search: string
  sort: { id: string; desc: boolean } | null
  /** Cancela a requisição quando o usuário muda de página ou digita de novo. */
  signal: AbortSignal
}

/** Resposta do servidor: os registros da página e o total que atende à busca e aos filtros. */
export interface TablePage<T> {
  rows: T[]
  total: number
}

/** Registros por página em todas as tabelas do sistema. */
export const TABLE_PAGE_SIZE = 15

export interface TableProps<T> {
  /** Dados já carregados (modo local). Com source, é ignorado. */
  data?: T[]
  /**
   * Modo remoto: a Table pede ao servidor só a página visível. Busca, ordenação e
   * filtros são enviados na requisição e valem para todos os registros. A função precisa
   * ser estável (definida fora do componente ou com useCallback).
   */
  source?: (query: TableQuery) => Promise<TablePage<T>>
  /** Mude este valor quando filtros externos mudarem: a Table recarrega a partir da página 1. */
  queryKey?: string
  columns: TableColumn<T>[]
  getRowId: (row: T) => string
  /** Seleção por checkbox (primeira coluna; no mobile, no topo do card). */
  selectable?: boolean
  /** Conteúdo expandido da linha. */
  expandable?: (row: T) => ReactNode
  /** Ordenação por clique no cabeçalho (padrão por coluna: sortable). */
  sortable?: boolean
  /** Busca global: texto aplicado a todas as colunas. */
  globalFilter?: string
  /** Menu Colunas na barra de ferramentas. */
  columnVisibility?: boolean
  /** Ações em massa para os selecionados (botões). No mobile, barra fixa no rodapé da tela. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode
  /** Mais ações em massa, no menu de três pontinhos ao lado dos botões. */
  bulkMenu?: {
    label: string
    icon?: ReactNode
    destructive?: boolean
    onClick: (selected: T[], clear: () => void) => void
  }[]
  /** Ações por linha. Até 2 visíveis como ícone; acima disso, menu. */
  rowActions?: RowAction<T>[]
  density?: 'compact' | 'default' | 'comfortable'
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /** Estado vazio. */
  empty?: { title: string; description?: string; action?: ReactNode }
  /** Itens por página. Padrão: 15 (TABLE_PAGE_SIZE). Use 0 para mostrar tudo sem paginação. */
  pageSize?: number
  /** No mobile: "anterior e próxima" ou "carregar mais". */
  mobilePagination?: 'pages' | 'loadMore'
  /** Barra de ferramentas no mesmo card, acima da tabela. */
  toolbar?: Omit<DataToolbarProps, 'columns' | 'selectionBar' | 'sort'>
  /**
   * Colunas de situação (kind: 'badge') vão para o fim, logo antes das ações.
   * Padrão true; use false para manter a ordem exata de columns.
   */
  statusLast?: boolean
  /** Rótulo da tabela para leitores de tela. */
  'aria-label': string
}

/* ================================================================ utilidades */

const densityRow = { compact: 'py-2', default: 'py-3', comfortable: 'py-4' } as const
const clamp = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' } as const
const minWidth = { sm: 'min-w-24', md: 'min-w-3xs', lg: 'min-w-sm' } as const

function formatValue<T>(col: TableColumn<T>, row: T): ReactNode {
  if (col.cell) return col.cell(row)
  const v = col.accessor(row)
  if (v == null || v === '') return <span className="text-muted-foreground">-</span>
  switch (col.kind) {
    case 'number':
      return Number(v).toLocaleString('pt-BR')
    case 'currency':
      return formatCurrency(Number(v))
    case 'date':
      return format(v instanceof Date ? v : new Date(String(v)), 'dd/MM/yyyy')
    case 'badge':
      return <Badge tone={col.badgeTone?.(row) ?? 'neutral'}>{String(v)}</Badge>
    default:
      return String(v)
  }
}

/** Valor da célula com link (href) e linhas extras (details), igual no desktop e no card. */
function CellContent<T>({ col, row, title }: { col: TableColumn<T>; row: T; title?: boolean }) {
  const Link = useRendraLink()
  const main = formatValue(col, row)
  const extra = (col.details?.(row) ?? []).filter((d) => d != null && d !== '')
  const value = col.href ? (
    <Link
      to={col.href(row)}
      className={cn(
        'rounded-item font-medium text-foreground underline-offset-4 transition-colors outline-none hover:text-primary-text hover:underline focus-visible:ring-2 focus-visible:ring-ring',
        title && 'inline-flex min-h-touch items-center md:min-h-0',
      )}
    >
      {main}
    </Link>
  ) : (
    main
  )
  if (!extra.length) return <>{value}</>
  return (
    <span className="flex min-w-0 flex-col">
      <span className="min-w-0">{value}</span>
      {extra.map((d, i) => (
        <span key={i} className="truncate text-xs font-normal text-muted-foreground">
          {d}
        </span>
      ))}
    </span>
  )
}

const alignOf = <T,>(c: TableColumn<T>) =>
  c.align ?? (c.kind === 'number' || c.kind === 'currency' ? 'right' : 'left')

function RowActions<T>({
  row,
  actions,
  mobile,
}: {
  row: T
  actions: RowAction<T>[]
  mobile?: boolean
}) {
  const list = actions.filter((a) => !a.hidden?.(row))
  const visible = list.length <= 2 ? list : list.slice(0, 1)
  const rest = list.length <= 2 ? [] : list.slice(1)
  return (
    <div
      className={cn('flex items-center gap-1', mobile ? 'w-full justify-end gap-2' : 'justify-end')}
    >
      {visible.map((a) =>
        mobile ? (
          <Button
            key={a.label}
            variant={a.destructive ? 'ghost' : 'outline'}
            size="sm"
            icon={a.icon}
            onClick={() => a.onClick(row)}
            className={cn('flex-1', a.destructive && 'text-destructive')}
          >
            {a.label}
          </Button>
        ) : (
          <Tooltip key={a.label} content={a.label}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={a.label}
              onClick={() => a.onClick(row)}
              className={cn(
                a.destructive &&
                  'text-destructive hover:bg-destructive-soft hover:text-destructive-soft-foreground',
              )}
            >
              {a.icon}
            </Button>
          </Tooltip>
        ),
      )}
      {rest.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" iconOnly aria-label="Mais ações">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {rest.map((a) => (
              <DropdownMenuItem
                key={a.label}
                destructive={a.destructive}
                onSelect={() => a.onClick(row)}
              >
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/*
 * Features do TanStack Table 9, só as que o componente usa. Constante de módulo:
 * criada uma única vez, nunca a cada render. columnFilteringFeature é pré-requisito
 * técnico de globalFilteringFeature (sem UI de filtro de coluna).
 */
const tableFeatureSet = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns: { basic: sortFn_basic, alphanumeric: sortFn_alphanumeric },
  filterFns: { includesString: filterFn_includesString },
})

/* ================================================================ componente */

/**
 * Table única do sistema (TanStack Table). Tudo é prop: seleção, expansão, ordenação,
 * busca, colunas visíveis, ações em massa e por linha, densidade e estados.
 * Mobile (< 768px): a mesma tabela vira lista de cards, sem rolagem horizontal.
 * Desktop: tabela larga rola na horizontal só dentro do próprio contêiner.
 */
/**
 * Bloco "Ver detalhes" do card no celular. Em `on` a altura abre e fecha pelos presets e o
 * conteúdo fechado sai do DOM; em `off` é o Collapsible de sempre, com as animações em CSS.
 */
function MobileDetails({ children }: { children: ReactNode }) {
  const motion = useMotionMode()
  const presets = useMotionPresets()
  const [open, setOpen] = useState(false)
  const trigger = (
    <Collapsible.Trigger className="group flex min-h-touch cursor-pointer items-center gap-1 text-sm font-medium text-primary-text">
      <span className="group-data-[state=open]:hidden">Ver detalhes</span>
      <span className="hidden group-data-[state=open]:inline">Ocultar detalhes</span>
      <ChevronDown
        className="size-icon-sm transition-transform duration-200 group-data-[state=open]:rotate-180"
        aria-hidden
      />
    </Collapsible.Trigger>
  )
  if (motion === 'on') {
    return (
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        {trigger}
        <AnimatePresence initial={false}>
          {open && (
            <Collapsible.Content forceMount asChild>
              <m.div
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={presets.fade.transition}
              >
                {children}
              </m.div>
            </Collapsible.Content>
          )}
        </AnimatePresence>
      </Collapsible.Root>
    )
  }
  return (
    <Collapsible.Root>
      {trigger}
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

export function Table<T>({
  data: dataProp,
  source,
  queryKey = '',
  columns: columnsProp,
  statusLast = true,
  getRowId,
  selectable,
  expandable,
  sortable = true,
  globalFilter,
  columnVisibility,
  bulkActions,
  bulkMenu,
  rowActions,
  density = 'default',
  loading,
  error,
  onRetry,
  empty,
  pageSize: pageSizeProp = TABLE_PAGE_SIZE,
  mobilePagination = 'pages',
  toolbar,
  ...aria
}: TableProps<T>) {
  const { isMobile } = useBreakpoint()
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  // Em `on` as linhas e os cards entram em fade escalonado (no máximo as 10 primeiras).
  const RowItem: ElementType = on ? m.tr : 'tr'
  const CardItem: ElementType = on ? m.li : 'li'
  const rowEnter = (i: number) =>
    on ? { ...presets.fade, transition: { ...presets.fade.transition, ...presets.stagger(i) } } : {}
  const columns = useMemo(
    () =>
      statusLast
        ? [
            ...columnsProp.filter((c) => c.kind !== 'badge'),
            ...columnsProp.filter((c) => c.kind === 'badge'),
          ]
        : columnsProp,
    [columnsProp, statusLast],
  )
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [visibility, setVisibility] = useState<ColumnVisibilityState>(() =>
    Object.fromEntries(columnsProp.filter((c) => c.hidden).map((c) => [c.id, false])),
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const pageSize = pageSizeProp || undefined
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: pageSize ?? 0 })
  const [mobilePage, setMobilePage] = useState(1)

  /* ---------------- modo remoto: uma requisição por página */
  const remote = Boolean(source)
  const search = useDebouncedValue(globalFilter?.trim() ?? '', 300)
  const sortKey = sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : ''
  // Busca, ordenação ou filtros novos voltam para a página 1 no mesmo render (sem pedir a
  // página antiga com a busca nova).
  const resetKey = `${search}|${sortKey}|${queryKey}`
  const [lastResetKey, setLastResetKey] = useState(resetKey)
  if (remote && resetKey !== lastResetKey) {
    setLastResetKey(resetKey)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
    setMobilePage(1)
  }
  const [reload, setReload] = useState(0)
  const [server, setServer] = useState<{
    rows: T[]
    total: number
    loading: boolean
    error: string | null
  }>({ rows: [], total: 0, loading: remote, error: null })
  const page = isMobile ? mobilePage : pagination.pageIndex + 1
  const size = (isMobile ? pageSize : pagination.pageSize) || TABLE_PAGE_SIZE
  // No mobile com "carregar mais", cada página nova soma às anteriores.
  const append = isMobile && mobilePagination === 'loadMore' && page > 1

  useEffect(() => {
    if (!source) return
    const controller = new AbortController()
    setServer((s) => ({ ...s, loading: true, error: null }))
    const [sortId, sortDir] = sortKey.split(':')
    source({
      page,
      pageSize: size,
      search,
      sort: sortId ? { id: sortId, desc: sortDir === 'desc' } : null,
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return
        setServer((s) => ({
          rows: append ? [...s.rows, ...res.rows] : res.rows,
          total: res.total,
          loading: false,
          error: null,
        }))
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        setServer((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : 'Erro ao carregar os dados.',
        }))
      })
    return () => controller.abort()
  }, [source, page, size, search, sortKey, queryKey, reload, append])

  const data = remote ? server.rows : (dataProp ?? [])

  const defs = useMemo<ColumnDef<typeof tableFeatureSet, T & RowData>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        accessorFn: (row: T & RowData) => {
          const v = c.accessor(row)
          return v instanceof Date ? v.getTime() : v
        },
        enableSorting: sortable && c.sortable !== false,
        enableHiding: c.hideable !== false,
        sortFn:
          c.kind === 'number' || c.kind === 'currency' || c.kind === 'date'
            ? 'basic'
            : 'alphanumeric',
      })),
    [columns, sortable],
  )

  const table = useTable({
    features: tableFeatureSet,
    data: data as (T & RowData)[],
    columns: defs,
    getRowId: (r) => getRowId(r),
    state: {
      sorting,
      rowSelection,
      columnVisibility: visibility,
      globalFilter,
      expanded,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setVisibility,
    onExpandedChange: (u) =>
      setExpanded((prev) =>
        typeof u === 'function'
          ? (u(prev) as Record<string, boolean>)
          : (u as Record<string, boolean>),
      ),
    onPaginationChange: setPagination,
    enableRowSelection: Boolean(selectable),
    getRowCanExpand: () => Boolean(expandable),
    globalFilterFn: 'includesString',
    // Os quatro modelos ficam sempre registrados (features é constante de módulo); a
    // alternância local ou remoto é só pelas flags manual* e por rowCount, como na v8.
    manualSorting: remote,
    manualFiltering: remote,
    // Mobile fatia as linhas na mão (rows, mais abaixo); sem pageSize não pagina.
    manualPagination: remote || !pageSize || isMobile,
    ...(remote ? { rowCount: server.total } : { autoResetPageIndex: true }),
  })

  const colById = (id: string) => columns.find((c) => c.id === id)!
  const visibleCols = table.getVisibleLeafColumns().map((c) => colById(c.id))
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original)
  const clearSelection = () => setRowSelection({})
  const bulkMenuButton =
    bulkMenu && bulkMenu.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" iconOnly aria-label="Mais ações para os selecionados">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {bulkMenu.map((a) => (
            <DropdownMenuItem
              key={a.label}
              destructive={a.destructive}
              onSelect={() => a.onClick(selectedRows, clearSelection)}
            >
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null
  const filteredCount = remote ? server.total : table.getFilteredRowModel().rows.length
  const allRows = table.getRowModel().rows
  const isLoading = Boolean(loading) || (remote && server.loading && !append)
  const loadError = error ?? (remote ? server.error : null)
  const retry = onRetry ?? (remote ? () => setReload((n) => n + 1) : undefined)
  const rows =
    !isMobile || !pageSize || remote
      ? allRows
      : mobilePagination === 'loadMore'
        ? allRows.slice(0, mobilePage * pageSize)
        : allRows.slice((mobilePage - 1) * pageSize, mobilePage * pageSize)
  const pad = densityRow[density]

  /* ---------------- barra de ferramentas */
  const hideableCols = columns.filter((c) => c.hideable !== false)
  const sortControl =
    isMobile && sortable ? (
      <Select
        label="Ordenar por"
        placeholder="Ordem padrão"
        clearable
        value={sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : null}
        onChange={(v) => {
          if (!v) return setSorting([])
          const [id, dir] = v.split(':')
          setSorting([{ id: id ?? '', desc: dir === 'desc' }])
        }}
        options={columns
          .filter((c) => c.sortable !== false)
          .flatMap((c) => [
            { value: `${c.id}:asc`, label: `${c.header} (crescente)` },
            { value: `${c.id}:desc`, label: `${c.header} (decrescente)` },
          ])}
      />
    ) : undefined

  const selectionBar =
    selectable && selectedRows.length > 0 ? (
      <>
        <span className="text-sm font-medium tabular-nums">
          {selectedRows.length} {selectedRows.length === 1 ? 'selecionado' : 'selecionados'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {bulkActions?.(selectedRows, clearSelection)}
          {bulkMenuButton}
        </div>
        <Button variant="ghost" className="ml-auto" onClick={clearSelection}>
          Limpar seleção
        </Button>
      </>
    ) : undefined

  const showToolbar = toolbar || columnVisibility || (isMobile && sortable)

  /* ---------------- estados */
  const state = (() => {
    if (loadError)
      return (
        <EmptyState
          type="error"
          size="compact"
          title="Não foi possível carregar"
          description={loadError}
          actions={
            retry && (
              <Button variant="outline" icon={<RotateCw />} onClick={retry}>
                Tentar de novo
              </Button>
            )
          }
        />
      )
    if (!isLoading && filteredCount === 0)
      return (
        <EmptyState
          size="compact"
          title={globalFilter ? 'Nenhum resultado' : (empty?.title ?? 'Nada por aqui ainda')}
          description={
            globalFilter ? 'Tente outros termos ou limpe os filtros.' : empty?.description
          }
          actions={!globalFilter && empty?.action}
        />
      )
    return null
  })()

  /* ---------------- mobile: cards */
  const mobileBody = () => {
    const primary = visibleCols.filter((c) => (c.mobile ?? 'secondary') === 'primary').slice(0, 3)
    const secondary = visibleCols.filter((c) => (c.mobile ?? 'secondary') === 'secondary')
    if (isLoading)
      return (
        <ul className="flex flex-col divide-y">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex flex-col gap-3 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </li>
          ))}
        </ul>
      )
    return (
      <ul className="flex flex-col divide-y">
        {rows.map((r, index) => {
          const row = r.original
          const [title, ...others] = primary
          return (
            <CardItem
              key={r.id}
              className={cn('flex flex-col gap-3 p-4', r.getIsSelected() && 'bg-primary-soft/50')}
              {...rowEnter(index)}
            >
              <div className="flex items-start gap-3">
                {selectable && (
                  <Checkbox
                    checked={r.getIsSelected()}
                    onCheckedChange={(v) => r.toggleSelected(v)}
                    aria-label="Selecionar linha"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {title && (
                    <span className="line-clamp-2 text-base font-semibold">
                      <CellContent col={title} row={row} title />
                    </span>
                  )}
                  {others.map((c) => (
                    <span
                      key={c.id}
                      className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="sr-only">{c.header}: </span>
                      <CellContent col={c} row={row} />
                    </span>
                  ))}
                </div>
              </div>
              {(secondary.length > 0 || expandable) && (
                <MobileDetails>
                  <dl className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                    {secondary.map((c) => (
                      <div key={c.id} className="flex flex-col gap-1">
                        <dt className="text-xs text-muted-foreground">{c.header}</dt>
                        <dd className="text-sm">
                          <CellContent col={c} row={row} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {expandable && <div className="pt-3">{expandable(row)}</div>}
                </MobileDetails>
              )}
              {rowActions && rowActions.length > 0 && (
                <div className="border-t pt-3">
                  <RowActions row={row} actions={rowActions} mobile />
                </div>
              )}
            </CardItem>
          )
        })}
      </ul>
    )
  }

  /* ---------------- desktop: tabela */
  const desktopBody = () => (
    <div className="scrollbar-subtle overflow-x-auto" data-allow-overflow>
      <table className="w-full border-collapse text-sm" aria-label={aria['aria-label']}>
        <thead className="border-b bg-muted/50">
          <tr>
            {selectable && (
              <th scope="col" className="w-12 pr-2 pl-4">
                <Checkbox
                  aria-label="Selecionar todas as linhas da página"
                  checked={
                    table.getIsAllPageRowsSelected()
                      ? true
                      : table.getIsSomePageRowsSelected()
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(v) => table.toggleAllPageRowsSelected(v)}
                />
              </th>
            )}
            {expandable && <th scope="col" className="w-12" aria-label="Expandir" />}
            {table.getVisibleLeafColumns().map((tc) => {
              const c = colById(tc.id)
              const sorted = tc.getIsSorted()
              const align = alignOf(c)
              return (
                <th
                  key={tc.id}
                  scope="col"
                  aria-sort={
                    sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                  }
                  className={cn(
                    'px-4 py-3 text-xs font-medium whitespace-nowrap text-muted-foreground',
                    align === 'right'
                      ? 'text-right'
                      : align === 'center'
                        ? 'text-center'
                        : 'text-left',
                    c.width && minWidth[c.width],
                  )}
                >
                  {tc.getCanSort() ? (
                    <button
                      type="button"
                      onClick={tc.getToggleSortingHandler()}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1 rounded-item hover:text-foreground',
                        align === 'right' && 'flex-row-reverse',
                        sorted && 'text-foreground',
                      )}
                    >
                      {c.header}
                      {sorted === 'asc' ? (
                        <ArrowUp className="size-3" aria-hidden />
                      ) : sorted === 'desc' ? (
                        <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" aria-hidden />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
            {rowActions && (
              <th
                scope="col"
                className="sticky right-0 w-24 bg-muted px-4 text-right text-xs font-medium text-muted-foreground"
              >
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {isLoading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {selectable && (
                    <td className="pr-2 pl-4">
                      <Skeleton className="size-icon-md" />
                    </td>
                  )}
                  {expandable && <td />}
                  {visibleCols.map((c) => (
                    <td key={c.id} className={cn('px-4', pad)}>
                      <Skeleton
                        className={cn('h-3', alignOf(c) === 'right' ? 'ml-auto w-16' : 'w-3/4')}
                      />
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4">
                      <Skeleton className="ml-auto h-6 w-16" />
                    </td>
                  )}
                </tr>
              ))
            : rows.map((r, index) => {
                const row = r.original
                return (
                  <Fragment key={r.id}>
                    <RowItem
                      data-state={r.getIsSelected() ? 'selected' : undefined}
                      className="group/row transition-colors hover:bg-muted/40 data-[state=selected]:bg-primary-soft/60"
                      {...rowEnter(index)}
                    >
                      {selectable && (
                        <td className="pr-2 pl-4">
                          <Checkbox
                            aria-label="Selecionar linha"
                            checked={r.getIsSelected()}
                            onCheckedChange={(v) => r.toggleSelected(v)}
                          />
                        </td>
                      )}
                      {expandable && (
                        <td className="px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={r.getIsExpanded() ? 'Recolher linha' : 'Expandir linha'}
                            aria-expanded={r.getIsExpanded()}
                            onClick={() => r.toggleExpanded()}
                          >
                            <ChevronDown
                              className={cn(
                                'transition-transform',
                                r.getIsExpanded() && 'rotate-180',
                              )}
                            />
                          </Button>
                        </td>
                      )}
                      {visibleCols.map((c) => {
                        const align = alignOf(c)
                        return (
                          <td
                            key={c.id}
                            className={cn(
                              'px-4 align-middle',
                              pad,
                              align === 'right'
                                ? 'text-right tabular-nums'
                                : align === 'center'
                                  ? 'text-center'
                                  : 'text-left',
                              c.width && minWidth[c.width],
                            )}
                          >
                            <div
                              className={cn(clamp[c.lines ?? 2], align === 'right' && 'ml-auto')}
                            >
                              <CellContent col={c} row={row} />
                            </div>
                          </td>
                        )
                      })}
                      {rowActions && (
                        <td className="sticky right-0 w-24 bg-card px-4 group-hover/row:bg-muted group-data-[state=selected]/row:bg-primary-soft">
                          <RowActions row={row} actions={rowActions} />
                        </td>
                      )}
                    </RowItem>
                    {expandable && !on && r.getIsExpanded() && (
                      <tr className="bg-muted/30">
                        <td
                          colSpan={
                            visibleCols.length + (selectable ? 1 : 0) + 1 + (rowActions ? 1 : 0)
                          }
                          className="px-4 py-4"
                        >
                          {expandable(row)}
                        </td>
                      </tr>
                    )}
                    {expandable && on && (
                      <AnimatePresence initial={false}>
                        {r.getIsExpanded() && (
                          <tr key="expanded" className="bg-muted/30">
                            <td
                              colSpan={
                                visibleCols.length + (selectable ? 1 : 0) + 1 + (rowActions ? 1 : 0)
                              }
                              className="px-4"
                            >
                              <m.div
                                className="overflow-hidden"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={presets.fade.transition}
                              >
                                <div className="py-4">{expandable(row)}</div>
                              </m.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    )}
                  </Fragment>
                )
              })}
        </tbody>
      </table>
    </div>
  )

  const total = filteredCount
  return (
    <Card
      data-rendra="TAB-001"
      className="overflow-hidden"
      aria-busy={isLoading || server.loading || undefined}
      // Marca a carga remota (os testes esperam a primeira página chegar).
      data-remote-loading={(remote && server.loading) || undefined}
    >
      {showToolbar && (
        <DataToolbar
          {...toolbar}
          sort={sortControl}
          selectionBar={selectionBar}
          columns={
            columnVisibility
              ? hideableCols.map((c) => ({
                  id: c.id,
                  label: c.header,
                  visible: table.getColumn(c.id)?.getIsVisible() ?? true,
                  onToggle: (v) => table.getColumn(c.id)?.toggleVisibility(v),
                }))
              : undefined
          }
        />
      )}

      {state ?? (isMobile ? mobileBody() : desktopBody())}

      {pageSize && !state && (!isLoading || remote) && total > 0 && (
        <div className="flex justify-end border-t p-4">
          <Pagination
            className="w-full"
            page={isMobile ? mobilePage : pagination.pageIndex + 1}
            pageSize={isMobile ? pageSize : pagination.pageSize}
            total={total}
            mobileMode={mobilePagination}
            loading={remote && server.loading}
            onPageChange={(p) =>
              isMobile ? setMobilePage(p) : setPagination((s) => ({ ...s, pageIndex: p - 1 }))
            }
            onPageSizeChange={(s) => setPagination({ pageIndex: 0, pageSize: s })}
          />
        </div>
      )}

      {/* Mobile: ações em massa em barra fixa no rodapé da tela */}
      {isMobile && selectable && selectedRows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t bg-card px-4 pt-3 pb-safe shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium tabular-nums">
              {selectedRows.length} {selectedRows.length === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Limpar
            </Button>
          </div>
          <div className={cn('grid gap-3', bulkMenuButton ? 'grid-actions-3' : 'grid-cols-2')}>
            {bulkMenuButton}
            {bulkActions?.(selectedRows, clearSelection)}
          </div>
        </div>
      )}
    </Card>
  )
}
