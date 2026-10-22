import { waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { expect } from 'vitest'
import { rendraMotion } from '@/lib/motion/motion-on'

/*
 * Apoio dos testes do caminho `on`. Os testes rodam com as animações do Motion desligadas
 * (setup.ts); estes dois ajudam nos casos que precisam do contrário.
 */

/**
 * O `on` dos testes: o objeto do Motion passado direto ao provider (`mode={motionOn}`), síncrono
 * e igual ao que `@rendra-ui/web/motion` entrega. Quem passa a string `'on'` espera o chunk.
 */
export const motionOn = rendraMotion

/** Simula `prefers-reduced-motion: reduce`. Devolve a função que restaura o `matchMedia`. */
export function reduceMotion() {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

/** Liga as animações de verdade (tempo real). Devolve a função que as desliga de novo. */
export function realAnimations() {
  MotionGlobalConfig.skipAnimations = false
  return () => {
    MotionGlobalConfig.skipAnimations = true
  }
}

/**
 * Espera a animação de entrada terminar (opacidade 1) e confere o transform final: `none` com
 * movimento (escala ou deslocamento voltou a zero) e vazio, sem nenhum transform, com movimento
 * reduzido (só opacidade).
 */
export async function expectSettled(el: HTMLElement, transform: 'none' | 'absent') {
  await waitFor(() => expect(el.style.opacity).toBe('1'))
  expect(el.style.transform).toBe(transform === 'none' ? 'none' : '')
}

/**
 * Espera o chunk do `domMax` chegar e o provider liberar o layout. Itens com `layout` remontam
 * uma vez quando isso acontece, então os testes que mexem na lista logo depois de montar
 * esperam este momento antes.
 */
export async function settleLayout() {
  await import('@/lib/motion/features-max')
  await new Promise((resolve) => setTimeout(resolve, 30))
}
