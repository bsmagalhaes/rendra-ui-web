import { ArrowDown, BarChart3, List as ListIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useId, useRef, useState, type CSSProperties } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { resolveCatalogCode } from '@/catalog/components'
import { Button } from '@/components/ui/button'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets, useRevealScope } from '@/lib/motion'
import { toCubicBezier } from '@/lib/motion/presets'

/*
 * Gráfico único do sistema. O tipo é a prop type, nunca um componente novo:
 *   line, area, bar, pie   séries sobre categorias (Recharts)
 *   combo                  barras e linhas juntas (ex.: receita em barras e meta em linha)
 *   gauge                  velocímetro de meta: valor, máximo, meta e faixas de cor
 *   funnel                 funil de etapas com a taxa de conversão entre elas
 * Cores sempre do template (--chart-1 a --chart-5). Mobile: legenda abaixo, eixos
 * simplificados, lista de valores quando há muitos pontos; o funil empilha rótulo e barra.
 */

export interface ChartSeries {
  /** Chave no objeto de dados. */
  key: string
  label: string
  /** Índice da cor do template (1 a 5). Padrão: na ordem das séries. */
  color?: 1 | 2 | 3 | 4 | 5
  /** No type="combo": desenha a série como barra (padrão) ou linha. */
  kind?: 'bar' | 'line'
}

interface BaseProps {
  valueFormatter?: (n: number) => string
  /** Altura: sm (12rem), md (16rem) ou fill (a altura do contêiner, como num widget). */
  height?: 'sm' | 'md' | 'fill'
  'aria-label': string
  className?: string
}

export interface CartesianChartProps extends BaseProps {
  type: 'line' | 'bar' | 'area' | 'pie' | 'combo'
  data: Record<string, string | number>[]
  /** Chave da categoria (eixo X ou fatias da pizza). */
  xKey: string
  series: ChartSeries[]
  /** Barras empilhadas (bar e combo). */
  stacked?: boolean
  /** Barra de uma série só com uma cor por categoria. */
  colorByCategory?: boolean
  /** Acima deste número de pontos, o mobile oferece ver como lista. */
  listThreshold?: number
}

export interface GaugeZone {
  /** Fim da faixa, de 0 a 1 do máximo. */
  to: number
  tone: 'error' | 'warning' | 'success' | 'primary' | 'neutral'
}

export interface GaugeChartProps extends BaseProps {
  type: 'gauge'
  value: number
  max: number
  min?: number
  /** Meta: marcada no arco e usada no percentual atingido. */
  target?: number
  /** Faixas de cor do arco. Padrão: vermelho até 60%, amarelo até 90%, verde até o fim. */
  zones?: GaugeZone[]
  /** Texto abaixo do valor (ex.: "Receita do mês"). */
  label?: string
}

export interface FunnelStage {
  label: string
  value: number
}

export interface FunnelChartProps extends BaseProps {
  type: 'funnel'
  stages: FunnelStage[]
}

export type ChartProps = CartesianChartProps | GaugeChartProps | FunnelChartProps

// Lê as variáveis do tema direto (as --color-* do Tailwind são inline e não existem no CSS).
const palette = [
  '--rendra-chart-1',
  '--rendra-chart-2',
  '--rendra-chart-3',
  '--rendra-chart-4',
  '--rendra-chart-5',
  '--rendra-ring',
]
const colorVar = (i: number) => `var(${palette[(i - 1) % palette.length]})`
const fmtDefault = (n: number) => n.toLocaleString('pt-BR')
const pct = (n: number) =>
  `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

export function Chart(props: ChartProps) {
  if (props.type === 'gauge') return <Gauge {...props} />
  if (props.type === 'funnel') return <Funnel {...props} />
  return <Cartesian {...props} />
}

/* ================================================================ velocímetro */

const defaultZones: GaugeZone[] = [
  { to: 0.6, tone: 'error' },
  { to: 0.9, tone: 'warning' },
  { to: 1, tone: 'success' },
]

const zoneBadge: Record<GaugeZone['tone'], string> = {
  error: 'bg-destructive-soft text-destructive-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  primary: 'bg-primary-soft text-primary-soft-foreground',
  neutral: 'bg-muted text-foreground',
}
const zoneText: Record<GaugeZone['tone'], string> = {
  error: 'Abaixo da meta',
  warning: 'Atenção',
  success: 'No verde',
  primary: 'Em andamento',
  neutral: 'Em andamento',
}

// Meio círculo (180°), da esquerda para a direita por cima, centro em (120, 120), raio 100.
const CX = 120
const CY = 120
const R = 100
const point = (frac: number, r = R) => {
  const a = Math.PI * (1 - frac)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const
}
const arc = (from: number, to: number, r = R) => {
  const [x1, y1] = point(from, r)
  const [x2, y2] = point(to, r)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

function Gauge({
  value,
  max,
  min = 0,
  target,
  zones = defaultZones,
  label,
  valueFormatter = fmtDefault,
  className,
  ...aria
}: GaugeChartProps) {
  const range = Math.max(1, max - min)
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  // Com meta, o ponteiro mostra o percentual da meta (100% = meta batida); sem meta, do máximo.
  const reached = target ? (value / target) * 100 : null
  const frac = reached !== null ? clamp(reached / 100) : clamp((value - min) / range)
  const zone = zones.find((z) => frac <= z.to) ?? zones[zones.length - 1]
  const tone = zone?.tone ?? 'primary'
  const gradientId = useId()
  const [ex, ey] = point(frac, R - 26)
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  const reveal = useRevealScope()
  const [sx, sy] = point(0, R - 26)

  return (
    <figure
      data-rendra={resolveCatalogCode('Chart', { type: 'gauge' })}
      className={cn('flex min-w-0 flex-col items-center gap-2', className)}
      aria-label={aria['aria-label']}
    >
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(frac * 100)}
        aria-valuetext={`${reached !== null ? `${pct(reached)} da meta` : valueFormatter(value)}, ${zoneText[tone]}`}
        aria-label={aria['aria-label']}
        className="w-full max-w-xs"
      >
        <svg viewBox="0 0 240 140" className="w-full" aria-hidden>
          <defs>
            {/* Degradê contínuo: vermelho, laranja, amarelo e verde */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--rendra-meter-low)" />
              <stop
                offset="38%"
                stopColor="color-mix(in oklab, var(--rendra-meter-low), var(--rendra-meter-mid))"
              />
              <stop offset="62%" stopColor="var(--rendra-meter-mid)" />
              <stop offset="100%" stopColor="var(--rendra-meter-high)" />
            </linearGradient>
          </defs>
          <path
            d={arc(0, 1)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={20}
            strokeLinecap="round"
          />
          {/* Ponteiro fino, do centro até perto do arco */}
          {on ? (
            // `on`: a agulha vai do 0% até o valor com a duração e a curva dos presets.
            <m.line
              x1={CX}
              y1={CY}
              initial={{ x2: sx, y2: sy }}
              animate={{ x2: ex, y2: ey }}
              transition={{
                duration: reveal ? presets.tokens.reveal.draw : presets.tokens.duration.draw,
                ease: presets.tokens.ease.out,
              }}
              stroke="var(--rendra-foreground)"
              strokeWidth={4}
              strokeLinecap="round"
            />
          ) : (
            // `off`: a agulha vai direto ao valor. Antes havia aqui uma transição de CSS em "all"
            // com 700 ms, que era letra morta: x2 e y2 do <line> não são propriedades de CSS (o
            // Chromium não cria transição nenhuma; provado em tests/motion.spec.ts), e "all" é
            // proibido pela linguagem de movimento.
            <line
              x1={CX}
              y1={CY}
              x2={ex}
              y2={ey}
              stroke="var(--rendra-foreground)"
              strokeWidth={4}
              strokeLinecap="round"
            />
          )}
          <circle cx={CX} cy={CY} r={9} fill="var(--rendra-foreground)" />
          <circle cx={CX} cy={CY} r={4} fill="var(--rendra-card)" />
          <text
            x={point(0)[0]}
            y={CY + 18}
            textAnchor="middle"
            fontSize={11}
            fill="var(--rendra-muted-foreground)"
          >
            0%
          </text>
          <text
            x={point(1)[0]}
            y={CY + 18}
            textAnchor="middle"
            fontSize={11}
            fill="var(--rendra-muted-foreground)"
          >
            100%
          </text>
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-3xl font-semibold tabular-nums">
          {reached !== null ? `${Math.round(reached)}%` : valueFormatter(value)}
        </span>
        {label && <span className="text-sm font-medium">{label}</span>}
        {target !== undefined && (
          <span className="flex flex-col text-sm text-muted-foreground tabular-nums">
            <span>Meta: {valueFormatter(target)}</span>
            <span>Realizado: {valueFormatter(value)}</span>
          </span>
        )}
        <span className={cn('mt-1 rounded-full px-3 py-1 text-xs font-semibold', zoneBadge[tone])}>
          {zoneText[tone]}
        </span>
      </div>
      <figcaption className="sr-only">{aria['aria-label']}</figcaption>
    </figure>
  )
}

/* ================================================================ funil */

function Funnel({ stages, valueFormatter = fmtDefault, className, ...aria }: FunnelChartProps) {
  const on = useMotionMode() === 'on'
  const presets = useMotionPresets()
  // Em `on` o contêiner do funil entra com fade.
  const Root = on ? m.figure : 'figure'
  const n = stages.length
  const top = stages[0]?.value || 1
  const last = stages[n - 1]
  // Afunila por igual, de 100% a 46% da largura, como um funil de verdade.
  const width = (i: number) => 1 - (i / Math.max(1, n)) * 0.54
  // Da primária ao sucesso, escurecido com o tom da sidebar: o texto claro passa AA.
  const fill = (i: number) => {
    const p = n > 1 ? Math.round(100 - (i / (n - 1)) * 100) : 100
    return `color-mix(in oklab, color-mix(in oklab, var(--rendra-primary) ${p}%, var(--rendra-success)) 58%, var(--rendra-sidebar))`
  }
  const rates = stages.map((s, i) => {
    const next = stages[i + 1]
    return next && s.value > 0 ? (next.value / s.value) * 100 : null
  })
  const worst = rates.reduce<number | null>(
    (w, r, i) => (r !== null && (w === null || r < (rates[w] ?? Infinity)) ? i : w),
    null,
  )

  return (
    <Root
      data-rendra={resolveCatalogCode('Chart', { type: 'funnel' })}
      className={cn('flex min-w-0 flex-col items-center', className)}
      aria-label={aria['aria-label']}
      {...(on ? presets.fade : {})}
    >
      <ol className="flex w-full flex-col items-center">
        {stages.map((s, i) => {
          const rate = rates[i]
          return (
            <li key={s.label} className="flex w-full flex-col items-center">
              <div
                className="flex h-16 w-full flex-col items-center justify-center bg-fill text-sidebar-foreground clip-trapezoid"
                style={
                  {
                    '--top': width(i).toFixed(4),
                    '--bottom': width(i + 1).toFixed(4),
                    '--fill': fill(i),
                  } as CSSProperties
                }
              >
                <span className="text-lg leading-tight font-semibold tabular-nums">
                  {valueFormatter(s.value)}
                </span>
                <span className="text-xs">{s.label}</span>
              </div>
              {rate != null && (
                <p className="flex items-center gap-1 py-1 text-xs text-muted-foreground">
                  <ArrowDown className="size-3" aria-hidden />
                  <span className="font-semibold text-foreground tabular-nums">{pct(rate)}</span>
                  <span>para a próxima etapa</span>
                  {i === worst && n > 2 && (
                    <span className="font-semibold text-destructive-soft-foreground">
                      · Maior queda
                    </span>
                  )}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      {n > 1 && last && (
        <p className="flex items-center gap-1 pt-2 text-sm text-muted-foreground">
          <ArrowDown className="size-icon-sm" aria-hidden />
          <span className="font-semibold text-foreground tabular-nums">
            {pct((last.value / top) * 100)}
          </span>
          de conversão total do funil
        </p>
      )}
      <figcaption className="sr-only">{aria['aria-label']}</figcaption>
    </Root>
  )
}

/* ================================================================ séries (Recharts) */

function Cartesian({
  type,
  data,
  xKey,
  series,
  stacked,
  colorByCategory,
  valueFormatter = fmtDefault,
  height = 'md',
  listThreshold = 8,
  className,
  ...aria
}: CartesianChartProps) {
  const { isMobile } = useBreakpoint()
  const motion = useMotionMode()
  const presets = useMotionPresets()
  const reveal = useRevealScope()
  // Gráfico é dado que o usuário lê: desenha uma vez, na primeira montagem, e rápido (`draw`,
  // 420 ms). Trocar período ou filtro não o redesenha (W11). Só dentro de um RevealScope (a
  // chegada do dashboard) o desenho dura o tempo do reveal (900 ms). O recharts aceita a curva só
  // no formato de toCubicBezier (quatro números, sem espaços). Em `off` não recebe prop nenhuma,
  // como antes.
  const [drawn, setDrawn] = useState(false)
  const ended = useRef(0)
  const animated = type === 'pie' ? 1 : series.length
  const draw =
    motion === 'on'
      ? {
          animationDuration: Math.round(
            (reveal ? presets.tokens.reveal.draw : presets.tokens.duration.draw) * 1000,
          ),
          animationEasing: toCubicBezier(presets.tokens.ease.out),
          // Só marca "desenhado" quando todas as séries terminaram, senão uma série pararia a
          // outra no meio do desenho.
          onAnimationEnd: () => {
            if (++ended.current >= animated) setDrawn(true)
          },
        }
      : {}
  const [asList, setAsList] = useState(false)
  // Anima só a entrada. Se a largura muda depois (barra de rolagem que aparece, janela
  // redimensionada), o gráfico vai direto à nova forma, sem desenhar fora do card no meio do
  // caminho. Com "reduzir movimento" no sistema, não anima.
  const [animate, setAnimate] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const firstWidth = useRef<number | null>(null)
  const onResize = (width: number) => {
    if (firstWidth.current === null) firstWidth.current = width
    else if (Math.abs(width - firstWidth.current) > 1) setAnimate(false)
  }
  const canList = isMobile && data.length > listThreshold
  const showList = canList && asList
  const colors = series.map((s, i) => colorVar(s.color ?? i + 1))

  const axis = {
    stroke: 'var(--rendra-muted-foreground)',
    fontSize: 12,
    tickLine: false,
    axisLine: false,
  }
  const tooltip = (
    <Tooltip
      cursor={{ fill: 'var(--rendra-muted)', stroke: 'var(--rendra-border)' }}
      formatter={(v) => valueFormatter(Number(v))}
      contentStyle={{
        background: 'var(--rendra-popover)',
        border: '1px solid var(--rendra-border)',
        borderRadius: 'var(--rendra-shape-control)',
        color: 'var(--rendra-popover-foreground)',
        fontSize: 12,
      }}
    />
  )
  const legend = (
    <Legend
      verticalAlign="bottom"
      iconType="circle"
      iconSize={8}
      wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
    />
  )
  const common = { data, margin: { top: 8, right: 8, left: isMobile ? -16 : 0, bottom: 0 } }
  const xAxis = (
    <XAxis dataKey={xKey} {...axis} interval="preserveStartEnd" minTickGap={isMobile ? 24 : 12} />
  )
  const yAxis = (
    <YAxis
      {...axis}
      width={isMobile ? 72 : 80}
      tickCount={isMobile ? 3 : 5}
      // Mostra todas as marcas calculadas (o padrão do Recharts some com algumas).
      interval={0}
      allowDecimals={false}
      tickFormatter={(v) => valueFormatter(Number(v))}
    />
  )
  const grid = (
    <CartesianGrid vertical={false} stroke="var(--rendra-border)" strokeDasharray="3 3" />
  )
  const bar = (s: ChartSeries, i: number, lastBar: boolean) => (
    <Bar
      key={s.key}
      dataKey={s.key}
      name={s.label}
      fill={colors[i]}
      stackId={stacked ? 'pilha' : undefined}
      // Empilhadas: só a barra de cima tem os cantos arredondados.
      radius={!stacked || lastBar ? [4, 4, 0, 0] : [0, 0, 0, 0]}
      maxBarSize={40}
      isAnimationActive={animate && !drawn}
      {...draw}
    >
      {colorByCategory && data.map((_, j) => <Cell key={j} fill={colorVar(j + 1)} />)}
    </Bar>
  )

  let chart
  if (type === 'pie') {
    const s = series[0]
    chart = (
      <PieChart>
        <Pie
          data={data}
          dataKey={s?.key ?? ''}
          nameKey={xKey}
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--rendra-card)"
          isAnimationActive={animate && !drawn}
          {...draw}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colorVar(i + 1)} />
          ))}
        </Pie>
        {tooltip}
        {legend}
      </PieChart>
    )
  } else if (type === 'bar') {
    chart = (
      <BarChart {...common}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {series.length > 1 && legend}
        {series.map((s, i) => bar(s, i, i === series.length - 1))}
      </BarChart>
    )
  } else if (type === 'combo') {
    const bars = series.filter((s) => (s.kind ?? 'bar') === 'bar')
    chart = (
      <ComposedChart {...common}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {legend}
        {series.map((s, i) =>
          (s.kind ?? 'bar') === 'bar' ? (
            bar(s, i, s.key === bars[bars.length - 1]?.key)
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[i], strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={animate && !drawn}
              {...draw}
            />
          ),
        )}
      </ComposedChart>
    )
  } else if (type === 'area') {
    chart = (
      <AreaChart {...common}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {series.length > 1 && legend}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colors[i]}
            strokeWidth={2}
            fill={`url(#area-${s.key})`}
            isAnimationActive={animate && !drawn}
            {...draw}
          />
        ))}
      </AreaChart>
    )
  } else {
    chart = (
      <LineChart {...common}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {series.length > 1 && legend}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colors[i]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={animate && !drawn}
            {...draw}
          />
        ))}
      </LineChart>
    )
  }

  return (
    <figure
      data-rendra={resolveCatalogCode('Chart', { type })}
      className={cn('flex min-w-0 flex-col gap-3', height === 'fill' && 'h-full', className)}
      aria-label={aria['aria-label']}
    >
      {canList && (
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          icon={asList ? <BarChart3 /> : <ListIcon />}
          onClick={() => setAsList((v) => !v)}
        >
          {asList ? 'Ver gráfico' : 'Ver como lista'}
        </Button>
      )}
      {showList ? (
        <ul className="flex flex-col divide-y">
          {data.map((d) => (
            <li
              key={String(d[xKey])}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{String(d[xKey])}</span>
              <span className="flex gap-3 font-medium tabular-nums">
                {series.map((s) => (
                  <span key={s.key}>{valueFormatter(Number(d[s.key]))}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={cn(
            'w-full',
            height === 'fill'
              ? 'min-h-chart-sm flex-1'
              : height === 'sm'
                ? 'h-chart-sm'
                : 'h-chart-md',
          )}
        >
          <ResponsiveContainer width="100%" height="100%" onResize={onResize}>
            {chart}
          </ResponsiveContainer>
        </div>
      )}
      <figcaption className="sr-only">{aria['aria-label']}</figcaption>
    </figure>
  )
}
