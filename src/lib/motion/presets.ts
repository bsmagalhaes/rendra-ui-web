import type { Target, TargetAndTransition, Transition } from 'motion/react'
import { BLUR, readMotionTokens, SCALE, SPRING, type Bezier, type MotionTokens } from './tokens'

/*
 * Presets do caminho `on` (linguagem única de movimento): fade, scale/open, sheet, tooltip,
 * indicator, pop, slide, reveal, press, move, settle e stagger. Toda duração e toda curva vêm de
 * readMotionTokens (globals.css); nenhum número de duração mora neste arquivo (o presets.test.ts
 * varre o código-fonte atrás de literal). As molas e as escalas vêm de tokens.ts.
 *
 * Duas regras moram aqui:
 *  - Assimetria: o que o usuário decidiu (abrir) entra no tempo `base`, e o que o sistema
 *    responde ao fechar sai em `fast`, só em opacidade. Gaveta e folha saem em `base`, de volta
 *    pelo lado de onde vieram.
 *  - Reduzido: sem deslocamento, escala, filtro nem cascata; a opacidade usa `base` (não zero),
 *    porque o esmaecimento é o que explica a mudança de estado.
 */

export interface MotionPreset {
  initial: Target
  animate: TargetAndTransition
  exit: TargetAndTransition
  transition: Transition
}

/** Toque: o alvo do `whileTap` (`undefined` no reduzido) e a transição de ida e de volta. */
export interface PressPreset {
  whileTap: TargetAndTransition | undefined
  transition: Transition
}

export type SlideFrom = 'left' | 'right' | 'top' | 'bottom'

/** Distância do slide: `full` (painel que entra da borda) ou `short` (conteúdo que assenta). */
export type SlideDistance = 'full' | 'short'

const SHORT_PX = 8

export interface Presets {
  reduced: boolean
  /** Toque do botão, do polegar e dos controles: 120 ms, `ease.out`, escala 0,97. */
  press: PressPreset
  /** Alias de `press.whileTap`, o nome antigo. Sem movimento reduzido vem `undefined`. */
  tap: TargetAndTransition | undefined
  /**
   * Salto curto de escala (célula do OTP), com a transição dentro do alvo. Estável entre
   * renders; `undefined` se reduzido.
   */
  bump: TargetAndTransition | undefined
  tokens: MotionTokens
  fade: MotionPreset
  /** Alias de `open()`: escala 0,95 com mola a partir da origem, saída rápida só em opacidade. */
  scale: MotionPreset
  /**
   * Cota rara de encanto (check do passo concluído): 0,8 -> 1 com a curva back, em `slow`. Nunca
   * em controle de uso frequente.
   */
  pop: MotionPreset
  /**
   * Indicador de controle frequente (check do Checkbox, ponto do Radio): 0,9 -> 1 com opacidade
   * em `fast`, sem quique e sem partir de zero.
   */
  indicator: MotionPreset
  slide: (from: SlideFrom, distance?: SlideDistance) => MotionPreset
  /**
   * Overlay ancorado (popover, menu, modal, painel do select). Número = escala de partida
   * (padrão 0,95); `{ y }` = entrada plana, sem escala, para a superfície em tela cheia.
   * Entra em mola criticamente amortecida (sem quique) em `base` e sai em `fast`, em opacidade.
   */
  open: (from?: number | { y: number }) => MotionPreset
  /** Gaveta e folha: entram de `from` em `slow` com `ease.drawer`, saem em `base` pelo mesmo lado. */
  sheet: (from: SlideFrom) => MotionPreset
  /** Tooltip: escala 0,97 em `fast`; aberto em `instant-open` não anima. */
  tooltip: (instant: boolean) => MotionPreset
  /**
   * Troca de conteúdo no lugar (passo do wizard), sem esperar a saída: o que sai esmaece com
   * `blur` de 2 px em `fast`; o que entra vem de `direction` (1 avança, -1 volta), 8 px, em
   * `base`. O desfoque disfarça o cruzamento: sem ele o olho vê dois objetos trocando de lugar.
   */
  swap: (direction: 1 | -1) => MotionPreset
  /**
   * Entrada de uso único (reveal do dashboard): desloca 8 px e dura `reveal.enter`, mais lenta
   * que `slide`. Não serve a interação repetida (overlay, tab, botão).
   */
  reveal: (from: SlideFrom) => MotionPreset
  /** Deslocamento na tela (indicador, reordenação): `move` em `ease.move`. */
  move: Transition
  /** Nome antigo de `move`. */
  layout: Transition
  /** Mola sem quique: onde há gesto ou soltura (drop do kanban, folha que volta). */
  settle: Transition
  /** Mola da folha depois do arraste (quique mínimo). */
  springSheet: Transition
  /**
   * A mesma mola da folha em rigidez e amortecimento (massa 1), que é o que o arraste do Motion
   * (`dragTransition`) pede para a volta à origem: rigidez = (2π / duração)², amortecimento =
   * 2 (1 - quique) raiz(rigidez).
   */
  sheetBounce: { bounceStiffness: number; bounceDamping: number }
  /** Atraso de entrada do item `index`, limitado a `limit` itens (padrão 8: 480 ms). */
  stagger: (index: number, limit?: number) => Transition
  /** Atraso do bloco `index` no reveal (passo `reveal.stagger`), limitado a `limit` blocos. */
  staggerReveal: (index: number, limit?: number) => Transition
}

/** Mola em "duração e quique" para rigidez e amortecimento (massa 1). */
function springToBounce({ duration, bounce }: { duration: number; bounce: number }) {
  const stiffness = ((2 * Math.PI) / duration) ** 2
  return {
    bounceStiffness: Math.round(stiffness),
    bounceDamping: Math.round(2 * (1 - bounce) * Math.sqrt(stiffness)),
  }
}

export function createPresets(tokens: MotionTokens, reduced: boolean): Presets {
  const { duration, reveal, ease } = tokens
  const base: Transition = { duration: duration.base, ease: ease.out }
  const fastOut: Transition = { duration: duration.fast, ease: ease.out }
  const settle: Transition = { type: 'spring', ...SPRING.settle }
  const enter: Transition = {
    type: 'spring',
    duration: duration.base,
    bounce: SPRING.settle.bounce,
  }

  /** O que sobra sob "reduzir movimento": só opacidade, em `base`. */
  const flat = (): MotionPreset => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: base,
  })
  const make = (initial: Target, animate: Target, time: number, curve = ease.out): MotionPreset =>
    reduced
      ? flat()
      : {
          initial,
          animate,
          exit: initial,
          transition: { duration: time, ease: curve },
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

  const fade: MotionPreset = reduced
    ? flat()
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: fastOut },
        transition: base,
      }

  const open = (from: number | { y: number } = SCALE.enter): MotionPreset => {
    if (reduced) return flat()
    const initial: Target =
      typeof from === 'number' ? { opacity: 0, scale: from } : { opacity: 0, y: from.y }
    const to: Target = typeof from === 'number' ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }
    return {
      initial,
      animate: { ...to, transition: enter },
      exit: { opacity: 0, transition: fastOut },
      transition: enter,
    }
  }

  const sheet = (from: SlideFrom): MotionPreset => {
    if (reduced) return flat()
    const sign = from === 'left' || from === 'top' ? -1 : 1
    const axis = from === 'left' || from === 'right' ? 'x' : 'y'
    const away = { [axis]: `${sign * 100}%` }
    return {
      initial: away,
      animate: { [axis]: 0 },
      exit: { ...away, transition: { duration: duration.base, ease: ease.drawer } },
      transition: { duration: duration.slow, ease: ease.drawer },
    }
  }

  const tooltip = (instant: boolean): MotionPreset => {
    if (reduced) return instant ? { ...flat(), transition: { duration: 0 } } : flat()
    return {
      initial: { opacity: 0, scale: SCALE.tooltip },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, transition: fastOut },
      transition: instant ? { duration: 0 } : fastOut,
    }
  }

  const blurred = `blur(${BLUR}px)`
  const swap = (direction: 1 | -1): MotionPreset => {
    if (reduced) return flat()
    return {
      initial: { opacity: 0, x: direction * SHORT_PX, filter: blurred },
      animate: { opacity: 1, x: 0, filter: 'blur(0px)', transition: base },
      exit: { opacity: 0, filter: blurred, transition: fastOut },
      transition: base,
    }
  }

  const indicatorInitial: Target = { opacity: 0, scale: SCALE.small }
  const press: PressPreset = {
    whileTap: reduced ? undefined : { scale: SCALE.press },
    transition: { duration: duration.press, ease: ease.out },
  }
  const move: Transition = reduced ? { duration: 0 } : { duration: duration.move, ease: ease.move }

  return {
    reduced,
    press,
    tap: press.whileTap,
    bump: reduced ? undefined : { scale: [SCALE.bump, 1], transition: fastOut },
    tokens,
    fade,
    scale: open(),
    pop: make(
      { opacity: 0, scale: SCALE.pop },
      { opacity: 1, scale: 1 },
      duration.slow,
      ease.spring,
    ),
    indicator: reduced
      ? flat()
      : {
          initial: indicatorInitial,
          animate: { opacity: 1, scale: 1 },
          exit: indicatorInitial,
          transition: fastOut,
        },
    slide: (from, distance = 'full') => {
      const initial = offset(from, distance)
      return make(initial, settled(initial), distance === 'full' ? duration.slow : duration.base)
    },
    open,
    sheet,
    tooltip,
    swap,
    reveal: (from) => {
      const initial = offset(from, 'short')
      return make(initial, settled(initial), reveal.enter)
    },
    move,
    layout: move,
    settle: reduced ? { duration: 0 } : settle,
    springSheet: reduced ? { duration: 0 } : { type: 'spring', ...SPRING.sheet },
    sheetBounce: springToBounce(SPRING.sheet),
    stagger: (index, limit = 8) => ({
      delay: reduced ? 0 : Math.min(index, limit) * (duration.fast / 2),
    }),
    staggerReveal: (index, limit = 8) => ({
      delay: reduced ? 0 : Math.min(index, limit) * reveal.stagger,
    }),
  }
}

/** Curva no formato do recharts: `cubic-bezier(a,b,c,d)`, sem espaços. */
export function toCubicBezier([
  a,
  b,
  c,
  d,
]: Bezier): `cubic-bezier(${number},${number},${number},${number})` {
  return `cubic-bezier(${a},${b},${c},${d})`
}

/** Presets com os tokens lidos agora do documento. */
export function presetsFromDocument(reduced: boolean): Presets {
  return createPresets(readMotionTokens(), reduced)
}
