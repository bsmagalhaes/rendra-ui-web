import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { auditar, auditLines, casaPrefixo } from './auditar'

const FIXTURES = join(import.meta.dirname, '../../test/fixtures')

describe('auditLines', () => {
  it('acusa cor fixa', () => {
    const violations = auditLines('const x = <div className="bg-[#123456]" />')
    // valor-arbitrário e cor-fixa podem coincidir na mesma linha; confere que cor-fixa aparece.
    expect(violations.some((v) => v.rule === 'cor-fixa')).toBe(true)
  })

  it('acusa valor arbitrário do Tailwind', () => {
    const violations = auditLines('<div className="p-[13px]" />')
    expect(violations.map((v) => v.rule)).toContain('valor-arbitrario')
  })

  it('não acusa classe dentro da escala permitida', () => {
    const violations = auditLines('<div className="p-4 gap-6" />')
    expect(violations).toHaveLength(0)
  })

  it('acusa degrau fora da escala', () => {
    const violations = auditLines('<div className="p-5" />')
    expect(violations.map((v) => v.rule)).toContain('fora-da-escala')
  })

  it('acusa estilo inline (fora de variável CSS)', () => {
    const violations = auditLines('<div style={{ color: "red" }} />')
    expect(violations.map((v) => v.rule)).toContain('estilo-inline')
  })

  it('não acusa estilo inline quando é só variável CSS', () => {
    const violations = auditLines("<div style={{ '--x': 10 }} />")
    expect(violations.map((v) => v.rule)).not.toContain('estilo-inline')
  })

  it('acusa fonte fixa', () => {
    const violations = auditLines('font-family: Roboto, sans-serif;')
    expect(violations.map((v) => v.rule)).toContain('fonte-fixa')
  })

  it('acusa 100vh', () => {
    const violations = auditLines('.x { height: 100vh; }')
    expect(violations.map((v) => v.rule)).toContain('100vh')
  })

  it('acusa raio fixo', () => {
    const violations = auditLines('.x { border-radius: 6px; }')
    expect(violations.map((v) => v.rule)).toContain('raio-fixo')
  })

  it('não acusa raio quando vem de uma variável', () => {
    const violations = auditLines('.x { border-radius: var(--rendra-shape-item); }')
    expect(violations.map((v) => v.rule)).not.toContain('raio-fixo')
  })

  it('pula linha de comentário', () => {
    const violations = auditLines('// className="p-[13px]"')
    expect(violations).toHaveLength(0)
  })
})

describe('auditar', () => {
  it('reporta a violação esperada na fixture com valor arbitrário', () => {
    const violations = auditar(join(FIXTURES, 'projeto-com-valor-arbitrario'))
    expect(violations.length).toBeGreaterThan(0)
    const violation = violations.find((v) => v.rule === 'valor-arbitrario')
    expect(violation).toBeDefined()
    expect(violation!.file).toBe('src/pagina.tsx')
    expect(violation!.line).toBeGreaterThan(0)
  })

  it('não reporta nada na fixture limpa', () => {
    expect(auditar(join(FIXTURES, 'projeto-limpo'))).toHaveLength(0)
  })

  it('devolve lista vazia quando o diretório não existe', () => {
    expect(auditar(join(FIXTURES, 'nao-existe'))).toHaveLength(0)
  })
})

describe('casaPrefixo', () => {
  it('casa o arquivo dentro da pasta, nunca por prefixo de texto', () => {
    expect(casaPrefixo('src/brand/marca.ts', ['src/brand'])).toBe(true)
    expect(casaPrefixo('src/brand', ['src/brand'])).toBe(true)
    expect(casaPrefixo('src/brand/marca.ts', ['src/br'])).toBe(false)
    expect(casaPrefixo('src/brand-novo/a.ts', ['src/brand'])).toBe(false)
  })

  it('normaliza ./ inicial, / final e contrabarra', () => {
    expect(casaPrefixo('src/brand/marca.ts', ['./src/brand/'])).toBe(true)
    expect(casaPrefixo('src/brand/marca.ts', ['src\\brand'])).toBe(true)
  })

  it('sem prefixos, ou com prefixo vazio, não casa nada', () => {
    expect(casaPrefixo('src/a.ts', [])).toBe(false)
    expect(casaPrefixo('src/a.ts', ['', '.', './'])).toBe(false)
  })

  it('casa se qualquer prefixo da lista casar', () => {
    expect(casaPrefixo('extra/a.ts', ['src/brand', 'extra'])).toBe(true)
  })
})

describe('auditar com opções', () => {
  const projeto = join(FIXTURES, 'projeto-varias-pastas')
  const arquivos = (r: { file: string }[]) => [...new Set(r.map((v) => v.file))]

  it('sem opções devolve o mesmo que sempre: só a raiz src, marca e estilos inclusos', () => {
    expect(arquivos(auditar(projeto))).toEqual([
      'src/brand/marca.ts',
      'src/pagina.tsx',
      'src/styles/tema.css',
    ])
    expect(auditar(projeto, {})).toEqual(auditar(projeto))
  })

  it('ignorar tira só as pastas pedidas', () => {
    const r = auditar(projeto, { ignorar: ['src/brand', 'src/styles'] })
    expect(arquivos(r)).toEqual(['src/pagina.tsx'])
  })

  it('ignorar é prefixo de pasta, não de texto; ./ e / final equivalem', () => {
    expect(arquivos(auditar(projeto, { ignorar: ['src/br'] }))).toContain('src/brand/marca.ts')
    const a = auditar(projeto, { ignorar: ['./src/brand/'] })
    const b = auditar(projeto, { ignorar: ['src/brand'] })
    expect(a).toEqual(b)
    expect(arquivos(a)).not.toContain('src/brand/marca.ts')
  })

  it('pastas junta as pastas dadas, file relativo ao cwd, ordenado', () => {
    const r = auditar(projeto, { pastas: ['src', 'extra'] })
    expect(arquivos(r)).toEqual([
      'extra/outra.tsx',
      'src/brand/marca.ts',
      'src/pagina.tsx',
      'src/styles/tema.css',
    ])
  })

  it('pastas dadas valem como estão, sem o atalho para src', () => {
    expect(arquivos(auditar(projeto, { pastas: ['extra'] }))).toEqual(['extra/outra.tsx'])
  })

  it('pasta repetida ou aninhada não duplica violação', () => {
    const uma = auditar(projeto, { pastas: ['src'] })
    expect(auditar(projeto, { pastas: ['src', 'src', 'src/brand'] })).toEqual(uma)
  })

  it('pasta inexistente em pastas não quebra', () => {
    expect(arquivos(auditar(projeto, { pastas: ['nao-existe', 'extra'] }))).toEqual([
      'extra/outra.tsx',
    ])
    expect(auditar(projeto, { pastas: ['nao-existe'] })).toEqual([])
  })

  it('ignorar também vale para pasta dada em pastas', () => {
    expect(auditar(projeto, { pastas: ['src', 'extra'], ignorar: ['extra'] })).toEqual(
      auditar(projeto),
    )
  })

  it('regras: false desliga uma regra genérica, as outras seguem', () => {
    const r = auditar(projeto, { regras: { 'cor-fixa': false } })
    expect(r.map((v) => v.rule)).not.toContain('cor-fixa')
    expect(r.map((v) => v.rule)).toContain('valor-arbitrario')
    expect(auditar(projeto, { regras: { 'cor-fixa': true } })).toEqual(auditar(projeto))
  })
})

describe('não duplicação (scripts/check-design-rules.mjs)', () => {
  const raiz = join(import.meta.dirname, '../..')
  const scriptSource = readFileSync(join(raiz, 'scripts/check-design-rules.mjs'), 'utf8')
  const tudoSource = readFileSync(join(raiz, 'src/cli/auditar-tudo.ts'), 'utf8')

  it('importa a varredura de src/cli/auditar-tudo.ts em vez de repeti-la', () => {
    expect(scriptSource).toMatch(/from ['"]\.\.\/src\/cli\/auditar-tudo\.ts['"]/)
  })

  it('auditar-tudo reaproveita as regras dos módulos únicos', () => {
    expect(tudoSource).toMatch(/import \{[^}]*\bauditLines\b[^}]*\} from ['"]\.\/auditar\.ts['"]/)
    expect(tudoSource).toMatch(/from ['"]\.\/regras-extras\.ts['"]/)
  })

  it('regras-extras delega texto-orientativo e prefixo aos módulos movidos', () => {
    const extras = readFileSync(join(raiz, 'src/cli/regras-extras.ts'), 'utf8')
    expect(extras).toMatch(/checkGuidance\b[^;]*from ['"]\.\/help-length\.ts['"]/)
    expect(extras).toMatch(/checkVarPrefix\b[^;]*from ['"]\.\/var-prefix\.ts['"]/)
  })

  it.each([
    'cor-fixa',
    'fora-da-escala',
    'var-inline',
    'svg-marca',
    'classe-dinamica',
    'texto-estreito',
    'primaria-como-texto',
    'botao-solto',
    'css-fora-do-lugar',
    'componente-duplicado',
  ])('o script não mantém uma segunda cópia da regra %s', (id) => {
    expect(scriptSource).not.toContain(`id: '${id}'`)
  })
})
