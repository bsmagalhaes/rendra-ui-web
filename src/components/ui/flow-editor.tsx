import {
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
  type EdgeChange,
  type FinalConnectionState,
  type NodeChange,
} from '@xyflow/react'
import { FlaskConical, ListChecks, Plus } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { BlockConfigPanel } from '@/components/ui/flow-config-panels'
import { FlowSimulationPanel, FlowValidationPanel } from '@/components/ui/flow-simulation-panel'
import { FlowBlockList, FlowPanelShell } from '@/components/ui/flow-sidebar'
import {
  FlowActionsContext,
  FlowSurface,
  toRfEdges,
  toRfNodes,
  type FlowActions,
  type FlowRfNode,
} from '@/components/ui/flow-viewer'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { RadioGroup } from '@/components/ui/radio-group'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useFillHeight } from '@/hooks/use-fill-height'
import { cn } from '@/lib/cn'
import { migrateFlow, nodeName, validateFlow, type Flow, type FlowNodeType } from '@/lib/flow'
import {
  FLOW_BLOCKS,
  FLOW_CARD_W,
  FLOW_TYPE_NAME,
  estimateNodeHeight,
  isTrigger,
  rulesOf,
} from '@/lib/flow-blocks'
import {
  addNode,
  connectNodes,
  describeNodeLinks,
  findFreePosition,
  moveNode,
  removeEdge,
  removeNode,
  replacedMessage,
  type RemoveMode,
} from '@/lib/flow-edit'
import {
  resetSimulation,
  simulateBlock,
  startSimulation,
  type SimulationState,
  type SimulationStep,
} from '@/lib/flow-sim'

/*
 * Editor de fluxos de automação (React Flow, MIT), estilo N8N: quadro à esquerda e barra lateral
 * à direita (blocos com busca e grupos, configuração do bloco, teste e validação). Monta blocos,
 * liga soltando em qualquer ponto do bloco de destino (com aviso do motivo e da troca), apaga com
 * confirmação e testa o caminho, tudo simulado: nada é executado de verdade. O fluxo é
 * CONTROLADO: `value` entra, `onChange` devolve um fluxo novo (nunca muda o recebido), sempre no
 * formato v2 (o da 2.7.0 também é aceito na entrada). O JSON é o de `lib/flow.ts`.
 *
 * Largura: a partir do tablet (768 px) monta por mouse ou toque (arraste, alças). No celular só
 * se vê e se navega; toda edição vai pela barra, que abre num Drawer. Arrastar nunca é o único
 * caminho. Fica fora da entrada principal (@rendra-ui/web/flow), porque depende de @xyflow/react.
 */

export interface FlowEditorProps {
  /** O fluxo (controlado). */
  value: Flow
  /** Recebe o fluxo novo a cada mudança. */
  onChange: (flow: Flow) => void
  /** Só ver, navegar e testar: nada se monta, liga ou apaga. */
  readOnly?: boolean
  /** Mostra "Validar" e "Testar fluxo" no canto do quadro. Padrão: `true`. */
  toolbar?: boolean
  /** Painel de teste aberto (controle de fora, por exemplo o botão "Testar fluxo" da tela). */
  testOpen?: boolean
  onTestOpenChange?: (open: boolean) => void
  className?: string
}

const DRAG_START = 4
const NO_BLOCK = 'Exclua um bloco por vez.'

/** Reaproveita os objetos de nó que não mudaram (a biblioteca guarda medida e seleção neles). */
function mergeNodes(prev: FlowRfNode[], next: FlowRfNode[]): FlowRfNode[] {
  const old = new Map(prev.map((n) => [n.id, n]))
  return next.map((n) => {
    const o = old.get(n.id)
    if (!o) return n
    const a = o.data
    const b = n.data
    const same =
      !o.dragging &&
      o.position.x === n.position.x &&
      o.position.y === n.position.y &&
      o.ariaLabel === n.ariaLabel &&
      a.label === b.label &&
      a.kind === b.kind &&
      a.config === b.config &&
      a.active === b.active &&
      a.issues.length === b.issues.length &&
      a.issues.every((m, i) => m === b.issues[i])
    if (same) return o
    return { ...o, position: o.dragging ? o.position : n.position, ariaLabel: n.ariaLabel, data: b }
  })
}

function mergeEdges(prev: Edge[], next: Edge[]): Edge[] {
  const old = new Map(prev.map((e) => [e.id, e]))
  return next.map((e) => {
    const o = old.get(e.id)
    if (!o) return e
    const same =
      o.source === e.source &&
      o.target === e.target &&
      o.sourceHandle === e.sourceHandle &&
      o.ariaLabel === e.ariaLabel &&
      o.data?.label === e.data?.label
    return same ? o : { ...o, ...e }
  })
}

/* ---------------------------------------------------------------------------- exclusão */

interface DeleteBlockModalProps {
  flow: Flow
  nodeId: string
  onClose: () => void
  onConfirm: (mode: RemoveMode) => void
}

/**
 * Excluir bloco: mostra o bloco, onde ele está ligado e duas opções (só este, ou este e tudo o
 * que vem depois), com dupla verificação: a caixa CONFIRMO na primeira, a palavra digitada na
 * segunda. O Modal fica como está: sem a verificação, o botão avisa e o modal continua aberto.
 */
function DeleteBlockModal({ flow, nodeId, onClose, onConfirm }: DeleteBlockModalProps) {
  const node = flow.nodes.find((n) => n.id === nodeId)
  const [mode, setMode] = useState<RemoveMode>('so-este')
  const [checked, setChecked] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState(false)
  const keepOpen = useRef(false)
  if (!node) return null
  const links = describeNodeLinks(flow, node.id)
  const total = links.descendentes + 1
  const verified = mode === 'so-este' ? checked : typed.trim().toLowerCase() === 'confirmo'
  const list = (items: typeof links.anteriores, empty: string) =>
    items.length === 0 ? (
      <span className="text-muted-foreground">{empty}</span>
    ) : (
      <ul className="flex flex-col gap-1">
        {items.map((x) => (
          <li key={x.node.id}>
            {nodeName(x.node)}
            {x.saida ? <span className="text-muted-foreground"> (saída {x.saida})</span> : null}
          </li>
        ))}
      </ul>
    )
  return (
    <Modal
      open
      size="md"
      type="destructive"
      title="Excluir este bloco?"
      description={
        nodeName(node) === FLOW_TYPE_NAME[node.type]
          ? nodeName(node)
          : `${FLOW_TYPE_NAME[node.type]}: ${nodeName(node)}`
      }
      confirmLabel="Excluir"
      onOpenChange={(open) => {
        if (open) return
        // o Modal fecha depois de qualquer confirmação; sem a verificação ele fica aberto
        if (keepOpen.current) {
          keepOpen.current = false
          return
        }
        onClose()
      }}
      onConfirm={() => {
        if (!verified) {
          keepOpen.current = true
          setError(true)
          return
        }
        onConfirm(mode)
      }}
    >
      <div className="flex w-full flex-col gap-4 text-left text-sm">
        <p className="text-muted-foreground">{FLOW_BLOCKS[node.type].description}</p>
        <dl className="flex flex-col gap-2">
          <div>
            <dt className="text-xs text-muted-foreground">Ligado depois de</dt>
            <dd>{list(links.anteriores, 'Nenhum bloco antes')}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ligado antes de</dt>
            <dd>{list(links.posteriores, 'Nenhum bloco depois')}</dd>
          </div>
        </dl>
        <RadioGroup
          aria-label="O que excluir"
          value={mode}
          onChange={(v) => {
            setMode(v as RemoveMode)
            setError(false)
          }}
          options={[
            { value: 'so-este', label: 'Excluir só este bloco' },
            {
              value: 'daqui-para-frente',
              label: `Excluir este bloco e tudo o que vem depois dele (${total} ${total === 1 ? 'bloco' : 'blocos'})`,
            },
          ]}
        />
        {mode === 'so-este' ? (
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => {
              setChecked(v === true)
              setError(false)
            }}
            label="CONFIRMO"
          />
        ) : (
          <Field label="Digite CONFIRMO para excluir" span="full">
            <Input
              value={typed}
              onChange={(v) => {
                setTyped(v)
                setError(false)
              }}
            />
          </Field>
        )}
        {error && (
          <p role="alert" className="font-medium text-destructive">
            {mode === 'so-este'
              ? 'Marque a caixa CONFIRMO para excluir.'
              : 'Digite CONFIRMO para excluir.'}
          </p>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------------------ editor */

type View = 'blocks' | 'config' | 'validate'

function FlowEditorInner({
  value,
  onChange,
  readOnly = false,
  toolbar = true,
  testOpen: testOpenProp,
  onTestOpenChange,
  className,
}: FlowEditorProps) {
  const { isMobile } = useBreakpoint()
  const canEdit = !readOnly
  const canBuild = canEdit && !isMobile
  const { screenToFlowPosition, fitView } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()
  const rootRef = useFillHeight<HTMLDivElement>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const noticeId = useId()

  // O fluxo da 2.7.0 também entra: o primeiro `onChange` já sai no formato v2.
  const flow = useMemo(() => migrateFlow(value), [value])
  const flowRef = useRef(flow)
  flowRef.current = flow
  const everUsed = useRef(new Set<string>())
  flow.nodes.forEach((n) => everUsed.current.add(n.id))

  const [view, setView] = useState<View>('blocks')
  const [configId, setConfigId] = useState<string | null>(null)
  const [testState, setTestState] = useState(false)
  const testOpen = testOpenProp ?? testState
  const [sim, setSim] = useState<SimulationState>(resetSimulation)
  const [blockStep, setBlockStep] = useState<SimulationStep | null>(null)
  const blockStepRef = useRef<SimulationStep | null>(null)
  blockStepRef.current = blockStep
  const [validated, setValidated] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const deletingRef = useRef<string | null>(null)
  deletingRef.current = deleting
  const [drag, setDrag] = useState<{
    type: FlowNodeType
    x: number
    y: number
    over: boolean
  } | null>(null)
  const suppressClick = useRef(false)

  const issues = useMemo(() => validateFlow(flow), [flow])
  const shownIssues = validated ? issues : undefined
  const activeId = sim.status === 'running' ? sim.currentId : null
  const configNode = configId ? flow.nodes.find((n) => n.id === configId) : undefined

  const setTestOpen = useCallback(
    (open: boolean) => {
      setTestState(open)
      onTestOpenChange?.(open)
    },
    [onTestOpenChange],
  )

  // Estado de interface da biblioteca (medida, seleção, arraste) guardado por bloco; o fluxo em
  // si nunca é copiado: sempre vem de `value`.
  const nextNodes = useMemo(
    () => toRfNodes(flow, { activeId, issues: shownIssues }),
    [flow, activeId, shownIssues],
  )
  const nextEdges = useMemo(() => toRfEdges(flow), [flow])
  const [rfNodes, setRfNodes] = useState<FlowRfNode[]>(nextNodes)
  const [rfEdges, setRfEdges] = useState<Edge[]>(nextEdges)
  useEffect(() => setRfNodes((prev) => mergeNodes(prev, nextNodes)), [nextNodes])
  useEffect(() => setRfEdges((prev) => mergeEdges(prev, nextEdges)), [nextEdges])

  // As saídas da condição mudam com as regras: a biblioteca precisa medir as alças de novo.
  const ruleKey = flow.nodes
    .filter((n) => n.type === 'condicao')
    .map(
      (n) =>
        `${n.id}:${rulesOf(n)
          .map((r) => r.id)
          .join(',')}`,
    )
    .join('|')
  useEffect(() => {
    for (const part of ruleKey.split('|')) if (part) updateNodeInternals(part.split(':')[0]!)
  }, [ruleKey, updateNodeInternals])

  const emit = useCallback(
    (next: Flow, message?: string) => {
      setNotice(message ?? null)
      onChange(next)
    },
    [onChange],
  )

  const commitMoves = useCallback(
    (moves: { id: string; position: { x: number; y: number } }[]) => {
      let next = flowRef.current
      for (const m of moves) {
        const cur = next.nodes.find((n) => n.id === m.id)
        if (cur && (cur.position.x !== m.position.x || cur.position.y !== m.position.y))
          next = moveNode(next, m.id, m.position)
      }
      if (next !== flowRef.current) emit(next)
    },
    [emit],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowRfNode>[]) => {
      setRfNodes((nds) =>
        applyNodeChanges(
          changes.filter((c) => c.type !== 'remove'),
          nds,
        ),
      )
      const moves = changes.flatMap((c) =>
        c.type === 'position' && c.dragging === false && c.position
          ? [{ id: c.id, position: c.position }]
          : [],
      )
      if (moves.length > 0 && canBuild) commitMoves(moves)
    },
    [canBuild, commitMoves],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setRfEdges((eds) =>
        applyEdgeChanges(
          changes.filter((c) => c.type !== 'remove'),
          eds,
        ),
      ),
    [],
  )

  /** Liga e avisa: o motivo da recusa, ou a ligação trocada. */
  const connect = useCallback(
    (source: string, target: string, branch?: string) => {
      const r = connectNodes(flowRef.current, source, target, branch)
      if (!r.ok) setNotice(r.reason)
      else emit(r.flow, r.replaced ? replacedMessage(flowRef.current, r.replaced) : undefined)
    },
    [emit],
  )

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) connect(c.source, c.target, c.sourceHandle ?? undefined)
    },
    [connect],
  )

  /** Soltar em qualquer ponto do bloco liga; fora de qualquer bloco, nada acontece. */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || !state.fromNode || state.fromHandle?.type !== 'source') return
      let to = state.toNode?.id
      if (!to && typeof document.elementFromPoint === 'function') {
        // no toque o evento não tem clientX/clientY: a posição vem de changedTouches
        const p = 'changedTouches' in event ? event.changedTouches[0] : (event as MouseEvent)
        if (p) {
          const el = document.elementFromPoint(p.clientX, p.clientY)
          to = el?.closest('.react-flow__node')?.getAttribute('data-id') ?? undefined
        }
      }
      if (!to) return
      connect(state.fromNode.id, to, state.fromHandle.id ?? undefined)
    },
    [connect],
  )

  const showDrawer = () => {
    if (isMobile) setDrawerOpen(true)
  }

  const openBlocks = () => {
    setView('blocks')
    setTestOpen(false)
    showDrawer()
  }

  const openConfig = useCallback(
    (id: string) => {
      if (!canEdit) return
      setConfigId(id)
      setView('config')
      setTestOpen(false)
      if (isMobile) setDrawerOpen(true)
    },
    [canEdit, isMobile, setTestOpen],
  )

  const addBlock = useCallback(
    (type: FlowNodeType, at?: { x: number; y: number }) => {
      const cur = flowRef.current
      if (isTrigger(type) && cur.nodes.some((n) => isTrigger(n.type))) {
        setNotice('Já existe um gatilho neste fluxo.')
        return
      }
      const size = {
        w: FLOW_CARD_W,
        h: estimateNodeHeight({ type, data: { label: '' } }),
      }
      let from = at
      if (!from) {
        const rect = canvasRef.current?.getBoundingClientRect()
        const center = screenToFlowPosition({
          x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
          y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
        })
        from = { x: center.x - size.w / 2, y: center.y - size.h / 2 }
      }
      const measured = Object.fromEntries(
        rfNodes.flatMap((n) =>
          n.measured?.width && n.measured.height
            ? [[n.id, { w: n.measured.width, h: n.measured.height }]]
            : [],
        ),
      )
      const position = findFreePosition(cur, size, from, measured)
      const added = addNode(cur, type, position, { reservedIds: everUsed.current })
      emit(added.flow)
      setConfigId(added.id)
      setView('config')
      setTestOpen(false)
      if (isMobile) setDrawerOpen(true)
    },
    [emit, isMobile, rfNodes, screenToFlowPosition, setTestOpen],
  )

  /** Arrastar um bloco da barra até o canvas, por pointer events (funciona com mouse e toque). */
  const startPaletteDrag = (e: ReactPointerEvent<HTMLButtonElement>, type: FlowNodeType) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const origin = { x: e.clientX, y: e.clientY }
    let moved = false
    const inside = (x: number, y: number) => {
      const r = canvasRef.current?.getBoundingClientRect()
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
      setDrag(null)
    }
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_START) return
      moved = true
      setDrag({ type, x: ev.clientX, y: ev.clientY, over: inside(ev.clientX, ev.clientY) })
    }
    const up = (ev: PointerEvent) => {
      stop()
      if (!moved) return
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
      if (inside(ev.clientX, ev.clientY)) {
        const p = screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
        addBlock(type, {
          x: p.x - FLOW_CARD_W / 2,
          y: p.y - estimateNodeHeight({ type, data: { label: '' } }) / 2,
        })
      }
    }
    const cancel = () => {
      stop()
      if (moved) {
        suppressClick.current = true
        setTimeout(() => (suppressClick.current = false), 0)
      }
    }
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cancel()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
  }

  const viewBlock = (id: string) => {
    setRfNodes((nds) =>
      nds.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })),
    )
    void fitView({ nodes: [{ id }], padding: 0.5, maxZoom: 1 })
  }

  // Abrir o teste de fora (`testOpen`) também começa o teste, a não ser que seja o play de um bloco.
  useEffect(() => {
    if (testOpen && !blockStepRef.current)
      setSim((s) => (s.status === 'idle' ? startSimulation(flowRef.current) : s))
    if (testOpen && isMobile) setDrawerOpen(true)
    if (!testOpen) {
      setSim(resetSimulation())
      setBlockStep(null)
    }
  }, [testOpen, isMobile])

  const openTest = () => {
    setTestOpen(true)
    showDrawer()
  }
  const playBlock = useCallback(
    (id: string) => {
      setSim(resetSimulation())
      const step = simulateBlock(flowRef.current, id)
      setBlockStep(step)
      blockStepRef.current = step
      setTestOpen(true)
      if (isMobile) setDrawerOpen(true)
    },
    [isMobile, setTestOpen],
  )

  const focusBoard = () => canvasRef.current?.querySelector<HTMLElement>('.flow-surface')?.focus()

  const actions = useMemo<FlowActions>(
    () => ({
      play: playBlock,
      ...(canEdit ? { edit: openConfig, remove: (id: string) => setDeleting(id) } : {}),
      ...(canBuild
        ? {
            removeEdge: (id: string) => {
              emit(removeEdge(flowRef.current, id))
              focusBoard()
            },
          }
        : {}),
    }),
    [canEdit, canBuild, playBlock, openConfig, emit],
  )

  const closeSidebarPanel = () => {
    setView('blocks')
    setValidated(false)
    setDrawerOpen(false)
  }

  /* ----------------------------------------------------------------- conteúdo da barra */

  const panel = testOpen ? (
    <FlowSimulationPanel
      flow={flow}
      sim={sim}
      blockStep={blockStep}
      onSim={(s) => {
        setBlockStep(null)
        setSim(s)
      }}
      onClose={
        isMobile
          ? undefined
          : () => {
              setTestOpen(false)
              setDrawerOpen(false)
            }
      }
      onViewBlock={viewBlock}
    />
  ) : view === 'validate' ? (
    <FlowValidationPanel
      flow={flow}
      issues={issues}
      onClose={isMobile ? undefined : closeSidebarPanel}
      onViewBlock={viewBlock}
    />
  ) : view === 'config' && configNode ? (
    <BlockConfigPanel
      key={configNode.id}
      flow={flow}
      nodeId={configNode.id}
      onApply={(next, message) => emit(next, message)}
      onClose={isMobile ? undefined : closeSidebarPanel}
    />
  ) : canEdit ? (
    <FlowPanelShell title="Adicionar bloco">
      <FlowBlockList
        onAdd={(type) => addBlock(type)}
        onDragStart={canBuild ? startPaletteDrag : undefined}
        suppressClick={suppressClick}
      />
    </FlowPanelShell>
  ) : null
  // `nokey`: Delete e Backspace dentro da barra nunca apagam o bloco selecionado do quadro.
  const sidebarBody = panel && <div className="nokey">{panel}</div>

  const showAside = !isMobile && sidebarBody !== null

  return (
    <div
      ref={rootRef}
      data-rendra="FLX-001"
      className={cn(
        'flow-editor flex min-w-0 flex-col overflow-hidden rounded-surface border bg-card lg:h-board lg:min-h-flow lg:flex-row',
        className,
      )}
    >
      <div
        ref={canvasRef}
        className={cn(
          'relative h-board min-w-0 md:h-viewer lg:h-full lg:flex-1',
          drag?.over && 'ring-2 ring-primary ring-inset',
        )}
      >
        <FlowActionsContext.Provider value={actions}>
          <FlowSurface
            fill={false}
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            nodesDraggable={canBuild}
            nodesConnectable={canBuild}
            elementsSelectable={canEdit}
            deleteKeyCode={canEdit ? ['Delete', 'Backspace'] : null}
            onBeforeDelete={async ({ nodes: gone }) => {
              if (!canEdit || drawerOpen || deletingRef.current) return false
              if (gone.length === 0) return true
              // bloco nunca sai direto: um bloco abre o modal, vários pedem um de cada vez
              if (gone.length === 1) setDeleting(gone[0]!.id)
              else setNotice(NO_BLOCK)
              return false
            }}
            onDelete={({ edges: gone }) => {
              let next = flowRef.current
              for (const e of gone) next = removeEdge(next, e.id)
              if (next !== flowRef.current) emit(next)
            }}
            onNodeDragStop={(_, __, nodes) =>
              commitMoves(nodes.map((n) => ({ id: n.id, position: n.position })))
            }
            onNodeClick={(e, node) => {
              if ((e.target as HTMLElement).closest('button')) return
              openConfig(node.id)
            }}
            onPaneClick={() => {
              if (view === 'config' && !isMobile) setView('blocks')
            }}
            onKeyDown={(e) => {
              const el = e.target as HTMLElement
              if (
                e.key === 'Enter' &&
                el.classList?.contains('react-flow__node') &&
                el.dataset.id
              ) {
                // o foco vai para a barra: sem isto o Enter ainda ativaria o primeiro botão dela
                e.preventDefault()
                openConfig(el.dataset.id)
              }
            }}
          />
        </FlowActionsContext.Provider>
        {(toolbar || (isMobile && canEdit)) && (
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            {isMobile && canEdit && (
              <Button
                variant="outline"
                iconOnly
                aria-label="Blocos"
                icon={<Plus />}
                onClick={openBlocks}
              />
            )}
            {toolbar && (
              <>
                <Button
                  variant="outline"
                  iconOnly={isMobile}
                  aria-label="Validar"
                  icon={<ListChecks />}
                  onClick={() => {
                    setValidated(true)
                    setView('validate')
                    setTestOpen(false)
                    showDrawer()
                  }}
                >
                  {isMobile ? null : 'Validar'}
                </Button>
                <Button
                  iconOnly={isMobile}
                  aria-label="Testar fluxo"
                  icon={<FlaskConical />}
                  onClick={openTest}
                >
                  {isMobile ? null : 'Testar fluxo'}
                </Button>
              </>
            )}
          </div>
        )}
        <div
          role="status"
          aria-live="polite"
          id={noticeId}
          data-flow-notice
          className={cn(notice ? 'absolute inset-x-2 top-16 z-10' : 'sr-only')}
        >
          {notice && <Alert type="warning" title={notice} onDismiss={() => setNotice(null)} />}
        </div>
      </div>
      {showAside && (
        <aside
          aria-label="Painel do fluxo"
          className="w-full shrink-0 scrollbar-subtle border-t p-4 lg:h-full lg:w-flow-panel lg:overflow-y-auto lg:border-t-0 lg:border-l"
        >
          <div
            role="presentation"
            onKeyDown={(e) => {
              if (
                e.key === 'Escape' &&
                view === 'config' &&
                !testOpen &&
                !(e.target as HTMLElement).closest(
                  '[role="combobox"],[role="listbox"],[role="dialog"],[data-radix-popper-content-wrapper],[cmdk-root]',
                )
              )
                setView('blocks')
            }}
          >
            {sidebarBody}
          </div>
        </aside>
      )}
      {drag && (
        <div
          aria-hidden
          data-flow-drag
          className="pointer-events-none fixed top-0 left-0 z-50 translate-x-(--flow-x) translate-y-(--flow-y) rounded-control border bg-card px-3 py-2 text-sm shadow-md"
          style={{ '--flow-x': `${drag.x}px`, '--flow-y': `${drag.y}px` } as CSSProperties}
        >
          {FLOW_TYPE_NAME[drag.type]}
        </div>
      )}
      {isMobile && sidebarBody !== null && (
        <Drawer
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open)
            if (!open) {
              if (testOpen) setTestOpen(false)
              setView('blocks')
              setValidated(false)
            }
          }}
          title="Fluxo de automação"
        >
          {sidebarBody}
        </Drawer>
      )}
      {canEdit && deleting && (
        <DeleteBlockModal
          key={deleting}
          flow={flow}
          nodeId={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={(mode) => {
            emit(removeNode(flowRef.current, deleting, mode))
            setDeleting(null)
            setConfigId((id) => (id === deleting ? null : id))
            setView('blocks')
            setDrawerOpen(false)
          }}
        />
      )}
    </div>
  )
}

export function FlowEditor(props: FlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
