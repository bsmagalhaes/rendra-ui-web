import {
  ConnectionLineType,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useReactFlow,
  useStore,
  type AriaLabelConfig,
  type Edge,
  type FitViewOptions,
  type Node,
  type NodeProps,
  type ReactFlowProps,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import {
  Clock,
  Flag,
  GitBranch,
  Maximize2,
  Play,
  SquarePen,
  TriangleAlert,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Button } from '@/components/ui/button'
import { useFillHeight } from '@/hooks/use-fill-height'
import { cn } from '@/lib/cn'
import {
  FLOW_TYPE_NAME,
  formatWait,
  nodeName,
  type Flow,
  type FlowIssue,
  type FlowNodeType,
} from '@/lib/flow'
import { useMotionLib, useMotionPresets } from '@/lib/motion'

/*
 * Canvas de fluxos de automação (React Flow, MIT). Este arquivo tem o que o FlowViewer e o
 * FlowEditor dividem: o desenho dos cinco tipos de bloco, a conversão do `Flow` do Rendra para
 * os nós e ligações da biblioteca, o tema (as variáveis --xy-* apontam para os tokens do Rendra),
 * o zoom próprio de 44 px e os textos de acessibilidade em português.
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
  /** Alças grandes (montar com mouse ou toque) ou discretas (só ver). */
  handles: 'lg' | 'sm'
  /** Mostra o botão "Editar bloco" dentro do bloco. */
  edit: boolean
}

export type FlowRfNode = Node<FlowBlockData, 'bloco'>

export const FLOW_ICON: Record<FlowNodeType, ComponentType<{ className?: string }>> = {
  gatilho: Zap,
  acao: Play,
  condicao: GitBranch,
  espera: Clock,
  fim: Flag,
}

const TONE: Record<FlowNodeType, string> = {
  gatilho: 'bg-primary-soft text-primary-soft-foreground',
  acao: 'bg-info-soft text-info-soft-foreground',
  condicao: 'bg-warning-soft text-warning-soft-foreground',
  espera: 'bg-muted text-muted-foreground',
  fim: 'bg-success-soft text-success-soft-foreground',
}

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
  handles: 'lg' | 'sm'
  edit: boolean
}

/** Os blocos do Rendra como nós do React Flow (a biblioteca só vê isto). */
export function toRfNodes(flow: Flow, opts: RfNodeOptions): FlowRfNode[] {
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
      handles: opts.handles,
      edit: opts.edit,
    },
  }))
}

/** As ligações do Rendra como arestas do React Flow, com a descrição em português. */
export function toRfEdges(flow: Flow): Edge[] {
  const labelOf = new Map(flow.nodes.map((n) => [n.id, nodeName(n)]))
  return flow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.branch ? { sourceHandle: e.branch } : {}),
    ariaLabel: `De "${labelOf.get(e.source) ?? e.source}" para "${labelOf.get(e.target) ?? e.target}"${
      e.branch ? `, se ${e.branch === 'sim' ? 'sim' : 'não'}` : ''
    }`,
    domAttributes: { 'aria-roledescription': 'ligação' },
  }))
}

function FlowBlock({ id, data, selected, isConnectable }: NodeProps<FlowRfNode>) {
  const lib = useMotionLib()
  const presets = useMotionPresets()
  const uid = useId()
  const Icon = FLOW_ICON[data.kind]
  const wait = data.kind === 'espera' ? formatWait(data.config) : null
  const invalid = data.issues.length > 0
  const issueId = `${uid}-problema`
  const handle = cn(
    'rounded-full border-2 border-card',
    data.handles === 'lg' ? 'size-6' : 'size-2',
  )
  const ring = 'pointer-events-none absolute -inset-1 rounded-block border-2 border-primary'
  return (
    <div
      data-flow-node
      data-kind={data.kind}
      data-block-id={id}
      data-active={data.active ? 'true' : undefined}
      data-invalid={invalid ? 'true' : undefined}
      data-selected={selected ? 'true' : undefined}
      aria-describedby={invalid ? issueId : undefined}
      className={cn(
        'relative w-flow-node rounded-block border bg-card p-3 text-card-foreground shadow-sm',
        data.kind === 'condicao' && 'pr-12 pb-8',
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
      {data.kind !== 'gatilho' && (
        <Handle
          type="target"
          position={Position.Top}
          className={handle}
          isConnectable={isConnectable}
        />
      )}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-block',
            TONE[data.kind],
          )}
        >
          <Icon className="size-icon-md" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground">{FLOW_TYPE_NAME[data.kind]}</span>
          <span className="text-sm font-medium break-words">{data.label}</span>
          {wait && <span className="text-xs text-muted-foreground">{wait}</span>}
          {data.active && <span className="text-xs font-medium text-primary-text">Ativo</span>}
        </div>
        {data.edit && (
          <Button
            data-flow-edit
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Editar bloco ${nodeName({ type: data.kind, data })}`}
            className="nodrag nopan -mt-1 -mr-1 min-h-touch min-w-touch shrink-0"
            icon={<SquarePen />}
          />
        )}
      </div>
      {invalid && (
        <p
          id={issueId}
          className="mt-2 flex flex-wrap gap-x-1 rounded-block bg-destructive-soft p-2 text-xs text-destructive-soft-foreground"
        >
          <TriangleAlert className="size-icon-sm shrink-0" aria-hidden />
          <strong>Problema</strong> {data.issues.join(' ')}
        </p>
      )}
      {data.kind === 'condicao' && (
        <>
          <span className="absolute inset-y-0 right-4 flex items-center text-xs font-medium">
            Sim
          </span>
          <span className="absolute inset-x-0 bottom-3 text-center text-xs font-medium">Não</span>
          <Handle
            id="sim"
            type="source"
            position={Position.Right}
            className={handle}
            isConnectable={isConnectable}
          />
          <Handle
            id="nao"
            type="source"
            position={Position.Bottom}
            className={handle}
            isConnectable={isConnectable}
          />
        </>
      )}
      {data.kind !== 'condicao' && data.kind !== 'fim' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={handle}
          isConnectable={isConnectable}
        />
      )}
    </div>
  )
}

const nodeTypes = { bloco: FlowBlock }

const defaultEdgeOptions = { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }
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

/** Enquadra de novo quando a largura do canvas muda (painel do teste abrindo, janela redimensionada). */
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
}

/**
 * O canvas: contêiner com a altura que sobra na tela (`h-board`), tema pelos tokens e a
 * biblioteca por dentro. A rolagem horizontal é do canvas (`data-allow-overflow`), nunca da página.
 */
export function FlowSurface({ className, children, ...props }: FlowSurfaceProps) {
  const ref = useFillHeight<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-allow-overflow
      className={cn(
        'flow-surface relative h-board min-h-viewer w-full min-w-0 overflow-hidden rounded-surface border',
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
        defaultEdgeOptions={defaultEdgeOptions}
        defaultMarkerColor="var(--rendra-muted-foreground)"
        connectionLineType={ConnectionLineType.SmoothStep}
        ariaLabelConfig={FLOW_ARIA}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.25}
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
  /** O fluxo a mostrar (o mesmo JSON do FlowEditor). */
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
  const nodes = useMemo(
    () => toRfNodes(value, { activeId, issues, handles: 'sm', edit: false }),
    [value, activeId, issues],
  )
  const edges = useMemo(() => toRfEdges(value), [value])
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
