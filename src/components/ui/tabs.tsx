import { m } from 'motion/react'
import { Tabs as T } from 'radix-ui'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

/** Contador de instâncias, só para o `layoutId` do indicador (ver `indicatorId`). */
let tabsCreated = 0

export interface TabItem {
  value: string
  label: string
  icon?: ReactNode
  /** Contador ao lado do rótulo. */
  count?: number
  disabled?: boolean
  content: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** line: sublinhado; pill: pílulas sobre fundo suave. */
  variant?: 'line' | 'pill'
  'aria-label'?: string
  className?: string
}

/**
 * Tabs único. Se as abas não couberem na largura, a mesma lista vira um Select
 * (nunca rolagem lateral). A troca é medida no próprio contêiner, não na tela.
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = 'line',
  className,
  ...aria
}: TabsProps) {
  const [inner, setInner] = useState(defaultValue ?? items[0]?.value ?? '')
  const current = value ?? inner
  const set = (v: string) => {
    setInner(v)
    onChange?.(v)
  }

  const boxRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)
  useLayoutEffect(() => {
    const box = boxRef.current
    const measure = measureRef.current
    if (!box || !measure) return
    const check = () => setOverflow(measure.scrollWidth > box.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(box)
    return () => ro.disconnect()
  }, [items, variant])

  const motion = useMotionMode()
  const presets = useMotionPresets()
  const on = motion === 'on'
  // Um layoutId por instância: duas Tabs na mesma tela não trocam o indicador entre si. Não usa
  // `useId` de propósito: ele consome a sequência de ids do React e deslocaria os ids de tudo o
  // que vem depois na página, mudando o HTML do caminho `off`.
  const [indicatorId] = useState(() => `rendra-tabs-${++tabsCreated}`)

  const trigger = cn(
    'inline-flex min-h-touch shrink-0 cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 [&_svg]:size-icon-sm',
    // Em `on` o destaque da aba ativa é o indicador deslizante: a borda e o fundo em CSS saem.
    variant === 'line'
      ? on
        ? 'relative -mb-px border-b-2 border-transparent py-3 text-muted-foreground hover:text-foreground data-[state=active]:text-foreground'
        : '-mb-px border-b-2 border-transparent py-3 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground'
      : on
        ? 'relative isolate rounded-item py-2 text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=active]:text-foreground'
        : 'rounded-item py-2 text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
  )
  const indicator = (
    <m.span
      layoutId={indicatorId}
      data-indicator="tabs"
      aria-hidden
      transition={presets.layout}
      className={
        variant === 'line'
          ? 'absolute inset-x-0 top-full border-b-2 border-primary'
          : 'absolute inset-0 -z-10 rounded-item bg-card shadow-sm'
      }
    />
  )
  const list = cn(
    'flex',
    variant === 'line' ? 'gap-2 border-b' : 'gap-1 rounded-control bg-muted p-1',
  )
  const label = (it: TabItem) => (
    <>
      {it.icon}
      {it.label}
      {it.count !== undefined && (
        <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground tabular-nums">
          {it.count}
        </span>
      )}
    </>
  )

  return (
    <T.Root
      value={current}
      onValueChange={set}
      data-rendra={resolveCatalogCode('Tabs', { variant })}
      className={cn('flex min-w-0 flex-col gap-6', className)}
    >
      <div ref={boxRef} className="relative min-w-0">
        {/* Cópia invisível só para medir a largura natural das abas */}
        <div ref={measureRef} aria-hidden className={cn(list, 'invisible absolute w-max')}>
          {items.map((it) => (
            <span key={it.value} className={trigger}>
              {label(it)}
            </span>
          ))}
        </div>
        {overflow ? (
          <Select
            label={aria['aria-label'] ?? 'Seção'}
            value={current}
            onChange={(v) => v && set(v)}
            options={items.map((it) => ({
              value: it.value,
              label: it.count !== undefined ? `${it.label} (${it.count})` : it.label,
              disabled: it.disabled,
            }))}
          />
        ) : (
          <T.List aria-label={aria['aria-label']} className={list}>
            {items.map((it) => (
              <T.Trigger key={it.value} value={it.value} disabled={it.disabled} className={trigger}>
                {on && current === it.value && indicator}
                {label(it)}
              </T.Trigger>
            ))}
          </T.List>
        )}
      </div>
      {items.map((it) => (
        <T.Content key={it.value} value={it.value} className="min-w-0 outline-none">
          {/* Sem forceMount: o Radix só monta o painel ativo, e o conteúdo novo entra animado. */}
          {on ? <m.div {...presets.slide('bottom', 'short')}>{it.content}</m.div> : it.content}
        </T.Content>
      ))}
    </T.Root>
  )
}
