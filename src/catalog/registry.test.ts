import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG, CATALOG_EXCLUDED_FILES } from './components'

/*
 * Só vale no repositório do Rendra, que publica o registry.json. A "Limpeza do clone"
 * (docs/COMO_APLICAR.md) apaga este arquivo junto com o registry.json que ele lê.
 */
describe('registry.json: meta.codes (etapa 1.2.0-alpha.3)', () => {
  // Confere o arquivo versionado. Rode `npm run registry:build` antes, se o catálogo mudou.
  const registry = JSON.parse(readFileSync(join(process.cwd(), 'registry.json'), 'utf8')) as {
    items: { name: string; files: { path: string }[]; meta?: { codes: string[] } }[]
  }
  // Só os itens de componente de src/components/ui (build-registry.mjs só dá meta a esses,
  // nunca aos itens de teste "<nome>-test", que apontam para o .test.tsx).
  const uiItems = registry.items.filter((i) => i.meta !== undefined)

  it('todo item de src/components/ui (menos os excluídos do catálogo) tem meta.codes preenchido', () => {
    expect(uiItems.length).toBeGreaterThan(0)
    for (const item of uiItems) {
      const file = item.files[0]!.path.replace(/^src\//, '')
      if (CATALOG_EXCLUDED_FILES.includes(file)) {
        expect(item.meta?.codes ?? []).toEqual([])
        continue
      }
      expect(item.meta?.codes?.length, `${item.name}: meta.codes vazio`).toBeGreaterThan(0)
    }
  })

  it('meta.codes de cada item bate exatamente com o catálogo daquele arquivo', () => {
    for (const item of uiItems) {
      const file = item.files[0]!.path.replace(/^src\//, '')
      const expected = CATALOG.filter((entry) => entry.file === file).map((entry) => entry.code)
      expect(item.meta?.codes ?? []).toEqual(expected)
    }
  })
})
