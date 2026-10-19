import { waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { expect } from 'vitest'

/*
 * Apoio dos testes do caminho `on`. Os testes rodam com as animações do Motion desligadas
 * (setup.ts); estes dois ajudam nos casos que precisam do contrário.
 */

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
