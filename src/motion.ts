/*
 * ENTRADA SEPARADA: Motion (@rendra-ui/web/motion)
 * -------------------------------------------------
 * Fora da entrada principal (src/index.ts): é o que carrega o pacote `motion` (animação). O
 * `import` desta entrada é o que decide se o host paga o Motion no bundle: quem usa o Rendra só
 * em `off` nunca a importa. `motion={rendraMotion}` liga o `on` desde o primeiro quadro (e no
 * servidor); a string `motion="on"` carrega o mesmo objeto por `import()`, sob demanda.
 */
export { rendraMotion, type RendraMotion } from './lib/motion/motion-on'
