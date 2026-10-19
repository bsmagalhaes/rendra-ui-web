import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { publicRoutes } from '../src/config/routes-list'
import { openRoute, templates, useTheme, type Theme } from './helpers'

/*
 * TESTE DE ACESSIBILIDADE (axe-core): toda rota, em todo modelo, no claro e no escuro,
 * mais a paleta Ardósia. Falha em qualquer violação WCAG 2.1 A ou AA: contraste,
 * rótulos, nomes acessíveis, ARIA inválido, landmarks e o que mais o axe verifica.
 * Desktop (1280px) em todas as combinações e mobile (360px) no modelo ativo.
 */

const themes: (Theme & { width: number })[] = [
  ...templates.flatMap((brand) =>
    (['light', 'dark'] as const).map((mode) => ({ brand, mode, width: 1280 })),
  ),
  { brand: 'safira', palette: 'ardosia', mode: 'light', width: 1280 },
  { brand: 'safira', palette: 'ardosia', mode: 'dark', width: 1280 },
  { brand: 'safira', mode: 'light', width: 360 },
]

for (const theme of themes) {
  const name = `${theme.brand}${theme.palette ? `+${theme.palette}` : ''} ${theme.mode === 'dark' ? 'escuro' : 'claro'} @ ${theme.width}px`
  test.describe(name, () => {
    test.use({ viewport: { width: theme.width, height: 800 } })
    test.beforeEach(({ page }) => useTheme(page, theme))

    for (const route of publicRoutes) {
      test(`${route}`, async ({ page }) => {
        await openRoute(page, route)
        // options() substitui o objeto inteiro: vem antes de withTags(), senão descarta o runOnly.
        // label-content-name-mismatch (WCAG 2.5.3) não está nas tags acima: liga-se à parte.
        const { violations } = await new AxeBuilder({ page })
          .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        const report = violations.map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help}\n${v.nodes
              .slice(0, 5)
              .map(
                (n) =>
                  `    ${n.target.join(' ')}\n      ${n.failureSummary?.split('\n').slice(1).join(' ')}`,
              )
              .join('\n')}`,
        )
        expect(report, 'violações de acessibilidade').toEqual([])
      })
    }
  })
}

/*
 * Modal sem cabeçalho visível (confirm, destructive e info): o "Fechar" não pode ser
 * coberto pelo corpo (clique) e aparece com foco de teclado. O projeto `a11y` é o que o CI
 * roda; um spec solto nunca executaria (cada projeto do playwright.config.ts tem testMatch).
 */
test.describe('Modal sem cabeçalho: botão Fechar', () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  test.beforeEach(({ page }) => useTheme(page, { brand: 'safira', mode: 'light' }))

  const gatilhos = [
    { tipo: 'info', botao: 'Informativo' },
    { tipo: 'confirm', botao: 'Confirmação' },
    { tipo: 'destructive', botao: 'Destrutiva' },
  ]

  for (const { tipo, botao } of gatilhos) {
    test(`${tipo}: clicar em Fechar (sem force) fecha o modal`, async ({ page }) => {
      await openRoute(page, '/componentes')
      await page.getByRole('button', { name: botao, exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('button', { name: 'Fechar' }).click({ timeout: 5_000 })
      await expect(page.getByRole('dialog')).toBeHidden()
    })

    test(`${tipo}: com foco de teclado o Fechar fica visível (largura mínima e opacidade 1)`, async ({
      page,
    }) => {
      await openRoute(page, '/componentes')
      await page.getByRole('button', { name: botao, exact: true }).focus()
      await page.keyboard.press('Enter')
      const fechar = page.getByRole('button', { name: 'Fechar' })
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(fechar).toBeFocused()
      const caixa = await fechar.boundingBox()
      expect(caixa?.width ?? 0).toBeGreaterThanOrEqual(24)
      const opacidade = await fechar.evaluate((el) => getComputedStyle(el).opacity)
      expect(opacidade).toBe('1')
      // Aparece de verdade: o ponto central do botão pertence a ele, não ao corpo do modal.
      const noTopo = await fechar.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const alvo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return alvo !== null && el.contains(alvo)
      })
      expect(noTopo).toBe(true)
    })
  }

  test('aberto com o mouse, o Fechar segue invisível (visual igual ao de hoje)', async ({
    page,
  }) => {
    await openRoute(page, '/componentes')
    await page.getByRole('button', { name: 'Informativo', exact: true }).click()
    const fechar = page.getByRole('button', { name: 'Fechar' })
    await expect(page.getByRole('dialog')).toBeVisible()
    const opacidade = await fechar.evaluate((el) => getComputedStyle(el).opacity)
    expect(opacidade).toBe('0')
  })
})
