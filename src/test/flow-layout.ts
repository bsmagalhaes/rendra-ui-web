import { vi } from 'vitest'

/*
 * jsdom não faz layout nem tem ResizeObserver que mede, DOMMatrixReadOnly ou getBBox, e o React
 * Flow depende dos quatro para medir os blocos e desenhar as ligações. O mock mora aqui, usado
 * pelos testes de FlowViewer e FlowEditor (como o clientWidth do widget-grid.test.tsx), e é
 * desfeito por `restoreFlowLayout` no afterEach.
 */
const proto = HTMLElement.prototype
const saved = {
  offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  offsetHeight: Object.getOwnPropertyDescriptor(proto, 'offsetHeight'),
  clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
  clientHeight: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
  getBBox: Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getBBox'),
  getBoundingClientRect: Object.getOwnPropertyDescriptor(proto, 'getBoundingClientRect'),
}

/** Tamanho que o mock dá a cada bloco do canvas. */
export const MOCK_NODE = { w: 336, h: 160 }

export function mockFlowLayout() {
  const size = (el: HTMLElement) =>
    el.classList.contains('react-flow__node') ? MOCK_NODE : { w: 800, h: 600 }
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
    value(this: HTMLElement) {
      const { w, h } = size(this)
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

export function restoreFlowLayout() {
  for (const [key, d] of Object.entries(saved)) {
    const target = key === 'getBBox' ? SVGElement.prototype : proto
    if (d) Object.defineProperty(target, key, d)
    else delete (target as unknown as Record<string, unknown>)[key]
  }
  vi.unstubAllGlobals()
}
