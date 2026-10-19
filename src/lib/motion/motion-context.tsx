import { domAnimation, LazyMotion } from 'motion/react'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/*
 * Modo de motion do Rendra. `off` (padrão): nada do Motion é montado, e o DOM e o
 * comportamento são os de sempre. `on`: os componentes trocam o elemento por `m.*` e animam.
 * O estado vive neste contexto próprio, não no do RendraProvider: o provider só o alimenta
 * pela prop `motion`, e uma tela (a de comparação) aninha o contexto para trocar on e off.
 */

export type MotionMode = 'off' | 'on'

interface MotionState {
  mode: MotionMode
  /**
   * O chunk do `domMax` (layout e arraste) já chegou. O contexto muda quando ele chega, para
   * os componentes que leem o modo renderizarem de novo: um `m.*` montado antes disso não tem
   * nó de projeção, e `layout`/`layoutId` só passam a valer na renderização seguinte.
   */
  layoutReady: boolean
}

const MotionContext = createContext<MotionState>({ mode: 'off', layoutReady: false })

/** Modo de motion do provider mais próximo (`off` sem provider). */
export function useMotionMode(): MotionMode {
  return useContext(MotionContext).mode
}

/**
 * Em `on`, o chunk do `domMax` já chegou. Um `m.*` com `layout` ou `layoutId` só ganha o nó de
 * projeção se for criado DEPOIS disso (o Motion não monta a projeção de um elemento que já
 * estava na tela), então quem usa layout liga a prop e remonta o item quando isto vira `true`.
 */
export function useLayoutReady(): boolean {
  const { mode, layoutReady } = useContext(MotionContext)
  return mode === 'on' && layoutReady
}

/** Só troca o modo lido pelos componentes; não monta nem desmonta o LazyMotion. */
export function MotionModeScope({ mode, children }: { mode: MotionMode; children: ReactNode }) {
  const { layoutReady } = useContext(MotionContext)
  const value = useMemo(() => ({ mode, layoutReady }), [mode, layoutReady])
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

/** O carregador do `domMax` (chunk à parte): layout, layoutId e arraste do Motion. */
const loadMax = () => import('./features-max').then((m) => m.default)

/**
 * Em `off`, só o contexto (nenhum nó novo, nenhum LazyMotion). Em `on`, dois `LazyMotion`: o de
 * fora carrega o `domMax` sob demanda (layout e arraste), em chunk separado; o de dentro traz o
 * `domAnimation` síncrono (animação e gestos) e é o que os `m.*` enxergam. Nessa ordem o
 * renderer síncrono já está no contexto na primeira renderização (elementos e gestos funcionam
 * na hora), e os recursos de layout se juntam quando o chunk chega. A ordem contrária esconderia
 * o renderer até o chunk terminar de baixar.
 */
export function MotionProvider({ mode, children }: { mode: MotionMode; children: ReactNode }) {
  if (mode !== 'on') return <MotionModeScope mode="off">{children}</MotionModeScope>
  return <OnProvider>{children}</OnProvider>
}

function OnProvider({ children }: { children: ReactNode }) {
  const [layoutReady, setLayoutReady] = useState(false)
  const value = useMemo(() => ({ mode: 'on' as const, layoutReady }), [layoutReady])
  // O LazyMotion registra os recursos DEPOIS de a promessa do carregador resolver; o aviso vai
  // para o ciclo seguinte, para a renderização que ele provoca já enxergar o layout.
  const load = useMemo(
    () => () =>
      loadMax().then((features) => {
        setTimeout(() => setLayoutReady(true), 0)
        return features
      }),
    [],
  )
  return (
    <LazyMotion features={load}>
      <LazyMotion features={domAnimation}>
        <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
      </LazyMotion>
    </LazyMotion>
  )
}
