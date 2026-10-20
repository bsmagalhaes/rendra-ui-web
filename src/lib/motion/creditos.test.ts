import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * Créditos do motion no README (T8): quem desenhou as regras, a licença e o link de origem. As
 * skills não são commitadas (o Rendra não as redistribui), então não há NOTICE a manter: o aviso
 * da Apache 2.0 (§4d) vale para quem redistribui a obra, e aqui há só a menção.
 */
const readme = readFileSync('README.md', 'utf8')
const secao = readme.slice(readme.indexOf('## Créditos'))

describe('README: seção Créditos das ferramentas de movimento', () => {
  it('cita Emil Kowalski, a licença MIT e o repositório de origem', () => {
    expect(secao).toContain('Emil Kowalski')
    expect(secao).toMatch(/MIT/)
    expect(secao).toContain('https://github.com/emilkowalski/skills')
  })

  it('cita a Impeccable, a licença Apache 2.0 e o repositório de origem', () => {
    expect(secao).toContain('Impeccable')
    expect(secao).toMatch(/Apache 2\.0/)
    expect(secao).toContain('https://github.com/pbakaus/impeccable')
  })

  it('não inventa NOTICE nem linha de copyright de terceiros', () => {
    expect(existsSync('NOTICE')).toBe(false)
    expect(secao).not.toMatch(/Copyright\s*(\(c\)|©)/i)
  })

  it('as skills e a pasta .cursor não entram no repositório (.gitignore protege .claude)', () => {
    expect(readFileSync('.gitignore', 'utf8')).toMatch(/^\.claude\/$/m)
  })
})
