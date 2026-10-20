/*
 * Monta a árvore que o GitHub Pages publica (pages-stage.mjs e pages-build.mjs chamam daqui):
 *   /                página de apresentação (docs/) com images/, videos/, icon.svg e og-image.png
 *   /demo/           a demo (build do Vite, dist/), com as páginas por rota, sitemap e llms próprios
 *   /r/              registry do shadcn (dist/r), endereço obrigatório
 *   /storybook/      Storybook (dist/storybook), quando existir
 * Função pura sobre pastas: não lê rede nem variável de ambiente, para dar teste de verdade.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { buildRedirectStub, staleRoutePaths } from './redirect-stubs.ts'
import { buildRobotsTxt } from './robots.ts'

/** Arquivos de `docs/` que vão para a raiz do Pages (robots.txt, sitemap.xml e llms.txt são gerados). */
const ARQUIVOS_DA_RAIZ = ['index.html', 'icon.svg', 'og-image.png', 'google9146e14a87f8288f.html']

export interface StageOptions {
  distDir: string
  docsDir: string
  outDir: string
  /** URL pública da raiz do site, com barra final. */
  rootUrl: string
  /** Rotas do app (`/clientes`, `/`...) que a demo tinha na raiz antes de virar `/demo/`. */
  routes: string[]
  /** `llms.txt` da raiz, já montado (a CLI usa `buildLlmsTxt`). */
  llmsTxt: string
}

/**
 * Script de desvio do `404.html` da raiz (achado B10): o Pages só serve o 404 da raiz do projeto,
 * então um endereço antigo fora de `/demo/`, `/r/` e `/storybook/` (por exemplo `/rendra-ui-web/clientes/1234`,
 * citado pelo README 2.2.2 no npm) é levado para dentro da demo, onde o app resolve a rota.
 */
export function notFoundRedirectScript(basePath: string): string {
  return `const p=location.pathname,b='${basePath}';if(!p.startsWith(b+'demo/')&&!p.startsWith(b+'r/')&&!p.startsWith(b+'storybook/'))location.replace(b+'demo/'+p.slice(b.length)+location.search+location.hash)`
}

function locsDoSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string)
}

function sitemapDaRaiz(urls: string[]): string {
  const itens = [...new Set(urls)].map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens}\n</urlset>\n`
}

export function stageSite({
  distDir,
  docsDir,
  outDir,
  rootUrl,
  routes,
  llmsTxt,
}: StageOptions): void {
  for (const nome of ARQUIVOS_DA_RAIZ) {
    if (!existsSync(join(docsDir, nome)))
      throw new Error(`docs/${nome} ausente: a página de apresentação precisa dele`)
  }
  if (!existsSync(join(docsDir, 'images')))
    throw new Error('docs/images ausente: a página precisa das imagens')
  if (!existsSync(join(docsDir, 'videos')))
    throw new Error('docs/videos ausente: a página precisa do vídeo de apresentação')
  for (const nome of ['index.html', '404.html', 'sitemap.xml']) {
    if (!existsSync(join(distDir, nome)))
      throw new Error(`dist/${nome} ausente: rode npm run build e seo-build antes`)
  }

  if (!existsSync(join(distDir, 'r')))
    throw new Error('dist/r ausente: rode npm run registry:build antes')

  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  for (const nome of ARQUIVOS_DA_RAIZ) cpSync(join(docsDir, nome), join(outDir, nome))
  cpSync(join(docsDir, 'images'), join(outDir, 'images'), { recursive: true })
  cpSync(join(docsDir, 'videos'), join(outDir, 'videos'), { recursive: true })

  const reservadas = [join(distDir, 'r'), join(distDir, 'storybook')]
  cpSync(distDir, join(outDir, 'demo'), {
    recursive: true,
    filter: (origem) => !reservadas.some((r) => origem === r || origem.startsWith(r + sep)),
  })
  cpSync(join(distDir, 'r'), join(outDir, 'r'), { recursive: true })
  const comStorybook = existsSync(join(distDir, 'storybook'))
  if (comStorybook)
    cpSync(join(distDir, 'storybook'), join(outDir, 'storybook'), { recursive: true })

  const script = `<script>${notFoundRedirectScript(new URL(rootUrl).pathname)}</script>`
  const html404 = readFileSync(join(distDir, '404.html'), 'utf8').replace(
    '<head>',
    `<head>${script}`,
  )
  writeFileSync(join(outDir, '404.html'), html404)

  const urls = [
    rootUrl,
    ...(comStorybook ? [`${rootUrl}storybook/`] : []),
    ...locsDoSitemap(readFileSync(join(distDir, 'sitemap.xml'), 'utf8')),
  ]
  writeFileSync(join(outDir, 'sitemap.xml'), sitemapDaRaiz(urls))
  writeFileSync(join(outDir, 'robots.txt'), buildRobotsTxt(rootUrl))
  writeFileSync(join(outDir, 'llms.txt'), llmsTxt)

  for (const rota of staleRoutePaths(routes)) {
    mkdirSync(join(outDir, rota), { recursive: true })
    writeFileSync(
      join(outDir, rota, 'index.html'),
      buildRedirectStub(rootUrl + 'demo/' + rota + '/'),
    )
  }
}
