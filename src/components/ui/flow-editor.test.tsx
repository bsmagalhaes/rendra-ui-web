// @vitest-environment jsdom
import type { ReactFlowProps } from '@xyflow/react'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serializeFlow, validateFlow, type Flow } from '@/lib/flow'
import { MotionProvider } from '@/lib/motion'
import { motionOn } from '@/test/motion'
import { renderApp } from '@/test/render'
import { FlowEditor } from './flow-editor'

/*
 * Para pegar os callbacks da biblioteca (ligar, apagar, mover pelo teclado), que o jsdom não
 * dispara com gestos de verdade, o ReactFlow é embrulhado e as últimas props ficam guardadas. O
 * gesto de verdade (arrastar, ligar, apagar) é provado no navegador, em tests/flow.spec.ts.
 */
let rf: ReactFlowProps
vi.mock('@xyflow/react', async (original) => {
  const mod = await original<typeof import('@xyflow/react')>()
  return {
    ...mod,
    ReactFlow: (props: ReactFlowProps) => {
      rf = props
      return <mod.ReactFlow {...props} />
    },
  }
})

const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)

// jsdom não faz layout: mesmo mock do flow-viewer.test.tsx, desfeito no afterEach.
const proto = HTMLElement.prototype
const saved = {
  offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  offsetHeight: Object.getOwnPropertyDescriptor(proto, 'offsetHeight'),
  clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
  clientHeight: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
  getBBox: Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox'),
  getBoundingClientRect: Object.getOwnPropertyDescriptor(proto, 'getBoundingClientRect'),
}
function mockLayout() {
  const size = (el: HTMLElement) =>
    el.classList.contains('react-flow__node') ? { w: 256, h: 72 } : { w: 800, h: 600 }
  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return size(this).w
    },
  })
  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return size(this).h
    },
  })
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => 800 })
  Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => 600 })
  Object.defineProperty(proto, 'getBoundingClientRect', {
    configurable: true,
    value() {
      const { w, h } = size(this as HTMLElement)
      return { x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h, toJSON() {} }
    },
  })
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  })
  class MeasuringResizeObserver {
    private timers = new Set<ReturnType<typeof setTimeout>>()
    constructor(private cb: ResizeObserverCallback) {}
    observe(target: Element) {
      const { w, h } = size(target as HTMLElement)
      const entry = { target, contentRect: { width: w, height: h } } as ResizeObserverEntry
      // depois do primeiro commit: a biblioteca só guarda a medida quando o canvas já existe
      this.timers.add(setTimeout(() => this.cb([entry], this as unknown as ResizeObserver), 0))
    }
    unobserve() {}
    disconnect() {
      this.timers.forEach(clearTimeout)
      this.timers.clear()
    }
  }
  class Matrix {
    m22: number
    constructor(transform?: string) {
      const scale = /scale\(([\d.]+)\)/.exec(transform ?? '')
      this.m22 = scale ? Number(scale[1]) : 1
    }
  }
  vi.stubGlobal('ResizeObserver', MeasuringResizeObserver)
  vi.stubGlobal('DOMMatrixReadOnly', Matrix)
}
function restoreLayout() {
  for (const [key, d] of Object.entries(saved)) {
    const target = key === 'getBBox' ? SVGElement.prototype : proto
    if (d) Object.defineProperty(target, key, d)
    else delete (target as unknown as Record<string, unknown>)[key]
  }
  vi.unstubAllGlobals()
  setViewportWidth(1280)
}
beforeEach(mockLayout)
afterEach(restoreLayout)

function congelar<T>(valor: T): T {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

const base = (): Flow => ({
  nodes: [
    { id: 'g', type: 'gatilho', position: { x: 0, y: 0 }, data: { label: 'Novo pedido' } },
    { id: 'a', type: 'acao', position: { x: 0, y: 120 }, data: { label: 'Enviar e-mail' } },
    { id: 'c', type: 'condicao', position: { x: 0, y: 240 }, data: { label: 'Pedido pago?' } },
    {
      id: 'e',
      type: 'espera',
      position: { x: 300, y: 240 },
      data: { label: 'Esperar', config: { duration: 5, unit: 'minutos' } },
    },
    { id: 'f1', type: 'fim', position: { x: 300, y: 360 }, data: { label: 'Fim pago' } },
    { id: 'f2', type: 'fim', position: { x: 0, y: 360 }, data: { label: 'Fim não pago' } },
  ],
  edges: [
    { id: 'g->a', source: 'g', target: 'a' },
    { id: 'a->c', source: 'a', target: 'c' },
    { id: 'c:sim->e', source: 'c', target: 'e', branch: 'sim' },
    { id: 'c:nao->f2', source: 'c', target: 'f2', branch: 'nao' },
    { id: 'e->f1', source: 'e', target: 'f1' },
  ],
})

/** O host: guarda o fluxo e entrega ao editor, como a tela de verdade faz. */
function Host({
  initial,
  onFlow,
  readOnly,
}: {
  initial: Flow
  onFlow?: (f: Flow) => void
  readOnly?: boolean
}) {
  const [flow, setFlow] = useState(initial)
  return (
    <>
      <FlowEditor
        value={flow}
        readOnly={readOnly}
        onChange={(f) => {
          onFlow?.(f)
          setFlow(f)
        }}
      />
      <output data-testid="json">{serializeFlow(flow)}</output>
    </>
  )
}

const current = (): Flow => JSON.parse(screen.getByTestId('json').textContent ?? '{}') as Flow
const blocos = (c: HTMLElement) => c.querySelectorAll('.react-flow__node').length
const blocoPor = (rotulo: string) =>
  screen.getByText(rotulo).closest('[data-flow-node]') as HTMLElement
const settle = () => waitFor(() => expect(document.querySelector('.react-flow__node')).toBeTruthy())

async function abrirGaveta(rotulo: string) {
  await userEvent.click(
    within(blocoPor(rotulo)).getByRole('button', { name: new RegExp(`Editar bloco ${rotulo}`) }),
  )
  return screen.findByRole('dialog')
}

describe('FlowEditor: montagem e controle', () => {
  it('mostra os blocos do value e o código do catálogo, e acompanha o value sem guardar cópia', async () => {
    const flow = congelar(base())
    const { container, rerender } = renderApp(<FlowEditor value={flow} onChange={() => {}} />)
    expect(container.querySelector('[data-rendra="FLX-001"]')).toBeInTheDocument()
    expect(blocos(container)).toBe(6)
    expect(screen.getByText('Novo pedido')).toBeInTheDocument()
    const menor: Flow = congelar({
      nodes: [base().nodes[0]!, base().nodes[1]!],
      edges: [base().edges[0]!],
    })
    rerender(<FlowEditor value={menor} onChange={() => {}} />)
    await waitFor(() => expect(blocos(container)).toBe(2))
    expect(screen.queryByText('Novo pedido')).toBeInTheDocument()
    expect(screen.queryByText('Esperar')).not.toBeInTheDocument()
  })
})

describe('FlowEditor: paleta', () => {
  it('lista os cinco tipos e acrescenta o bloco escolhido, sem mexer no value recebido', async () => {
    const onFlow = vi.fn()
    const frozen = congelar(base())
    renderApp(<FlowEditor value={frozen} onChange={onFlow} />)
    const paleta = screen.getByRole('group', { name: 'Blocos' })
    for (const nome of ['Gatilho', 'Ação', 'Condição', 'Espera', 'Fim'])
      expect(within(paleta).getByRole('button', { name: nome })).toBeInTheDocument()
    await userEvent.click(within(paleta).getByRole('button', { name: 'Condição' }))
    expect(onFlow).toHaveBeenCalledTimes(1)
    const novo = onFlow.mock.calls[0]![0] as Flow
    expect(novo.nodes).toHaveLength(7)
    const extra = novo.nodes.find((n) => n.id === 'condicao-1')!
    expect(extra).toMatchObject({ type: 'condicao', data: { label: 'Condição' } })
    expect(frozen.nodes).toHaveLength(6)
  })

  it('com Enter na paleta também adiciona; o novo bloco aparece na tela', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    screen.getByRole('button', { name: 'Espera' }).focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(blocos(container)).toBe(7))
    expect(current().nodes.some((n) => n.id === 'espera-1')).toBe(true)
  })

  it('já existindo um gatilho, a paleta avisa e não adiciona outro', async () => {
    const onFlow = vi.fn()
    renderApp(<FlowEditor value={base()} onChange={onFlow} />)
    await userEvent.click(screen.getByRole('button', { name: 'Gatilho' }))
    expect(onFlow).not.toHaveBeenCalled()
    expect(await screen.findByText(/Já existe um gatilho/)).toBeInTheDocument()
  })

  it('arrastar da paleta e soltar sobre o canvas adiciona o bloco na posição da soltura', async () => {
    const onFlow = vi.fn()
    renderApp(<FlowEditor value={base()} onChange={onFlow} />)
    await settle()
    const item = screen.getByRole('button', { name: 'Ação' })
    fireEvent.pointerDown(item, { button: 0, pointerId: 1, clientX: 5, clientY: 5 })
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 300, clientY: 200 })
    expect(document.querySelector('[data-flow-drag]')).toBeInTheDocument()
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 400, clientY: 300 })
    expect(onFlow).toHaveBeenCalledTimes(1)
    const novo = (onFlow.mock.calls[0]![0] as Flow).nodes.at(-1)!
    expect(novo.type).toBe('acao')
    // a posição acompanha a soltura: 200 px mais à direita dão 200 unidades a mais (zoom 1)
    fireEvent.pointerDown(item, { button: 0, pointerId: 3, clientX: 5, clientY: 5 })
    fireEvent.pointerMove(window, { pointerId: 3, clientX: 500, clientY: 200 })
    fireEvent.pointerUp(window, { pointerId: 3, clientX: 600, clientY: 300 })
    const outro = (onFlow.mock.calls[1]![0] as Flow).nodes.at(-1)!
    expect(outro.position.x - novo.position.x).toBeCloseTo(200)
    expect(outro.position.y).toBeCloseTo(novo.position.y)
    expect(document.querySelector('[data-flow-drag]')).not.toBeInTheDocument()
    // o clique que vem depois do arraste não adiciona outro
    fireEvent.click(item)
    expect(onFlow).toHaveBeenCalledTimes(2)
  })

  it('soltar fora do canvas ou apertar Esc durante o arraste não adiciona nada', async () => {
    const onFlow = vi.fn()
    renderApp(<FlowEditor value={base()} onChange={onFlow} />)
    await settle()
    const item = screen.getByRole('button', { name: 'Ação' })
    fireEvent.pointerDown(item, { button: 0, pointerId: 1, clientX: 5, clientY: 5 })
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 900, clientY: 900 })
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 900, clientY: 900 })
    expect(onFlow).not.toHaveBeenCalled()

    fireEvent.pointerDown(item, { button: 0, pointerId: 2, clientX: 5, clientY: 5 })
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 300, clientY: 200 })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('[data-flow-drag]')).not.toBeInTheDocument()
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 300, clientY: 200 })
    expect(onFlow).not.toHaveBeenCalled()
  })
})

describe('FlowEditor: ligar, apagar e mover (callbacks da biblioteca)', () => {
  it('ligar dois blocos pelo gesto grava a ligação; na condição usa o ramo da alça', async () => {
    const onFlow = vi.fn()
    const flow: Flow = {
      nodes: base().nodes,
      edges: [],
    }
    renderApp(<FlowEditor value={flow} onChange={onFlow} />)
    rf.onConnect?.({ source: 'g', target: 'a', sourceHandle: null, targetHandle: null })
    expect((onFlow.mock.calls[0]![0] as Flow).edges).toEqual([
      { id: 'g->a', source: 'g', target: 'a' },
    ])
    rf.onConnect?.({ source: 'c', target: 'f1', sourceHandle: 'nao', targetHandle: null })
    expect((onFlow.mock.calls[1]![0] as Flow).edges[0]).toEqual({
      id: 'c:nao->f1',
      source: 'c',
      target: 'f1',
      branch: 'nao',
    })
  })

  it('uma ligação recusada avisa o motivo e não muda o fluxo', async () => {
    const onFlow = vi.fn()
    renderApp(<FlowEditor value={base()} onChange={onFlow} />)
    rf.onConnect?.({ source: 'a', target: 'a', sourceHandle: null, targetHandle: null })
    rf.onConnect?.({ source: 'f1', target: 'a', sourceHandle: null, targetHandle: null })
    expect(onFlow).not.toHaveBeenCalled()
    expect(await screen.findByText(/não tem saída/)).toBeInTheDocument()
  })

  it('apagar bloco e ligação (onDelete) tira o bloco com as ligações dele, de uma vez', async () => {
    const onFlow = vi.fn()
    renderApp(<FlowEditor value={base()} onChange={onFlow} />)
    rf.onDelete?.({
      nodes: [{ id: 'a' }] as never,
      edges: [{ id: 'g->a' }, { id: 'a->c' }] as never,
    })
    expect(onFlow).toHaveBeenCalledTimes(1)
    const novo = onFlow.mock.calls[0]![0] as Flow
    expect(novo.nodes.map((n) => n.id)).not.toContain('a')
    expect(novo.edges.map((e) => e.id)).not.toContain('a->c')
    expect(novo.edges.map((e) => e.id)).not.toContain('g->a')
    expect(novo.edges).toHaveLength(3)
  })

  it('apagar uma ligação sozinha tira só ela', () => {
    const onFlow = vi.fn()
    renderApp(<FlowEditor value={base()} onChange={onFlow} />)
    rf.onDelete?.({ nodes: [], edges: [{ id: 'e->f1' }] as never })
    const novo = onFlow.mock.calls[0]![0] as Flow
    expect(novo.nodes).toHaveLength(6)
    expect(novo.edges.some((e) => e.id === 'e->f1')).toBe(false)
  })

  it('em somente leitura nada apaga', async () => {
    renderApp(<FlowEditor value={base()} onChange={() => {}} readOnly />)
    expect(await rf.onBeforeDelete?.({ nodes: [], edges: [] })).toBe(false)
    expect(rf.deleteKeyCode).toBeNull()
    expect(rf.nodesDraggable).toBe(false)
    expect(rf.nodesConnectable).toBe(false)
  })

  it('mover o bloco (fim do arraste ou setas) muda a posição no JSON; sem mudança nada muda', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const pos = (id: string) => current().nodes.find((n) => n.id === id)!.position
    act(() =>
      rf.onNodeDragStop?.(
        {} as never,
        { id: 'a', position: { x: 40, y: 50 } } as never,
        [{ id: 'a', position: { x: 40, y: 50 } }] as never,
      ),
    )
    expect(pos('a')).toEqual({ x: 40, y: 50 })
    act(() =>
      rf.onNodesChange?.([
        { type: 'position', id: 'g', position: { x: 10, y: 0 }, dragging: false },
      ] as never),
    )
    expect(pos('g')).toEqual({ x: 10, y: 0 })
    // arrastar sem sair do lugar não mexe em ninguém
    const antes = screen.getByTestId('json').textContent
    act(() =>
      rf.onNodeDragStop?.(
        {} as never,
        { id: 'a', position: { x: 40, y: 50 } } as never,
        [{ id: 'a', position: { x: 40, y: 50 } }] as never,
      ),
    )
    expect(screen.getByTestId('json').textContent).toBe(antes)
  })
})

describe('FlowEditor: gaveta do bloco', () => {
  it('abre pelo botão Editar, mostra o rótulo e aplica o rótulo novo', async () => {
    const onFlow = vi.fn()
    renderApp(<Host initial={base()} onFlow={onFlow} />)
    await settle()
    const gaveta = await abrirGaveta('Enviar e-mail')
    expect(within(gaveta).getByText('Ação')).toBeInTheDocument()
    const campo = within(gaveta).getByLabelText('Rótulo')
    expect(campo).toHaveValue('Enviar e-mail')
    await userEvent.clear(campo)
    await userEvent.type(campo, 'Avisar o cliente')
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(current().nodes.find((n) => n.id === 'a')?.data.label).toBe('Avisar o cliente')
    expect(await screen.findByText('Avisar o cliente')).toBeInTheDocument()
  })

  it('Cancelar sem mudar não altera nada; com mudança pede para confirmar o descarte', async () => {
    const onFlow = vi.fn()
    renderApp(<Host initial={base()} onFlow={onFlow} />)
    await settle()
    let gaveta = await abrirGaveta('Enviar e-mail')
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onFlow).not.toHaveBeenCalled()

    gaveta = await abrirGaveta('Enviar e-mail')
    await userEvent.type(within(gaveta).getByLabelText('Rótulo'), ' x')
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Cancelar' }))
    expect((await screen.findAllByText('Descartar alterações?')).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(screen.queryAllByText('Descartar alterações?')).toHaveLength(0))
    expect(onFlow).not.toHaveBeenCalled()
    // reabrir mostra o valor original, sem o rascunho descartado
    gaveta = await abrirGaveta('Enviar e-mail')
    expect(within(gaveta).getByLabelText('Rótulo')).toHaveValue('Enviar e-mail')
  })

  it('"Próximo bloco" liga, troca e desliga sem arrastar, e não oferece o próprio bloco nem o gatilho', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    let gaveta = await abrirGaveta('Enviar e-mail')
    const campo = within(gaveta).getByRole('combobox', { name: 'Próximo bloco' })
    expect(campo).toHaveTextContent('Pedido pago?')
    await userEvent.click(campo)
    const opcoes = (await screen.findAllByRole('option')).map((o) => o.textContent ?? '')
    expect(opcoes.some((t) => t.includes('Enviar e-mail'))).toBe(false)
    expect(opcoes.some((t) => t.includes('Novo pedido'))).toBe(false)
    expect(opcoes.some((t) => t.includes('Nenhum'))).toBe(true)
    await userEvent.click(screen.getByRole('option', { name: /Fim pago/ }))
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(current().edges.find((e) => e.source === 'a')?.target).toBe('f1')

    gaveta = await abrirGaveta('Enviar e-mail')
    await userEvent.click(within(gaveta).getByRole('combobox', { name: 'Próximo bloco' }))
    await userEvent.click(await screen.findByRole('option', { name: /Nenhum/ }))
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(current().edges.some((e) => e.source === 'a')).toBe(false)
  })

  it('na condição aparecem "Se sim" e "Se não", cada um com o seu destino', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const gaveta = await abrirGaveta('Pedido pago?')
    expect(within(gaveta).getByRole('combobox', { name: 'Se sim' })).toHaveTextContent('Esperar')
    const naoCampo = within(gaveta).getByRole('combobox', { name: 'Se não' })
    expect(naoCampo).toHaveTextContent('Fim não pago')
    await userEvent.click(naoCampo)
    await userEvent.click(await screen.findByRole('option', { name: /Fim pago/ }))
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const saidas = current().edges.filter((e) => e.source === 'c')
    expect(saidas.find((e) => e.branch === 'nao')?.target).toBe('f1')
    expect(saidas.find((e) => e.branch === 'sim')?.target).toBe('e')
  })

  it('a espera edita a duração e a unidade', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const gaveta = await abrirGaveta('Esperar')
    const duracao = within(gaveta).getByLabelText('Duração')
    expect(duracao).toHaveValue('5')
    await userEvent.clear(duracao)
    await userEvent.type(duracao, '2')
    await userEvent.click(within(gaveta).getByRole('combobox', { name: 'Unidade' }))
    await userEvent.click(await screen.findByRole('option', { name: 'horas' }))
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(current().nodes.find((n) => n.id === 'e')?.data.config).toEqual({
      duration: 2,
      unit: 'horas',
    })
    expect(await screen.findByText('2 horas')).toBeInTheDocument()
  })

  it('duração inválida mostra o erro e não deixa aplicar', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const gaveta = await abrirGaveta('Esperar')
    const duracao = within(gaveta).getByLabelText('Duração')
    await userEvent.clear(duracao)
    expect(await within(gaveta).findByText(/número maior que zero/)).toBeInTheDocument()
    expect(within(gaveta).getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('"Excluir bloco" pede confirmação: cancelar não apaga, confirmar apaga o bloco e as ligações', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    let gaveta = await abrirGaveta('Enviar e-mail')
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Mais ações' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Excluir bloco' }))
    expect((await screen.findAllByText('Excluir este bloco?')).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar', hidden: false }))
    await waitFor(() => expect(screen.queryAllByText('Excluir este bloco?')).toHaveLength(0))
    expect(current().nodes.some((n) => n.id === 'a')).toBe(true)

    gaveta = screen.getByRole('dialog')
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Mais ações' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Excluir bloco' }))
    await screen.findAllByText('Excluir este bloco?')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(current().nodes.some((n) => n.id === 'a')).toBe(false))
    expect(current().edges.some((e) => e.source === 'a' || e.target === 'a')).toBe(false)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('o gatilho e o fim não têm "Próximo bloco" quando não cabe', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const gaveta = await abrirGaveta('Fim pago')
    expect(within(gaveta).queryByRole('combobox', { name: 'Próximo bloco' })).toBeNull()
  })
})

describe('FlowEditor: teclado', () => {
  it('Enter no bloco focado abre a gaveta e Esc fecha', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    const no = container.querySelector('.react-flow__node[data-id="a"]') as HTMLElement
    no.focus()
    await userEvent.keyboard('{Enter}')
    const gaveta = await screen.findByRole('dialog')
    expect(within(gaveta).getByLabelText('Rótulo')).toHaveValue('Enviar e-mail')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('com a gaveta aberta, Delete não apaga o bloco; fechada, o bloco some', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    // a biblioteca só chama onDelete quando onBeforeDelete deixa
    const apagar = async () => {
      if (await rf.onBeforeDelete?.({ nodes: [], edges: [] }))
        act(() => rf.onDelete?.({ nodes: [{ id: 'a' }] as never, edges: [] }))
    }
    await abrirGaveta('Enviar e-mail')
    await apagar()
    expect(current().nodes.some((n) => n.id === 'a')).toBe(true)
    expect(screen.getByText('Enviar e-mail')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await apagar()
    expect(current().nodes.some((n) => n.id === 'a')).toBe(false)
    await waitFor(() => expect(screen.queryByText('Enviar e-mail')).not.toBeInTheDocument())
  })

  it('em condições normais a biblioteca pode apagar (Delete e Backspace)', async () => {
    renderApp(<FlowEditor value={base()} onChange={() => {}} />)
    expect(rf.deleteKeyCode).toEqual(['Delete', 'Backspace'])
    expect(await rf.onBeforeDelete?.({ nodes: [], edges: [] })).toBe(true)
    expect(rf.zoomOnDoubleClick).toBe(false)
  })
})

describe('FlowEditor: validar', () => {
  it('mostra uma mensagem por problema, cada uma com "Ver bloco", e marca os blocos no canvas', async () => {
    const quebrado = base()
    quebrado.edges = quebrado.edges.filter((e) => e.id !== 'a->c')
    const erroDoReact = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderApp(<Host initial={quebrado} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Validar' }))
    const esperado = validateFlow(quebrado)
    const relatorio = await screen.findByRole('region', { name: 'Validação do fluxo' })
    for (const issue of esperado)
      expect(within(relatorio).getByText(issue.message)).toBeInTheDocument()
    const ver = within(relatorio).getAllByRole('button', { name: /Ver bloco/ })
    expect(ver.length).toBe(esperado.filter((i) => i.nodeId).length)
    // HTML válido: a lista não fica dentro de um parágrafo (o React reclama no console)
    expect(relatorio.querySelector('p ul')).toBeNull()
    expect(erroDoReact).not.toHaveBeenCalled()
    erroDoReact.mockRestore()
    await userEvent.click(ver[0]!)
    expect(container.querySelector('.react-flow__node.selected')).toBeInTheDocument()
    await waitFor(() =>
      expect(container.querySelector('[data-flow-node][data-invalid="true"]')).toBeInTheDocument(),
    )
  })

  it('fluxo válido mostra a confirmação', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Validar' }))
    expect(await screen.findByText('Fluxo válido')).toBeInTheDocument()
  })
})

describe('FlowEditor: testar fluxo (simulação)', () => {
  it('fluxo inválido mostra as mensagens e não cria passo', async () => {
    const quebrado = base()
    quebrado.edges = quebrado.edges.filter((e) => e.id !== 'g->a')
    renderApp(<Host initial={quebrado} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const painel = await screen.findByRole('region', { name: 'Teste do fluxo' })
    for (const i of validateFlow(quebrado))
      expect(within(painel).getByText(i.message)).toBeInTheDocument()
    expect(painel.querySelector('ol')).toBeNull()
    expect(within(painel).getByRole('button', { name: 'Avançar' })).toBeDisabled()
  })

  it('percorre passo a passo, escolhe o ramo da condição e termina no fim', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const painel = await screen.findByRole('region', { name: 'Teste do fluxo' })
    const avancar = () => userEvent.click(within(painel).getByRole('button', { name: 'Avançar' }))
    const passos = () => within(painel).queryAllByRole('listitem')
    expect(passos()).toHaveLength(0)
    const ativo = () =>
      container.querySelector('[data-flow-node][data-active="true"]')?.getAttribute('data-block-id')
    expect(ativo()).toBe('g')

    await avancar()
    expect(passos()).toHaveLength(1)
    expect(within(passos()[0]!).getByText('Novo pedido')).toBeInTheDocument()
    expect(within(passos()[0]!).getByText('Concluído')).toBeInTheDocument()
    await waitFor(() => expect(ativo()).toBe('a'))
    await avancar()
    expect(passos()).toHaveLength(2)
    await waitFor(() => expect(ativo()).toBe('c'))

    // na condição: Avançar espera a escolha
    expect(within(painel).getByRole('button', { name: 'Avançar' })).toBeDisabled()
    await userEvent.click(within(painel).getByRole('button', { name: 'Não' }))
    expect(passos()).toHaveLength(3)
    expect(within(passos()[2]!).getByText('Escolha: Não')).toBeInTheDocument()
    expect(within(painel).queryByText('Esperar')).not.toBeInTheDocument()
    await waitFor(() => expect(ativo()).toBe('f2'))
    await avancar()
    expect(passos()).toHaveLength(4)
    expect(within(painel).getByText('Fluxo concluído')).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Avançar' })).toBeDisabled()
    expect(ativo()).toBeUndefined()
  })

  it('o ramo "Sim" passa pela espera e mostra quanto aguardaria', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const painel = await screen.findByRole('region', { name: 'Teste do fluxo' })
    await userEvent.click(within(painel).getByRole('button', { name: 'Avançar' }))
    await userEvent.click(within(painel).getByRole('button', { name: 'Avançar' }))
    await userEvent.click(within(painel).getByRole('button', { name: 'Sim' }))
    await userEvent.click(within(painel).getByRole('button', { name: 'Avançar' }))
    expect(within(painel).getByText('Aguardaria 5 minutos')).toBeInTheDocument()
  })

  it('Reiniciar volta ao começo e Fechar limpa o destaque do canvas', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const painel = await screen.findByRole('region', { name: 'Teste do fluxo' })
    await userEvent.click(within(painel).getByRole('button', { name: 'Avançar' }))
    await userEvent.click(within(painel).getByRole('button', { name: 'Reiniciar' }))
    expect(within(painel).queryAllByRole('listitem')).toHaveLength(0)
    await waitFor(() =>
      expect(
        container
          .querySelector('[data-flow-node][data-active="true"]')
          ?.getAttribute('data-block-id'),
      ).toBe('g'),
    )
    await userEvent.click(within(painel).getByRole('button', { name: 'Fechar teste' }))
    expect(screen.queryByRole('region', { name: 'Teste do fluxo' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(container.querySelector('[data-flow-node][data-active="true"]')).toBeNull(),
    )
  })

  it('em somente leitura a simulação continua disponível', async () => {
    renderApp(<FlowEditor value={base()} onChange={() => {}} readOnly />)
    expect(screen.queryByRole('group', { name: 'Blocos' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    expect(await screen.findByRole('region', { name: 'Teste do fluxo' })).toBeInTheDocument()
  })
})

describe('FlowEditor: celular (360 px)', () => {
  beforeEach(() => setViewportWidth(360))

  it('só ver e navegar: sem paleta, sem alça de ligar, blocos não arrastam, zoom presente', async () => {
    const { container } = renderApp(<FlowEditor value={base()} onChange={() => {}} />)
    await settle()
    expect(screen.queryByRole('group', { name: 'Blocos' })).not.toBeInTheDocument()
    expect(rf.nodesDraggable).toBe(false)
    expect(rf.nodesConnectable).toBe(false)
    expect(container.querySelectorAll('.react-flow__handle.connectable')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Aproximar' })).toBeInTheDocument()
    expect(container.querySelector('[data-flow-edit]')).toBeNull()
  })

  it('tocar no bloco abre a gaveta, e lá dá para ligar ao próximo e excluir', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    // toque: só o click (o mousedown do user-event não traz `view`, que o d3-zoom lê no jsdom)
    fireEvent.click(blocoPor('Enviar e-mail'))
    const gaveta = await screen.findByRole('dialog')
    await userEvent.click(within(gaveta).getByRole('combobox', { name: 'Próximo bloco' }))
    await userEvent.click(await screen.findByRole('option', { name: /Fim pago/ }))
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(current().edges.find((e) => e.source === 'a')?.target).toBe('f1')

    // toque: só o click (o mousedown do user-event não traz `view`, que o d3-zoom lê no jsdom)
    fireEvent.click(blocoPor('Enviar e-mail'))
    const outra = await screen.findByRole('dialog')
    await userEvent.click(within(outra).getByRole('button', { name: 'Mais ações' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Excluir bloco' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(current().nodes.some((n) => n.id === 'a')).toBe(false))
  })
})

describe('FlowEditor: movimento', () => {
  it('em off o bloco ativo tem destaque estático; em on ganha o anel que pulsa', async () => {
    const { container, unmount } = renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    await waitFor(() => expect(container.querySelector('[data-active="true"]')).toBeTruthy())
    expect(container.querySelector('[data-flow-pulse]')).toBeNull()
    unmount()

    const on = renderApp(
      <MotionProvider mode={motionOn}>
        <Host initial={base()} />
      </MotionProvider>,
    )
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    await waitFor(() => expect(on.container.querySelector('[data-flow-pulse]')).toBeTruthy())
  })
})
