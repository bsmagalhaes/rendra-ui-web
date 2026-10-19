/*
 * `executarAuditar`: tudo o que `rendra auditar` decide (argumentos, base, config, precedência,
 * `auditar` ou `auditarTudo`), como função com teste. O `bin` só importa, chama, imprime e
 * define o código de saída (o CI roda os testes antes do build, então nenhum teste chama o bin).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { executarAuditar } from './executar-auditar.ts'
import { formatHelp } from './help.ts'

const temporarios: string[] = []
const COR = 'const c = "#ff0000"\n'
const BOTAO = '<CardContent><Button>x</Button></CardContent>\n'

function projeto(arquivos: Record<string, string>): string {
  const raiz = mkdtempSync(join(tmpdir(), 'rendra-executar-'))
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

type Resultado = ReturnType<typeof executarAuditar>
const violacoes = (r: Resultado) => {
  if (!('violacoes' in r)) throw new Error(`esperava violações, veio ${JSON.stringify(r)}`)
  return r.violacoes
}
const erroDe = (r: Resultado) => {
  if (!('erro' in r)) throw new Error('esperava erro')
  return r.erro
}
const arquivos = (r: Resultado) => [...new Set(violacoes(r).map((v) => v.file))]
const config = (obj: unknown) => JSON.stringify(obj)

describe('base e posicionais', () => {
  it('sem posicional, a base é o cwd do processo', () => {
    const cwd = projeto({ 'src/a.tsx': COR })
    expect(arquivos(executarAuditar([], cwd))).toEqual(['src/a.tsx'])
  })

  it('uma posicional vira a base: file relativo a ela e config lida dela', () => {
    const outro = projeto({})
    const alvo = projeto({
      'src/a.tsx': COR,
      'extra/e.tsx': COR,
      'rendra.config.json': config({ pastas: ['extra'] }),
    })
    expect(arquivos(executarAuditar([alvo], outro))).toEqual(['extra/e.tsx'])
  })

  it('uma posicional relativa é resolvida contra o cwd do processo', () => {
    const cwd = projeto({ 'proj/src/a.tsx': COR })
    expect(arquivos(executarAuditar(['proj'], cwd))).toEqual(['src/a.tsx'])
  })

  it('uma posicional inexistente não é erro: nada a varrer, como sempre', () => {
    const cwd = projeto({})
    expect(violacoes(executarAuditar(['nao-existe'], cwd))).toEqual([])
  })

  it('duas ou mais posicionais substituem pastas, com file e config relativos ao cwd', () => {
    const cwd = projeto({
      'src/a.tsx': COR,
      'extra/e.tsx': COR,
      'fora/f.tsx': COR,
      'rendra.config.json': config({ pastas: ['fora'] }),
    })
    expect(arquivos(executarAuditar(['src', 'extra'], cwd))).toEqual(['extra/e.tsx', 'src/a.tsx'])
  })

  it('pasta do config é varrida como está, sem o atalho para src', () => {
    const cwd = projeto({
      'src/a.tsx': COR,
      'extra/e.tsx': COR,
      'rendra.config.json': config({ pastas: ['extra'] }),
    })
    expect(arquivos(executarAuditar([], cwd))).toEqual(['extra/e.tsx'])
  })

  it('aceita pasta absoluta dentro da base', () => {
    const cwd = projeto({ 'extra/e.tsx': COR, 'src/a.tsx': COR })
    expect(arquivos(executarAuditar([join(cwd, 'extra'), 'src'], cwd))).toEqual([
      'extra/e.tsx',
      'src/a.tsx',
    ])
  })
})

describe('pasta fora da base', () => {
  it('posicional (duas ou mais) fora da base: erro claro, nada varrido', () => {
    const cwd = projeto({ 'src/a.tsx': COR })
    const fora = projeto({ 'x.tsx': COR })
    const erro = erroDe(executarAuditar(['src', fora], cwd))
    expect(erro).toContain('fora de')
    expect(erro).toContain(fora)
  })

  it('.. também é fora da base', () => {
    const cwd = projeto({ 'src/a.tsx': COR })
    expect(erroDe(executarAuditar(['src', '../irmao'], cwd))).toContain('fora de')
  })

  it('pasta do config fora da base: erro claro', () => {
    const cwd = projeto({ 'rendra.config.json': config({ pastas: ['../fora'] }) })
    expect(erroDe(executarAuditar([], cwd))).toContain('fora de')
  })

  it('config da posicional única com pasta fora da base também erra', () => {
    const outro = projeto({})
    const alvo = projeto({ 'rendra.config.json': config({ pastas: ['../x'] }) })
    expect(erroDe(executarAuditar([alvo], outro))).toContain('fora de')
  })
})

describe('precedência e config', () => {
  const alvo = () =>
    projeto({
      'src/a.tsx': COR,
      'src/gerado/g.tsx': COR,
      'src/outro/o.tsx': COR,
      'rendra.config.json': config({ ignorar: ['src/gerado'] }),
    })

  it('config aplicada sem flag (ignorar)', () => {
    expect(arquivos(executarAuditar([], alvo()))).toEqual(['src/a.tsx', 'src/outro/o.tsx'])
  })

  it('flag substitui a chave do config, não soma', () => {
    expect(arquivos(executarAuditar(['--ignore', 'src/outro'], alvo()))).toEqual([
      'src/a.tsx',
      'src/gerado/g.tsx',
    ])
  })

  it('as três formas de --ignore dão o mesmo resultado', () => {
    const cwd = alvo()
    const a = executarAuditar(['--ignore', 'src/gerado,src/outro'], cwd)
    const b = executarAuditar(['--ignore', 'src/gerado', '--ignore', 'src/outro'], cwd)
    const c = executarAuditar(['--ignore=src/gerado,src/outro'], cwd)
    expect(arquivos(a)).toEqual(['src/a.tsx'])
    expect(b).toEqual(a)
    expect(c).toEqual(a)
  })

  it('--ignore é relativo à base (a posicional única)', () => {
    const outro = projeto({})
    const raiz = projeto({ 'src/a.tsx': COR, 'src/gerado/g.tsx': COR })
    expect(arquivos(executarAuditar([raiz, '--ignore', 'src/gerado'], outro))).toEqual([
      'src/a.tsx',
    ])
  })

  it('regras: false do config desliga uma regra genérica, sem --all', () => {
    const cwd = projeto({
      'src/a.tsx': 'const c = "#ff0000"\n<div className="p-[13px]" />\n',
      'rendra.config.json': config({ regras: { 'cor-fixa': false } }),
    })
    expect(violacoes(executarAuditar([], cwd)).map((v) => v.rule)).toEqual(['valor-arbitrario'])
  })

  it('sem --all, só as sete genéricas: marca e regras extras não entram', () => {
    const cwd = projeto({ 'src/pages/app/t.tsx': BOTAO + COR, 'src/brand/m.tsx': COR })
    const regras = violacoes(executarAuditar([], cwd)).map((v) => `${v.file}:${v.rule}`)
    expect(regras).toEqual(['src/brand/m.tsx:cor-fixa', 'src/pages/app/t.tsx:cor-fixa'])
  })
})

describe('--all', () => {
  it('liga as 17 regras, com marca e telas padrão', () => {
    const cwd = projeto({
      'src/pages/app/t.tsx': BOTAO + COR,
      'src/brand/m.tsx': COR,
      'src/solto.css': 'a { color: red; }\n',
    })
    const r = violacoes(executarAuditar(['--all'], cwd)).map((v) => `${v.file}:${v.rule}`)
    expect(r).toEqual([
      'src/pages/app/t.tsx:botao-solto',
      'src/pages/app/t.tsx:cor-fixa',
      'src/solto.css:css-fora-do-lugar',
    ])
  })

  it('config: regras desliga uma regra extra e pastasMarca/pastasTelas trocam os padrões', () => {
    const cwd = projeto({
      'src/telas/t.tsx': BOTAO,
      'src/tema/m.tsx': COR,
      'rendra.config.json': config({
        pastasMarca: ['src/tema'],
        pastasTelas: ['src/telas'],
        regras: { 'botao-solto': false },
      }),
    })
    expect(violacoes(executarAuditar(['--all'], cwd))).toEqual([])
    const ligado = projeto({
      'src/telas/t.tsx': BOTAO,
      'src/tema/m.tsx': COR,
      'rendra.config.json': config({ pastasMarca: ['src/tema'], pastasTelas: ['src/telas'] }),
    })
    expect(violacoes(executarAuditar(['--all'], ligado)).map((v) => v.rule)).toEqual([
      'botao-solto',
    ])
  })

  it('--all junto de --ignore e várias pastas', () => {
    const cwd = projeto({ 'src/a.tsx': COR, 'extra/e.tsx': COR, 'extra/gerado/g.tsx': COR })
    const r = executarAuditar(['--all', 'src', 'extra', '--ignore', 'extra/gerado'], cwd)
    expect(arquivos(r)).toEqual(['extra/e.tsx', 'src/a.tsx'])
  })
})

describe('erros e ajuda', () => {
  it('flag desconhecida: erro, nada varrido', () => {
    const cwd = projeto({ 'src/a.tsx': COR })
    expect(erroDe(executarAuditar(['--foo'], cwd))).toContain('Flag desconhecida: --foo')
  })

  it('--ignore sem valor: erro', () => {
    expect(erroDe(executarAuditar(['--ignore'], projeto({})))).toContain('Falta o valor')
  })

  it('JSON inválido no config: erro em português citando o arquivo', () => {
    const cwd = projeto({ 'rendra.config.json': '{ nope', 'src/a.tsx': COR })
    const erro = erroDe(executarAuditar([], cwd))
    expect(erro).toContain('rendra.config.json')
    expect(erro).toContain('JSON inválido')
  })

  it('--help devolve a ajuda geral, sem varrer', () => {
    const r = executarAuditar(['--help'], projeto({ 'src/a.tsx': COR }))
    expect(r).toEqual({ ajuda: formatHelp() })
  })

  it('argumento inválido vence o --help', () => {
    expect(executarAuditar(['--help', '--foo'], projeto({}))).toHaveProperty('erro')
  })
})
