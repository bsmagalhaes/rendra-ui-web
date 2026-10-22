import {
  AnimatePresence,
  animate,
  domAnimation,
  m,
  useDragControls,
  useMotionValue,
  useTransform,
} from 'motion/react'

/*
 * O motor do `on`: tudo o que os componentes usam do Motion, num objeto só. É o ÚNICO arquivo de
 * produção (além das páginas de demonstração lazy) que importa valores de `motion/react`: os
 * componentes leem o objeto por contexto (`useMotionLib`) em vez de importá-lo, e por isso o Motion
 * não entra no bundle inicial de quem usa o Rendra em `off`.
 *
 * Duas formas de entregar o objeto ao provider:
 *  - `motion={rendraMotion}` (import de `@rendra-ui/web/motion`): síncrono, `on` desde o primeiro
 *    quadro e no servidor; o bundler do host põe o Motion no chunk de quem importa.
 *  - `motion="on"` (texto): o provider carrega este módulo por `import()` depois do primeiro quadro.
 *
 * Hooks do Motion ficam no objeto com nome `useX` de propósito: as regras de hooks do React
 * enxergam `lib.useMotionValue(...)` como hook e cobram a ordem estável.
 */
/** O objeto do Motion que o provider aceita em `motion={...}` e que `useMotionLib()` devolve. */
export interface RendraMotion {
  m: typeof m
  AnimatePresence: typeof AnimatePresence
  animate: typeof animate
  useMotionValue: typeof useMotionValue
  useTransform: typeof useTransform
  useDragControls: typeof useDragControls
  domAnimation: typeof domAnimation
}

export const rendraMotion: RendraMotion = {
  m,
  AnimatePresence,
  animate,
  useMotionValue,
  useTransform,
  useDragControls,
  domAnimation,
}
