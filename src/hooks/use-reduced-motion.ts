import { useSyncExternalStore } from 'react'

/*
 * Único hook de leitura de "menos movimento" do sistema operacional (prefers-reduced-motion).
 * Usado pelo Spinner e pelo Progress indeterminado para parar a animação sem depender só do
 * CSS, e assim ficar testável (mocke matchMedia para simular a preferência).
 */

/** Fonte única da preferência (também usada pelo motion, que só a assina em `on`). */
export function subscribeReducedMotion(cb: () => void) {
  const mq = matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function getReducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false)
}
