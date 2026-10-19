/*
 * Preparação dos testes unitários e de componente (Vitest).
 * Testes de componente declaram `// @vitest-environment jsdom` na primeira linha; os de
 * funções puras rodam no Node, mais rápido. Aqui entra o que o jsdom não tem e os
 * componentes usam: matchMedia (useBreakpoint), ResizeObserver, IntersectionObserver e as
 * funções de ponteiro e rolagem que o Radix chama.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach } from 'vitest'

// Os testes afirmam o estado final, sem esperar tempo de animação (o Motion só roda com
// `motion="on"`; os testes de saída animada ligam isto de volta por conta própria).
MotionGlobalConfig.skipAnimations = true

if (typeof window !== 'undefined') {
  afterEach(() => cleanup())

  /** Largura simulada da tela. Padrão: desktop (1280px). Mude com setViewportWidth. */
  let width = 1280
  const listeners = new Set<() => void>()
  ;(globalThis as { setViewportWidth?: (w: number) => void }).setViewportWidth = (w: number) => {
    width = w
    listeners.forEach((l) => l())
  }
  window.matchMedia = (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query)
    const max = /max-width:\s*(\d+)px/.exec(query)
    const matches =
      (!min || width >= Number(min[1])) &&
      (!max || width <= Number(max[1])) &&
      !query.includes('prefers-reduced-motion')
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
      addListener: (l: () => void) => listeners.add(l),
      removeListener: (l: () => void) => listeners.delete(l),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }

  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  window.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
  window.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver

  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.scrollTo ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
}
