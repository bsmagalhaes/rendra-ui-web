/*
 * `auditarTudo`: a varredura completa (as 17 regras) que `rendra auditar --all` e o
 * `check:rules` compartilham. Gatilhos de `variavel-sem-prefixo-rendra` e afins são montados
 * por concatenação ou vêm de fixture, porque o `check:rules` varre este arquivo.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { IDS_REGRAS_GENERICAS } from './auditar.ts'
import { IDS_TODAS_AS_REGRAS, auditarTudo } from './auditar-tudo.ts'
import { IDS_REGRAS_EXTRAS } from './regras-extras.ts'

const FIXTURES = join(import.meta.dirname, '../../test/fixtures')
const COMPLETA = join(FIXTURES, 'regras-completas')
const VAR = 'var(--'
const temporarios: string[] = []

/** Cria um projeto temporário com os arquivos dados (caminho relativo -> conteúdo). */
function projeto(arquivos: Record<string, string>): string {
  const raiz = mkdtempSync(join(tmpdir(), 'rendra-auditar-tudo-'))
  temporarios.push(raiz)
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, caminho)), { recursive: true })
    writeFileSync(join(raiz, caminho), conteudo)
  }
  return raiz
}

afterAll(() => {
  for (const t of temporarios) rmSync(t, { recursive: true, force: true })
})

const regrasDe = (r: { violacoes: { rule: string }[] }) => r.violacoes.map((v) => v.rule)
const arquivosDe = (r: { violacoes: { file: string }[] }) => [
  ...new Set(r.violacoes.map((v) => v.file)),
]

describe('IDS_TODAS_AS_REGRAS', () => {
  it('são as 17: sete genéricas mais dez extras, sem repetição', () => {
    expect(IDS_REGRAS_GENERICAS).toHaveLength(7)
    expect(IDS_REGRAS_EXTRAS).toHaveLength(10)
    expect(IDS_TODAS_AS_REGRAS).toHaveLength(17)
    expect(new Set(IDS_TODAS_AS_REGRAS).size).toBe(17)
  })
})

describe('modo repositorio', () => {
  const resultado = auditarTudo(COMPLETA, { modo: 'repositorio' })

  it('acusa os 17 identificadores na fixture completa', () => {
    expect([...new Set(regrasDe(resultado))].sort()).toEqual([...IDS_TODAS_AS_REGRAS].sort())
  })

  it('conta os arquivos varridos (todos os .ts/.tsx/.css de src)', () => {
    expect(resultado.arquivos).toBe(7)
  })

  it('não ordena: sai na ordem da varredura e, por arquivo, na ordem das regras', () => {
    const tela = resultado.violacoes.filter((v) => v.file === 'src/pages/app/tela.tsx')
    // telas (texto-orientativo, botao-solto) antes das genéricas e das de linha
    expect(tela.map((v) => v.rule).slice(0, 2)).toEqual(['texto-orientativo', 'botao-solto'])
    const pagina = resultado.violacoes.filter((v) => v.file === 'src/pagina.tsx')
    // variavel-sem-prefixo primeiro; depois as genéricas; por último as de linha
    expect(pagina[0]!.rule).toBe('variavel-sem-prefixo-rendra')
    expect(pagina[1]!.rule).toBe('cor-fixa')
    expect(pagina.at(-1)!.rule).toBe('primaria-como-texto')
    expect(arquivosDe(resultado)[0]).toBe('src/brand/marca.ts')
  })

  it('arquivo de marca só recebe variavel-sem-prefixo-rendra', () => {
    const marca = resultado.violacoes.filter((v) => v.file === 'src/brand/marca.ts')
    expect(marca.map((v) => v.rule)).toEqual(['variavel-sem-prefixo-rendra'])
    expect(resultado.violacoes.some((v) => v.file.startsWith('src/styles/'))).toBe(false)
  })

  it('.css fora das pastas de marca acusa só css-fora-do-lugar', () => {
    const css = resultado.violacoes.filter((v) => v.file === 'src/estilos-soltos.css')
    expect(css.map((v) => v.rule)).toEqual(['css-fora-do-lugar'])
  })

  it('não lê rendra.config.json nem tem opção de pastas (varre sempre src)', () => {
    const r = auditarTudo(COMPLETA, { modo: 'repositorio', pastas: ['nao-existe'] })
    expect(r.arquivos).toBe(7)
  })

  it('sem src devolve vazio, sem lançar', () => {
    expect(auditarTudo(join(FIXTURES, 'nao-existe'), { modo: 'repositorio' })).toEqual({
      violacoes: [],
      arquivos: 0,
    })
  })

  it('não pula teste, story nem node_modules (como o script sempre fez)', () => {
    const raiz = projeto({
      'src/a.test.tsx': 'const x = "#ff0000"\n',
      'src/node_modules/b.tsx': 'const x = "#ff0000"\n',
    })
    const r = auditarTudo(raiz, { modo: 'repositorio' })
    expect(r.arquivos).toBe(2)
    expect(arquivosDe(r)).toEqual(['src/a.test.tsx', 'src/node_modules/b.tsx'])
  })

  it('regras: false desliga uma regra, até as de nome de arquivo', () => {
    const r = auditarTudo(COMPLETA, {
      modo: 'repositorio',
      regras: { 'componente-duplicado': false, 'botao-solto': false },
    })
    expect(regrasDe(r)).not.toContain('componente-duplicado')
    expect(regrasDe(r)).not.toContain('botao-solto')
    expect(regrasDe(r)).toContain('texto-orientativo')
  })
})

describe('modo cli', () => {
  it('é o padrão e ordena por arquivo e linha', () => {
    const { violacoes } = auditarTudo(COMPLETA)
    const pares = violacoes.map((v) => [v.file, v.line] as const)
    const ordenado = [...pares].sort((x, y) => x[0].localeCompare(y[0]) || x[1] - y[1])
    expect(pares).toEqual(ordenado)
    expect(violacoes[0]!.file).toBe('src/brand/marca.ts')
  })

  it('não varre .test., .stories., node_modules, dist nem build', () => {
    const raiz = projeto({
      'src/a.tsx': 'const x = "#ff0000"\n',
      'src/a.test.tsx': 'const x = "#ff0000"\n',
      'src/a.stories.tsx': 'const x = "#ff0000"\n',
      'src/node_modules/b.tsx': 'const x = "#ff0000"\n',
      'src/dist/c.tsx': 'const x = "#ff0000"\n',
      'src/build/d.tsx': 'const x = "#ff0000"\n',
    })
    expect(arquivosDe(auditarTudo(raiz))).toEqual(['src/a.tsx'])
    expect(auditarTudo(raiz).arquivos).toBe(1)
  })

  it('sem src, a raiz é a pasta do projeto', () => {
    const raiz = projeto({ 'app/a.tsx': 'const x = "#ff0000"\n' })
    expect(arquivosDe(auditarTudo(raiz))).toEqual(['app/a.tsx'])
  })

  it('pastasMarca e pastasTelas padrão são as do boilerplate', () => {
    const conteudo =
      '<Card><CardContent><Button>x</Button></CardContent></Card>\nconst c = "#ff0000"\n'
    const raiz = projeto({
      'src/brand/m.tsx': conteudo,
      'src/pages/app/t.tsx': conteudo,
      'src/outra/o.tsx': conteudo,
    })
    const por = (f: string) =>
      auditarTudo(raiz)
        .violacoes.filter((v) => v.file === f)
        .map((v) => v.rule)
    expect(por('src/brand/m.tsx')).toEqual([])
    expect(por('src/pages/app/t.tsx')).toEqual(['botao-solto', 'cor-fixa'])
    expect(por('src/outra/o.tsx')).toEqual(['cor-fixa'])
  })

  it('pastasMarca do projeto troca o padrão: marca passa só pelo prefixo --rendra-', () => {
    const raiz = projeto({
      'src/tema/t.ts': `const c = "#ff0000"\nconst d = '${VAR}primary)'\n`,
      'src/brand/b.ts': 'const c = "#ff0000"\n',
    })
    const r = auditarTudo(raiz, { pastasMarca: ['src/tema'] })
    expect(r.violacoes.filter((v) => v.file === 'src/tema/t.ts').map((v) => v.rule)).toEqual([
      'variavel-sem-prefixo-rendra',
    ])
    expect(regrasDe({ violacoes: r.violacoes.filter((v) => v.file === 'src/brand/b.ts') })).toEqual(
      ['cor-fixa'],
    )
  })

  it('pastasTelas do projeto troca o padrão: botao-solto e texto-orientativo só lá', () => {
    const botao = '<CardContent><Button>x</Button></CardContent>\n'
    const raiz = projeto({ 'src/telas/t.tsx': botao, 'src/pages/app/p.tsx': botao })
    const r = auditarTudo(raiz, { pastasTelas: ['src/telas'] })
    expect(arquivosDe(r)).toEqual(['src/telas/t.tsx'])
  })

  it('.css dentro de pasta de marca não acusa css-fora-do-lugar; fora, acusa e nada mais', () => {
    const raiz = projeto({
      'src/styles/ok.css': 'a { color: #fff; }\n',
      'src/solto.css': 'a { color: #fff; }\n',
    })
    const r = auditarTudo(raiz)
    expect(r.violacoes.map((v) => `${v.file}:${v.rule}`)).toEqual([
      'src/solto.css:css-fora-do-lugar',
    ])
  })

  it('pasta com nome parecido com a de marca não é pasta de marca', () => {
    const raiz = projeto({ 'src/brand-novo/a.tsx': 'const c = "#ff0000"\n' })
    expect(regrasDe(auditarTudo(raiz))).toEqual(['cor-fixa'])
  })

  it('regras: false desliga só a regra pedida', () => {
    const botao = '<CardContent><Button>x</Button></CardContent>\nconst c = "#ff0000"\n'
    const raiz = projeto({ 'src/pages/app/t.tsx': botao })
    const r = auditarTudo(raiz, { regras: { 'botao-solto': false } })
    expect(regrasDe(r)).toEqual(['cor-fixa'])
  })

  it('ignorar e pastas funcionam como em auditar', () => {
    const raiz = projeto({
      'src/a.tsx': 'const c = "#ff0000"\n',
      'src/gerado/g.tsx': 'const c = "#ff0000"\n',
      'extra/e.tsx': 'const c = "#ff0000"\n',
    })
    expect(arquivosDe(auditarTudo(raiz, { ignorar: ['src/gerado'] }))).toEqual(['src/a.tsx'])
    expect(
      arquivosDe(auditarTudo(raiz, { pastas: ['src', 'extra'], ignorar: ['src/gerado'] })),
    ).toEqual(['extra/e.tsx', 'src/a.tsx'])
  })

  it('componente-duplicado acusa por nome também em pasta de marca', () => {
    const raiz = projeto({ 'src/brand/LogoMobile.tsx': 'export {}\n' })
    expect(regrasDe(auditarTudo(raiz))).toEqual(['componente-duplicado'])
  })
})
