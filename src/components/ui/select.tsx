import { Command } from 'cmdk'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/cn'
import {
  controlAdornmentButton,
  controlAdornmentSpace,
  controlFrame,
  type ControlSize,
} from '@/lib/control'
import { PickerPanel } from './picker-panel'

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
  /** Agrupa opções sob um título. */
  group?: string
}

interface BaseProps {
  options?: SelectOption[]
  placeholder?: string
  /**
   * Nome do campo: título do painel no mobile e, quando o Select não está dentro de um
   * Field (sem id ligado a um rótulo visível), nome acessível do gatilho.
   */
  label?: string
  size?: ControlSize
  invalid?: boolean
  disabled?: boolean
  /** Campo de busca no topo da lista. */
  searchable?: boolean
  /** Permite criar uma opção nova a partir do texto buscado. */
  creatable?: boolean
  onCreate?: (label: string) => SelectOption | Promise<SelectOption>
  /** Busca remota: recebe o texto e devolve as opções. Liga a busca automaticamente. */
  loadOptions?: (query: string) => Promise<SelectOption[]>
  /** Mostra indicador de carregamento na lista. */
  loading?: boolean
  /** Botão de limpar no campo. */
  clearable?: boolean
  emptyText?: string
  id?: string
  className?: string
  'aria-describedby'?: string
}

/** Acima deste número de opções, o "Selecionar todos" aparece sem a prop `selectAll`. */
const SELECT_ALL_AUTO_MIN = 5

interface SingleProps extends BaseProps {
  multiple?: false
  value?: string | null
  onChange?: (value: string | null) => void
  selectAll?: never
  showCount?: never
  maxChips?: never
}

interface MultipleProps extends BaseProps {
  /** Seleção múltipla com checkbox e chips. */
  multiple: true
  value?: string[]
  onChange?: (value: string[]) => void
  /**
   * Linha "Selecionar todos" no topo da lista (vira "Desmarcar todos" com tudo marcado).
   * Padrão: aparece sozinha com mais de 5 opções; `false` desliga, `true` força com 5 ou menos.
   */
  selectAll?: boolean
  /** Mostra "3 selecionados" no lugar dos chips. */
  showCount?: boolean
  /** Máximo de chips visíveis antes de "+N". */
  maxChips?: number
}

export type SelectProps = SingleProps | MultipleProps

/**
 * Select único do sistema. Busca, múltiplo, selecionar todos, contador, criar opção,
 * busca remota e carregamento são props. No mobile abre como bottom sheet.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(props, ref) {
  const {
    options: staticOptions = [],
    placeholder = 'Selecione',
    label,
    size,
    invalid,
    disabled,
    searchable,
    creatable,
    onCreate,
    loadOptions,
    loading,
    clearable,
    emptyText = 'Nenhuma opção encontrada.',
    id,
    className,
  } = props
  const multiple = props.multiple === true
  const { isMobile } = useBreakpoint()
  const [open, setOpen] = useState(false)
  const listId = `${useId()}-lista`
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<SelectOption[] | null>(null)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [created, setCreated] = useState<SelectOption[]>([])
  const [innerSingle, setInnerSingle] = useState<string | null>(null)
  const [innerMulti, setInnerMulti] = useState<string[]>([])
  // No mobile, o múltiplo só aplica ao confirmar.
  const [draft, setDraft] = useState<string[]>([])

  const selectedSingle = multiple ? null : ((props as SingleProps).value ?? innerSingle)
  const selectedMulti = multiple ? ((props as MultipleProps).value ?? innerMulti) : []

  // Busca remota com espera curta entre teclas.
  const seq = useRef(0)
  useEffect(() => {
    if (!loadOptions || !open) return
    const n = ++seq.current
    setRemoteLoading(true)
    const t = window.setTimeout(async () => {
      const res = await loadOptions(query)
      if (n === seq.current) {
        setRemote(res)
        setRemoteLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [loadOptions, query, open])

  const all = useMemo(() => {
    const base = remote ?? staticOptions
    const map = new Map<string, SelectOption>()
    ;[...base, ...created].forEach((o) => map.set(o.value, o))
    return [...map.values()]
  }, [remote, staticOptions, created])

  const byValue = (v: string) => all.find((o) => o.value === v)
  const isSearchable = searchable || creatable || Boolean(loadOptions)
  const busy = loading || remoteLoading
  const multiValue = isMobile && multiple ? draft : selectedMulti

  const commitSingle = (v: string | null) => {
    setInnerSingle(v)
    ;(props as SingleProps).onChange?.(v)
  }
  const commitMulti = (v: string[]) => {
    setInnerMulti(v)
    ;(props as MultipleProps).onChange?.(v)
  }

  const toggle = (v: string) => {
    if (!multiple) {
      commitSingle(v)
      setOpen(false)
      return
    }
    const next = multiValue.includes(v) ? multiValue.filter((x) => x !== v) : [...multiValue, v]
    if (isMobile) setDraft(next)
    else commitMulti(next)
  }

  const enabled = all.filter((o) => !o.disabled)
  const allSelected = enabled.length > 0 && enabled.every((o) => multiValue.includes(o.value))
  const showSelectAll =
    multiple && ((props as MultipleProps).selectAll ?? all.length > SELECT_ALL_AUTO_MIN)
  const toggleAll = () => {
    const next = allSelected ? [] : enabled.map((o) => o.value)
    if (isMobile) setDraft(next)
    else commitMulti(next)
  }

  const create = async () => {
    const text = query.trim()
    if (!text) return
    const opt = onCreate ? await onCreate(text) : { value: text, label: text }
    setCreated((c) => [...c, opt])
    setQuery('')
    toggle(opt.value)
  }

  const onOpenChange = (o: boolean) => {
    setOpen(o)
    if (o) setDraft(selectedMulti)
    else setQuery('')
  }

  // ------------------------------------------------ gatilho
  const hasValue = multiple ? selectedMulti.length > 0 : selectedSingle != null
  const maxChips = (props as MultipleProps).maxChips ?? 2
  let display: ReactNode = <span className="truncate text-muted-foreground">{placeholder}</span>
  if (!multiple && selectedSingle != null) {
    const o = byValue(selectedSingle)
    display = (
      <span className="flex min-w-0 items-center gap-2">
        {o?.icon}
        <span className="truncate">{o?.label ?? selectedSingle}</span>
      </span>
    )
  } else if (multiple && selectedMulti.length > 0) {
    display = (props as MultipleProps).showCount ? (
      <span className="truncate">
        {selectedMulti.length} {selectedMulti.length === 1 ? 'selecionado' : 'selecionados'}
      </span>
    ) : (
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        {selectedMulti.slice(0, maxChips).map((v) => (
          <span
            key={v}
            className="max-w-3xs shrink-0 truncate rounded-item bg-primary-soft px-2 py-1 text-xs leading-none font-medium text-primary-soft-foreground"
          >
            {byValue(v)?.label ?? v}
          </span>
        ))}
        {selectedMulti.length > maxChips && (
          <span className="shrink-0 rounded-item bg-muted px-2 py-1 text-xs leading-none font-medium">
            +{selectedMulti.length - maxChips}
          </span>
        )}
      </span>
    )
  }

  const showClear = clearable && hasValue && !disabled
  const clear = showClear ? (
    <button
      type="button"
      aria-label="Limpar seleção"
      className={cn(
        controlAdornmentButton,
        'absolute top-1/2 right-8 mr-0 -translate-y-1/2 md:mr-0',
      )}
      onClick={() => (multiple ? commitMulti([]) : commitSingle(null))}
    >
      <X aria-hidden />
    </button>
  ) : undefined

  const trigger = (
    <button
      ref={ref}
      id={id}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-haspopup="listbox"
      aria-invalid={invalid || undefined}
      aria-describedby={props['aria-describedby']}
      aria-label={id ? undefined : label}
      disabled={disabled}
      data-rendra="SEL-001"
      // Teclas no gatilho não chegam à lista (Enter não seleciona opção com o painel fechado).
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        controlFrame({ size, invalid }),
        'cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center">{display}</span>
      {showClear && <span aria-hidden className={cn(controlAdornmentSpace, '-mr-1')} />}
      <ChevronDown
        aria-hidden
        className={cn(
          'size-icon-sm shrink-0 text-muted-foreground transition-transform duration-(--rendra-duration-base) ease-move',
          open && 'rotate-180',
        )}
      />
    </button>
  )

  // ------------------------------------------------ lista
  const groups = all.reduce<Record<string, SelectOption[]>>((acc, o) => {
    ;(acc[o.group ?? ''] ??= []).push(o)
    return acc
  }, {})
  const q = query.trim().toLowerCase()
  const showCreate = creatable && q && !all.some((o) => o.label.toLowerCase() === q)

  const itemClass =
    'relative flex min-h-touch cursor-pointer items-center gap-3 rounded-item px-3 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent md:min-h-0 md:py-2'

  const checkbox = (checked: boolean) => (
    <span
      aria-hidden
      className={cn(
        'flex size-icon-sm shrink-0 items-center justify-center rounded-item border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </span>
  )

  const list = (
    <Command.List id={listId} aria-label={label ?? placeholder}>
      {busy && (
        <Command.Loading>
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Spinner size="sm" />
            Carregando opções...
          </div>
        </Command.Loading>
      )}
      {!busy && (
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </Command.Empty>
      )}
      {showCreate && (
        <Command.Item value={`__criar__${query}`} onSelect={create} className={itemClass}>
          <Plus className="size-icon-sm shrink-0 text-primary-text" aria-hidden />
          <span className="truncate">
            Criar <strong className="font-semibold">“{query.trim()}”</strong>
          </span>
        </Command.Item>
      )}
      {showSelectAll && !q && enabled.length > 0 && (
        <Command.Item
          value="__todos__"
          onSelect={toggleAll}
          className={cn(itemClass, 'font-medium')}
        >
          {checkbox(allSelected)}
          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </Command.Item>
      )}
      {Object.entries(groups).map(([group, opts]) => (
        <Command.Group
          key={group || 'sem-grupo'}
          heading={group || undefined}
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          {opts.map((o) => {
            const checked = multiple ? multiValue.includes(o.value) : selectedSingle === o.value
            return (
              <Command.Item
                key={o.value}
                value={`${o.label} ${o.description ?? ''} ${o.value}`}
                disabled={o.disabled}
                onSelect={() => toggle(o.value)}
                aria-selected={checked}
                className={itemClass}
              >
                {multiple && checkbox(checked)}
                {o.icon && <span className="flex shrink-0 [&_svg]:size-icon-sm">{o.icon}</span>}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn('truncate', checked && !multiple && 'font-medium')}>
                    {o.label}
                  </span>
                  {o.description && (
                    <span className="truncate text-xs text-muted-foreground">{o.description}</span>
                  )}
                </span>
                {!multiple && checked && (
                  <Check className="size-icon-sm shrink-0 text-primary-text" aria-hidden />
                )}
              </Command.Item>
            )
          })}
        </Command.Group>
      ))}
    </Command.List>
  )

  const search = isSearchable ? (
    <div className={cn(controlFrame({ size: 'md' }), 'bg-background')}>
      <Search className="size-icon-sm shrink-0 text-muted-foreground" aria-hidden />
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder={creatable ? 'Buscar ou criar...' : 'Buscar...'}
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  ) : null

  const count = multiValue.length
  const footer =
    multiple && (isMobile || count > 0) ? (
      <div className="grid grid-actions-2 gap-3">
        <Button
          variant="outline"
          onClick={() => (isMobile ? setDraft([]) : commitMulti([]))}
          disabled={count === 0}
        >
          Limpar
        </Button>
        {isMobile ? (
          <Button
            onClick={() => {
              commitMulti(draft)
              setOpen(false)
            }}
          >
            Aplicar{count ? ` (${count})` : ''}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Pronto ({count})
          </Button>
        )}
      </div>
    ) : undefined

  return (
    <Command shouldFilter={!loadOptions} loop className="contents" label={label ?? placeholder}>
      <PickerPanel
        open={open}
        onOpenChange={onOpenChange}
        trigger={trigger}
        adornment={clear}
        title={label ?? placeholder}
        header={search}
        footer={footer}
      >
        {list}
      </PickerPanel>
    </Command>
  )
})
