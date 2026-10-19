import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * A lista de classes `@utility` do Rendra em docs/COMO_APLICAR.md (seção "O CSS do pacote e
 * as classes das suas telas") tem de acompanhar src/styles/globals.css: utility nova ou
 * removida sem atualizar o guia faz este teste falhar. Sem isso a lista envelhece em silêncio.
 */
const raiz = process.cwd()
const css = readFileSync(join(raiz, 'src/styles/globals.css'), 'utf8')
const guia = readFileSync(join(raiz, 'docs/COMO_APLICAR.md'), 'utf8')

const utilities = [...css.matchAll(/@utility\s+([a-zA-Z0-9_-]+)/g)].map((m) => m[1]!)

/** Trecho do guia entre o título da seção e o próximo `## `. */
function secaoDoGuia() {
  const inicio = guia.indexOf('## O CSS do pacote e as classes das suas telas')
  if (inicio === -1) return ''
  const resto = guia.slice(inicio + 3)
  const fim = resto.indexOf('\n## ')
  return fim === -1 ? resto : resto.slice(0, fim)
}

describe('guia do host: lista de @utility', () => {
  it('globals.css tem as @utility que o guia precisa listar', () => {
    expect(utilities.length).toBeGreaterThan(40)
  })

  it('a seção existe no guia', () => {
    expect(secaoDoGuia()).not.toBe('')
  })

  it('cada @utility de globals.css aparece, entre crases, na seção do guia', () => {
    const secao = secaoDoGuia()
    const faltando = utilities.filter((nome) => !secao.includes(`\`${nome}\``))
    expect(faltando).toEqual([])
  })

  it('o guia não lista @utility que não existe mais em globals.css', () => {
    const secao = secaoDoGuia()
    const marca = '`@utility` do Rendra (sempre presentes):'
    const inicio = secao.indexOf(marca)
    const lista = inicio === -1 ? '' : secao.slice(inicio + marca.length)
    const citadas = [...lista.matchAll(/`([a-zA-Z0-9_-]+)`/g)].map((m) => m[1]!)
    const sobrando = citadas.filter((nome) => !utilities.includes(nome))
    expect(citadas.length).toBeGreaterThan(0)
    expect(sobrando).toEqual([])
  })
})
