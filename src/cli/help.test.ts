import { describe, expect, it } from 'vitest'
import { AUTHOR_LINE, formatHelp } from './help'

describe('formatHelp', () => {
  it('lista os três subcomandos', () => {
    const saida = formatHelp()
    expect(saida).toContain('rendra codigos')
    expect(saida).toContain('rendra auditar')
    expect(saida).toContain('rendra trocar')
  })

  it('descreve as flags do auditar e o rendra.config.json', () => {
    const saida = formatHelp()
    expect(saida).toContain('--all')
    expect(saida).toContain('--ignore')
    expect(saida).toContain('rendra.config.json')
  })

  it('termina com a linha de autoria, com site e Instagram', () => {
    const linhas = formatHelp().split('\n')
    expect(linhas.at(-1)).toBe(AUTHOR_LINE)
    expect(AUTHOR_LINE).toContain('Bruno Magalhaes')
    expect(AUTHOR_LINE).toContain('brunomagalhaes.me')
    expect(AUTHOR_LINE).toContain('instagram.com/brunomagalhaes.me')
    expect(AUTHOR_LINE).not.toContain('—')
  })
})
