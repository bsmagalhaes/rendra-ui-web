// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Flow } from '@/lib/flow'
import { renderApp } from '@/test/render'
import { FlowViewer } from './flow-viewer'

/*
 * jsdom não faz layout nem tem ResizeObserver que mede, DOMMatrixReadOnly ou getBBox, e o React
 * Flow depende dos quatro para medir os blocos e desenhar as ligações. O mock mora aqui, no
 * teste (como o clientWidth do widget-grid.test.tsx), e é desfeito no afterEach.
 */
const proto = HTMLElement.prototype
const saved = {
  offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  offsetHeight: Object.getOwnPropertyDescriptor(proto, 'offsetHeight'),
  clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
  clientHeight: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
  getBBox: Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox'),
}
function mockLayout() {
  const size = (el: HTMLElement) =>
    el.classList.contains('react-flow__node') ? { w: 224, h: 64 } : { w: 800, h: 600 }
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
}
beforeEach(mockLayout)
afterEach(restoreLayout)

const flow: Flow = {
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
    { id: 'f', type: 'fim', position: { x: 0, y: 360 }, data: { label: 'Concluído' } },
  ],
  edges: [
    { id: 'g->a', source: 'g', target: 'a' },
    { id: 'a->c', source: 'a', target: 'c' },
    { id: 'c:sim->e', source: 'c', target: 'e', branch: 'sim' },
    { id: 'c:nao->f', source: 'c', target: 'f', branch: 'nao' },
    { id: 'e->f', source: 'e', target: 'f' },
  ],
}

describe('FlowViewer', () => {
  it('mostra o rótulo e o tipo de cada bloco, o código do catálogo e as saídas Sim e Não', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    expect(container.querySelector('[data-rendra="FLX-002"]')).toBeInTheDocument()
    for (const label of ['Novo pedido', 'Enviar e-mail', 'Pedido pago?', 'Esperar', 'Concluído'])
      expect(screen.getByText(label)).toBeInTheDocument()
    // o tipo aparece em texto, não só pela cor
    for (const tipo of ['Gatilho', 'Ação', 'Condição', 'Espera', 'Fim'])
      expect(screen.getAllByText(tipo).length).toBeGreaterThan(0)
    expect(screen.getByText('5 minutos')).toBeInTheDocument()
    const condicao = screen.getByText('Pedido pago?').closest('[data-flow-node]') as HTMLElement
    expect(within(condicao).getByText('Sim')).toBeInTheDocument()
    expect(within(condicao).getByText('Não')).toBeInTheDocument()
    expect(container.querySelectorAll('.react-flow__node')).toHaveLength(5)
    await vi.waitFor(() => expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(5))
  })

  it('descreve blocos e ligações em português para quem usa leitor de tela', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    await vi.waitFor(() => expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(5))
    const node = container.querySelector('.react-flow__node[data-id="g"]')!
    expect(node.getAttribute('aria-roledescription')).toBe('bloco')
    expect(node.getAttribute('aria-label')).toBe('Novo pedido')
    const edge = container.querySelector('.react-flow__edge[data-id="c:sim->e"]')!
    expect(edge.getAttribute('aria-roledescription')).toBe('ligação')
    expect(edge.getAttribute('aria-label')).toBe('De "Pedido pago?" para "Esperar", se sim')
    const ligacao = container.querySelector('.react-flow__edge[data-id="g->a"]')!
    expect(ligacao.getAttribute('aria-label')).toBe('De "Novo pedido" para "Enviar e-mail"')
    // as descrições que a biblioteca escreve no DOM não ficam em inglês
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/Press enter|Press delete|Control Panel/)
  })

  it('é só leitura: sem alça de ligar, bloco não arrasta, nem seleciona', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    expect(container.querySelectorAll('.react-flow__handle.connectable')).toHaveLength(0)
    const node = container.querySelector('.react-flow__node[data-id="a"]') as HTMLElement
    expect(node.classList.contains('draggable')).toBe(false)
    expect(node.classList.contains('selectable')).toBe(false)
    // Delete com o bloco focado não apaga nada: o viewer nem recebe onChange
    node.focus()
    await userEvent.keyboard('{Delete}')
    expect(container.querySelectorAll('.react-flow__node')).toHaveLength(5)
    expect(container.querySelector('.react-flow__node.selected')).toBeNull()
  })

  it('activeId destaca só o bloco indicado, e o destaque muda de lugar', () => {
    const { container, rerender } = renderApp(<FlowViewer value={flow} activeId="a" />)
    const ativos = () =>
      Array.from(container.querySelectorAll('[data-flow-node][data-active="true"]')).map((el) =>
        el.closest('.react-flow__node')?.getAttribute('data-id'),
      )
    expect(ativos()).toEqual(['a'])
    // texto, não só cor
    expect(
      within(container.querySelector('[data-active="true"]') as HTMLElement).getByText('Ativo'),
    ).toBeInTheDocument()
    rerender(<FlowViewer value={flow} activeId="c" />)
    expect(ativos()).toEqual(['c'])
    rerender(<FlowViewer value={flow} />)
    expect(ativos()).toEqual([])
  })

  it('bloco com problema mostra marca e texto, ligado por aria-describedby', () => {
    const { container } = renderApp(
      <FlowViewer
        value={flow}
        issues={[
          {
            code: 'sem-saida',
            message: 'O bloco "Enviar e-mail" não leva a nenhum próximo bloco.',
            nodeId: 'a',
          },
        ]}
      />,
    )
    const bloco = screen.getByText('Enviar e-mail').closest('[data-flow-node]') as HTMLElement
    expect(bloco.getAttribute('data-invalid')).toBe('true')
    const texto = within(bloco).getByText(/não leva a nenhum próximo bloco/)
    expect(bloco.getAttribute('aria-describedby')).toBe(texto.id)
    expect(within(bloco).getByText('Problema')).toBeInTheDocument()
    const outro = screen.getByText('Esperar').closest('[data-flow-node]') as HTMLElement
    expect(outro.getAttribute('data-invalid')).toBeNull()
    expect(container.querySelectorAll('[data-invalid="true"]')).toHaveLength(1)
  })

  it('tem zoom e enquadrar próprios, com 44 px de toque, e não usa os controles da biblioteca', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    expect(container.querySelector('.react-flow__controls')).toBeNull()
    for (const nome of ['Aproximar', 'Afastar', 'Enquadrar']) {
      const botao = screen.getByRole('button', { name: nome })
      expect(botao.className).toContain('min-h-touch')
      expect(botao.className).toContain('min-w-touch')
    }
    const viewport = container.querySelector('.react-flow__viewport') as HTMLElement
    const zoom = () => Number(/scale\(([\d.]+)\)/.exec(viewport.style.transform)?.[1])
    const antes = zoom()
    await act(async () => {
      screen.getByRole('button', { name: 'Aproximar' }).click()
    })
    await vi.waitFor(() => expect(zoom()).toBeGreaterThan(antes))
    const depois = zoom()
    await act(async () => {
      screen.getByRole('button', { name: 'Afastar' }).click()
    })
    await vi.waitFor(() => expect(zoom()).toBeLessThan(depois))
  })

  it('mantém o link de atribuição do React Flow, que fica visível e com área de toque', () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    const link = container.querySelector('.react-flow__attribution a') as HTMLAnchorElement
    expect(link).toBeInTheDocument()
    expect(link.textContent).toBe('React Flow')
    expect(link.href).toMatch(/reactflow\.dev/)
  })
})

describe('tema do fluxo (bloco em @layer rendra.components)', () => {
  const css = readFileSync('src/styles/globals.css', 'utf8')
  const fonte = readFileSync('src/components/ui/flow-viewer.tsx', 'utf8')

  it('existe, usa só tokens e nunca declara --xy-* no CSS publicado', () => {
    expect(css).toMatch(/\.flow-surface\s/)
    expect(css).not.toMatch(/--xy-[\w-]+\s*:/)
    const bloco = css.slice(css.indexOf('.flow-surface'))
    expect(bloco).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(bloco).toContain('var(--rendra-')
  })

  it('a ponte --xy-* vai no style do contêiner, apontando para os tokens do Rendra', () => {
    for (const nome of [
      '--xy-edge-stroke',
      '--xy-edge-stroke-selected',
      '--xy-handle-background-color',
      '--xy-attribution-background-color',
    ])
      expect(fonte).toMatch(new RegExp(`'${nome}': 'var\\(--rendra-`))
  })
})
