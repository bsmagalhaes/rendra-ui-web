/*
 * O Motion toma `onDrag`, `onDragStart`, `onDragEnd` e `onAnimationStart` para os gestos e
 * animações dele: tira essas props do DOM e as tipa com outra assinatura. Em `m.button` e
 * `m.li`, o consumidor que passa o evento nativo (HTML5 drag, animationstart do CSS) o perderia.
 * Estes ajudantes separam essas chaves das props e as ligam como ouvintes nativos no elemento.
 */

const NATIVE_EVENTS = {
  onDrag: 'drag',
  onDragStart: 'dragstart',
  onDragEnd: 'dragend',
  onAnimationStart: 'animationstart',
} as const

type NativeKey = keyof typeof NATIVE_EVENTS
type Handler = ((event: never) => void) | undefined

/** Separa as quatro chaves em conflito; o resto segue para o elemento do Motion. */
export function splitNativeEvents<P extends object>(props: P) {
  const native: Partial<Record<NativeKey, Handler>> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (key in NATIVE_EVENTS) native[key as NativeKey] = value as Handler
    else rest[key] = value
  }
  return { native, rest: rest as Omit<P, NativeKey> }
}

/** Liga os manipuladores como ouvintes nativos. Devolve a função que os remove. */
export function bindNativeEvents(el: HTMLElement, native: Partial<Record<NativeKey, Handler>>) {
  const bound: [string, EventListener][] = []
  for (const [key, type] of Object.entries(NATIVE_EVENTS)) {
    const handler = native[key as NativeKey]
    if (!handler) continue
    const listener = ((event: Event) => handler(event as never)) as EventListener
    el.addEventListener(type, listener)
    bound.push([type, listener])
  }
  return () => bound.forEach(([type, listener]) => el.removeEventListener(type, listener))
}
