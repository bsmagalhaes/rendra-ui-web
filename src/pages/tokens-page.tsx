import { RotateCw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useBrand, type FeedbackType } from '@/brand'
import { Container, Grid, Inline, PageHeader, Stack } from '@/components/layout'
import { Alert } from '@/components/ui/alert'
import { BrandLogo } from '@/components/ui/brand-logo'
import { Button } from '@/components/ui/button'
import { BrandFeedbackIcon, feedbackLabels } from '@/components/ui/brand-feedback-icon'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/cn'
import { contrastRatio, readVar } from '@/lib/contrast'
import { shapeLabels } from '@/lib/shape'

/* Página provisória da Etapa 1. Na Etapa 5 vira a seção "Fundamentos" de /componentes. */

// ---------------------------------------------------------------- utilidades locais

/** Reavalia medições depois que a marca, o modo ou a largura mudam. */
function useThemeTick() {
  const { brand, resolvedMode } = useBrand()
  const { current } = useBreakpoint()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setTick((t) => t + 1))
    return () => cancelAnimationFrame(id)
  }, [brand.id, resolvedMode, current])
  return tick
}

function formatRatio(r: number) {
  return r.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function RatioChip({ fg, bg, min = 4.5 }: { fg: string; bg: string; min?: number }) {
  const tick = useThemeTick()
  const [ratio, setRatio] = useState<number | null>(null)
  useEffect(() => {
    setRatio(contrastRatio(readVar(fg), readVar(bg)))
  }, [fg, bg, tick])
  if (ratio === null) return null
  const pass = ratio >= min
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums',
        pass ? 'bg-card/90 text-foreground' : 'bg-destructive text-destructive-foreground',
      )}
    >
      {formatRatio(ratio)}:1 {pass ? (min < 4.5 ? 'AA ui' : 'AA') : 'falha'}
    </span>
  )
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-t`} className="text-xl">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn('rounded-surface border bg-card p-4 text-card-foreground md:p-6', className)}
    >
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-control border bg-muted p-1"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.icon ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-item px-3 text-sm font-medium transition-colors md:min-h-0 md:min-w-0 md:py-2',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-card hover:text-foreground',
            )}
          >
            {o.icon}
            <span className={cn(o.icon && 'sr-only md:not-sr-only')}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- dados das seções

const semantic = [
  {
    name: 'primary',
    title: 'Primária',
    fill: 'bg-primary text-primary-foreground',
    soft: 'bg-primary-soft text-primary-soft-foreground',
  },
  {
    name: 'destructive',
    title: 'Destrutiva',
    fill: 'bg-destructive text-destructive-foreground',
    soft: 'bg-destructive-soft text-destructive-soft-foreground',
  },
  {
    name: 'success',
    title: 'Sucesso',
    fill: 'bg-success text-success-foreground',
    soft: 'bg-success-soft text-success-soft-foreground',
  },
  {
    name: 'warning',
    title: 'Atenção',
    fill: 'bg-warning text-warning-foreground',
    soft: 'bg-warning-soft text-warning-soft-foreground',
  },
  {
    name: 'info',
    title: 'Informação',
    fill: 'bg-info text-info-foreground',
    soft: 'bg-info-soft text-info-soft-foreground',
  },
] as const

const statusExtra = [
  {
    name: 'critical-soft',
    title: 'Crítico (fundo do card do Kanban)',
    swatch: 'bg-critical-soft text-critical-soft-foreground',
  },
  {
    name: 'warning-mid',
    title: 'Vence hoje (calendário do Kanban)',
    swatch: 'bg-warning-mid text-warning-mid-foreground',
  },
] as const

const neutrals = [
  {
    token: 'background',
    swatch: 'bg-background',
    fg: '--rendra-foreground',
    note: 'Fundo da aplicação',
  },
  {
    token: 'card',
    swatch: 'bg-card',
    fg: '--rendra-card-foreground',
    note: 'Superfície de conteúdo',
  },
  {
    token: 'muted',
    swatch: 'bg-muted',
    fg: '--rendra-muted-foreground',
    note: 'Apoio e texto secundário',
  },
  {
    token: 'secondary',
    swatch: 'bg-secondary',
    fg: '--rendra-secondary-foreground',
    note: 'Botão secundário',
  },
  {
    token: 'accent',
    swatch: 'bg-accent',
    fg: '--rendra-accent-foreground',
    note: 'Hover e item ativo',
  },
  {
    token: 'popover',
    swatch: 'bg-popover',
    fg: '--rendra-popover-foreground',
    note: 'Menus e painéis',
  },
] as const

const typeScale = [
  { token: 'text-3xl', cls: 'text-3xl font-semibold', sample: 'Título de página' },
  { token: 'text-2xl', cls: 'text-2xl font-semibold', sample: 'Título de seção' },
  { token: 'text-xl', cls: 'text-xl font-semibold', sample: 'Título de card' },
  { token: 'text-lg', cls: 'text-lg font-medium', sample: 'Subtítulo e destaque' },
  {
    token: 'text-base',
    cls: 'text-base',
    sample: 'Texto corrido confortável, com leitura tranquila em telas pequenas e grandes.',
  },
  { token: 'text-sm', cls: 'text-sm', sample: 'Rótulos, tabelas e texto de apoio.' },
  { token: 'text-xs', cls: 'text-xs text-muted-foreground', sample: 'Legendas e metadados' },
] as const

const spacing = [
  { step: '1', cls: 'w-1' },
  { step: '2', cls: 'w-2' },
  { step: '3', cls: 'w-3' },
  { step: '4', cls: 'w-4' },
  { step: '6', cls: 'w-6' },
  { step: '8', cls: 'w-8' },
  { step: '12', cls: 'w-12' },
  { step: '16', cls: 'w-16' },
  { step: '24', cls: 'w-24' },
] as const

const radii = [
  { token: 'rounded-item', cls: 'rounded-item', use: 'Itens de menu e lista' },
  { token: 'rounded-control', cls: 'rounded-control', use: 'Botão, input, alert' },
  { token: 'rounded-surface', cls: 'rounded-surface', use: 'Card, drawer, modal' },
  { token: 'rounded-avatar', cls: 'rounded-avatar', use: 'Avatares' },
] as const

const shadows = [
  { token: 'shadow-sm', cls: 'shadow-sm', use: 'Controle ativo, segmentado' },
  { token: 'shadow-md', cls: 'shadow-md', use: 'Popover, dropdown' },
  { token: 'shadow-lg', cls: 'shadow-lg', use: 'Drawer, modal' },
] as const

const controls = [
  { token: 'h-control-sm', cls: 'h-control-sm' },
  { token: 'h-control-md', cls: 'h-control-md' },
  { token: 'h-control-lg', cls: 'h-control-lg' },
] as const

const feedbackTypes: FeedbackType[] = ['success', 'error', 'warning', 'info']
const feedbackTitle: Record<FeedbackType, string> = {
  success: 'Cadastro salvo',
  error: 'Falha ao salvar',
  warning: 'Alterações pendentes',
  info: 'Exportação em andamento',
}

const brandColors = [
  {
    name: 'primary',
    title: 'Primária',
    variant: 'primary',
    base: 'bg-primary text-primary-foreground',
    hover: 'bg-primary-hover text-primary-hover-foreground',
  },
  {
    name: 'secondary',
    title: 'Secundária',
    variant: 'secondary',
    base: 'bg-secondary text-secondary-foreground',
    hover: 'bg-secondary-hover text-secondary-hover-foreground',
  },
] as const
const feedbackSample: Record<FeedbackType, string> = {
  success: 'O cliente já aparece na listagem.',
  error: 'Verifique a conexão e tente de novo.',
  warning: 'Salve antes de sair desta tela.',
  info: 'O arquivo chega por e-mail em instantes.',
}

// ---------------------------------------------------------------- medições

function Measured({ cls, children }: { cls: string; children: (px: string) => ReactNode }) {
  const tick = useThemeTick()
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState('')
  useEffect(() => {
    if (ref.current) setValue(getComputedStyle(ref.current).height)
  }, [tick])
  return (
    <>
      <span ref={ref} aria-hidden className={cn('invisible absolute', cls)} />
      {children(value.replace('px', ''))}
    </>
  )
}

function TypeRow({ token, cls, sample }: (typeof typeScale)[number]) {
  const tick = useThemeTick()
  const ref = useRef<HTMLParagraphElement>(null)
  const [meta, setMeta] = useState('')
  useEffect(() => {
    if (!ref.current) return
    const s = getComputedStyle(ref.current)
    setMeta(`${parseFloat(s.fontSize)}/${parseFloat(s.lineHeight)}px`)
  }, [tick])
  return (
    <li className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 md:flex-row md:items-baseline md:gap-6">
      <div className="flex shrink-0 items-baseline gap-2 md:w-3xs">
        <code className="font-mono text-xs text-foreground">{token}</code>
        <span className="text-xs text-muted-foreground tabular-nums">{meta}</span>
      </div>
      <p ref={ref} className={cls}>
        {sample}
      </p>
    </li>
  )
}

// ---------------------------------------------------------------- página

export function TokensPage() {
  const { brand, brands, setBrandId, palette, palettes, setPaletteId } = useBrand()
  const { isMobile } = useBreakpoint()
  const [replay, setReplay] = useState(0)

  return (
    <Container padded>
      <Stack gap="section">
        <PageHeader
          title="Tokens e identidade"
          description="Cores, tipografia, espaço, formato, degradê, sombra e densidade que todos os componentes usam. Troque o template: nenhum componente muda."
        />
        <Panel className="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
          <Stack gap="2">
            <span className="text-sm font-medium">Modelo</span>
            <Segmented
              label="Modelo"
              value={brand.id}
              onChange={setBrandId}
              options={brands.map((b) => ({
                value: b.id,
                label: b.productName.replace('Rendra ', ''),
              }))}
            />
          </Stack>
          <Stack gap="2">
            <span className="text-sm font-medium">Paleta de cores</span>
            <Segmented
              label="Paleta de cores"
              value={palette.id}
              onChange={(v) => setPaletteId(v === brand.id ? null : v)}
              options={palettes.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Stack>
          <p className="text-sm text-muted-foreground md:ml-auto">
            O modelo define fonte, símbolo e formato; a paleta define as cores. Combine qualquer
            modelo com qualquer paleta. {brand.productName} usa o formato{' '}
            <strong className="font-medium text-foreground">
              {shapeLabels[brand.shape].toLowerCase()}
            </strong>
            , aplicado a todos os componentes.
          </p>
        </Panel>

        <Section
          id="marca"
          title="Cores da marca"
          description="Todo template define primária, secundária e a cor de hover de cada uma. Passe o mouse nos botões: a cor muda para a de hover."
        >
          <Grid cols={{ base: 1, md: 2 }}>
            {brandColors.map((c) => (
              <Panel key={c.name} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 overflow-hidden rounded-control border">
                  <div className={cn('flex flex-col items-start gap-4 p-4', c.base)}>
                    <span className="text-sm font-medium">{c.title}</span>
                    <RatioChip fg={`--rendra-${c.name}-foreground`} bg={`--rendra-${c.name}`} />
                  </div>
                  <div className={cn('flex flex-col items-start gap-4 p-4', c.hover)}>
                    <span className="text-sm font-medium">Hover</span>
                    <RatioChip
                      fg={`--rendra-${c.name}-hover-foreground`}
                      bg={`--rendra-${c.name}-hover`}
                    />
                  </div>
                </div>
                <Inline gap="3">
                  <Button variant={c.variant} icon={<Sparkles />}>
                    Passe o mouse
                  </Button>
                  <Button variant={c.variant} loading>
                    Salvando
                  </Button>
                  <Button variant={c.variant} disabled>
                    Desabilitado
                  </Button>
                </Inline>
              </Panel>
            ))}
          </Grid>
          <Panel>
            <Inline gap="3">
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destrutivo</Button>
              <Button variant="link">Link</Button>
            </Inline>
          </Panel>
        </Section>

        <Section
          id="degrades"
          title="Degradês"
          description="Três degradês por template, cada um com lugar certo. No máximo um degradê forte por tela, nunca em botão, input ou fundo de texto corrido, e o ponto de luz nunca atrás do texto."
        >
          <Grid cols={{ base: 1, md: 3 }}>
            <div className="flex min-h-chart-sm flex-col justify-end gap-1 rounded-surface bg-gradient-brand p-6 text-gradient-brand-foreground">
              <code className="font-mono text-xs opacity-80">gradient-brand</code>
              <span className="text-lg font-semibold">Forte</span>
              <span className="text-sm opacity-90">Sidebar, painel do login, tela de erro.</span>
            </div>
            <div className="flex min-h-chart-sm flex-col justify-end gap-1 rounded-surface border bg-gradient-soft p-6">
              <code className="font-mono text-xs text-muted-foreground">gradient-soft</code>
              <span className="text-lg font-semibold">Suave</span>
              <span className="text-sm text-muted-foreground">
                Destaque de superfície, StatCard principal.
              </span>
            </div>
            <Panel className="flex min-h-chart-sm flex-col justify-end gap-4">
              <div className="h-2 w-full rounded-full bg-gradient-accent" />
              <div className="h-1 w-2/3 rounded-full bg-gradient-accent" />
              <Stack gap="1">
                <code className="font-mono text-xs text-muted-foreground">gradient-accent</code>
                <span className="text-lg font-semibold">Detalhe</span>
                <span className="text-sm text-muted-foreground">
                  Progresso, borda de destaque, linha de gráfico. Sem texto por cima.
                </span>
              </Stack>
            </Panel>
          </Grid>
        </Section>

        <Section
          id="cores"
          title="Cores semânticas"
          description="Cada semântica tem preenchimento forte e fundo suave, cada um com a cor de texto própria. O selo mostra o contraste real medido agora, no tema e modo ativos."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {semantic.map((s) => (
              <div key={s.name} className="overflow-hidden rounded-surface border bg-card">
                <div className={cn('flex flex-col gap-6 p-4', s.fill)}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{s.title}</span>
                    <RatioChip fg={`--rendra-${s.name}-foreground`} bg={`--rendra-${s.name}`} />
                  </div>
                  <span className="text-2xl font-semibold">Aa</span>
                </div>
                <div className={cn('flex items-center justify-between gap-2 p-4', s.soft)}>
                  <span className="text-sm font-medium">Suave</span>
                  <RatioChip
                    fg={`--rendra-${s.name}-soft-foreground`}
                    bg={`--rendra-${s.name}-soft`}
                  />
                </div>
                {s.name === 'primary' && (
                  <div className="flex items-center justify-between gap-2 border-t p-4">
                    <span className="text-sm font-medium text-primary-text">Como texto</span>
                    <RatioChip fg="--rendra-primary-text" bg="--rendra-card" />
                  </div>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 border-t p-4 font-mono text-xs text-muted-foreground">
                  <span>{s.name}</span>
                  {s.name === 'primary' && <span>primary-text</span>}
                  <span>{s.name}-foreground</span>
                  <span>{s.name}-soft</span>
                  <span>{s.name}-soft-foreground</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="status-kanban"
          title="Status do Kanban"
          description="Dois tons de apoio ao status do card, cada um com a cor de texto própria e o contraste medido agora."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statusExtra.map((s) => (
              <div key={s.name} className="overflow-hidden rounded-surface border bg-card">
                <div className={cn('flex items-center justify-between gap-2 p-4', s.swatch)}>
                  <span className="text-sm font-medium">{s.title}</span>
                  <RatioChip fg={`--rendra-${s.name}-foreground`} bg={`--rendra-${s.name}`} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 border-t p-4 font-mono text-xs text-muted-foreground">
                  <span>{s.name}</span>
                  <span>{s.name}-foreground</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="neutros"
          title="Neutros e superfícies"
          description="Fundo, superfície e borda com diferença perceptível entre si. A borda de input segue o mínimo de 3:1 para componentes de interface."
        >
          <Panel>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {neutrals.map((n) => (
                <li key={n.token} className="flex items-center gap-3">
                  <span className={cn('size-12 shrink-0 rounded-control border', n.swatch)} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-xs">{n.token}</code>
                      <RatioChip fg={n.fg} bg={`--rendra-${n.token}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{n.note}</span>
                  </div>
                </li>
              ))}
              <li className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-card">
                  <span className="h-px w-8 bg-border" />
                </span>
                <div className="flex flex-col gap-1">
                  <code className="font-mono text-xs">border</code>
                  <span className="text-xs text-muted-foreground">Divisões e contorno de card</span>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="size-12 shrink-0 rounded-control border border-input bg-card" />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs">input</code>
                    <RatioChip fg="--rendra-input" bg="--rendra-card" min={3} />
                  </div>
                  <span className="text-xs text-muted-foreground">Contorno de campos</span>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="size-12 shrink-0 rounded-control border-2 border-ring bg-card" />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs">ring</code>
                    <RatioChip fg="--rendra-ring" bg="--rendra-background" min={3} />
                  </div>
                  <span className="text-xs text-muted-foreground">Foco visível</span>
                </div>
              </li>
            </ul>
          </Panel>
        </Section>

        <Section
          id="navegacao"
          title="Superfície de navegação"
          description="A sidebar tem tokens próprios: cada marca decide se ela é escura, clara ou em gradiente."
        >
          <div className="flex flex-col gap-1 rounded-surface bg-sidebar-brand p-3 text-sidebar-foreground">
            <div className="flex items-center gap-3 px-3 pb-3">
              <BrandLogo on="sidebar" />
            </div>
            <span className="px-3 py-2 text-xs font-medium tracking-wide text-sidebar-muted-foreground uppercase">
              Operação
            </span>
            <span className="relative rounded-item bg-sidebar-active px-3 py-2 text-sm font-medium text-sidebar-active-foreground">
              <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-sidebar-indicator" />
              Painel
            </span>
            <span className="rounded-item px-3 py-2 text-sm text-sidebar-foreground">Clientes</span>
            <span className="rounded-item bg-sidebar-accent px-3 py-2 text-sm text-sidebar-foreground">
              Contratos (hover)
            </span>
          </div>
        </Section>

        <Section
          id="tipografia"
          title="Tipografia"
          description={`Sete tamanhos, três pesos. Os títulos encolhem no mobile e ganham tracking levemente negativo. Medidas atuais em ${isMobile ? 'tela mobile' : 'tela desktop'}.`}
        >
          <Panel>
            <ul className="flex flex-col divide-y">
              {typeScale.map((t) => (
                <TypeRow key={t.token} {...t} />
              ))}
            </ul>
          </Panel>
          <Panel className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ['font-normal', '400', 'Texto corrido'],
                ['font-medium', '500', 'Rótulos e botões'],
                ['font-semibold', '600', 'Títulos'],
              ] as const
            ).map(([cls, w, use]) => (
              <div key={cls} className="flex flex-col gap-1">
                <span className={cn('text-2xl', cls)}>Operação</span>
                <span className="text-xs text-muted-foreground">
                  <code className="font-mono">{cls}</code> · {w} · {use}
                </span>
              </div>
            ))}
          </Panel>
        </Section>

        <Section
          id="espaco"
          title="Espaçamento"
          description="Base de 4px. Só estes degraus existem: classes fora da escala não são geradas. Dentro de componentes use de 2 a 6; entre seções, de 8 a 16."
        >
          <Panel>
            <ul className="flex flex-col gap-3">
              {spacing.map((s) => (
                <li key={s.step} className="flex items-center gap-4">
                  <code className="w-12 shrink-0 font-mono text-xs">{s.step}</code>
                  <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {Number(s.step) * 4}px
                  </span>
                  <span className={cn('h-3 rounded-sm bg-primary', s.cls)} />
                </li>
              ))}
            </ul>
          </Panel>
        </Section>

        <div className="grid gap-12 md:gap-16 lg:grid-cols-2 lg:gap-8">
          <Section
            id="raio"
            title="Raio"
            description="Um token base (--rendra-radius) e derivados. Mudar o base arredonda o sistema inteiro."
          >
            <Panel className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {radii.map((r) => (
                <div key={r.token} className="flex flex-col gap-2">
                  <span className={cn('h-16 border-2 border-primary bg-primary-soft', r.cls)} />
                  <code className="font-mono text-xs">{r.token}</code>
                  <span className="text-xs text-muted-foreground">{r.use}</span>
                </div>
              ))}
            </Panel>
          </Section>

          <Section
            id="sombra"
            title="Sombra"
            description="Três níveis, sutis. Superfícies de página usam borda de 1px; sombra só no que flutua."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {shadows.map((s) => (
                <div
                  key={s.token}
                  className={cn('flex flex-col gap-1 rounded-surface border bg-card p-4', s.cls)}
                >
                  <code className="font-mono text-xs">{s.token}</code>
                  <span className="text-xs text-muted-foreground">{s.use}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section
          id="densidade"
          title="Densidade"
          description="Input, botão e select compartilham a mesma altura em cada tamanho. No mobile tudo fica com no mínimo 44px de área de toque; a partir de 768px os controles compactam."
        >
          <Panel className="grid gap-4 sm:grid-cols-3">
            {controls.map((c) => (
              <Measured key={c.token} cls={c.cls}>
                {(px) => (
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        'flex items-center justify-between rounded-control border border-input bg-card px-3 text-base md:text-sm',
                        c.cls,
                      )}
                    >
                      <span className="text-muted-foreground">Campo</span>
                      <span className="font-medium tabular-nums">{px}px</span>
                    </div>
                    <code className="font-mono text-xs">{c.token}</code>
                  </div>
                )}
              </Measured>
            ))}
          </Panel>
        </Section>

        <Section
          id="feedback"
          title="Ícones de feedback da marca"
          description="O símbolo da marca em currentColor, tingido pela cor semântica e com selo de status, para o significado não depender só da cor. Cada tipo pode ser trocado por um SVG próprio no brand.config.ts."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {feedbackTypes.map((t) => (
              <Panel key={t} className="flex flex-col gap-4">
                <div className="flex items-end gap-4">
                  <BrandFeedbackIcon type={t} size="sm" />
                  <BrandFeedbackIcon type={t} size="md" />
                  <BrandFeedbackIcon type={t} size="lg" />
                  <BrandFeedbackIcon
                    key={replay}
                    type={t}
                    size="xl"
                    animated
                    label={feedbackLabels[t]}
                  />
                  <span className="ml-auto text-sm font-medium">{feedbackLabels[t]}</span>
                </div>
              </Panel>
            ))}
          </div>
        </Section>

        <Section
          id="alertas"
          title="Alert"
          description="Um único componente: ícone à esquerda, título em negrito e descrição, cada um uma prop. O formato segue o template ativo."
        >
          <div>
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCw />}
              onClick={() => setReplay((r) => r + 1)}
            >
              Repetir animação
            </Button>
          </div>
          <Grid cols={{ base: 1, lg: 2 }}>
            {feedbackTypes.map((t) => (
              <Alert
                key={`${t}-${replay}`}
                type={t}
                title={feedbackTitle[t]}
                description={feedbackSample[t]}
                animated
              />
            ))}
          </Grid>
        </Section>
      </Stack>
    </Container>
  )
}
