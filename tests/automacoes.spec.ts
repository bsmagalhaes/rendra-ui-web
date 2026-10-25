import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { auditLayout, MOBILE, openRoute, templates, useTheme } from './helpers'

/*
 * TELAS DE AUTOMAÇÕES NO NAVEGADOR (/automacoes e /automacoes/nova): a listagem no padrão das
 * listagens e a tela cheia de automação, fora do AppShell, com as abas Geral, Workflow,
 * Configurações e Histórico de execuções. Nada é executado de verdade.
 *
 *   BASE_URL=http://localhost:5199 npx playwright test --project=automacoes
 */

// Relógio fixo, como nos outros testes de tela do template.
const NOW = new Date('2026-09-23T10:00:00-03:00')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await useTheme(page, { brand: 'safira', mode: 'light' })
})

const nodes = (page: Page) => page.locator('.react-flow__node')
const abas = ['Geral', 'Workflow', 'Configurações', 'Histórico de execuções'] as const

async function abrirTela(page: Page) {
  const errors = await openRoute(page, '/automacoes/nova')
  await expect(nodes(page).first()).toBeVisible()
  return errors
}

async function irParaAba(page: Page, nome: (typeof abas)[number]) {
  const aba = page.getByRole('tab', { name: nome })
  if (await aba.isVisible().catch(() => false)) await aba.click()
  else {
    // sem espaço para as abas, a mesma lista vira um Select
    await page.getByRole('combobox', { name: 'Seções da automação' }).click()
    await page.getByRole('option', { name: nome }).click()
  }
  await page.waitForTimeout(300)
}

test.describe('listagem (1280)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('seis linhas, busca, filtro por situação e o nome abre a automação', async ({ page }) => {
    const errors = await openRoute(page, '/automacoes')
    const tabela = page.getByRole('table', { name: 'Automações' })
    await expect(tabela.getByRole('row')).toHaveCount(7)
    await expect(page.getByText('1 a 6 de 6')).toBeVisible()
    await page.getByLabel('Buscar por nome ou gatilho').fill('cobrança')
    await expect(tabela.getByRole('row')).toHaveCount(2)
    await page.getByLabel('Buscar por nome ou gatilho').fill('')
    await expect(tabela.getByRole('row')).toHaveCount(7)
    await page.getByRole('button', { name: /Filtros/ }).click()
    await page.getByRole('combobox', { name: 'Situação' }).click()
    await page.getByRole('option', { name: 'Ativo', exact: true }).click()
    await expect(tabela.getByRole('row')).toHaveCount(4)
    await expect(page.getByText('Situação: Ativo')).toBeVisible()
    await tabela.getByRole('link', { name: 'Boas-vindas ao novo cliente' }).click()
    await expect(page).toHaveURL(/\/automacoes\/nova$/)
    expect(errors).toEqual([])
  })

  test('"Nova automação" leva à tela cheia', async ({ page }) => {
    await openRoute(page, '/automacoes')
    await page.getByRole('button', { name: 'Nova automação' }).click()
    await expect(page).toHaveURL(/\/automacoes\/nova$/)
  })
})

test.describe('tela cheia (1280)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('sem sidebar, sem header do sistema e sem #conteudo; a barra do topo está visível', async ({
    page,
  }) => {
    const errors = await abrirTela(page)
    await expect(page.locator('aside:not([aria-label="Painel do fluxo"])')).toHaveCount(0)
    await expect(page.locator('header.h-header')).toHaveCount(0)
    await expect(page.locator('#conteudo')).toHaveCount(0)
    const topo = page.getByRole('banner')
    await expect(topo.getByRole('link', { name: 'Voltar para Automações' })).toBeVisible()
    await expect(topo.getByRole('heading', { level: 1 })).toHaveText('Boas-vindas ao novo cliente')
    await expect(topo.getByRole('button', { name: 'Testar fluxo' })).toBeVisible()
    await expect(topo.getByRole('button', { name: 'Salvar' })).toBeVisible()
    // nem o <main> rola na aba Workflow em 1280x800: o editor cabe no que sobra
    const mainSobra = await page.evaluate(() => {
      const m = document.querySelector('main')!
      return m.scrollHeight - m.clientHeight
    })
    expect(mainSobra).toBeLessThanOrEqual(1)
    // a página não rola: só o <main>
    const sobra = await page.evaluate(
      () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
    )
    expect(sobra).toBeLessThanOrEqual(0)
    expect(errors).toEqual([])
  })

  test('voltar leva à listagem', async ({ page }) => {
    await abrirTela(page)
    await page.getByRole('link', { name: 'Voltar para Automações' }).click()
    await expect(page).toHaveURL(/\/automacoes$/)
  })

  test('fluxo completo: selecionar o webhook, mapear, testar pelo botão do topo e salvar', async ({
    page,
  }) => {
    await abrirTela(page)
    await page.getByRole('button', { name: /Editar bloco Receber webhook/ }).click()
    await page.getByRole('combobox', { name: 'Campo do sistema para cliente.email' }).click()
    await page.getByRole('option', { name: /Cliente › Telefone/ }).click()
    await page.getByRole('button', { name: 'Fechar configuração' }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Testar fluxo' }).click()
    const regiao = page.getByRole('region', { name: 'Teste do fluxo' })
    await expect(regiao).toBeVisible()
    for (let i = 0; i < 4; i++) await regiao.getByRole('button', { name: 'Avançar' }).click()
    await expect(regiao).toContainText('Regra 1 bateu')
    await expect(regiao).toContainText('Fluxo concluído')
    await page.getByRole('banner').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Automação salva')).toBeVisible()
  })

  test('Geral: o nome muda a barra; Configurações: o card Ativo muda o selo', async ({ page }) => {
    await abrirTela(page)
    await irParaAba(page, 'Geral')
    await page.getByRole('textbox', { name: /Nome/ }).fill('Cobrança automática')
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toHaveText(
      'Cobrança automática',
    )
    await irParaAba(page, 'Configurações')
    await page.getByRole('radio', { name: /Ativo/ }).check()
    await expect(page.getByRole('banner').getByText('Ativo')).toBeVisible()
    await page.getByRole('switch', { name: 'Avisar quando houver erro' }).click()
    await expect(page.getByRole('combobox', { name: 'Destinatários' })).toHaveCount(0)
  })

  test('Histórico: 15 linhas e 5 na segunda página, filtro por erro e detalhe passo a passo', async ({
    page,
  }) => {
    await abrirTela(page)
    await irParaAba(page, 'Histórico de execuções')
    const tabela = page.getByRole('table', { name: 'Histórico de execuções' })
    await expect(tabela.getByRole('row')).toHaveCount(16)
    await page.getByRole('button', { name: 'Próxima página' }).click()
    await expect(tabela.getByRole('row')).toHaveCount(6)
    await page.getByRole('button', { name: 'Página anterior' }).click()
    await page.getByRole('button', { name: /Filtros/ }).click()
    await page.getByRole('combobox', { name: 'Situação' }).click()
    await page.getByRole('option', { name: 'Erro' }).click()
    await expect(tabela.getByRole('row')).toHaveCount(5)
    // o painel de filtros abre por cima da tabela: fecha antes de abrir o detalhe
    await page.keyboard.press('Escape')
    await tabela.getByRole('button', { name: 'Passo a passo' }).first().click()
    const gaveta = page.getByRole('dialog')
    await expect(gaveta.getByText('Falhou').first()).toBeVisible()
    await expect(gaveta).toContainText('Passo 1')
  })
})

test.describe('tela cheia (360)', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true })

  test('a barra do topo cabe, as abas viram Select e o Workflow é só ver e navegar', async ({
    page,
  }) => {
    await abrirTela(page)
    const topo = page.getByRole('banner')
    for (const b of ['Voltar para Automações', 'Testar fluxo', 'Salvar']) {
      const caixa = (await topo
        .getByRole(b === 'Voltar para Automações' ? 'link' : 'button', { name: b })
        .boundingBox())!
      expect(caixa.x).toBeGreaterThanOrEqual(0)
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(360)
    }
    await expect(page.getByRole('combobox', { name: 'Seções da automação' })).toBeVisible()
    await expect(page.getByRole('tab')).toHaveCount(0)
    await expect(page.locator('.react-flow__handle.connectable')).toHaveCount(0)
    await irParaAba(page, 'Histórico de execuções')
    // no celular a tabela vira lista de cards
    await expect(page.getByText(/Sucesso|Erro/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Filtros/ })).toBeVisible()
  })
})

/* Layout e acessibilidade da listagem e de cada aba, nos três modelos. */
const larguras = [
  { width: 360, mode: 'light' as const },
  { width: 768, mode: 'light' as const },
  { width: 1280, mode: 'light' as const },
  { width: 360, mode: 'dark' as const },
  { width: 1280, mode: 'dark' as const },
]

for (const brand of templates) {
  for (const { width, mode } of larguras) {
    test.describe(`layout ${brand} ${mode === 'dark' ? 'escuro ' : ''}@ ${width}px`, () => {
      test.use({ viewport: { width, height: 800 }, hasTouch: width < MOBILE })
      for (const aba of abas) {
        test(`aba ${aba}`, async ({ page }) => {
          await useTheme(page, { brand, mode })
          const errors = await abrirTela(page)
          await irParaAba(page, aba)
          const res = await auditLayout(page, width < MOBILE)
          expect.soft(errors, 'erros de JavaScript').toEqual([])
          expect.soft(res.scroll, 'rolagem horizontal').toBeLessThanOrEqual(0)
          expect.soft(res.wide, 'elementos maiores que a tela').toEqual([])
          if (width < MOBILE) expect.soft(res.small, 'alvos de toque menores que 44px').toEqual([])
        })
      }
    })
  }
}

for (const brand of templates) {
  for (const { width, mode } of [
    { width: 1280, mode: 'light' as const },
    { width: 1280, mode: 'dark' as const },
    { width: 360, mode: 'light' as const },
  ]) {
    test.describe(`a11y ${brand} ${mode === 'dark' ? 'escuro ' : ''}@ ${width}px`, () => {
      test.use({ viewport: { width, height: 800 }, hasTouch: width < MOBILE })
      for (const aba of abas) {
        test(`aba ${aba}`, async ({ page }) => {
          await useTheme(page, { brand, mode })
          await abrirTela(page)
          await irParaAba(page, aba)
          const { violations } = await new AxeBuilder({ page })
            .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
          const relatorio = violations.map(
            (v) =>
              `${v.id} (${v.impact}): ${v.help}\n${v.nodes
                .slice(0, 5)
                .map((n) => `    ${n.target.join(' ')}`)
                .join('\n')}`,
          )
          expect(relatorio, 'violações de acessibilidade').toEqual([])
        })
      }
    })
  }
}

/* Capturas para revisão a olho (não comparam nada): FLOW_SHOTS=1 e FLOW_SHOTS_DIR. */
test.describe('capturas das telas de automação', () => {
  test.skip(!process.env.FLOW_SHOTS, 'só com FLOW_SHOTS=1')
  test.use({ hasTouch: true })
  const dir = process.env.FLOW_SHOTS_DIR ?? 'screenshots/automacoes'
  const combos = templates.flatMap((brand) =>
    (['light', 'dark'] as const).flatMap((mode) => [
      { brand, mode, width: 1280 },
      { brand, mode, width: 360 },
    ]),
  )
  for (const t of combos) {
    test(`${t.brand} ${t.mode} ${t.width}`, async ({ page }) => {
      await page.setViewportSize({ width: t.width, height: t.width < MOBILE ? 800 : 900 })
      await useTheme(page, { brand: t.brand, mode: t.mode })
      const mobile = t.width < MOBILE
      const nome = `${dir}/auto-${t.brand}-${t.mode}-${t.width}`
      const toque = (l: ReturnType<Page['locator']>) => (mobile ? l.tap() : l.click())
      await openRoute(page, '/automacoes')
      await page.screenshot({ path: `${nome}-lista.png` })
      await openRoute(page, '/automacoes/nova')
      await expect(nodes(page).first()).toBeVisible()
      await page.screenshot({ path: `${nome}-workflow.png` })
      await toque(page.getByRole('button', { name: /Editar bloco Receber webhook/ }))
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${nome}-webhook.png` })
      if (mobile) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
      }
      await toque(page.getByRole('button', { name: /Excluir bloco Enviar WhatsApp/ }))
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${nome}-exclusao.png` })
      await page.keyboard.press('Escape')
      await openRoute(page, '/automacoes/nova')
      await toque(page.getByRole('banner').getByRole('button', { name: 'Testar fluxo' }))
      const regiao = page.getByRole('region', { name: 'Teste do fluxo' })
      for (let i = 0; i < 3; i++) await toque(regiao.getByRole('button', { name: 'Avançar' }))
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${nome}-teste.png` })
      for (const aba of ['Geral', 'Configurações', 'Histórico de execuções'] as const) {
        await openRoute(page, '/automacoes/nova')
        await irParaAba(page, aba)
        await page.waitForTimeout(500)
        await page.screenshot({
          path: `${nome}-${aba === 'Histórico de execuções' ? 'historico' : aba === 'Geral' ? 'geral' : 'config'}.png`,
        })
      }
    })
  }
})
