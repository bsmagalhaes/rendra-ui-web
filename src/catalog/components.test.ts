import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { colorCodes, menuCodes, themeCodes } from '@/config/presets'
import {
  CATALOG,
  CATALOG_EXCLUDED_FILES,
  COMPONENT_CODE_PATTERN,
  assertCatalogIntegrity,
  catalogByComponent,
  findComponentsWithMultipleDefaults,
  findComponentsWithoutDefault,
  findDuplicateCodes,
  findInvalidFormatCodes,
  findPresetCollisions,
  filesMissingCatalogEntry,
  getCatalogEntry,
  resolveCatalogCode,
  type ComponentCatalogEntry,
} from './components'

const UI_DIR = join(process.cwd(), 'src/components/ui')

/** Arquivos reais de src/components/ui, como o catálogo os referencia (relativo a src/). */
function realUiFiles(): string[] {
  return readdirSync(UI_DIR)
    .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
    .map((name) => `components/ui/${name}`)
    .filter((file) => !CATALOG_EXCLUDED_FILES.includes(file))
}

describe('catálogo de componentes: varredura de src/components/ui', () => {
  it('todo arquivo de src/components/ui (menos teste, overlay-shell e picker-panel) tem ao menos um código', () => {
    const files = realUiFiles()
    expect(files.length).toBeGreaterThan(0)
    const missing = filesMissingCatalogEntry(files, CATALOG)
    expect(missing).toEqual([])
  })

  it('falha (a regra existe de verdade) quando um arquivo real fica sem código no catálogo', () => {
    // Fabrica um catálogo que "esqueceu" um componente real: a regra precisa acusar.
    const semUltimoArquivo = CATALOG.filter((entry) => entry.file !== 'components/ui/button.tsx')
    const missing = filesMissingCatalogEntry(realUiFiles(), semUltimoArquivo)
    expect(missing).toEqual(['components/ui/button.tsx'])
  })

  it('não sobra nenhum código do catálogo para um arquivo que não existe mais em src/components/ui', () => {
    const files = new Set(realUiFiles())
    const orphans = CATALOG.filter((entry) => !files.has(entry.file))
    expect(orphans).toEqual([])
  })
})

describe('catálogo de componentes: formato e duplicidade', () => {
  it('todo código do catálogo segue ^[A-Z]{3,4}-\\d{3}$', () => {
    expect(findInvalidFormatCodes(CATALOG)).toEqual([])
    for (const entry of CATALOG) {
      expect(entry.code).toMatch(COMPONENT_CODE_PATTERN)
    }
  })

  it('acusa código fora do formato numa lista fabricada', () => {
    const fixture: ComponentCatalogEntry[] = [
      {
        code: 'ab-001',
        name: 'x',
        component: 'X',
        file: 'components/ui/x.tsx',
        variantProps: {},
        whenToUse: '',
      },
      {
        code: 'ABCDE-001',
        name: 'y',
        component: 'Y',
        file: 'components/ui/y.tsx',
        variantProps: {},
        whenToUse: '',
      },
    ]
    expect(findInvalidFormatCodes(fixture)).toEqual(['ab-001', 'ABCDE-001'])
  })

  it('não há código duplicado no catálogo real', () => {
    expect(findDuplicateCodes(CATALOG)).toEqual([])
  })

  it('acusa código duplicado numa lista fabricada (dois ABA-001)', () => {
    const fixture: ComponentCatalogEntry[] = [
      {
        code: 'ABA-001',
        name: 'Abas em linha',
        component: 'Tabs',
        file: 'components/ui/tabs.tsx',
        variantProps: { variant: 'line' },
        whenToUse: '',
      },
      {
        code: 'ABA-001',
        name: 'Abas em pílula, com código errado',
        component: 'Tabs',
        file: 'components/ui/tabs.tsx',
        variantProps: { variant: 'pill' },
        whenToUse: '',
      },
    ]
    expect(findDuplicateCodes(fixture)).toEqual(['ABA-001'])
  })

  it('abas (Tabs) têm só os dois códigos do plano: ABA-001 (linha) e ABA-002 (pílula)', () => {
    const abas = catalogByComponent('Tabs')
    expect(abas.map((e) => e.code).sort()).toEqual(['ABA-001', 'ABA-002'])
  })
})

describe('catálogo de componentes: variante padrão (isDefault)', () => {
  it('todo componente com mais de uma variante no catálogo real tem exatamente uma isDefault', () => {
    expect(findComponentsWithoutDefault(CATALOG)).toEqual([])
    expect(findComponentsWithMultipleDefaults(CATALOG)).toEqual([])
  })

  it('ABA-001 (linha) é a variante padrão do Tabs, não ABA-002', () => {
    expect(getCatalogEntry('ABA-001')?.isDefault).toBe(true)
    expect(getCatalogEntry('ABA-002')?.isDefault).toBeUndefined()
  })

  it('acusa componente com mais de uma variante sem nenhuma isDefault, numa lista fabricada', () => {
    const fixture: ComponentCatalogEntry[] = [
      {
        code: 'ABA-001',
        name: 'x',
        component: 'Tabs',
        file: 'components/ui/tabs.tsx',
        variantProps: { variant: 'line' },
        whenToUse: '',
      },
      {
        code: 'ABA-002',
        name: 'y',
        component: 'Tabs',
        file: 'components/ui/tabs.tsx',
        variantProps: { variant: 'pill' },
        whenToUse: '',
      },
    ]
    expect(findComponentsWithoutDefault(fixture)).toEqual(['Tabs'])
    expect(findComponentsWithMultipleDefaults(fixture)).toEqual([])
  })

  it('acusa componente com mais de uma variante isDefault ao mesmo tempo, numa lista fabricada', () => {
    const fixture: ComponentCatalogEntry[] = [
      {
        code: 'ABA-001',
        name: 'x',
        component: 'Tabs',
        file: 'components/ui/tabs.tsx',
        variantProps: { variant: 'line' },
        whenToUse: '',
        isDefault: true,
      },
      {
        code: 'ABA-002',
        name: 'y',
        component: 'Tabs',
        file: 'components/ui/tabs.tsx',
        variantProps: { variant: 'pill' },
        whenToUse: '',
        isDefault: true,
      },
    ]
    expect(findComponentsWithoutDefault(fixture)).toEqual([])
    expect(findComponentsWithMultipleDefaults(fixture)).toEqual(['Tabs'])
  })

  it('não acusa nada quando o componente tem só uma variante (nada a distinguir)', () => {
    const fixture: ComponentCatalogEntry[] = [
      {
        code: 'CARD-001',
        name: 'x',
        component: 'Card',
        file: 'components/ui/card.tsx',
        variantProps: {},
        whenToUse: '',
      },
    ]
    expect(findComponentsWithoutDefault(fixture)).toEqual([])
    expect(findComponentsWithMultipleDefaults(fixture)).toEqual([])
  })
})

describe('catálogo de componentes: sem colisão com os códigos de modelo (T/C/M)', () => {
  it('nenhum código do catálogo casa /[TCM]\\d+/ (o padrão dos códigos de modelo de presets.ts)', () => {
    expect(findPresetCollisions(CATALOG)).toEqual([])
  })

  it('acusa colisão com T/C/M numa lista fabricada', () => {
    const fixture: ComponentCatalogEntry[] = [
      {
        code: 'TC1-001',
        name: 'x',
        component: 'X',
        file: 'components/ui/x.tsx',
        variantProps: {},
        whenToUse: '',
      },
    ]
    expect(findPresetCollisions(fixture)).toEqual(['TC1-001'])
  })

  it('nenhum código de modelo (T/C/M) de presets.ts casa o padrão do catálogo (^[A-Z]{3,4}-\\d{3}$)', () => {
    const modelCodes = [...themeCodes, ...colorCodes, ...menuCodes].map((c) => c.code)
    expect(modelCodes.length).toBeGreaterThan(0)
    for (const code of modelCodes) {
      expect(COMPONENT_CODE_PATTERN.test(code)).toBe(false)
    }
  })

  it('assertCatalogIntegrity() passa com o catálogo real', () => {
    expect(() => assertCatalogIntegrity()).not.toThrow()
  })
})

/** Escapa um texto para uso literal dentro de uma RegExp. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * O valor aparece no código-fonte como literal entre aspas ('line', "pill") ou como chave de
 * objeto (variants: { primary: '...' } do cva, ou 'primary': ...). Palavra solta em
 * comentário ou nome de variável não conta.
 */
function sourceDeclaresVariant(source: string, value: string): boolean {
  const v = escapeRegExp(value)
  // Chave de objeto: depois de "{" ou "," ou no começo da linha (cva com comentário antes).
  return new RegExp(`(['"])${v}\\1|(^|[{,])\\s*${v}\\s*:`, 'm').test(source)
}

describe('catálogo de componentes: variantProps existem de verdade no componente', () => {
  it('todo valor de variantProps aparece como literal entre aspas ou chave de objeto no arquivo', () => {
    for (const entry of CATALOG) {
      if (Object.keys(entry.variantProps).length === 0) continue
      const source = readFileSync(join(process.cwd(), 'src', entry.file), 'utf8')
      for (const value of Object.values(entry.variantProps)) {
        if (typeof value === 'string') {
          expect(
            sourceDeclaresVariant(source, value),
            `${entry.code}: "${value}" não aparece em ${entry.file}`,
          ).toBe(true)
        }
      }
    }
  })

  it('a checagem recusa o valor solto (comentário ou nome) e aceita aspas e chave de objeto', () => {
    expect(sourceDeclaresVariant('// variante pill, em comentário', 'pill')).toBe(false)
    expect(sourceDeclaresVariant('const pillWidth = 2', 'pill')).toBe(false)
    expect(sourceDeclaresVariant("variant: 'line' | 'pill'", 'pill')).toBe(true)
    expect(sourceDeclaresVariant('variant: "pill"', 'pill')).toBe(true)
    expect(sourceDeclaresVariant("variants: { primary: 'bg-primary' }", 'primary')).toBe(true)
    expect(sourceDeclaresVariant("{\n  ghost: 'x',\n}", 'ghost')).toBe(true)
    expect(sourceDeclaresVariant("{\n  // comentário\n  ghost: 'x',\n}", 'ghost')).toBe(true)
    expect(sourceDeclaresVariant('{\n  // ghost: comentado\n}', 'ghost')).toBe(false)
  })
})

/** Códigos literais de data-rendra="XXX-000" num código-fonte. */
function literalDataRendraCodes(source: string): string[] {
  return [...source.matchAll(/data-rendra="([A-Z]{3,4}-\d{3})"/g)].map((m) => m[1]!)
}

/** Componentes com mais de uma entrada no catálogo para o mesmo arquivo. */
function componentsWithVariants(file: string): string[] {
  const count = new Map<string, number>()
  for (const entry of CATALOG.filter((e) => e.file === file)) {
    count.set(entry.component, (count.get(entry.component) ?? 0) + 1)
  }
  return [...count].filter(([, n]) => n > 1).map(([component]) => component)
}

describe('catálogo de componentes: data-rendra no código dos componentes', () => {
  it('extrai só os data-rendra literais no formato do catálogo', () => {
    const source =
      'a data-rendra="BTN-001" b data-rendra={code} c data-rendra="x-1" d data-rendra="ABA-002"'
    expect(literalDataRendraCodes(source)).toEqual(['BTN-001', 'ABA-002'])
  })

  it('todo data-rendra literal de src/components/ui existe no catálogo, com o arquivo certo', () => {
    for (const file of realUiFiles()) {
      const source = readFileSync(join(process.cwd(), 'src', file), 'utf8')
      for (const code of literalDataRendraCodes(source)) {
        const entry = getCatalogEntry(code)
        expect(entry, `${file}: data-rendra="${code}" não existe no catálogo`).toBeDefined()
        expect(entry?.file, `${file}: data-rendra="${code}" é de outro arquivo`).toBe(file)
      }
    }
  })

  it('arquivo com mais de uma variante do mesmo componente resolve o código com resolveCatalogCode', () => {
    for (const file of realUiFiles()) {
      const components = componentsWithVariants(file)
      if (components.length === 0) continue
      const source = readFileSync(join(process.cwd(), 'src', file), 'utf8')
      expect(
        /import\s*\{[^}]*\bresolveCatalogCode\b[^}]*\}\s*from\s*'@\/catalog\/components'/.test(
          source,
        ),
        `${file} (${components.join(', ')}) precisa importar resolveCatalogCode`,
      ).toBe(true)
    }
  })

  it('toda entrada do catálogo aparece na vitrine (/componentes)', () => {
    const showcaseDir = join(process.cwd(), 'src/pages/showcase')
    const sources = [
      ...readdirSync(showcaseDir)
        .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
        .map((name) => readFileSync(join(showcaseDir, name), 'utf8')),
      readFileSync(join(process.cwd(), 'src/pages/components-page.tsx'), 'utf8'),
    ].join('\n')
    const missing = CATALOG.filter(
      (entry) => !sources.includes(`'${entry.code}'`) && !sources.includes(`"${entry.code}"`),
    )
    expect(missing.map((entry) => entry.code)).toEqual([])
  })
})

describe('helpers do catálogo', () => {
  it('getCatalogEntry encontra pelo código e devolve undefined para código inexistente', () => {
    expect(getCatalogEntry('BTN-001')?.component).toBe('Button')
    expect(getCatalogEntry('ZZZ-999')).toBeUndefined()
  })

  it('catalogByComponent devolve todas as variantes de um componente, na ordem cadastrada', () => {
    const codes = catalogByComponent('Button').map((e) => e.code)
    expect(codes).toEqual(['BTN-001', 'BTN-002', 'BTN-003', 'BTN-004', 'BTN-005', 'BTN-006'])
  })

  it('resolveCatalogCode escolhe a variante certa a partir das props', () => {
    expect(resolveCatalogCode('Tabs', { variant: 'line' })).toBe('ABA-001')
    expect(resolveCatalogCode('Tabs', { variant: 'pill' })).toBe('ABA-002')
  })

  it('resolveCatalogCode cai no primeiro código do componente quando a prop não bate com nenhuma variante', () => {
    expect(resolveCatalogCode('Button', { variant: 'inexistente' })).toBe('BTN-001')
  })

  it('resolveCatalogCode cai no único código de um componente sem variantes, mesmo sem props', () => {
    expect(resolveCatalogCode('Card')).toBe('CARD-001')
  })

  it('resolveCatalogCode lança para um componente sem nenhum código cadastrado', () => {
    expect(() => resolveCatalogCode('ComponenteQueNaoExiste')).toThrow()
  })
})
