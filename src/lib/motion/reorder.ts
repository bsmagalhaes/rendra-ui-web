import type { MotionMode } from './motion-context'

/*
 * Regra de reordenação (kanban, list, upload): o `layout` do Motion só fica ligado quando
 * não há arraste em curso. Sob o dedo ou o ponteiro a ordem muda a cada passo, e animar cada
 * passo atrasaria o item atrás do cursor; ao soltar (ou pelo teclado/menu) a ordem muda de uma
 * vez, e aí o layout anima o resultado.
 */
export function layoutEnabled({
  mode,
  ready,
  dragging,
}: {
  mode: MotionMode
  /** O chunk do `domMax` já chegou (`useLayoutReady`). Antes disso `layout` não faz nada. */
  ready: boolean
  dragging: boolean
}) {
  return mode === 'on' && ready && !dragging
}
