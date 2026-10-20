import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { notFoundRedirectScript, stageSite } from './pages-stage'

const ROOT = 'https://bsmagalhaes.github.io/rendra-ui-web/'
const RAIZ = ['index.html', 'icon.svg', 'og-image.png', 'google9146e14a87f8288f.html']
const LLMS =
  '# Rendra Design System\n\n- [Demo](https://bsmagalhaes.github.io/rendra-ui-web/demo/)\n'

function arranjo({ comStorybook = true } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'rendra-web-stage-'))
  const dist = join(base, 'dist')
  const docs = join(base, 'docs')
  mkdirSync(join(dist, 'r'), { recursive: true })
  writeFileSync(join(dist, 'index.html'), 'demo')
  writeFileSync(
    join(dist, '404.html'),
    '<!doctype html><html><head><title>404 da demo</title></head></html>',
  )
  writeFileSync(
    join(dist, 'sitemap.xml'),
    `<urlset><url><loc>${ROOT}demo/</loc></url><url><loc>${ROOT}demo/componentes/</loc></url></urlset>`,
  )
  writeFileSync(join(dist, 'robots.txt'), 'robots da demo')
  writeFileSync(join(dist, 'r', 'select.json'), '{"name":"select"}')
  if (comStorybook) {
    mkdirSync(join(dist, 'storybook'), { recursive: true })
    writeFileSync(join(dist, 'storybook', 'index.html'), 'sb')
  }
  mkdirSync(join(docs, 'images'), { recursive: true })
  writeFileSync(join(docs, 'images', 'safira-painel.webp'), 'webp')
  mkdirSync(join(docs, 'videos'), { recursive: true })
  writeFileSync(join(docs, 'videos', 'rendra-web-apresentacao.mp4'), 'mp4')
  for (const nome of RAIZ) writeFileSync(join(docs, nome), `raiz:${nome}`)
  return { base, dist, docs, out: join(base, '.pages', 'rendra-ui-web') }
}

const stage = (a: ReturnType<typeof arranjo>, routes: string[] = []) =>
  stageSite({
    distDir: a.dist,
    docsDir: a.docs,
    outDir: a.out,
    rootUrl: ROOT,
    routes,
    llmsTxt: LLMS,
  })

describe('stageSite', () => {
  it('página na raiz, demo em /demo/, registry em /r/ e Storybook em /storybook/', () => {
    const a = arranjo()
    stage(a)
    expect(readFileSync(join(a.out, 'index.html'), 'utf8')).toBe('raiz:index.html')
    expect(readFileSync(join(a.out, 'demo', 'index.html'), 'utf8')).toBe('demo')
    expect(readFileSync(join(a.out, 'r', 'select.json'), 'utf8')).toBe('{"name":"select"}')
    expect(readFileSync(join(a.out, 'storybook', 'index.html'), 'utf8')).toBe('sb')
    expect(readFileSync(join(a.out, 'images', 'safira-painel.webp'), 'utf8')).toBe('webp')
    expect(readFileSync(join(a.out, 'videos', 'rendra-web-apresentacao.mp4'), 'utf8')).toBe('mp4')
    expect(existsSync(join(a.out, 'demo', 'r'))).toBe(false)
    expect(existsSync(join(a.out, 'demo', 'storybook'))).toBe(false)
    rmSync(a.base, { recursive: true, force: true })
  })

  it('grava um stub em cada rota antiga apontando para a demo, sem tocar a página da raiz', () => {
    const a = arranjo()
    stage(a, ['/', '/clientes', '/clientes/1000'])
    const stub = readFileSync(join(a.out, 'clientes', 'index.html'), 'utf8')
    expect(stub).toContain(`url=${ROOT}demo/clientes/`)
    expect(stub).toContain('location.search + location.hash')
    expect(readFileSync(join(a.out, 'clientes', '1000', 'index.html'), 'utf8')).toContain(
      `url=${ROOT}demo/clientes/1000/`,
    )
    expect(readFileSync(join(a.out, 'index.html'), 'utf8')).toBe('raiz:index.html')
    rmSync(a.base, { recursive: true, force: true })
  })

  it('não grava stub por cima de demo/, r/ e storybook/', () => {
    const a = arranjo()
    stage(a, ['/demo', '/r', '/storybook'])
    expect(readFileSync(join(a.out, 'demo', 'index.html'), 'utf8')).toBe('demo')
    expect(readFileSync(join(a.out, 'r', 'select.json'), 'utf8')).toBe('{"name":"select"}')
    expect(readFileSync(join(a.out, 'storybook', 'index.html'), 'utf8')).toBe('sb')
    rmSync(a.base, { recursive: true, force: true })
  })

  it('mantém o arquivo do Search Console na raiz', () => {
    const a = arranjo()
    stage(a)
    expect(existsSync(join(a.out, 'google9146e14a87f8288f.html'))).toBe(true)
    rmSync(a.base, { recursive: true, force: true })
  })

  it('funciona sem Storybook (teste local) e não cria a pasta nem lista no sitemap', () => {
    const a = arranjo({ comStorybook: false })
    stage(a)
    expect(existsSync(join(a.out, 'storybook'))).toBe(false)
    expect(readFileSync(join(a.out, 'sitemap.xml'), 'utf8')).not.toContain('storybook')
    rmSync(a.base, { recursive: true, force: true })
  })

  it('sitemap da raiz lista a página, o Storybook e as URLs da demo; robots e llms.txt da raiz', () => {
    const a = arranjo()
    stage(a)
    const sitemap = readFileSync(join(a.out, 'sitemap.xml'), 'utf8')
    expect(sitemap).toContain(`<loc>${ROOT}</loc>`)
    expect(sitemap).toContain(`<loc>${ROOT}storybook/</loc>`)
    expect(sitemap).toContain(`<loc>${ROOT}demo/componentes/</loc>`)
    const robots = readFileSync(join(a.out, 'robots.txt'), 'utf8')
    expect(robots).toContain(`Sitemap: ${ROOT}sitemap.xml`)
    expect(robots).toContain('User-agent: GPTBot\nDisallow: /')
    expect(robots).not.toContain('robots da demo')
    expect(readFileSync(join(a.out, 'llms.txt'), 'utf8')).toContain(`${ROOT}demo/`)
    rmSync(a.base, { recursive: true, force: true })
  })

  it('o 404.html da raiz é o 404 da demo com o script de desvio; o da demo fica intacto (B10)', () => {
    const a = arranjo()
    stage(a)
    const raiz = readFileSync(join(a.out, '404.html'), 'utf8')
    expect(raiz).toContain('<title>404 da demo</title>')
    expect(raiz).toContain('<head><script>')
    expect(raiz).toContain(notFoundRedirectScript('/rendra-ui-web/'))
    const demo = readFileSync(join(a.out, 'demo', '404.html'), 'utf8')
    expect(demo).toContain('<title>404 da demo</title>')
    expect(demo).not.toContain('location.replace')
    rmSync(a.base, { recursive: true, force: true })
  })

  it('o script de desvio deixa passar demo/, r/ e storybook/ e leva o resto para dentro da demo', () => {
    const script = notFoundRedirectScript('/rendra-ui-web/')
    for (const reservado of ['demo/', 'r/', 'storybook/'])
      expect(script).toContain(`b+'${reservado}'`)
    expect(script).toContain(
      "location.replace(b+'demo/'+p.slice(b.length)+location.search+location.hash)",
    )
  })

  it.each([
    ['docs/index.html', (a: ReturnType<typeof arranjo>) => rmSync(join(a.docs, 'index.html'))],
    [
      'docs/images',
      (a: ReturnType<typeof arranjo>) => rmSync(join(a.docs, 'images'), { recursive: true }),
    ],
    [
      'docs/videos',
      (a: ReturnType<typeof arranjo>) => rmSync(join(a.docs, 'videos'), { recursive: true }),
    ],
    ['dist/404.html', (a: ReturnType<typeof arranjo>) => rmSync(join(a.dist, '404.html'))],
    ['dist/sitemap.xml', (a: ReturnType<typeof arranjo>) => rmSync(join(a.dist, 'sitemap.xml'))],
    ['dist/r', (a: ReturnType<typeof arranjo>) => rmSync(join(a.dist, 'r'), { recursive: true })],
  ])('falha com mensagem clara sem %s', (nome, apagar) => {
    const a = arranjo()
    apagar(a)
    expect(() => stage(a)).toThrow(`${nome} ausente`)
    rmSync(a.base, { recursive: true, force: true })
  })
})
