/*
 * Recursos de layout e arraste do Motion (`layout`, `layoutId`, projeção). Módulo à parte de
 * propósito: só o MotionProvider o importa, e de forma dinâmica, para o build gerar um chunk
 * separado do código de projeção e o `domAnimation` (síncrono) não pagar o custo dele.
 * O registry não enxerga import dinâmico, por isso o arquivo entra na lista explícita do
 * scripts/build-registry.mjs.
 */
export { domMax as default } from 'motion/react'
