/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import svgr from 'vite-plugin-svgr'

// Endereço público da demo (agora em /demo/), usado no canonical, no Open Graph e no JSON-LD do index.html.
const SITE_URL = process.env.SITE_URL ?? 'https://bsmagalhaes.github.io/rendra-ui-web/demo/'
// O Storybook e o registry vivem na raiz do site, fora de /demo/.
const ROOT_URL = SITE_URL.replace(/demo\/$/, '')
const siteUrl = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: (html) =>
    html.replaceAll('__ROOT_URL__', ROOT_URL).replaceAll('__SITE_URL__', SITE_URL),
})

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr(), siteUrl()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  // Demo no GitHub Pages: o build de publicação (scripts/pages-build.mjs) define BASE_PATH=/rendra-ui-web/demo/.
  base: process.env.BASE_PATH ?? '/',
  // Testes unitários (Vitest). Os testes de layout (Playwright) ficam em tests/.
  test: {
    // scripts/lib cobre a lógica compartilhada com scripts/check-design-rules.mjs (regra
    // variavel-sem-prefixo-rendra), que precisa de teste próprio (etapa 2.0.0-alpha.2).
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}'],
    // Funções puras no Node; testes de componente pedem jsdom na primeira linha do arquivo.
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**',
        'src/brand/palette.ts',
        'src/brand/theme.ts',
        'src/brand/apply-theme.ts',
        'src/brand/brand-provider.tsx',
        'src/hooks/**',
        'src/components/ui/**',
        'src/components/rendra-provider.tsx',
        'src/components/rendra-router-bridge.tsx',
        'src/components/app-shell/**',
        'src/components/layout/page-header.tsx',
        'src/components/layout/primitives.tsx',
        'scripts/lib/**',
        'src/catalog/**',
        'src/cli/**',
      ],
      exclude: ['**/*.test.{ts,tsx}'],
      reporter: ['text-summary', 'html'],
      // Piso por arquivo (linhas): a cobertura de quem já tem teste não pode cair. Componente
      // novo ou alterado entra com o próprio teste (ao lado dele) e ganha uma linha aqui.
      thresholds: {
        'src/lib/{masks,lookup,validators}.ts': { lines: 85 },
        'src/brand/palette.ts': { lines: 90 },
        'src/brand/theme.ts': { lines: 90 },
        'src/brand/apply-theme.ts': { lines: 90 },
        'src/brand/brand-provider.tsx': { lines: 95 },
        'src/hooks/use-lookup.ts': { lines: 90 },
        'src/hooks/use-reduced-motion.ts': { lines: 90 },
        'src/cli/var-prefix.ts': { lines: 90 },
        'src/catalog/components.ts': { lines: 90 },
        'src/components/rendra-provider.tsx': { lines: 90 },
        'src/components/rendra-router-bridge.tsx': { lines: 90 },
        'src/components/app-shell/navigation-utils.ts': { lines: 95 },
        'src/components/app-shell/{shell-context,layout}.ts': { lines: 90 },
        'src/components/app-shell/app-shell.tsx': { lines: 75 },
        'src/components/app-shell/command-search.tsx': { lines: 85 },
        'src/components/app-shell/notifications.tsx': { lines: 100 },
        'src/components/app-shell/sidebar.tsx': { lines: 60 },
        'src/components/app-shell/header.tsx': { lines: 70 },
        'src/components/app-shell/mega-menu.tsx': { lines: 60 },
        'src/components/layout/page-header.tsx': { lines: 85 },
        'src/components/layout/primitives.tsx': { lines: 90 },
        'src/cli/help-length.ts': { lines: 95 },
        'src/components/ui/rendra-credit.tsx': { lines: 90 },
        'src/components/ui/color-picker.tsx': { lines: 85 },
        'src/components/ui/spinner.tsx': { lines: 90 },
        'src/components/ui/{input,select,modal,alert,accordion,checkbox,field,radio-group,switch,tabs,textarea}.tsx':
          { lines: 85 },
        'src/components/ui/{table,button}.tsx': { lines: 75 },
        'src/components/ui/drawer.tsx': { lines: 75 },
        'src/components/ui/pagination.tsx': { lines: 80 },
        'src/components/ui/otp-input.tsx': { lines: 100 },
        'src/components/ui/toast.tsx': { lines: 90 },
        'src/components/ui/card.tsx': { lines: 70 },
        'src/components/ui/data-toolbar.tsx': { lines: 70 },
        'src/components/ui/date-picker.tsx': { lines: 65 },
        'src/components/ui/calendar.tsx': { lines: 55 },
        'src/components/ui/chat.tsx': { lines: 35 },
        'src/components/ui/rich-text-editor.tsx': { lines: 35 },
        'src/components/ui/wizard.tsx': { lines: 95 },
        'src/components/ui/widget-grid.tsx': { lines: 90 },
        'src/components/ui/brand-logo.tsx': { lines: 100 },
        'src/components/ui/action-bar.tsx': { lines: 100 },
        'src/components/ui/avatar.tsx': { lines: 100 },
        'src/components/ui/badge.tsx': { lines: 100 },
        'src/components/ui/brand-feedback-icon.tsx': { lines: 100 },
        'src/components/ui/empty-state.tsx': { lines: 100 },
        'src/components/ui/error-page.tsx': { lines: 100 },
        'src/components/ui/popover.tsx': { lines: 100 },
        'src/components/ui/tooltip.tsx': { lines: 100 },
        'src/components/ui/button-group.tsx': { lines: 80 },
        'src/components/ui/dropdown-menu.tsx': { lines: 60 },
        'src/lib/sortable.ts': { lines: 95 },
        'src/components/ui/{list,timeline}.tsx': { lines: 95 },
        'src/components/ui/upload.tsx': { lines: 80 },
        'src/components/ui/image-cropper.tsx': { lines: 80 },
        'src/components/ui/kanban.tsx': { lines: 75 },
        'src/components/ui/chart.tsx': { lines: 80 },
        'src/components/ui/separator.tsx': { lines: 100 },
        'src/components/ui/slider.tsx': { lines: 100 },
        'src/components/ui/stat-card.tsx': { lines: 100 },
        'src/components/ui/skeleton.tsx': { lines: 100 },
        'src/components/ui/form.tsx': { lines: 100 },
        'src/components/ui/breadcrumb.tsx': { lines: 100 },
        'src/components/ui/{progress,image-viewer}.tsx': { lines: 85 },
        'src/lib/qr-encode.ts': { lines: 90 },
        'src/components/ui/{qr-code,rating,repeatable-field,checklist}.tsx': { lines: 85 },
        'src/components/ui/document-viewer.tsx': { lines: 60 },
        'src/cli/codigos.ts': { lines: 95 },
        'src/cli/auditar.ts': { lines: 90 },
        'src/cli/trocar.ts': { lines: 85 },
        'src/cli/typescript-loader.ts': { lines: 80 },
        'src/cli/help.ts': { lines: 100 },
        'scripts/lib/robots.ts': { lines: 100 },
        'scripts/lib/llms-txt.ts': { lines: 100 },
        'scripts/lib/{pages-stage,pages-env,redirect-stubs,sitemap,og-html}.ts': { lines: 90 },
        'scripts/lib/html.ts': { lines: 100 },
        'scripts/lib/verify-pack-checks.ts': { lines: 100 },
      },
    },
  },
})
