import { expect, test } from '@playwright/test'
import { openRoute, useTheme } from './helpers'

/*
 * KANBAN NO NAVEGADOR (/kanban). O jsdom não detecta o clique "fora" do Radix nem faz o arraste
 * nativo de verdade; aqui se prova o fluxo principal com o que a pessoa vê: arrastar um card
 * até um destino do rodapé flutuante, ver a confirmação e, ao confirmar, o card sumir da coluna;
 * e o hint do calendário, que não pode fechar ao apertar o próprio gatilho.
 *
 *   npx playwright test --project=kanban
 */

// Relógio fixo, como no teste visual: a demonstração monta os cards em torno de "hoje".
const NOW = new Date('2026-09-23T10:00:00-03:00')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await useTheme(page, { brand: 'safira', mode: 'light' })
})

test.describe('1280px', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('arrastar um card até Ganhar, confirmar e vê-lo sair da coluna', async ({ page }) => {
    const errors = await openRoute(page, '/kanban')
    // Por CSS, não por papel: com o modal aberto a lista fica `aria-hidden`.
    const coluna = page.locator('[aria-label="Cards em Novo contato"]')
    const card = coluna.locator('li[data-kanban-card="k1"]')
    await expect(card).toContainText('Mercado Central')

    // Arraste nativo (HTML5): o Playwright o dispara de verdade pelo mouse.
    await card.hover()
    await page.mouse.down()
    await page.mouse.move(640, 500, { steps: 8 })
    const rodape = page.getByLabel('Soltar em')
    await expect(rodape).toBeVisible()
    const ganhar = rodape.locator('[data-kanban-target="ganho"]')
    await expect(ganhar).toContainText('Encerra como ganho')
    const box = (await ganhar.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
    await expect(ganhar).toHaveAttribute('data-over', 'true')
    await page.mouse.up()

    // A confirmação abre com os dados do card, e o card continua na coluna até confirmar.
    const dialogo = page.getByRole('dialog', { name: 'Marcar como ganho?' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo).toContainText('Mercado Central')
    await expect(dialogo).toContainText('P&S:')
    await expect(card).toBeAttached()

    await dialogo.getByRole('button', { name: 'Ganhar' }).click()
    await expect(dialogo).toBeHidden()
    await expect(coluna.locator('li[data-kanban-card="k1"]')).toHaveCount(0)
    await expect(page.getByText('Card ganho')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('Perder pede o motivo e Cancelar mantém o card', async ({ page }) => {
    await openRoute(page, '/kanban')
    const card = page.locator('[aria-label="Cards em Novo contato"] li[data-kanban-card="k2"]')
    await card.hover()
    await page.mouse.down()
    await page.mouse.move(640, 500, { steps: 8 })
    const perder = page.getByLabel('Soltar em').locator('[data-kanban-target="perdido"]')
    const box = (await perder.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()
    const dialogo = page.getByRole('dialog', { name: 'Marcar como perdido?' })
    await expect(dialogo.getByRole('combobox', { name: 'Motivo' })).toContainText('Preço')
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo).toBeHidden()
    await expect(card).toBeAttached()
  })

  test('o hint do calendário abre por hover e não fecha ao apertar o próprio gatilho', async ({
    page,
  }) => {
    await openRoute(page, '/kanban')
    const gatilho = page.getByRole('button', { name: /Atrasada há/ }).first()
    await gatilho.scrollIntoViewIfNeeded()
    await gatilho.hover()
    const hint = page.getByText(/^Atrasada há \d+ dias?$/)
    await expect(hint).toBeVisible()
    await page.mouse.down()
    await expect(hint).toBeVisible()
    await expect(gatilho).toHaveAttribute('aria-expanded', 'true')
    await page.mouse.up()
    await expect(hint).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(hint).toBeHidden()
  })
})

test.describe('360px', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true })

  test('toque: o segundo toque no calendário fecha o hint', async ({ page }) => {
    await openRoute(page, '/kanban')
    const gatilho = page.getByRole('button', { name: /Atrasada há/ }).first()
    await gatilho.scrollIntoViewIfNeeded()
    const hint = page.getByText(/^Atrasada há \d+ dias?$/)
    await gatilho.tap()
    await expect(hint).toBeVisible()
    await gatilho.tap()
    await expect(hint).toBeHidden()
  })
})
