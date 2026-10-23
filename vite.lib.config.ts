/*
 * BUILD DE BIBLIOTECA (pacote @rendra-ui/web)
 * --------------------------------------------------------------------------------
 * Gera o JavaScript do pacote (ESM, uma entrada por item da superfície pública, mais os
 * quatro subcaminhos "pesados" e a ponte de rotas). O CSS pré-compilado (tokens.css,
 * base.css, components.css) não passa por aqui: sai de scripts/build-lib.mjs.
 *
 *   npm run build:lib
 *     -> vite build --config vite.lib.config.ts   (este arquivo: o JS)
 *     -> tsc -p tsconfig.build.json                (os .d.ts)
 *     -> node scripts/fix-dts-aliases.mjs          (resolve o alias @/ nos .d.ts)
 *     -> node scripts/build-lib.mjs                (o CSS)
 *
 * Nunca roda com o app: este arquivo não é usado por `npm run dev`, `npm run build` nem
 * pelo Storybook, todos com o próprio `vite.config.ts`. O boilerplate continua exatamente
 * como antes.
 *
 * external: os peers (react, react-dom, radix-ui) e as dependências de produção ficam de
 * fora do bundle: quem consome o pacote já as tem (peer) ou o npm instala (dependency).
 * `react-router` também fica de fora, mas não é peer nem dependency: só existe na entrada
 * opcional @rendra-ui/web/router-bridge, e quem não a importa nunca precisa dele.
 *
 * Estratégia de CSS: A (pré-compilado), não B. A estratégia B seria prefixar toda classe do
 * JSX dos componentes (ex.: `bg-primary` viraria `rendra-bg-primary`) e deixar o host
 * escanear e compilar o Tailwind dele mesmo contra o código-fonte do pacote (via `@source`
 * apontando para node_modules/@rendra-ui/web). Ela exigiria reescrever toda className de
 * todo componente (alto custo, alto risco de esquecer uma) e ainda obrigaria o host a ter
 * Tailwind v4 instalado; a estratégia A não pede nada disso: o host recebe CSS puro, sem
 * precisar do Tailwind. Por isso A venceu; B nunca chegou a ser implementada.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import { packageBanner } from './scripts/lib/pkg-banner'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as {
  version: string
}
const BANNER = packageBanner(pkg.version)

// Peers (react, react-dom, radix-ui) e dependências de produção: nunca entram no bundle.
// react-router só existe na entrada @rendra-ui/web/router-bridge (fora dos peers e de
// dependencies do package.json), mas também precisa ficar de fora do bundle.
const EXTERNAL_PACKAGES = [
  'react',
  'motion',
  'react/jsx-runtime',
  'react-dom',
  'radix-ui',
  'react-router',
  'lucide-react',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'date-fns',
  'react-day-picker',
  'react-hook-form',
  'zod',
  'imask',
  'cmdk',
  'sonner',
  'recharts',
  'react-grid-layout',
  '@xyflow/react',
  '@tanstack/react-table',
  '@tiptap/pm',
  '@tiptap/react',
  '@tiptap/starter-kit',
  '@tiptap/extension-image',
  '@tiptap/extension-placeholder',
  '@tiptap/extension-table',
  '@tiptap/extension-text-align',
  'pdfjs-dist',
]

function isExternal(id: string) {
  // Módulos nativos do Node (node:fs, node:path...): só a CLI (src/cli) os usa, em tempo de
  // execução no Node, nunca no navegador; sempre externo, nunca no bundle.
  if (id.startsWith('node:')) return true
  return EXTERNAL_PACKAGES.some((name) => id === name || id.startsWith(`${name}/`))
}

export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // O pacote não tem "público": nunca copia public/ (favicon, og-image, verificação do
  // Google) do boilerplate para dist/.
  publicDir: false,
  build: {
    outDir: 'dist',
    // O primeiro passo de `build:lib`: esvazia dist/ antes de tsc e build-lib.mjs escreverem
    // os .d.ts e o CSS (nenhum dos dois apaga o que já está em dist/).
    emptyOutDir: true,
    lib: {
      entry: {
        index: 'src/index.ts',
        'router-bridge': 'src/rendra-router-bridge.ts',
        'document-viewer': 'src/document-viewer.ts',
        'rich-text-editor': 'src/rich-text-editor.ts',
        chart: 'src/chart.ts',
        'widget-grid': 'src/widget-grid.ts',
        flow: 'src/flow.ts',
        motion: 'src/motion.ts',
        // CLI: bin/rendra.mjs importa sempre daqui, nunca de src/cli/*.ts direto. "typescript"
        // nunca entra no bundle: o import em src/cli/trocar.ts é só de tipo (import type),
        // apagado na compilação; quem carrega a instância de verdade é
        // src/cli/typescript-loader.ts, por import dinâmico.
        'cli/codigos': 'src/cli/codigos.ts',
        'cli/auditar': 'src/cli/auditar.ts',
        // `rendra auditar` (argumentos, config, --all, --ignore): o bin importa só daqui; o
        // restante (auditar-tudo, regras-extras, config...) entra como chunk compartilhado.
        'cli/executar-auditar': 'src/cli/executar-auditar.ts',
        'cli/trocar': 'src/cli/trocar.ts',
        'cli/typescript-loader': 'src/cli/typescript-loader.ts',
        'cli/help': 'src/cli/help.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: isExternal,
      output: {
        banner: BANNER,
        preserveModules: false,
      },
    },
    // O pacote é consumido por outro bundler (Vite, Next, etc.), que já minifica; manter
    // legível ajuda a depurar e a conferir o banner e a ausência do react-router no
    // scripts/verify-pack.mjs.
    minify: false,
    cssCodeSplit: false,
    sourcemap: true,
  },
})
