import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as motion from './index'
import { DURATION, EASE, REVEAL } from './tokens'

/*
 * API pública do motion (R3): a linguagem única só ACRESCENTA. O pacote npm expõe só o tipo
 * `MotionMode` e o hook de movimento reduzido; os nomes antigos de preset, de token e de variável
 * CSS continuam, com os mesmos valores ou como alias. (O registry do shadcn lista todos os arquivos
 * de src/lib/motion: o teste mora em src/catalog/registry.test.ts, que a limpeza do clone apaga
 * junto com o registry.json.)
 */
const indice = readFileSync('src/index.ts', 'utf8')

describe('src/index.ts (pacote npm)', () => {
  it('exporta do motion só os tipos MotionMode e RendraMotion e o hook de reduzir movimento (só acrescenta)', () => {
    const linhas = indice.split('\n').filter((l) => /motion/i.test(l) && /^export/.test(l))
    expect(linhas).toEqual([
      "export type { MotionMode } from './lib/motion/motion-context'",
      "export type { RendraMotion } from './lib/motion/motion-on'",
      "export * from './hooks/use-reduced-motion'",
    ])
  })
})

describe('nomes antigos continuam (aditivo)', () => {
  it('as durações e o reveal de antes seguem com os mesmos valores', () => {
    expect(DURATION).toMatchObject({ fast: 0.12, base: 0.2, slow: 0.32, draw: 0.42 })
    expect(REVEAL).toEqual({ enter: 0.6, stagger: 0.12, count: 1.2, draw: 0.9 })
    expect(EASE.out).toEqual([0.22, 1, 0.36, 1])
    expect(EASE.inOut).toEqual([0.65, 0, 0.35, 1])
    expect(EASE.spring).toEqual([0.34, 1.56, 0.64, 1])
  })

  it('o barril de lib/motion segue exportando o que os componentes copiados importam', () => {
    for (const nome of [
      'MotionProvider',
      'MotionModeScope',
      'useMotionMode',
      'useMotionPresets',
      'useLayoutReady',
      'useMotionLib',
      'layoutEnabled',
    ])
      expect(motion, nome).toHaveProperty(nome)
    // e acrescenta o escopo de chegada de painel
    expect(motion).toHaveProperty('RevealScope')
    expect(motion).toHaveProperty('useRevealScope')
  })
})
