import { LazyMotion, MotionConfig, PresenceContext } from 'motion/react'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import type { RendraMotion } from './motion-on'

/*
 * Modo de motion do Rendra. `off` (padrão): nada do Motion é montado, e o DOM e o
 * comportamento são os de sempre. `on`: os componentes trocam o elemento por `m.*` e animam.
 * O estado vive neste contexto próprio, não no do RendraProvider: o provider só o alimenta
 * pela prop `motion`, e uma tela (a de comparação) aninha o contexto para trocar on e off.
 *
 * O Motion NÃO é importado por quem usa o Rendra em `off`: os componentes leem `m`,
 * `AnimatePresence`, `animate` e os hooks do objeto `RendraMotion` que vem deste contexto
 * (`useMotionLib`). O objeto chega pela prop (`motion={rendraMotion}`, síncrono) ou por
 * `import()` do `./motion-on` quando a prop é o texto `'on'`. Este arquivo só importa o
 * `LazyMotion`, o `MotionConfig` e o `PresenceContext`, que têm de estar montados desde o primeiro
 * quadro para a chegada do chunk não remontar a árvore.
 */

export type MotionMode = 'off' | 'on'

interface MotionState {
  /** Modo efetivo: só é `on` quando há objeto do Motion para os componentes usarem. */
  mode: MotionMode
  /** O objeto do Motion de quem lê em `on`; `null` em `off`. */
  lib: RendraMotion | null
  /** O objeto que o provider tem, mesmo que um escopo esteja em `off` (para ligar de novo). */
  source: RendraMotion | null
  /**
   * A troca tardia (`'on'` em texto) acabou de acontecer: o que está sendo montado agora já estava
   * na tela e NÃO repete a entrada. Dura só o commit da troca.
   */
  adopted: boolean
  /**
   * O chunk do `domMax` (layout e arraste) já chegou. O contexto muda quando ele chega, para
   * os componentes que leem o modo renderizarem de novo: um `m.*` montado antes disso não tem
   * nó de projeção, e `layout`/`layoutId` só passam a valer na renderização seguinte.
   */
  layoutReady: boolean
}

const MotionContext = createContext<MotionState>({
  mode: 'off',
  lib: null,
  source: null,
  adopted: false,
  layoutReady: false,
})

/** Modo de motion do provider mais próximo (`off` sem provider). */
export function useMotionMode(): MotionMode {
  return useContext(MotionContext).mode
}

/** O objeto do Motion de quem está em `on` (`m`, `AnimatePresence`, `animate`, hooks); `null` em `off`. */
export function useMotionLib(): RendraMotion | null {
  return useContext(MotionContext).lib
}

/** Como `useMotionLib`, para o que só existe em `on`: sem objeto é erro de uso, não um `off`. */
export function useMotionOn(): RendraMotion {
  const lib = useContext(MotionContext).lib
  if (!lib) throw new Error('useMotionOn só existe em `on` (dentro de um MotionProvider ligado).')
  return lib
}

/**
 * O componente está sendo montado na troca tardia do `off` para o `on`? Então ele já estava na
 * tela: mostra o valor final em vez de repetir a contagem ou a entrada.
 */
export function useMotionAdopted(): boolean {
  return useContext(MotionContext).adopted
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

const RevealContext = createContext(false)

/**
 * Marca um trecho da árvore como "chegada de painel" (o dashboard): lá, o gráfico desenha no
 * tempo do reveal (900 ms) em vez do tempo de rotina (`draw`, 420 ms). Fora dele, o gráfico de
 * uma tela de uso diário desenha uma vez e rápido.
 */
export function RevealScope({ children }: { children: ReactNode }) {
  return <RevealContext.Provider value>{children}</RevealContext.Provider>
}

/** O componente está dentro de um `RevealScope`? */
export function useRevealScope(): boolean {
  return useContext(RevealContext)
}

/** Só troca o modo lido pelos componentes; não monta nem desmonta o LazyMotion. */
export function MotionModeScope({ mode, children }: { mode: MotionMode; children: ReactNode }) {
  const parent = useContext(MotionContext)
  const value = useMemo<MotionState>(() => {
    const on = mode === 'on' && parent.source !== null
    return { ...parent, mode: on ? 'on' : 'off', lib: on ? parent.source : null }
  }, [mode, parent])
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

/** O carregador do `domMax` (chunk à parte): layout, layoutId e arraste do Motion. */
const loadMax = () => import('./features-max').then((m) => m.default)

/**
 * O motor (chunk `motion-on`): um único `import()` por carga do módulo, compartilhado entre o
 * provider e o `LazyMotion`. Falha vira `null` com um aviso, e a falha também fica guardada (o
 * navegador não repete um `import()` que falhou), então o aviso sai uma única vez.
 */
let carga: Promise<RendraMotion | null> | null = null
const loadOn = () =>
  (carga ??= import('./motion-on').then(
    (mod) => mod.rendraMotion,
    (erro: unknown) => {
      console.warn('Rendra: não foi possível carregar o Motion; a tela segue sem animação.', erro)
      return null
    },
  ))

type Features = NonNullable<ComponentProps<typeof LazyMotion>['features']>

/**
 * Em `off`, só o contexto (nenhum nó novo, nenhum LazyMotion). Em `on`, dois `LazyMotion` (os
 * dois `strict`: só `m.*` entra, um `motion.*` esquecido quebra em vez de puxar o pacote inteiro):
 * o de fora carrega o `domMax` sob demanda (layout e arraste), em chunk separado; o de dentro traz
 * o `domAnimation` (animação e gestos) e é o que os `m.*` enxergam. Nessa ordem o renderer já está
 * no contexto na primeira renderização, e os recursos de layout se juntam quando o chunk chega. A
 * ordem contrária esconderia o renderer até o chunk terminar de baixar.
 *
 * `mode` aceita o objeto do Motion (`rendraMotion`): `on` síncrono, desde o primeiro quadro e no
 * servidor. Com o texto `'on'`, o objeto vem do chunk `motion-on`, carregado depois do primeiro
 * quadro: até lá a árvore roda em `off` (nunca vazia); quando ele chega o modo vira `on` SEM
 * remontar nada (os `LazyMotion` e o `MotionConfig` já estavam montados) e o que já estava na tela
 * não repete a entrada.
 *
 * O `MotionConfig` recebe "reduzir movimento" da mesma fonte dos presets (o `matchMedia` de
 * `use-reduced-motion.ts`, reativo): com `always`, o Motion também tira o deslocamento e o layout
 * de qualquer animação que um componente escreva à mão, e mantém a opacidade. Não é uma segunda
 * fonte: é a primeira, lida uma vez, entregue a dois consumidores.
 */
export function MotionProvider({
  mode,
  children,
}: {
  mode: MotionMode | RendraMotion
  children: ReactNode
}) {
  if (mode === 'off') return <MotionModeScope mode="off">{children}</MotionModeScope>
  if (mode === 'on') return <LazyOnProvider>{children}</LazyOnProvider>
  return <ObjectOnProvider lib={mode}>{children}</ObjectOnProvider>
}

/** `motion={rendraMotion}`: o objeto já está aqui, o `domAnimation` é síncrono. */
function ObjectOnProvider({ lib, children }: { lib: RendraMotion; children: ReactNode }) {
  return (
    <OnShell animation={lib.domAnimation} lib={lib} adopted={false} presence={null}>
      {children}
    </OnShell>
  )
}

/** `motion="on"`: off até o chunk chegar; então liga sem remontar. */
function LazyOnProvider({ children }: { children: ReactNode }) {
  const [lib, setLib] = useState<RendraMotion | null>(null)
  const [adopted, setAdopted] = useState(false)
  useEffect(() => {
    let vivo = true
    void loadOn().then((carregado) => {
      if (!vivo || !carregado) return
      setAdopted(true)
      setLib(carregado)
    })
    return () => {
      vivo = false
    }
  }, [])
  // A marca vale só para o commit da troca: o que montar depois anima a entrada normalmente.
  useEffect(() => {
    if (adopted) setAdopted(false)
  }, [adopted])
  const animation = useMemo<Features>(
    // sem chunk, um pacote vazio: os `m.*` nunca chegam a existir (o modo fica `off`)
    () => () => loadOn().then((carregado) => carregado?.domAnimation ?? ({} as never)),
    [],
  )
  return (
    <OnShell
      animation={animation}
      lib={lib}
      adopted={adopted}
      presence={lib ? (adopted ? ADOPTED_PRESENCE : SETTLED_PRESENCE) : null}
    >
      {children}
    </OnShell>
  )
}

/** Nunca remonta: a estrutura é a mesma com ou sem o objeto; só o valor do contexto muda. */
function OnShell({
  animation,
  lib,
  adopted,
  presence,
  children,
}: {
  animation: Features
  lib: RendraMotion | null
  adopted: boolean
  presence: ComponentProps<typeof PresenceContext.Provider>['value']
  children: ReactNode
}) {
  const [layoutReady, setLayoutReady] = useState(false)
  const reduced = usePrefersReducedMotion()
  const value = useMemo<MotionState>(
    () => ({ mode: lib ? 'on' : 'off', lib, source: lib, adopted, layoutReady }),
    [lib, adopted, layoutReady],
  )
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
    <LazyMotion features={load} strict>
      <LazyMotion features={animation} strict>
        <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
          <PresenceContext.Provider value={presence}>
            <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
          </PresenceContext.Provider>
        </MotionConfig>
      </LazyMotion>
    </LazyMotion>
  )
}

/**
 * Na troca tardia, o que o `on` monta pela primeira vez já estava na tela em `off`: com
 * `initial: false` o Motion pula o estado `initial` de qualquer `m.*` (inclusive o literal do
 * ponteiro do gauge) e o desenha direto no estado final, igual ao que o `AnimatePresence
 * initial={false}` faz no primeiro quadro. Só vale no commit da troca; depois o valor passa para
 * `SETTLED_PRESENCE` (sem `initial`), e as montagens seguintes animam a entrada normalmente.
 *
 * O contexto NUNCA volta a `null` depois da troca: o `usePresence` do Motion chama hooks a
 * mais quando o contexto não é nulo, então um `AnimatePresence` já montado quebraria ("Should have a
 * queue") se o contexto mudasse entre nulo e não nulo. Antes da troca nenhum consumidor do Motion
 * está montado (tudo o que o usa só existe em `on`), então a passagem de nulo para o valor da
 * adoção é segura.
 */
const ADOPTED_PRESENCE = {
  id: 'rendra-adotado',
  initial: false,
  isPresent: true,
  register: () => () => {},
} as const

const SETTLED_PRESENCE = {
  id: 'rendra-ligado',
  isPresent: true,
  register: () => () => {},
} as const
