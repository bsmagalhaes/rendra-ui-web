import { Tabs as T } from 'radix-ui'
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { useLayoutReady, useMotionLib, useMotionPresets } from '@/lib/motion'

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

  const presets = useMotionPresets()
  // O indicador deslizante (layoutId) só existe com o domMax carregado: um elemento com layoutId
  // criado antes disso não ganha projeção. Até lá vale o destaque em CSS de sempre.
  const on = useLayoutReady()
  const lib = useMotionLib()

  // Em `on`, a cor do texto da aba ativa troca por clip-path: uma cópia da lista, com o texto na
  // cor de destaque, recortada só sobre a aba ativa; o recorte desliza junto com o indicador.
  // Duas cores interpoladas nunca ficam em sincronia com o indicador; um recorte, sim.
  const listRef = useRef<HTMLDivElement>(null)
  const [clip, setClip] = useState({ l: 0, r: 0 })
  useLayoutEffect(() => {
    const list = listRef.current
    if (!on || !list) return
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (!active) return
      const l = active.offsetLeft
      const r = list.offsetWidth - l - active.offsetWidth
      setClip((prev) => (prev.l === l && prev.r === r ? prev : { l, r }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [on, current, items, variant, overflow])
  // Um layoutId por instância: duas Tabs na mesma tela não trocam o indicador entre si. Não usa
  // `useId` de propósito: ele consome a sequência de ids do React e deslocaria os ids de tudo o
  // que vem depois na página, mudando o HTML do caminho `off`.
  const [indicatorId] = useState(() => `rendra-tabs-${++tabsCreated}`)

  const trigger = cn(
    'inline-flex min-h-touch shrink-0 cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 [&_svg]:size-icon-sm',
    // Em `on` o destaque da aba ativa é o indicador deslizante: a borda e o fundo em CSS saem, e
    // a cor do texto ativo vem da cópia recortada (sem `transition` de cor na aba).
    variant === 'line'
      ? on
        ? 'relative -mb-px border-b-2 border-transparent py-3 text-muted-foreground hover:text-foreground'
        : '-mb-px border-b-2 border-transparent py-3 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground'
      : on
        ? 'relative isolate rounded-item py-2 text-muted-foreground hover:bg-card/60 hover:text-foreground'
        : 'rounded-item py-2 text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
  )
  const indicator = lib && (
    <lib.m.span
      layoutId={indicatorId}
      data-indicator="tabs"
      aria-hidden
      transition={presets.move}
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
          <>
            <T.List ref={listRef} aria-label={aria['aria-label']} className={list}>
              {items.map((it) => (
                <T.Trigger
                  key={it.value}
                  value={it.value}
                  disabled={it.disabled}
                  className={trigger}
                >
                  {on && current === it.value && indicator}
                  {label(it)}
                </T.Trigger>
              ))}
            </T.List>
            {on && (
              <div
                data-tabs-copy
                aria-hidden
                className={cn(
                  list,
                  'pointer-events-none absolute inset-0 border-transparent bg-transparent text-foreground tabs-clip',
                )}
                style={{ '--tabs-l': `${clip.l}px`, '--tabs-r': `${clip.r}px` } as CSSProperties}
              >
                {items.map((it) => (
                  <span key={it.value} className={cn(trigger, 'text-foreground')}>
                    {label(it)}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {items.map((it) => (
        <T.Content key={it.value} value={it.value} className="min-w-0 outline-none">
          {/* Sem entrada animada (W4): troca de aba é frequente e vem do teclado, então o painel
              aparece direto. Quem explica a troca é o indicador. */}
          {it.content}
        </T.Content>
      ))}
    </T.Root>
  )
}
