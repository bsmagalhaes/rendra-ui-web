/*
 * Teste de caracterização de scripts/check-design-rules.mjs (`npm run check:rules`): roda o
 * script de verdade, por processo, sobre fixtures em test/fixtures e confere a saída completa
 * (ordem inclusive), o código de saída e a presença de cada um dos 17 identificadores de regra.
 * Nasceu verde contra o script antigo (varredura própria) e tem de seguir verde, sem edição,
 * depois que o script virou chamador fino de src/cli/auditar-tudo.ts.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = join(import.meta.dirname, '..')
const SCRIPT = join(RAIZ, 'scripts', 'check-design-rules.mjs')
const FIXTURES = join(RAIZ, 'test', 'fixtures')

const IDS = [
  'cor-fixa',
  'valor-arbitrario',
  'estilo-inline',
  'fonte-fixa',
  '100vh',
  'raio-fixo',
  'fora-da-escala',
  'var-inline',
  'svg-marca',
  'classe-dinamica',
  'texto-estreito',
  'primaria-como-texto',
  'componente-duplicado',
  'css-fora-do-lugar',
  'botao-solto',
  'texto-orientativo',
  'variavel-sem-prefixo-rendra',
]

function rodar(fixture: string) {
  const r = spawnSync(process.execPath, [SCRIPT], {
    cwd: join(FIXTURES, fixture),
    encoding: 'utf8',
  })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}

describe('scripts/check-design-rules.mjs', () => {
  it('acusa os 17 identificadores na fixture completa, com arquivo:linha', () => {
    const { status, stderr } = rodar('regras-completas')
    expect(status).toBe(1)
    for (const id of IDS) expect(stderr).toMatch(new RegExp(`\\S+:\\d+  \\[${id}\\] `))
  })

  it('imprime a saída completa, na ordem de sempre (igualdade exata)', () => {
    // autocrlf do Windows pode converter o esperado em CRLF no checkout: normaliza
    const esperado = readFileSync(join(FIXTURES, 'regras-completas.esperado.txt'), 'utf8').replace(
      /\r\n/g,
      '\n',
    )
    const { stderr, stdout } = rodar('regras-completas')
    expect(stdout).toBe('')
    expect(stderr.replace(/\r\n/g, '\n')).toBe(esperado)
  })

  it('numa fixture limpa sai com 0 e diz que não há violação', () => {
    const { status, stdout, stderr } = rodar('projeto-limpo')
    expect(status).toBe(0)
    expect(stderr).toBe('')
    expect(stdout).toBe('Regras de design: 1 arquivos verificados, nenhuma violação.\n')
  })
})
