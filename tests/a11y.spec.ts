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
