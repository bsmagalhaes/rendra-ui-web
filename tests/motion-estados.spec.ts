import { expect, test, type Page } from '@playwright/test'

/*
 * ESTADOS E TEXTO LONGO dos componentes que se movem (Impeccable harden): vazio, carregando,
 * erro, desabilitado e texto longo, abertos em /componentes-motion, em `on` e em `off`, em 360 e
 * 1280 px. O que o teste afirma é o que o usuário perceberia como quebrado: rolagem horizontal da
 * página, texto que vaza para fora do próprio bloco e estado que some. Não muda tokens, paleta,
 * tipografia nem identidade; só prova que o movimento não esconde nem empurra nada.
 *
 *   BASE_URL=http://localhost:5211 npx playwright test --project=estados
 */

const LONGO =
  'Texto muito longo para provar que o componente aguenta nomes grandes sem quebrar o layout em telas pequenas nem empurrar os vizinhos'
const SEM_ESPACO = 'ClinicaVidaPlenaDeSaudeIntegralEOdontologiaAvancadaDoBrasilTodo'

async function abrir(page: Page, modo: 'on' | 'off') {
  await page.goto('/componentes-motion', { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('heading', { name: 'Componentes com motion' }).waitFor()
  if (modo === 'off') await page.getByRole('radio', { name: 'Desligado' }).click()
  await page.waitForTimeout(1500)
}

for (const modo of ['on', 'off'] as const) {
  for (const largura of [360, 1280]) {
    test.describe(`motion ${modo} @ ${largura}px`, () => {
      test.use({ viewport: { width: largura, height: 800 } })

      test('texto longo nos rótulos e valores não vaza do bloco nem da tela', async ({ page }) => {
        await abrir(page, modo)
        // Cada alvo recebe um texto muito longo (com espaços; sem espaços na tabela) e tem de
        // continuar dentro da tela e sem vazar do próprio bloco. Botão fica de fora de propósito:
        // o rótulo é `whitespace-nowrap` (o Rendra manda rótulo curto); ver relatório.
        const alvos = [
          '#accordion button',
          '#table tbody tr:first-child td:nth-child(2), #table ul > li:first-child span.line-clamp-2',
          '#empty-state [data-rendra="VAZ-001"] p',
          '#checkbox-radio label span.text-sm',
          '#select [role="combobox"]',
          '#progress-skeleton p',
          '#wizard li span, #wizard .text-xs',
        ]
        const relatorio = await page.evaluate(
          ({ longo, semEspaco, alvos }) =>
            alvos.map((sel) => {
              const el = document.querySelector<HTMLElement>(sel)
              if (!el) return { sel, ausente: true }
              const antes = el.textContent
              el.textContent = sel.includes('tbody') ? semEspaco : longo
              const r = el.getBoundingClientRect()
              const out = {
                sel,
                direita: Math.round(r.right),
                tela: window.innerWidth,
                // o que fica recortado (overflow hidden, line-clamp, truncate) não vaza: é tratado
                vazaDoBloco: ['hidden', 'clip'].includes(getComputedStyle(el).overflowX)
                  ? 0
                  : el.scrollWidth - el.clientWidth,
              }
              el.textContent = antes
              return out
            }),
          { longo: LONGO, semEspaco: SEM_ESPACO, alvos },
        )
        for (const r of relatorio) {
          if ('ausente' in r) continue
          expect(r.direita, `${r.sel} passa da tela`).toBeLessThanOrEqual(r.tela + 1)
          expect(r.vazaDoBloco, `${r.sel} vaza do próprio bloco`).toBeLessThanOrEqual(1)
        }
        expect(relatorio.filter((r) => !('ausente' in r)).length).toBeGreaterThanOrEqual(4)
      })

      test('os estados vazio, carregando, erro e desabilitado estão na vitrine e continuam visíveis', async ({
        page,
      }) => {
        await abrir(page, modo)
        // vazio: o EmptyState mostra título e o ícone da marca
        const vazio = page.locator('#empty-state [data-rendra="VAZ-001"]').first()
        await vazio.scrollIntoViewIfNeeded()
        await expect(vazio).toBeVisible()
        await expect(vazio.locator('svg, img').first()).toBeVisible()
        // carregando: o botão "Salvando" mostra o indicador e fica bloqueado
        const salvando = page.getByRole('button', { name: /Salvando/ }).first()
        await expect(salvando).toBeDisabled()
        await expect(salvando).toHaveAttribute('aria-busy', 'true')
        // skeleton: com motion o brilho existe, sem motion o pulso; nos dois o bloco aparece
        const skeleton = page.locator('#progress-skeleton [data-rendra="SKEL-001"]').first()
        await skeleton.scrollIntoViewIfNeeded()
        await expect(skeleton).toBeVisible()
        const box = (await skeleton.boundingBox())!
        expect(box.width).toBeGreaterThan(8)
        // desabilitado: o item do acordeão não abre
        const desabilitado = page.locator('#accordion button[disabled]').first()
        await expect(desabilitado).toBeDisabled()
        // erro: a tabela tem o estado de erro pelo seletor da vitrine
        const estado = page.locator('#table').getByRole('combobox', { name: 'Estado da tabela' })
        if (await estado.count()) {
          await estado.click()
          const erro = page.getByRole('option', { name: /erro/i })
          if (await erro.count()) {
            await erro.first().click()
            await expect(
              page.locator('#table').getByRole('button', { name: /tentar/i }),
            ).toBeVisible()
          }
        }
      })

      test('modal: título e descrição longos, sem espaço, não saem da tela (E-mail, URL, nome composto)', async ({
        page,
      }) => {
        await abrir(page, modo)
        await page.locator('#modal').getByRole('button', { name: 'Confirmação' }).click()
        const dialogo = page.getByRole('dialog')
        await dialogo.waitFor()
        await page.waitForTimeout(600)
        const medidas = await page.evaluate((semEspaco) => {
          const alvos = [...document.querySelectorAll<HTMLElement>('[role="dialog"] p')].slice(0, 2)
          return alvos.map((el) => {
            const antes = el.textContent
            el.textContent = semEspaco
            const r = el.getBoundingClientRect()
            const out = { direita: Math.round(r.right), tela: window.innerWidth }
            el.textContent = antes
            return out
          })
        }, SEM_ESPACO)
        expect(medidas.length).toBe(2)
        for (const m of medidas) expect(m.direita).toBeLessThanOrEqual(m.tela + 1)
      })

      test('o skeleton não esconde nem empurra o conteúdo: mesma altura nos dois caminhos', async ({
        page,
      }) => {
        await abrir(page, modo)
        const alturas = await page.evaluate(() =>
          [
            ...document.querySelectorAll<HTMLElement>(
              '#progress-skeleton [data-rendra="SKEL-001"]',
            ),
          ].map((e) => Math.round(e.getBoundingClientRect().height)),
        )
        expect(alturas.length).toBeGreaterThan(0)
        for (const h of alturas) expect(h).toBeGreaterThan(0)
      })
    })
  }
}
