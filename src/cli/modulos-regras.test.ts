/*
 * As regras de texto orientativo e de prefixo --rendra- moram em src/cli (entram no pacote da
 * CLI). Os testes de comportamento delas ficam em scripts/lib (help-length.test.ts e
 * var-prefix.test.ts), que importam pelo reexport; aqui só se prova que o fonte está em
 * src/cli e responde pela mesma API.
 */
import { describe, expect, it } from 'vitest'
import { checkGuidance, helpLimit } from './help-length.ts'
import { checkVarPrefix, isRendraOwnVar } from './var-prefix.ts'

describe('módulos de regra em src/cli', () => {
  it('help-length exporta o limite e a verificação de texto orientativo', () => {
    expect(helpLimit('full')).toBe(150)
    expect(checkGuidance('<PageHeader description="Comece agora." />')).toHaveLength(1)
  })

  it('var-prefix reconhece variável própria do Rendra e acusa a sem prefixo', () => {
    expect(isRendraOwnVar('primary')).toBe(true)
    const gatilho = 'var(--' + 'primary)'
    expect(checkVarPrefix(gatilho).map((v) => v.name)).toEqual(['primary'])
  })
})
