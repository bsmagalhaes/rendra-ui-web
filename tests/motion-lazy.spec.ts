import { expect, test, type Page } from '@playwright/test'

/*
 * MOTION SOB DEMANDA NO NAVEGADOR: o motor do Motion (animações, gestos, `animate`) só pode ser
 * baixado por quem liga o `on`.
 *
 *   BASE_URL=http://localhost:5211 npx playwright test --project=lazy
 *
 * O motor é reconhecido pelo CONTEÚDO da resposta (a assinatura de `bundle-inicial.mjs`), não pelo
 * nome do arquivo, que muda a cada build. O grupo "on pelo texto" só roda contra um build em que a
 * ponte recebe `motion="on"` (MOTION_TEXTO=1); a demonstração entrega `off` na ponte.
 */

const ASSINATURA = ['animateVisualElement', 'keyframeResolver', 'calculatedDuration']

/** Registra os scripts baixados que levam o motor do Motion; `atrasoMs` segura a resposta deles. */
async function vigiarMotor(page: Page, atrasoMs = 0) {
  const motor: string[] = []
  await page.route('**/assets/**/*.js', async (route) => {
    const resposta = await route.fetch()
    const corpo = await resposta.text()
    if (ASSINATURA.every((s) => corpo.includes(s))) {
      motor.push(route.request().url())
      if (atrasoMs) await new Promise((r) => setTimeout(r, atrasoMs))
    }
    await route.fulfill({ response: resposta, body: corpo })
  })
  return motor
}

async function ocioso(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

test.describe('off: nenhuma requisição do motor do Motion', () => {
  test.skip(!!process.env.MOTION_TEXTO, 'build com motion="on" na ponte')
  for (const rota of ['/', '/componentes', '/tabelas', '/login']) {
    test(`${rota} não baixa o motor`, async ({ page }) => {
      const motor = await vigiarMotor(page)
      await page.goto(rota, { waitUntil: 'load' })
      await ocioso(page)
      expect(motor).toEqual([])
      // o index.html não pré-carrega o motor por modulepreload
      const preloads = await page.$$eval('link[rel="modulepreload"]', (els) =>
        els.map((e) => e.getAttribute('href') ?? ''),
      )
      for (const href of preloads) expect(motor.some((u) => u.endsWith(href))).toBe(false)
    })
  }
})

test.describe('on pelo objeto: o motor vem com a rota que o importa', () => {
  test('/componentes-motion baixa o motor e a chave Ligado/Desligado funciona', async ({
    page,
  }) => {
    const motor = await vigiarMotor(page)
    await page.goto('/componentes-motion', { waitUntil: 'load' })
    await page.getByRole('heading', { name: 'Componentes com motion' }).waitFor()
    await ocioso(page)
    expect(motor.length).toBeGreaterThan(0)
    await page.getByRole('radio', { name: 'Desligado' }).first().click()
    await page.getByRole('radio', { name: 'Ligado' }).first().click()
  })

  test('/dashboard-motion baixa o motor e desenha o painel', async ({ page }) => {
    const motor = await vigiarMotor(page)
    await page.goto('/dashboard-motion', { waitUntil: 'load' })
    await ocioso(page)
    expect(motor.length).toBeGreaterThan(0)
    await expect(page.locator('main')).toBeVisible()
  })
})

test.describe('on pelo texto: liga sem remontar nada (precisa do build com MOTION_TEXTO=1)', () => {
  test.skip(!process.env.MOTION_TEXTO, 'build sem motion="on" na ponte')

  test('o primeiro quadro é o off, o chunk chega e o app liga sem remontar nem repetir a entrada', async ({
    page,
  }) => {
    const motor = await vigiarMotor(page, 2500)
    await page.goto('/componentes', { waitUntil: 'load' })
    // janela em `off`: o motor ainda não chegou (a resposta dele está segura)
    const campo = page.getByRole('textbox').first()
    await campo.waitFor()
    await campo.fill('texto digitado antes do chunk')
    await campo.evaluate((el) => el.setAttribute('data-sonda', 'mesmo-no'))
    const antes = await page.evaluate(
      () => document.querySelectorAll('[role="switch"] span').length,
    )
    expect(antes).toBeGreaterThan(0)
    const thumb = page.locator('[role="switch"] > span').first()
    await expect(thumb).toHaveClass(/transition-transform/)
    await page.screenshot({
      path: process.env.MOTION_CAPTURAS
        ? `${process.env.MOTION_CAPTURAS}/texto-1-off.png`
        : undefined,
    })
    // o chunk chega: o thumb passa a `transition-[translate]` (só existe em `on`)
    await expect(thumb).toHaveClass(/transition-\[translate\]/, { timeout: 15_000 })
    expect(motor.length).toBeGreaterThan(0)
    // o mesmo nó, com o que foi digitado: a árvore não foi recriada
    const depois = page.locator('[data-sonda="mesmo-no"]')
    await expect(depois).toHaveCount(1)
    await expect(depois).toHaveValue('texto digitado antes do chunk')
    // nunca ficou vazia
    expect(await page.locator('main').innerText()).not.toBe('')
    await page.screenshot({
      path: process.env.MOTION_CAPTURAS
        ? `${process.env.MOTION_CAPTURAS}/texto-2-on.png`
        : undefined,
    })
  })
})
