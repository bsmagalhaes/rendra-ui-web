import {
  BaseEdge,
  ConnectionLineType,
  EdgeLabelRenderer,
  Handle,
  getBezierPath,
  MarkerType,
  Position,
  ReactFlow,
  useReactFlow,
  useStore,
  type AriaLabelConfig,
  type Edge,
  type EdgeProps,
  type FitViewOptions,
  type Node,
  type NodeProps,
  type ReactFlowProps,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import {
  CalendarClock,
  CheckCircle2,
  Cog,
  Flag,
  GitBranch,
  Hourglass,
  Mail,
  MessageCircle,
  Maximize2,
  Play,
  Send,
  SquarePen,
  Trash2,
  TriangleAlert,
  UserPlus,
  Webhook,
  Zap,
  ZoomIn,
  ZoomOut,
  ListChecks,
} from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Button } from '@/components/ui/button'
import { useFillHeight } from '@/hooks/use-fill-height'
import { cn } from '@/lib/cn'
import {
  FLOW_BLOCKS,
  FLOW_TYPE_NAME,
  branchName,
  edgeLabel,
  rulesOf,
  ruleSummary,
  splitVariables,
  summarizeConfig,
  type FlowBlockGroupId,
} from '@/lib/flow-blocks'
import { migrateFlow, nodeName, type Flow, type FlowIssue, type FlowNodeType } from '@/lib/flow'
import { useMotionLib, useMotionPresets } from '@/lib/motion'

/*
 * Canvas de fluxos de automação (React Flow, MIT). Este arquivo tem o que o FlowViewer e o
 * FlowEditor dividem: o card do bloco, a ligação pontilhada animada, a conversão do `Flow` do
 * Rendra para os nós e ligações da biblioteca, o tema (as variáveis --xy-* apontam para os tokens
 * do Rendra), o zoom próprio de 44 px e os textos de acessibilidade em português.
 *
 * FlowViewer é só leitura: ver, aproximar, afastar e mover o canvas. O que muda o fluxo é do
 * FlowEditor. Fica fora da entrada principal (@rendra-ui/web/flow), porque depende de @xyflow/react.
 */

export interface FlowBlockData extends Record<string, unknown> {
  label: string
  kind: FlowNodeType
  config?: Record<string, unknown>
  /** Mensagens de validação deste bloco; vazio quando está tudo certo. */
  issues: string[]
  /** Bloco que a simulação executa agora. */
  active: boolean
}

export type FlowRfNode = Node<FlowBlockData, 'bloco'>

/** O que o card e a ligação podem pedir ao editor. No viewer não há nada (contexto nulo). */
export interface FlowActions {
  play: (id: string) => void
  edit?: (id: string) => void
  remove?: (id: string) => void
  /** Só com montagem liberada: a lixeira da ligação selecionada. */
  removeEdge?: (id: string) => void
}

export const FlowActionsContext = createContext<FlowActions | null>(null)

/** Raio de atração das alças em px: menor que o padrão da biblioteca (20), para não ligar sozinho. */
export const CONNECTION_RADIUS = 12

export const FLOW_ICON: Record<FlowNodeType, ComponentType<{ className?: string }>> = {
  'webhook-entrada': Webhook,
  agendamento: CalendarClock,
  'registro-criado': UserPlus,
  whatsapp: MessageCircle,
  email: Mail,
  condicao: GitBranch,
  espera: Hourglass,
  'webhook-saida': Send,
  tarefa: ListChecks,
  gatilho: Zap,
  acao: Cog,
  fim: Flag,
}

const TONE: Record<FlowBlockGroupId, string> = {
  gatilhos: 'bg-primary-soft text-primary-soft-foreground',
  mensagens: 'bg-success-soft text-success-soft-foreground',
  condicionais: 'bg-warning-soft text-warning-soft-foreground',
  integracoes: 'bg-info-soft text-info-soft-foreground',
  acoes: 'bg-muted text-muted-foreground',
}

/** Cor do ícone do bloco, por grupo (também usada na barra de blocos). */
export const flowTone = (type: FlowNodeType) => TONE[FLOW_BLOCKS[type].group]

const DIRECTION: Record<string, string> = {
  up: 'para cima',
  down: 'para baixo',
  left: 'para a esquerda',
  right: 'para a direita',
}

/** Os textos que a biblioteca escreve no DOM (leitor de tela), em português. */
export const FLOW_ARIA: Partial<AriaLabelConfig> = {
  'node.a11yDescription.default':
    'Pressione Enter para abrir o bloco, Espaço para selecioná-lo e Delete para apagá-lo. Esc cancela.',
  'node.a11yDescription.keyboardDisabled':
    'Pressione Enter para abrir o bloco, Espaço para selecioná-lo e Delete para apagá-lo. Esc cancela.',
  'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) =>
    `Bloco movido ${DIRECTION[direction] ?? direction}. Nova posição, x: ${x}, y: ${y}`,
  'edge.a11yDescription.default':
    'Pressione Espaço para selecionar a ligação e Delete para apagá-la. Esc cancela.',
}

interface RfNodeOptions {
  activeId?: string | null
  issues?: FlowIssue[]
}

/** Os blocos do Rendra como nós do React Flow (a biblioteca só vê isto). */
export function toRfNodes(flow: Flow, opts: RfNodeOptions = {}): FlowRfNode[] {
  const byNode = new Map<string, string[]>()
  for (const issue of opts.issues ?? [])
    if (issue.nodeId) byNode.set(issue.nodeId, [...(byNode.get(issue.nodeId) ?? []), issue.message])
  return flow.nodes.map((n) => ({
    id: n.id,
    type: 'bloco',
    position: n.position,
    ariaLabel: n.data.label,
    domAttributes: { 'aria-roledescription': 'bloco' },
    data: {
      label: n.data.label,
      kind: n.type,
      ...(n.data.config ? { config: n.data.config } : {}),
      issues: byNode.get(n.id) ?? [],
      active: opts.activeId === n.id,
    },
  }))
}

export interface FlowEdgeData extends Record<string, unknown> {
  /** Rótulo da regra na ligação ("> 500", "Senão"); `null` fora da condição. */
  label: string | null
  from: string
  to: string
}

/** As ligações do Rendra como arestas do React Flow, com a descrição em português. */
export function toRfEdges(flow: Flow): Edge<FlowEdgeData>[] {
  const nameOf = new Map(flow.nodes.map((n) => [n.id, nodeName(n)]))
  return flow.edges.map((e) => {
    const label = edgeLabel(flow, e)
    const from = nameOf.get(e.source) ?? e.source
    const to = nameOf.get(e.target) ?? e.target
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'ligacao',
      animated: true,
      ...(e.branch ? { sourceHandle: e.branch } : {}),
      ariaLabel: `De "${from}" para "${to}"${label ? `, se ${label}` : ''}`,
      domAttributes: { 'aria-roledescription': 'ligação' },
      data: { label, from, to },
    }
  })
}

/* --------------------------------------------------------------------------- card */

function Port({
  type,
  id,
  isConnectable,
  position = type === 'target' ? Position.Left : Position.Right,
}: {
  type: 'source' | 'target'
  id?: string
  isConnectable: boolean
  position?: Position
}) {
  // O Handle é o alvo de 44 px (transparente); o ponto de 12 px é um filho que não recebe toque.
  return (
    <Handle
      id={id}
      type={type}
      position={position}
      className="size-touch"
      isConnectable={isConnectable}
    >
      <span
        aria-hidden
        data-flow-dot
        className="pointer-events-none absolute inset-0 m-auto size-3 rounded-full border-2 border-card bg-primary"
      />
    </Handle>
  )
}

function Value({ text }: { text: string }) {
  if (!text) return <span className="text-xs text-muted-foreground">Não definido</span>
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs break-words">
      {splitVariables(text).map((part, i) =>
        part.kind === 'var' ? (
          <span
            key={i}
            data-flow-chip
            className="rounded-item bg-primary-soft px-2 py-1 text-primary-soft-foreground"
          >{`{{${part.value}}}`}</span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  )
}

function FlowBlock({ id, data, selected, isConnectable }: NodeProps<FlowRfNode>) {
  const lib = useMotionLib()
  const presets = useMotionPresets()
  const actions = useContext(FlowActionsContext)
  const uid = useId()
  const Icon = FLOW_ICON[data.kind]
  const def = FLOW_BLOCKS[data.kind]
  const shape = { type: data.kind, data: { label: data.label, config: data.config } }
  const name = nodeName(shape)
  const summary = summarizeConfig(shape)
  const rules = data.kind === 'condicao' ? rulesOf(shape) : []
  const received = data.kind === 'webhook-entrada' && data.config?.received === true
  const invalid = data.issues.length > 0
  const issueId = `${uid}-problema`
  const descId = `${uid}-descricao`
  const ring = 'pointer-events-none absolute -inset-1 rounded-block border-2 border-primary'
  const action = 'nodrag nopan min-h-touch min-w-touch'
  return (
    <div
      data-flow-node
      data-kind={data.kind}
      data-block-id={id}
      data-active={data.active ? 'true' : undefined}
      data-invalid={invalid ? 'true' : undefined}
      data-selected={selected ? 'true' : undefined}
      aria-describedby={invalid ? `${descId} ${issueId}` : descId}
      className={cn(
        'relative w-flow-node rounded-block border bg-card text-card-foreground shadow-sm',
        invalid && 'border-destructive',
        data.active && 'border-primary',
        selected && 'ring-2 ring-primary',
      )}
    >
      {data.active &&
        (lib ? (
          <lib.m.span
            aria-hidden
            data-flow-pulse
            className={ring}
            animate={presets.reduced ? { opacity: 1 } : { opacity: [1, 0.3, 1] }}
            transition={
              presets.reduced
                ? presets.fade.transition
                : {
                    duration: presets.tokens.duration.pulse,
                    ease: presets.tokens.ease.inOut,
                    repeat: Infinity,
                  }
            }
          />
        ) : (
          <span aria-hidden className={ring} />
        ))}
      {!(def.group === 'gatilhos') && <Port type="target" isConnectable={isConnectable} />}
      <div className="flex items-start gap-3 p-3 pb-2">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-block',
            flowTone(data.kind),
          )}
        >
          <Icon className="size-icon-md" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span data-flow-title className="truncate text-sm font-medium" title={name}>
            {name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {data.active ? 'Ativo' : FLOW_TYPE_NAME[data.kind]}
          </span>
        </div>
        {actions && (
          <div className="-mt-3 -mr-3 flex shrink-0">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Executar bloco ${name}`}
              className={action}
              icon={<Play />}
              onClick={() => actions.play(id)}
            />
            {actions.edit && (
              <Button
                data-flow-edit
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Editar bloco ${name}`}
                className={action}
                icon={<SquarePen />}
                onClick={() => actions.edit?.(id)}
              />
            )}
            {actions.remove && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Excluir bloco ${name}`}
                className={action}
                icon={<Trash2 />}
                onClick={() => actions.remove?.(id)}
              />
            )}
          </div>
        )}
      </div>
      <p id={descId} className="px-3 pb-3 text-xs text-muted-foreground">
        {def.description}
      </p>
      {summary.length > 0 && (
        <dl className="flex flex-col gap-2 border-t p-3">
          {summary.map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd>
                <Value text={row.value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {received && (
        <p className="mx-3 mb-3 flex items-center gap-2 rounded-block bg-success-soft p-2 text-xs text-success-soft-foreground">
          <CheckCircle2 className="size-icon-sm shrink-0" aria-hidden />
          Dados de exemplo recebidos
        </p>
      )}
      {data.kind === 'condicao' && (
        <div className="flex flex-col border-t">
          {rules.map((rule) => (
            <div
              key={rule.id}
              data-flow-output={rule.id}
              className="relative flex min-h-touch items-center justify-between gap-2 border-b px-3 pr-4"
            >
              <span className="text-xs font-medium">{branchName(shape, rule.id)}</span>
              <span
                className="min-w-0 truncate text-xs text-muted-foreground"
                title={ruleSummary(rule)}
              >
                {ruleSummary(rule)}
              </span>
              <Port type="source" id={rule.id} isConnectable={isConnectable} />
            </div>
          ))}
          <div
            data-flow-output="senao"
            className="relative flex min-h-touch items-center justify-between gap-2 px-3 pr-4"
          >
            <span className="text-xs font-medium">Senão</span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              Nenhuma regra bateu
            </span>
            <Port type="source" id="senao" isConnectable={isConnectable} />
          </div>
        </div>
      )}
      {invalid && (
        <p
          id={issueId}
          className="m-3 mt-0 flex flex-wrap gap-x-1 rounded-block bg-destructive-soft p-2 text-xs text-destructive-soft-foreground"
        >
          <TriangleAlert className="size-icon-sm shrink-0" aria-hidden />
          <strong>Problema</strong> {data.issues.join(' ')}
        </p>
      )}
      {data.kind !== 'condicao' && <Port type="source" isConnectable={isConnectable} />}
    </div>
  )
}

/* ------------------------------------------------------------------------ ligação */

/** Ponto da curva de Bézier de uma ligação (t entre 0 e 1), com os mesmos controles da biblioteca. */
function bezierAt(sx: number, sy: number, tx: number, ty: number, t: number) {
  const d = tx - sx
  const offset = d >= 0 ? 0.5 * d : 0.25 * 25 * Math.sqrt(-d)
  const mt = 1 - t
  const x =
    mt ** 3 * sx + 3 * mt ** 2 * t * (sx + offset) + 3 * mt * t ** 2 * (tx - offset) + t ** 3 * tx
  const y = mt ** 3 * sy + 3 * mt ** 2 * t * sy + 3 * mt * t ** 2 * ty + t ** 3 * ty
  return { x, y }
}

function FlowLink({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<Edge<FlowEdgeData>>) {
  const actions = useContext(FlowActionsContext)
  const [confirming, setConfirming] = useState(false)
  const noRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (confirming) noRef.current?.focus()
  }, [confirming])
  const [path, midX, midY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const start = bezierAt(sourceX, sourceY, targetX, targetY, 0.18)
  const showTrash = Boolean(selected && actions?.removeEdge)
  const names = `${data?.from ?? ''} para ${data?.to ?? ''}`
  const label = data?.label
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} />
      <EdgeLabelRenderer>
        {label && (
          <div
            className="pointer-events-none absolute top-0 left-0 translate-x-(--flow-x) translate-y-(--flow-y)"
            style={{ '--flow-x': `${start.x}px`, '--flow-y': `${start.y}px` } as CSSProperties}
          >
            <span
              data-flow-edge-label
              className="block -translate-x-1/2 -translate-y-1/2 rounded-item border bg-card px-2 py-1 text-xs font-medium text-card-foreground"
            >
              {label}
            </span>
          </div>
        )}
        {showTrash && actions?.removeEdge && (
          <div
            className="pointer-events-none absolute top-0 left-0 z-50 translate-x-(--flow-x) translate-y-(--flow-y)"
            style={{ '--flow-x': `${midX}px`, '--flow-y': `${midY}px` } as CSSProperties}
          >
            <div
              data-flow-edge-actions
              role="presentation"
              className="nodrag nopan pointer-events-auto flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-control border bg-card p-1 shadow-md"
              onKeyDown={(e) => {
                if (e.key === 'Escape' && confirming) {
                  e.stopPropagation()
                  setConfirming(false)
                }
              }}
            >
              {confirming ? (
                <>
                  <span
                    role="alertdialog"
                    aria-label="Confirmar exclusão da ligação"
                    className="px-2 text-xs font-medium"
                  >
                    Excluir ligação?
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="min-h-touch"
                    onClick={() => {
                      setConfirming(false)
                      actions.removeEdge?.(id)
                    }}
                  >
                    Sim
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    ref={noRef}
                    className="min-h-touch"
                    onClick={(e) => {
                      setConfirming(false)
                      e.currentTarget.closest<HTMLElement>('.flow-surface')?.focus()
                    }}
                  >
                    Não
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  iconOnly
                  aria-label={`Excluir ligação de ${names}`}
                  className="min-h-touch min-w-touch"
                  icon={<Trash2 />}
                  onClick={() => setConfirming(true)}
                />
              )}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = { bloco: FlowBlock }
const edgeTypes = { ligacao: FlowLink }

const defaultEdgeOptions = {
  type: 'ligacao',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
}
// Folga em cima e embaixo: o zoom fica no topo e a atribuição no canto de baixo, sem cobrir blocos.
const fitViewOptions: FitViewOptions = {
  padding: { top: '64px', right: '16px', bottom: '64px', left: '16px' },
  maxZoom: 1,
}

/** Aproximar, afastar e enquadrar, com 44 px de toque (os botões da biblioteca têm 26 px). */
export function FlowZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const cls = 'min-h-touch min-w-touch'
  return (
    <div className="absolute top-2 left-2 z-10 flex gap-2">
      <Button
        variant="outline"
        size="sm"
        iconOnly
        aria-label="Aproximar"
        className={cls}
        icon={<ZoomIn />}
        onClick={() => void zoomIn()}
      />
      <Button
        variant="outline"
        size="sm"
        iconOnly
        aria-label="Afastar"
        className={cls}
        icon={<ZoomOut />}
        onClick={() => void zoomOut()}
      />
      <Button
        variant="outline"
        size="sm"
        iconOnly
        aria-label="Enquadrar"
        className={cls}
        icon={<Maximize2 />}
        onClick={() => void fitView(fitViewOptions)}
      />
    </div>
  )
}

/** Enquadra de novo quando a largura do canvas muda (painel abrindo, janela redimensionada). */
function FlowAutoFit() {
  const { fitView } = useReactFlow()
  const width = useStore((st) => st.width)
  const before = useRef(0)
  useEffect(() => {
    if (before.current > 0 && width > 0 && width !== before.current) void fitView(fitViewOptions)
    if (width > 0) before.current = width
  }, [width, fitView])
  return null
}

export interface FlowSurfaceProps extends ReactFlowProps<FlowRfNode, Edge> {
  children?: ReactNode
  /** Falso quando o contêiner de fora já dá a altura (o FlowEditor): o canvas só o preenche. */
  fill?: boolean
}

/**
 * O canvas: contêiner com a altura que sobra na tela (`h-board`), tema pelos tokens e a
 * biblioteca por dentro. A rolagem horizontal é do canvas (`data-allow-overflow`), nunca da página.
 */
export function FlowSurface({ className, children, fill = true, ...props }: FlowSurfaceProps) {
  const ref = useFillHeight<HTMLDivElement>()
  return (
    <div
      ref={fill ? ref : undefined}
      tabIndex={-1}
      data-allow-overflow
      className={cn(
        'flow-surface relative w-full min-w-0 overflow-hidden outline-none',
        fill ? 'h-board min-h-viewer rounded-surface border' : 'h-full',
        className,
      )}
      style={
        {
          '--xy-edge-stroke': 'var(--rendra-muted-foreground)',
          '--xy-edge-stroke-selected': 'var(--rendra-primary)',
          '--xy-edge-stroke-width': '2',
          '--xy-connectionline-stroke': 'var(--rendra-primary)',
          '--xy-connectionline-stroke-width': '2',
          '--xy-handle-background-color': 'var(--rendra-primary)',
          '--xy-attribution-background-color': 'var(--rendra-card)',
          '--xy-background-color': 'var(--rendra-muted)',
        } as CSSProperties
      }
    >
      <ReactFlow
        className="flow-canvas"
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultMarkerColor="var(--rendra-muted-foreground)"
        connectionLineType={ConnectionLineType.Bezier}
        connectionRadius={CONNECTION_RADIUS}
        ariaLabelConfig={FLOW_ARIA}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.1}
        maxZoom={2}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        preventScrolling={false}
        {...props}
      >
        <FlowZoomControls />
        <FlowAutoFit />
        {children}
      </ReactFlow>
    </div>
  )
}

export interface FlowViewerProps {
  /** O fluxo a mostrar (o mesmo JSON do FlowEditor; o da 2.7.0 também abre). */
  value: Flow
  /** Bloco destacado (por exemplo, o passo que a simulação está executando). */
  activeId?: string | null
  /** Problemas de validação (`validateFlow`): os blocos citados ganham marca e texto. */
  issues?: FlowIssue[]
  className?: string
}

/**
 * Fluxo de automação só para ler: aproximar, afastar e mover o canvas. Não arrasta, não liga,
 * não apaga. Para montar e editar, use o FlowEditor.
 */
export function FlowViewer({ value, activeId = null, issues, className }: FlowViewerProps) {
  const flow = useMemo(() => migrateFlow(value), [value])
  const nodes = useMemo(() => toRfNodes(flow, { activeId, issues }), [flow, activeId, issues])
  const edges = useMemo(() => toRfEdges(flow), [flow])
  return (
    <div data-rendra="FLX-002" className={cn('flow-viewer min-w-0', className)}>
      <FlowSurface
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
      />
    </div>
  )
}
