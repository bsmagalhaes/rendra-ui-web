import { useMemo, useSyncExternalStore } from 'react'
import { getReducedMotion, subscribeReducedMotion } from '@/hooks/use-reduced-motion'
import { useMotionMode } from './motion-context'
import { createPresets, presetsFromDocument, type Presets } from './presets'
import { DURATION, EASE } from './tokens'

/** Em `off` ninguém lê o documento nem assina o matchMedia: um objeto único e inerte. */
const OFF_PRESETS = createPresets({ duration: DURATION, ease: EASE }, false)
const noSubscribe = () => () => {}
const never = () => false

/**
 * Presets do motion para o componente. A preferência "reduzir movimento" vem do mesmo
 * `matchMedia` do hook do projeto (`use-reduced-motion.ts`: Spinner, Progress), a fonte única,
 * reativa e testável, sem `MotionConfig reducedMotion` somando por cima. Só em `on` a
 * preferência é assinada e os tokens lidos do documento; em `off` o custo é zero.
 */
export function useMotionPresets(): Presets {
  const on = useMotionMode() === 'on'
  const reduced = useSyncExternalStore(
    on ? subscribeReducedMotion : noSubscribe,
    on ? getReducedMotion : never,
    never,
  )
  return useMemo(() => (on ? presetsFromDocument(reduced) : OFF_PRESETS), [on, reduced])
}
