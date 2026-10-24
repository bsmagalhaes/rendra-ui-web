import { defineConfig } from '@playwright/test'

/*
 * Testes no navegador (Playwright). Sobe o Vite sozinho se não houver servidor na 5173.
 *   npm run test:layout   layout: rotas x larguras x modelos, claro e escuro
 *   npm run test:a11y     acessibilidade (axe-core, WCAG 2.1 AA)
 *   npm run test:visual   regressão visual contra as referências aprovadas
 *   npm run test:motion   movimento no navegador (tempo, escala, origem, gesto): /componentes-motion
 *   npm run test:lazy     o motor do Motion só é baixado por quem liga o `on`
 *   npm run test:flow     fluxos de automação (FlowEditor e FlowViewer): arrastar, ligar, apagar, tema, toque
 *   npm run test:kanban   Kanban: arrastar até o rodapé, confirmar, hint do calendário
 *   npm run test:automacoes   Automações: listagem, tela cheia, abas, histórico
 */
export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  // Referências por sistema operacional: a renderização de fonte muda entre eles.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'layout', testMatch: 'layout.spec.ts' },
    { name: 'a11y', testMatch: 'a11y.spec.ts' },
    { name: 'visual', testMatch: 'visual.spec.ts' },
    // Movimento medido quadro a quadro em /componentes-motion (linguagem única de motion).
    { name: 'motion', testMatch: 'motion.spec.ts', fullyParallel: false },
    // Estados (vazio, carregando, erro, desabilitado) e texto longo nos componentes que se movem.
    { name: 'estados', testMatch: 'motion-estados.spec.ts' },
    // Motion sob demanda: o motor do Motion só é baixado por quem liga o `on` (tests/motion-lazy.spec.ts).
    { name: 'lazy', testMatch: 'motion-lazy.spec.ts' },
    // Fluxos de automação: arrastar, ligar, apagar, simular, tema computado, toque e acessibilidade.
    { name: 'flow', testMatch: 'flow.spec.ts' },
    // Kanban (/kanban): arrastar até o rodapé flutuante, confirmar e o hint do calendário.
    { name: 'kanban', testMatch: 'kanban.spec.ts' },
    // Automações (/automacoes e /automacoes/nova): listagem, tela cheia, abas e histórico.
    { name: 'automacoes', testMatch: 'automacoes.spec.ts' },
    // CSS em camadas (C4, etapa 2.0.0-alpha.8): tests/css-layers.spec.ts.
    { name: 'css-layers', testMatch: 'css-layers.spec.ts' },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
