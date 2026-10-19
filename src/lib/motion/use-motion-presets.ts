import { useMemo } from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { presetsFromDocument, type Presets } from './presets'

/**
 * Presets do motion para o componente. A preferência "reduzir movimento" vem do hook do
 * projeto (`usePrefersReducedMotion`, o mesmo `matchMedia` do Spinner e do Progress): uma fonte
 * só, reativa e testável, sem `MotionConfig reducedMotion` somando por cima.
 */
export function useMotionPresets(): Presets {
  const reduced = usePrefersReducedMotion()
  return useMemo(() => presetsFromDocument(reduced), [reduced])
}
