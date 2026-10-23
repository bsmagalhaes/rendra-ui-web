import {
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { CheckCircle2, FlaskConical, ListChecks, Trash2, X } from 'lucide-react'
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
import { ActionBar } from '@/components/ui/action-bar'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import {
  FLOW_ICON,
  FlowSurface,
  toRfEdges,
  toRfNodes,
  type FlowRfNode,
} from '@/components/ui/flow-viewer'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Timeline, type TimelineEvent } from '@/components/ui/timeline'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/cn'
import {
  FLOW_NODE_TYPES,
  FLOW_TYPE_NAME,
  nodeName,
  FLOW_WAIT_UNITS,
  addNode,
  advanceSimulation,
  connectNodes,
  moveNode,
  nextCandidates,
  removeEdge,
  removeNode,
  resetSimulation,
  setNext,
  startSimulation,
  updateNodeData,
  validateFlow,
  type Flow,
  type FlowBranch,
  type FlowNode,
  type FlowNodeType,
  type FlowWaitUnit,
  type SimulationState,
} from '@/lib/flow'

/*
 * Editor de fluxos de automação (React Flow, MIT): monta blocos (gatilho, ação, condição, espera
 * e fim), liga um ao próximo, apaga, valida e testa o caminho. O fluxo é CONTROLADO: `value`
 * entra, `onChange` devolve um fluxo novo (nunca muda o recebido). O JSON é o de `lib/flow.ts`.
 *
 * Largura: a partir do tablet (768 px) monta por mouse ou toque (paleta, arraste, alças). No
 * celular só se vê e se navega; tocar no bloco abre a gaveta, que é onde se edita, se liga ao
 * próximo bloco e se exclui. A gaveta também é o caminho por teclado. Arrastar nunca é o único
 * caminho. Fica fora da entrada principal (@rendra-ui/web/flow), porque depende de @xyflow/react.
 */

export interface FlowEditorProps {
  /** O fluxo (controlado). */
  value: Flow
  /** Recebe o fluxo novo a cada mudança. */
  onChange: (flow: Flow) => void
  /** Só ver, navegar e testar: nada se monta, liga ou apaga. */
  readOnly?: boolean
  className?: string
}

const NODE_W = 256
const NODE_H = 72
const DRAG_START = 4
const NONE = '__nenhum'

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
      a.handles === b.handles &&
      a.edit === b.edit &&
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
      o.ariaLabel === e.ariaLabel
    return same ? o : { ...o, ...e }
  })
}

/* --------------------------------------------------------------------------- gaveta */

interface Draft {
  label: string
  duration: string
  unit: FlowWaitUnit
  next: string
  sim: string
  nao: string
}

function draftOf(node: FlowNode, flow: Flow): Draft {
  const target = (branch?: FlowBranch) =>
    flow.edges.find((e) => e.source === node.id && (branch ? e.branch === branch : true))?.target ??
    NONE
  const cfg = node.data.config
  const unit = FLOW_WAIT_UNITS.find((u) => u === cfg?.unit) ?? 'minutos'
  return {
    label: node.data.label,
    duration: typeof cfg?.duration === 'number' ? String(cfg.duration) : '',
    unit,
    next: node.type === 'condicao' ? NONE : target(),
    sim: node.type === 'condicao' ? target('sim') : NONE,
    nao: node.type === 'condicao' ? target('nao') : NONE,
  }
}

const sameDraft = (a: Draft, b: Draft) =>
  a.label === b.label &&
  a.duration === b.duration &&
  a.unit === b.unit &&
  a.next === b.next &&
  a.sim === b.sim &&
  a.nao === b.nao

interface BlockDrawerProps {
  flow: Flow
  nodeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (flow: Flow) => void
  onDelete: (nodeId: string) => void
}

function BlockDrawer({ flow, nodeId, open, onOpenChange, onApply, onDelete }: BlockDrawerProps) {
  const node = flow.nodes.find((n) => n.id === nodeId)
  const initial = useMemo(() => (node ? draftOf(node, flow) : null), [node, flow])
  const [draft, setDraft] = useState<Draft | null>(initial)
  const [discarding, setDiscarding] = useState(false)
  // O rascunho nasce quando a gaveta abre (key do pai) e não segue o fluxo depois disso.
  if (!node || !initial || !draft) return null

  const dirty = !sameDraft(draft, initial)
  const duration = Number(draft.duration)
  const durationError =
    node.type === 'espera' && (draft.duration.trim() === '' || !(duration > 0))
      ? 'Informe um número maior que zero.'
      : undefined
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const options = [
    { value: NONE, label: 'Nenhum' },
    ...nextCandidates(flow, node.id).map((n) => ({
      value: n.id,
      label: `${FLOW_TYPE_NAME[n.type]}: ${nodeName(n)}`,
    })),
  ]
  const target = (value: string | null) => (value && value !== NONE ? value : null)

  const apply = () => {
    let next = updateNodeData(flow, node.id, {
      label: draft.label,
      ...(node.type === 'espera' ? { config: { duration, unit: draft.unit } } : {}),
    })
    if (node.type === 'condicao') {
      next = setNext(next, node.id, target(draft.sim), 'sim')
      next = setNext(next, node.id, target(draft.nao), 'nao')
    } else if (node.type !== 'fim') {
      next = setNext(next, node.id, target(draft.next))
    }
    onApply(next)
  }

  const nextField = (name: string, key: 'next' | 'sim' | 'nao') => (
    <Field label={name} span="full">
      <Select
        label={name}
        options={options}
        value={draft[key]}
        onChange={(v) => set({ [key]: v ?? NONE })}
      />
    </Field>
  )

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title={`Bloco: ${nodeName(node)}`}
        description={FLOW_TYPE_NAME[node.type]}
        dirty={dirty}
        footer={
          <ActionBar
            primary={{
              label: 'Aplicar',
              onClick: apply,
              disabled: draft.label.trim() === '' || Boolean(durationError),
            }}
            cancel={{
              label: 'Cancelar',
              onClick: () => (dirty ? setDiscarding(true) : onOpenChange(false)),
            }}
            secondary={[
              {
                label: 'Excluir bloco',
                icon: <Trash2 />,
                destructive: true,
                onClick: () => onDelete(node.id),
              },
            ]}
          />
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Rótulo"
            span="full"
            error={draft.label.trim() === '' ? 'Informe um rótulo.' : undefined}
          >
            <Input value={draft.label} onChange={(v) => set({ label: v })} />
          </Field>
          {node.type === 'espera' && (
            <>
              <Field label="Duração" span="full" error={durationError}>
                <Input
                  value={draft.duration}
                  inputMode="numeric"
                  onChange={(v) => set({ duration: v })}
                />
              </Field>
              <Field label="Unidade" span="full">
                <Select
                  label="Unidade"
                  options={FLOW_WAIT_UNITS.map((u) => ({ value: u, label: u }))}
                  value={draft.unit}
                  onChange={(v) => set({ unit: (v as FlowWaitUnit | null) ?? 'minutos' })}
                />
              </Field>
            </>
          )}
          {node.type === 'condicao' && (
            <>
              {nextField('Se sim', 'sim')}
              {nextField('Se não', 'nao')}
            </>
          )}
          {node.type !== 'condicao' && node.type !== 'fim' && nextField('Próximo bloco', 'next')}
        </div>
      </Drawer>
      <Modal
        open={discarding}
        onOpenChange={setDiscarding}
        type="destructive"
        title="Descartar alterações?"
        description="As informações preenchidas neste painel serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  )
}

/* ---------------------------------------------------------------------- simulação */

function SimulationPanel({
  flow,
  sim,
  onSim,
  onClose,
}: {
  flow: Flow
  sim: SimulationState
  onSim: (sim: SimulationState) => void
  onClose: () => void
}) {
  const waiting = sim.status === 'waiting-choice'
  const current = flow.nodes.find((n) => n.id === sim.currentId)
  const events: TimelineEvent[] = sim.steps.map((s, i) => ({
    id: `${i}-${s.nodeId}`,
    title: s.label,
    description: s.detail,
    date: `Passo ${i + 1}`,
    status: s.status,
  }))
  const choose = (choice: FlowBranch) => onSim(advanceSimulation(flow, sim, choice))
  return (
    <Card role="region" aria-label="Teste do fluxo" className="min-w-0 shrink-0 lg:w-popover">
      <CardHeader
        actions={
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            aria-label="Fechar teste"
            icon={<X />}
            onClick={onClose}
          />
        }
      >
        <CardTitle>Teste do fluxo</CardTitle>
        <CardDescription>Um passo por vez, sem executar nada de verdade.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ActionBar
          primary={{
            label: 'Avançar',
            disabled: sim.status !== 'running',
            onClick: () => onSim(advanceSimulation(flow, sim)),
          }}
          cancel={{ label: 'Reiniciar', onClick: () => onSim(startSimulation(flow)) }}
        />
        {sim.status === 'error' && (
          <div className="flex flex-col gap-3">
            <Alert type="error" title="O fluxo precisa de ajustes antes do teste" />
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
              {sim.issues.map((i, k) => (
                <li key={`${i.code}-${k}`}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}
        {waiting && current && (
          <div
            role="group"
            aria-label="Escolha o caminho da condição"
            className="flex flex-col gap-3"
          >
            <p className="text-sm font-medium">{nodeName(current)}</p>
            <div className="grid grid-actions-2 gap-3">
              <Button variant="outline" onClick={() => choose('sim')}>
                Sim
              </Button>
              <Button variant="outline" onClick={() => choose('nao')}>
                Não
              </Button>
            </div>
          </div>
        )}
        {sim.status === 'finished' && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm font-medium text-success-soft-foreground"
          >
            <CheckCircle2 className="size-icon-md" aria-hidden />
            Fluxo concluído
          </p>
        )}
        {events.length > 0 && <Timeline events={events} />}
        {events.length === 0 && sim.status !== 'error' && (
          <p className="text-sm text-muted-foreground">Nenhum passo executado ainda.</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------------ editor */

function FlowEditorInner({ value, onChange, readOnly = false, className }: FlowEditorProps) {
  const { isMobile } = useBreakpoint()
  const canEdit = !readOnly
  const canBuild = canEdit && !isMobile
  const { screenToFlowPosition, fitView } = useReactFlow()
  const canvasRef = useRef<HTMLDivElement>(null)
  const noticeId = useId()

  const valueRef = useRef(value)
  valueRef.current = value
  const everUsed = useRef(new Set<string>())
  value.nodes.forEach((n) => everUsed.current.add(n.id))

  const [validated, setValidated] = useState(false)
  const [sim, setSim] = useState<SimulationState>(resetSimulation)
  const [notice, setNotice] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<{ id: string; session: number } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerOpenRef = useRef(false)
  drawerOpenRef.current = drawerOpen
  const [deleting, setDeleting] = useState<string | null>(null)
  const [drag, setDrag] = useState<{
    type: FlowNodeType
    x: number
    y: number
    over: boolean
  } | null>(null)
  const suppressClick = useRef(false)

  const issues = useMemo(() => validateFlow(value), [value])
  const shownIssues = validated ? issues : undefined
  const activeId =
    sim.status === 'running' || sim.status === 'waiting-choice' ? sim.currentId : null

  // Estado de interface da biblioteca (medida, seleção, arraste) guardado por bloco; o fluxo em
  // si nunca é copiado: sempre vem de `value`.
  const nextNodes = useMemo(
    () =>
      toRfNodes(value, {
        activeId,
        issues: shownIssues,
        handles: canBuild ? 'lg' : 'sm',
        edit: canBuild,
      }),
    [value, activeId, shownIssues, canBuild],
  )
  const nextEdges = useMemo(() => toRfEdges(value), [value])
  const [rfNodes, setRfNodes] = useState<FlowRfNode[]>(nextNodes)
  const [rfEdges, setRfEdges] = useState<Edge[]>(nextEdges)
  useEffect(() => setRfNodes((prev) => mergeNodes(prev, nextNodes)), [nextNodes])
  useEffect(() => setRfEdges((prev) => mergeEdges(prev, nextEdges)), [nextEdges])

  const emit = useCallback(
    (flow: Flow) => {
      setNotice(null)
      onChange(flow)
    },
    [onChange],
  )

  const commitMoves = useCallback(
    (moves: { id: string; position: { x: number; y: number } }[]) => {
      let flow = valueRef.current
      for (const m of moves) {
        const cur = flow.nodes.find((n) => n.id === m.id)
        if (cur && (cur.position.x !== m.position.x || cur.position.y !== m.position.y))
          flow = moveNode(flow, m.id, m.position)
      }
      if (flow !== valueRef.current) emit(flow)
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

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return
      const branch =
        c.sourceHandle === 'sim' || c.sourceHandle === 'nao' ? c.sourceHandle : undefined
      const r = connectNodes(valueRef.current, c.source, c.target, branch)
      if (r.ok) emit(r.flow)
      else setNotice(r.reason)
    },
    [emit],
  )

  const addBlock = useCallback(
    (type: FlowNodeType, at?: { x: number; y: number }) => {
      const flow = valueRef.current
      if (type === 'gatilho' && flow.nodes.some((n) => n.type === 'gatilho')) {
        setNotice('Já existe um gatilho neste fluxo.')
        return
      }
      let pos = at
      if (!pos) {
        const rect = canvasRef.current?.getBoundingClientRect()
        const center = screenToFlowPosition({
          x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
          y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
        })
        pos = { x: center.x - NODE_W / 2, y: center.y - NODE_H / 2 }
        // Não empilha o bloco novo sobre outro que já esteja ali.
        while (
          flow.nodes.some(
            (n) => Math.abs(n.position.x - pos!.x) < 24 && Math.abs(n.position.y - pos!.y) < 24,
          )
        )
          pos = { x: pos.x + 24, y: pos.y + 24 }
      }
      emit(addNode(flow, type, pos, { reservedIds: everUsed.current }).flow)
    },
    [emit, screenToFlowPosition],
  )

  /** Arrastar um item da paleta até o canvas, por pointer events (funciona com mouse e toque). */
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
        addBlock(type, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 })
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

  const openDrawer = (id: string) => {
    if (!canEdit) return
    setDrawer((d) => ({ id, session: (d?.session ?? 0) + 1 }))
    setDrawerOpen(true)
  }

  const viewBlock = (id: string) => {
    setRfNodes((nds) =>
      nds.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })),
    )
    void fitView({ nodes: [{ id }], padding: 0.5, maxZoom: 1 })
  }

  const startTest = () => setSim(startSimulation(value))
  const closeTest = () => setSim(resetSimulation())

  const deleteNode = deleting ? value.nodes.find((n) => n.id === deleting) : undefined

  return (
    <div data-rendra="FLX-001" className={cn('flow-editor flex min-w-0 flex-col gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="min-w-0 flex-1">
          <CardHeader
            actions={
              <>
                <Button
                  variant="outline"
                  iconOnly={isMobile}
                  aria-label="Validar"
                  icon={<ListChecks />}
                  onClick={() => setValidated(true)}
                >
                  {isMobile ? null : 'Validar'}
                </Button>
                <Button
                  iconOnly={isMobile}
                  aria-label="Testar fluxo"
                  icon={<FlaskConical />}
                  onClick={startTest}
                >
                  {isMobile ? null : 'Testar fluxo'}
                </Button>
              </>
            }
          >
            <CardTitle>Fluxo de automação</CardTitle>
            <CardDescription>Blocos, ligações e teste do caminho.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {canBuild && (
              <div role="group" aria-label="Blocos" className="flex flex-wrap items-center gap-2">
                {FLOW_NODE_TYPES.map((type) => {
                  const Icon = FLOW_ICON[type]
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      icon={<Icon />}
                      className="cursor-grab touch-none"
                      onPointerDown={(e) => startPaletteDrag(e, type)}
                      onClick={() => {
                        if (suppressClick.current) return
                        addBlock(type)
                      }}
                    >
                      {FLOW_TYPE_NAME[type]}
                    </Button>
                  )
                })}
              </div>
            )}
            <div ref={canvasRef} className="min-w-0">
              <FlowSurface
                className={cn(drag?.over && 'ring-2 ring-primary')}
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodesDraggable={canBuild}
                nodesConnectable={canBuild}
                elementsSelectable={canEdit}
                deleteKeyCode={canEdit ? ['Delete', 'Backspace'] : null}
                onBeforeDelete={async () => canEdit && !drawerOpenRef.current}
                onDelete={({ nodes, edges }) => {
                  let flow = valueRef.current
                  for (const e of edges) flow = removeEdge(flow, e.id)
                  for (const n of nodes) flow = removeNode(flow, n.id)
                  if (flow !== valueRef.current) emit(flow)
                }}
                onNodeDragStop={(_, __, nodes) =>
                  commitMoves(nodes.map((n) => ({ id: n.id, position: n.position })))
                }
                onNodeClick={(e, node) => {
                  const fromEditButton = (e.target as HTMLElement).closest('[data-flow-edit]')
                  if (isMobile || fromEditButton) openDrawer(node.id)
                }}
                onNodeDoubleClick={(_, node) => openDrawer(node.id)}
                onKeyDown={(e) => {
                  const el = e.target as HTMLElement
                  if (
                    e.key === 'Enter' &&
                    el.classList?.contains('react-flow__node') &&
                    el.dataset.id
                  ) {
                    // O foco vai para a gaveta: sem isto o Enter ainda ativaria o primeiro botão dela.
                    e.preventDefault()
                    openDrawer(el.dataset.id)
                  }
                }}
              />
            </div>
            <div
              role="status"
              aria-live="polite"
              id={noticeId}
              className={cn(!notice && 'sr-only')}
            >
              {notice && <Alert type="warning" title={notice} onDismiss={() => setNotice(null)} />}
            </div>
            {validated && (
              <section
                aria-label="Validação do fluxo"
                aria-live="polite"
                className="flex flex-col gap-3"
              >
                {issues.length === 0 ? (
                  <Alert type="success" title="Fluxo válido" />
                ) : (
                  <>
                    <Alert
                      type="error"
                      title={
                        issues.length === 1
                          ? '1 problema encontrado'
                          : `${issues.length} problemas encontrados`
                      }
                    />
                    <ul className="flex flex-col gap-2">
                      {issues.map((i, k) => (
                        <li
                          key={`${i.code}-${i.nodeId ?? i.edgeId ?? k}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-control border bg-card px-3 py-2 text-sm"
                        >
                          <span>{i.message}</span>
                          {i.nodeId && (
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label={`Ver bloco ${nodeName(
                                value.nodes.find((n) => n.id === i.nodeId) ?? {
                                  type: 'acao',
                                  data: { label: i.nodeId },
                                },
                              )}`}
                              onClick={() => viewBlock(i.nodeId!)}
                            >
                              Ver bloco
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
          </CardContent>
        </Card>
        {sim.status !== 'idle' && (
          <SimulationPanel flow={value} sim={sim} onSim={setSim} onClose={closeTest} />
        )}
      </div>
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
      {canEdit && drawer && (
        <BlockDrawer
          key={drawer.session}
          flow={value}
          nodeId={drawer.id}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onApply={(flow) => {
            setDrawerOpen(false)
            emit(flow)
          }}
          onDelete={setDeleting}
        />
      )}
      <Modal
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        type="destructive"
        title="Excluir este bloco?"
        description={
          deleteNode
            ? `O bloco "${nodeName(deleteNode)}" e as ligações dele serão apagados.`
            : undefined
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (!deleting) return
          emit(removeNode(valueRef.current, deleting))
          setDeleting(null)
          setDrawerOpen(false)
        }}
      />
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
