import type { Target, Transition } from 'motion/react'
import { readMotionTokens, type MotionTokens } from './tokens'

/*
 * Presets do caminho `on`: fade, scale, slide, pop, layout e stagger. Toda duração e toda curva
 * vêm de readMotionTokens (globals.css); nenhum número de duração mora neste arquivo (o
 * presets.test.ts varre o código-fonte atrás de literal). Com "reduzir movimento", todos viram
 * só opacidade e duração 0 (sem deslocamento nem escala).
 */

export interface MotionPreset {
  initial: Target
  animate: Target
  exit: Target
  transition: Transition
}

export type SlideFrom = 'left' | 'right' | 'top' | 'bottom'

/** Distância do slide: `full` (painel que entra da borda) ou `short` (conteúdo que assenta). */
export type SlideDistance = 'full' | 'short'

const SHORT_PX = 8
const POP_FROM = 0.5
const SCALE_FROM = 0.95

export interface Presets {
  reduced: boolean
  tokens: MotionTokens
  fade: MotionPreset
  scale: MotionPreset
  pop: MotionPreset
  slide: (from: SlideFrom, distance?: SlideDistance) => MotionPreset
  /** Transição de `layout`/`layoutId`. */
  layout: Transition
  /** Atraso de entrada do item `index`, limitado a `limit` itens. */
  stagger: (index: number, limit?: number) => Transition
}

export function createPresets(tokens: MotionTokens, reduced: boolean): Presets {
  const { duration, ease } = tokens
  const make = (initial: Target, animate: Target, time: number, curve = ease.out): MotionPreset => {
    if (reduced) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    }
    return {
      initial,
      animate,
      exit: initial,
      transition: { duration: time, ease: curve },
    }
  }
  const offset = (from: SlideFrom, distance: SlideDistance): Target => {
    const far = distance === 'full' ? '100%' : SHORT_PX
    const sign = from === 'left' || from === 'top' ? -1 : 1
    const value = typeof far === 'string' ? `${sign * 100}%` : sign * far
    return from === 'left' || from === 'right' ? { x: value, opacity: 0 } : { y: value, opacity: 0 }
  }
  const settled = (initial: Target): Target => ({
    opacity: 1,
    ...(initial.x !== undefined ? { x: 0 } : {}),
    ...(initial.y !== undefined ? { y: 0 } : {}),
  })

  return {
    reduced,
    tokens,
    fade: make({ opacity: 0 }, { opacity: 1 }, duration.base),
    scale: make({ opacity: 0, scale: SCALE_FROM }, { opacity: 1, scale: 1 }, duration.base),
    pop: make(
      { opacity: 0, scale: POP_FROM },
      { opacity: 1, scale: 1 },
      duration.slow,
      ease.spring,
    ),
    slide: (from, distance = 'full') => {
      const initial = offset(from, distance)
      return make(initial, settled(initial), distance === 'full' ? duration.slow : duration.base)
    },
    layout: reduced ? { duration: 0 } : { duration: duration.base, ease: ease.out },
    stagger: (index, limit = 10) => ({
      delay: reduced ? 0 : Math.min(index, limit) * (duration.fast / 2),
    }),
  }
}

/** Presets com os tokens lidos agora do documento. */
export function presetsFromDocument(reduced: boolean): Presets {
  return createPresets(readMotionTokens(), reduced)
}
