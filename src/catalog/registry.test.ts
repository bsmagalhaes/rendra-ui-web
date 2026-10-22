import { readdirSync, readFileSync } from 'node:fs'
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

describe('registry.json: motion (linguagem única)', () => {
  it('lista todos os arquivos de src/lib/motion que não são teste (API pública só acrescenta)', () => {
    const registro = readFileSync(join(process.cwd(), 'registry.json'), 'utf8')
    const arquivos = readdirSync(join(process.cwd(), 'src/lib/motion')).filter(
      (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f),
    )
    expect(arquivos.length).toBeGreaterThanOrEqual(9)
    for (const f of arquivos) expect(registro, f).toContain(`"src/lib/motion/${f}"`)
  })

  it('o motor do Motion (motion-on.tsx) vai no núcleo, que leva o `motion`; os componentes de interface não o declaram à parte', () => {
    const registro = JSON.parse(readFileSync(join(process.cwd(), 'registry.json'), 'utf8')) as {
      items: {
        name: string
        dependencies?: string[]
        registryDependencies?: string[]
        files: { path: string }[]
      }[]
    }
    const core = registro.items.find((i) => i.name === 'core')!
    expect(core.files.map((f) => f.path)).toContain('src/lib/motion/motion-on.tsx')
    expect(core.dependencies?.some((d) => d.startsWith('motion@'))).toBe(true)
    for (const nome of ['button', 'checkbox', 'stat-card', 'tooltip', 'picker-panel']) {
      const item = registro.items.find((i) => i.name === nome)!
      expect(
        item.dependencies?.some((d) => d.startsWith('motion@')),
        nome,
      ).toBeFalsy()
      expect(item.registryDependencies?.join(' '), nome).toContain('core')
    }
  })

  it('o subcaminho @rendra-ui/web/motion existe no package.json, no formato das outras entradas, e o `motion` segue em dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      exports: Record<string, unknown>
      dependencies: Record<string, string>
    }
    expect(pkg.exports['./motion']).toEqual({
      types: './dist/types/motion.d.ts',
      import: './dist/motion.js',
    })
    expect(pkg.exports['./chart']).toEqual({
      types: './dist/types/chart.d.ts',
      import: './dist/chart.js',
    })
    expect(pkg.dependencies.motion).toBeDefined()
  })
})
