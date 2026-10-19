import { domAnimation, LazyMotion } from 'motion/react'
import { createContext, useContext, type ReactNode } from 'react'

/*
 * Modo de motion do Rendra. `off` (padrão): nada do Motion é montado, e o DOM e o
 * comportamento são os de sempre. `on`: os componentes trocam o elemento por `m.*` e animam.
 * O estado vive neste contexto próprio, não no do RendraProvider: o provider só o alimenta
 * pela prop `motion`, e uma tela (a de comparação) aninha o contexto para trocar on e off.
 */

export type MotionMode = 'off' | 'on'

const MotionContext = createContext<MotionMode>('off')

/** Modo de motion do provider mais próximo (`off` sem provider). */
export function useMotionMode(): MotionMode {
  return useContext(MotionContext)
}

/** Só troca o modo lido pelos componentes; não monta nem desmonta o LazyMotion. */
export function MotionModeScope({ mode, children }: { mode: MotionMode; children: ReactNode }) {
  return <MotionContext.Provider value={mode}>{children}</MotionContext.Provider>
}

/** O carregador do `domMax` (chunk à parte): layout, layoutId e arraste do Motion. */
const loadMax = () => import('./features-max').then((m) => m.default)

/**
 * Em `off`, só o contexto (nenhum nó novo, nenhum LazyMotion). Em `on`, o `LazyMotion` com o
 * `domAnimation` síncrono (animação e gestos) e, dentro dele, um segundo `LazyMotion` que
 * carrega o `domMax` sob demanda (layout), em chunk separado.
 */
export function MotionProvider({ mode, children }: { mode: MotionMode; children: ReactNode }) {
  if (mode !== 'on') return <MotionModeScope mode="off">{children}</MotionModeScope>
  return (
    <LazyMotion features={domAnimation}>
      <LazyMotion features={loadMax}>
        <MotionModeScope mode="on">{children}</MotionModeScope>
      </LazyMotion>
    </LazyMotion>
  )
}
