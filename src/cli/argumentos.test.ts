import { describe, expect, it } from 'vitest'
import { FLAGS_AUDITAR, lerArgumentosAuditar } from './argumentos.ts'

const vazio = { pastas: [], ignorar: [], todas: false, ajuda: false }

describe('lerArgumentosAuditar', () => {
  it.each([
    [[], vazio],
    [['pasta'], { ...vazio, pastas: ['pasta'] }],
    [['a', 'b'], { ...vazio, pastas: ['a', 'b'] }],
    [['--all'], { ...vazio, todas: true }],
    [['--ignore', 'x,y'], { ...vazio, ignorar: ['x', 'y'] }],
    [['--ignore', 'x', '--ignore', 'y'], { ...vazio, ignorar: ['x', 'y'] }],
    [['--ignore=x,y'], { ...vazio, ignorar: ['x', 'y'] }],
    [['--ignore=x', '--ignore', 'y,z'], { ...vazio, ignorar: ['x', 'y', 'z'] }],
    [
      ['--all', 'pasta', '--ignore', 'x'],
      { ...vazio, todas: true, pastas: ['pasta'], ignorar: ['x'] },
    ],
    [
      ['--ignore', 'x', 'pasta', '--all'],
      { ...vazio, todas: true, pastas: ['pasta'], ignorar: ['x'] },
    ],
    [['--ignore', ' x , ,y '], { ...vazio, ignorar: ['x', 'y'] }],
    [['--help'], { ...vazio, ajuda: true }],
    [['-h'], { ...vazio, ajuda: true }],
    [['pasta', '--help'], { ...vazio, pastas: ['pasta'], ajuda: true }],
  ])('%j', (entrada, esperado) => {
    expect(lerArgumentosAuditar(entrada)).toEqual(esperado)
  })

  it('o valor de --ignore nunca vira pasta', () => {
    expect(lerArgumentosAuditar(['--ignore', 'src/brand'])).toMatchObject({ pastas: [] })
  })

  it.each([
    [['--ignore']],
    [['--ignore', '--all']],
    [['--ignore=']],
    [['--ignore', ',']],
    [['--ignore', '-x']],
  ])('%j: erro de valor ausente', (entrada) => {
    const r = lerArgumentosAuditar(entrada)
    expect(r).toHaveProperty('erro')
    expect((r as { erro: string }).erro).toContain('Falta o valor de --ignore')
  })

  it.each([['--foo'], ['-x'], ['--all=1'], ['--']])('%s: flag desconhecida', (flag) => {
    const r = lerArgumentosAuditar([flag])
    const erro = (r as { erro: string }).erro
    expect(erro).toContain(`Flag desconhecida: ${flag}`)
    for (const aceita of FLAGS_AUDITAR) expect(erro).toContain(aceita)
  })

  it('o primeiro erro ganha, mesmo com argumentos bons antes', () => {
    expect(lerArgumentosAuditar(['pasta', '--all', '--foo'])).toHaveProperty('erro')
  })
})
