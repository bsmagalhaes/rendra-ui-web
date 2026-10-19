import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = process.cwd()
const guia = readFileSync(join(raiz, 'docs', 'COMO_APLICAR.md'), 'utf8')
const item =
  guia.split('\n').find((l) => l.startsWith('- **Página de apresentação do Rendra**')) ?? ''

/** Expande `scripts/lib/{a,b}.test.ts` em caminhos soltos. */
function expandir(texto: string): string[] {
  const caminhos: string[] = []
  for (const m of texto.matchAll(/`([^`]+\.(?:ts|mjs|html|svg|png))`/g)) {
    const bruto = m[1]!
    const chaves = bruto.match(/^(.*)\{([^}]+)\}(.*)$/)
    if (chaves) for (const p of chaves[2]!.split(',')) caminhos.push(`${chaves[1]}${p}${chaves[3]}`)
    else caminhos.push(bruto)
  }
  return caminhos
}

const paraApagar = new Set(expandir(item.split('Mantenha `scripts/lib/sitemap.ts`')[0] ?? ''))

/** Arquivos `scripts/*.mjs` e `scripts/lib/*.ts` que continuam no clone. */
function importadosPelosQueFicam(): Map<string, string[]> {
  const importados = new Map<string, string[]>()
  for (const pasta of ['scripts', 'scripts/lib']) {
    for (const nome of readdirSync(join(raiz, pasta))) {
      const rel = `${pasta}/${nome}`
      if (!/\.(mjs|ts)$/.test(nome) || nome.endsWith('.test.ts') || paraApagar.has(rel)) continue
      const codigo = readFileSync(join(raiz, rel), 'utf8')
      for (const m of codigo.matchAll(/from\s+'(\.[^']+)'/g)) {
        const alvo = resolve(raiz, pasta, m[1]!)
          .slice(raiz.length + 1)
          .split(sep)
          .join('/')
        importados.set(alvo, [...(importados.get(alvo) ?? []), rel])
      }
    }
  }
  return importados
}

describe('limpeza do clone (docs/COMO_APLICAR.md)', () => {
  it('a lista de arquivos a apagar foi lida do guia', () => {
    expect(paraApagar.size).toBeGreaterThan(10)
    expect(paraApagar.has('scripts/lib/pages-stage.ts')).toBe(true)
  })

  it('todo arquivo da lista existe no repositório', () => {
    for (const arquivo of paraApagar) expect(existsSync(join(raiz, arquivo)), arquivo).toBe(true)
  })

  it('nenhum arquivo apagado é importado por um script que continua no clone', () => {
    const usados = importadosPelosQueFicam()
    for (const arquivo of paraApagar) expect(usados.get(arquivo), arquivo).toBeUndefined()
  })

  it('a regra de texto só do Rendra (texto-publico.test.ts) está na lista de limpeza e existe', () => {
    const regras = guia.split('\n').find((l) => l.startsWith('- **Regras só do Rendra**')) ?? ''
    expect(regras).toContain('`scripts/lib/texto-publico.test.ts`')
    expect(existsSync(join(raiz, 'scripts/lib/texto-publico.test.ts'))).toBe(true)
  })

  it('o sitemap fica: o seo-build da demo do clone o importa', () => {
    expect(paraApagar.has('scripts/lib/sitemap.ts')).toBe(false)
    expect(paraApagar.has('scripts/lib/sitemap.test.ts')).toBe(false)
    expect(readFileSync(join(raiz, 'scripts/seo-build.mjs'), 'utf8')).toContain('./lib/sitemap.ts')
  })

  it('as listas "Publicação", "Skill" e "Regras só do Rendra" citam os arquivos que esta guarda lê', () => {
    const linhas = guia.split('\n')
    const pega = (inicio: string) => linhas.find((l) => l.startsWith(inicio)) ?? ''
    expect(pega('- **Publicação**')).toContain('`src/catalog/registry.test.ts`')
    expect(pega('- **Regras só do Rendra**')).toContain('`src/lib/utilities-doc.test.ts`')
  })

  it('nenhum teste que fica no clone lê um arquivo que a lista de limpeza apaga', () => {
    const linhas = guia.split('\n')
    const itens = [
      '- **Publicação**',
      '- **Skill de migração parcial**',
      '- **Regras só do Rendra**',
    ]
    const textoApagar = itens.map((i) => linhas.find((l) => l.startsWith(i)) ?? '').join('\n')
    const apagados = new Set<string>(
      [...textoApagar.matchAll(/`([^`]+\.(?:ts|mjs|json|yml|test\.ts)|[^`]+\/)`/g)]
        .map((m) => m[1]!)
        .filter((c) => !c.startsWith('npm ') && !c.includes(' ')),
    )
    for (const a of paraApagar) apagados.add(a)
    // Só o que é arquivo ou pasta do repositório (descarta nomes de script do package.json).
    const alvos = [...apagados].filter(
      (a) => !a.endsWith('/') && existsSync(join(raiz, a)) && statSync(join(raiz, a)).isFile(),
    )
    expect(alvos).toContain('registry.json')
    const testes: string[] = []
    const varre = (pasta: string) => {
      for (const nome of readdirSync(join(raiz, pasta))) {
        const rel = `${pasta}/${nome}`
        if (nome === 'node_modules' || nome === '__screenshots__') continue
        if (statSync(join(raiz, rel)).isDirectory()) varre(rel)
        else if (/\.test\.(ts|tsx)$/.test(nome) && !apagados.has(rel)) testes.push(rel)
      }
    }
    for (const pasta of ['src', 'scripts', 'tests']) varre(pasta)
    const leem: string[] = []
    for (const teste of testes) {
      if (teste === 'scripts/lib/clone-cleanup.test.ts') continue
      const codigo = readFileSync(join(raiz, teste), 'utf8')
      for (const alvo of alvos) {
        const sem = alvo.replace(/\/$/, '')
        if (
          codigo.includes(`'${sem}'`) ||
          codigo.includes(`'${sem}/`) ||
          codigo.includes(`"${sem}"`)
        )
          leem.push(`${teste} lê ${alvo}`)
      }
    }
    expect(leem).toEqual([])
  })
})
