import { mkdirSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { auditLayout, MOBILE, openRoute, templates, useTheme, type Theme } from './helpers'

/*
 * FLUXOS DE AUTOMAÇÃO NO NAVEGADOR (FlowEditor e FlowViewer, na vitrine /componentes).
 * O jsdom não faz arrastar, ligar nem apagar de verdade; é aqui que isso se prova, afirmando o
 * que a pessoa vê (blocos e ligações no DOM, texto, destaque) e o estilo computado do tema.
 *
 *   BASE_URL=http://localhost:5199 npx playwright test --project=flow
 */

const SEC = '#fluxo-editor'
const nodes = (page: Page) => page.locator(`${SEC} .react-flow__node`)
const edges = (page: Page) => page.locator(`${SEC} .react-flow__edge`)
const json = async (page: Page) =>
  JSON.parse(await page.getByLabel('JSON do fluxo').inputValue()) as {
    nodes: { id: string; position: { x: number; y: number } }[]
    edges: { id: string }[]
  }

async function abrir(page: Page, theme: Theme = { brand: 'safira', mode: 'light' }) {
  await useTheme(page, theme)
  const errors = await openRoute(page, '/componentes')
  // O mouse nasce em (0, 0), sobre a barra lateral recolhida, e o hover a abre por cima do canvas.
  await page.mouse.move(640, 500)
  await page.waitForTimeout(300)
  await page.locator(SEC).scrollIntoViewIfNeeded()
  await expect(nodes(page)).toHaveCount(7)
  // os blocos só aparecem depois de medidos
  await expect(nodes(page).first()).toBeVisible()
  await expect(edges(page)).toHaveCount(6)
  return errors
}

async function centro(loc: Locator) {
  await loc.scrollIntoViewIfNeeded()
  const b = (await loc.boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b }
}

async function arrastarPaleta(page: Page, nome: string) {
  const item = page
    .locator(SEC)
    .getByRole('group', { name: 'Blocos' })
    .getByRole('button', { name: nome })
  const from = await centro(item)
  const canvas = (await page.locator(`${SEC} .flow-surface`).boundingBox())!
  const to = { x: canvas.x + canvas.width * 0.1, y: canvas.y + canvas.height * 0.5 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
}

/** Gesto de toque de verdade (eventos de ponteiro do tipo toque), pelo protocolo do navegador. */
async function toque(page: Page, caminho: { x: number; y: number }[]) {
  const cdp = await page.context().newCDPSession(page)
  const [primeiro, ...resto] = caminho
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [primeiro!] })
  for (const p of resto)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
const reta = (a: { x: number; y: number }, b: { x: number; y: number }, passos = 12) =>
  Array.from({ length: passos + 1 }, (_, i) => ({
    x: a.x + ((b.x - a.x) * i) / passos,
    y: a.y + ((b.y - a.y) * i) / passos,
  }))

const zoomOf = (page: Page) =>
  page.locator(`${SEC} .react-flow__viewport`).evaluate((el) => {
    const m = /scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform)
    return m ? Number(m[1]) : NaN
  })
const translateOf = (page: Page) =>
  page.locator(`${SEC} .react-flow__viewport`).evaluate((el) => (el as HTMLElement).style.transform)

test.describe('desktop (1280, claro, mouse)', () => {
  test.use({ viewport: { width: 1280, height: 1000 } })

  test('arrastar da paleta, ligar pela alça, mover e apagar por Delete', async ({ page }) => {
    const errors = await abrir(page)

    // 1. arrastar "Ação" da paleta até o canvas: um bloco a mais
    await arrastarPaleta(page, 'Ação')
    await expect(nodes(page)).toHaveCount(8)
    const novo = page.locator(`${SEC} .react-flow__node[data-id="acao-3"]`)
    await expect(novo).toBeVisible()

    // 2. ligar: da alça de saída do bloco novo até a de entrada de "Pedido cancelado"
    const saida = await centro(novo.locator('.react-flow__handle.source'))
    const entrada = await centro(
      page.locator(`${SEC} .react-flow__node[data-id="fim-2"] .react-flow__handle.target`),
    )
    await page.mouse.move(saida.x, saida.y)
    await page.mouse.down()
    await page.mouse.move(entrada.x, entrada.y, { steps: 12 })
    await page.mouse.up()
    await expect(edges(page)).toHaveCount(7)
    expect((await json(page)).edges.map((e) => e.id)).toContain('acao-3->fim-2')

    // 3. mover um bloco pelo canvas: a posição do JSON da demo acompanha
    const antes = (await json(page)).nodes.find((n) => n.id === 'acao-1')!.position
    const alvo = await centro(
      page.locator(`${SEC} .react-flow__node[data-id="acao-1"]`).getByText('Enviar confirmação'),
    )
    await page.mouse.move(alvo.x, alvo.y)
    await page.mouse.down()
    await page.mouse.move(alvo.x + 60, alvo.y + 6, { steps: 8 })
    await page.mouse.up()
    await expect
      .poll(async () => (await json(page)).nodes.find((n) => n.id === 'acao-1')!.position.x)
      .toBeGreaterThan(antes.x + 20)

    // 4. apagar o bloco novo por Delete: o bloco e a ligação dele somem
    await novo.getByText('Ação', { exact: true }).last().click()
    await expect(novo).toHaveClass(/selected/)
    await page.keyboard.press('Delete')
    await expect(nodes(page)).toHaveCount(7)
    await expect(edges(page)).toHaveCount(6)
    expect((await json(page)).nodes.some((n) => n.id === 'acao-3')).toBe(false)
    expect(errors).toEqual([])
  })

  test('apagar uma ligação selecionada por Delete', async ({ page }) => {
    await abrir(page)
    // clica no meio do traço da ligação (a área de toque dela é o traço transparente de 20 px)
    const ponto = await page
      .locator(`${SEC} .react-flow__edge[data-id="acao-2->fim-1"] .react-flow__edge-interaction`)
      .evaluate((el) => {
        const path = el as unknown as SVGPathElement
        const p = path.getPointAtLength(path.getTotalLength() / 2)
        const m = path.getScreenCTM()!
        return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f }
      })
    await page.mouse.click(ponto.x, ponto.y)
    await expect(page.locator(`${SEC} .react-flow__edge[data-id="acao-2->fim-1"]`)).toHaveClass(
      /selected/,
    )
    await page.keyboard.press('Delete')
    await expect(edges(page)).toHaveCount(5)
    expect((await json(page)).edges.some((e) => e.id === 'acao-2->fim-1')).toBe(false)
  })

  test('Validar mostra as mensagens do que está errado, marca o bloco e leva até ele', async ({
    page,
  }) => {
    await abrir(page)
    await arrastarPaleta(page, 'Ação')
    await expect(nodes(page)).toHaveCount(8)
    await page.locator(SEC).getByRole('button', { name: 'Validar' }).click()
    const relatorio = page.locator(SEC).getByRole('region', { name: 'Validação do fluxo' })
    await expect(relatorio).toContainText('não é alcançado a partir do gatilho')
    await expect(relatorio).toContainText('não leva a nenhum próximo bloco')
    await expect(page.locator(`${SEC} [data-flow-node][data-invalid="true"]`)).toHaveCount(1)
    await relatorio
      .getByRole('button', { name: /Ver bloco/ })
      .first()
      .click()
    await expect(page.locator(`${SEC} .react-flow__node.selected`)).toHaveCount(1)
  })

  test('Testar fluxo percorre até o fim, escolhendo "Não" na condição', async ({ page }) => {
    await abrir(page)
    await page.locator(SEC).getByRole('button', { name: 'Testar fluxo' }).click()
    const painel = page.locator(SEC).getByRole('region', { name: 'Teste do fluxo' })
    await expect(painel).toBeVisible()
    const passos = painel.getByRole('listitem')
    await painel.getByRole('button', { name: 'Avançar' }).click()
    await painel.getByRole('button', { name: 'Avançar' }).click()
    await expect(page.locator(`${SEC} [data-flow-node][data-active="true"]`)).toContainText(
      'Pagamento aprovado?',
    )
    await expect(painel.getByRole('button', { name: 'Avançar' })).toBeDisabled()
    await painel.getByRole('button', { name: 'Não' }).click()
    await painel.getByRole('button', { name: 'Avançar' }).click()
    await expect(painel.getByText('Fluxo concluído')).toBeVisible()
    await expect(passos).toHaveCount(4)
    await expect(passos).toContainText([
      'Novo pedido',
      'Enviar confirmação',
      'Pagamento aprovado?',
      'Pedido cancelado',
    ])
    await expect(painel).not.toContainText('Aguardar liberação')
    await painel.getByRole('button', { name: 'Fechar teste' }).click()
    await expect(page.locator(`${SEC} [data-flow-node][data-active="true"]`)).toHaveCount(0)
  })

  test('a roda do mouse rola a página e Ctrl+roda dá zoom no canvas', async ({ page }) => {
    await abrir(page)
    const canvas = await centro(page.locator(`${SEC} .flow-surface`))
    const zoom0 = await zoomOf(page)
    const main = page.locator('main#conteudo')
    const rolagem0 = await main.evaluate((el) => el.scrollTop)
    await page.mouse.move(canvas.x, canvas.y)
    await page.mouse.wheel(0, 300)
    await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(rolagem0)
    expect(await zoomOf(page)).toBe(zoom0)
    await page.mouse.move(canvas.x, (await centro(page.locator(`${SEC} .flow-surface`))).y)
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -300)
    await page.keyboard.up('Control')
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(zoom0)
  })

  test('aproximar, afastar e enquadrar mudam o zoom', async ({ page }) => {
    await abrir(page)
    const zoom0 = await zoomOf(page)
    await page.locator(SEC).getByRole('button', { name: 'Aproximar' }).click()
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(zoom0)
    await page.locator(SEC).getByRole('button', { name: 'Afastar' }).click()
    await page.locator(SEC).getByRole('button', { name: 'Afastar' }).click()
    await expect.poll(() => zoomOf(page)).toBeLessThan(zoom0)
    await page.locator(SEC).getByRole('button', { name: 'Enquadrar' }).click()
    await expect.poll(() => zoomOf(page)).toBeCloseTo(zoom0, 1)
  })

  test('teclado: Enter no bloco abre a gaveta, Próximo bloco liga sem mouse e Esc fecha', async ({
    page,
  }) => {
    await abrir(page)
    const bloco = page.locator(`${SEC} .react-flow__node[data-id="acao-1"]`)
    await bloco.focus()
    await page.keyboard.press('Enter')
    const gaveta = page.getByRole('dialog')
    await expect(gaveta).toBeVisible()
    await expect(gaveta.getByLabel('Rótulo')).toHaveValue('Enviar confirmação')
    const proximo = gaveta.getByRole('combobox', { name: 'Próximo bloco' })
    await proximo.focus()
    await page.keyboard.press('Enter')
    // só teclado: desce pela lista até a opção e confirma com Enter
    for (let i = 0; i < 10; i++) {
      const ativa = await page.locator('[role="option"][data-selected="true"]').textContent()
      if (ativa?.includes('Pedido cancelado')) break
      await page.keyboard.press('ArrowDown')
    }
    await page.keyboard.press('Enter')
    await expect(proximo).toContainText('Pedido cancelado')
    await gaveta.getByRole('button', { name: 'Aplicar' }).focus()
    await page.keyboard.press('Enter')
    await expect(gaveta).toBeHidden()
    expect((await json(page)).edges.some((e) => e.id === 'acao-1->fim-2')).toBe(true)
    // Esc fecha sem aplicar
    await bloco.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('as setas movem o bloco selecionado e a posição vai para o JSON', async ({ page }) => {
    await abrir(page)
    const bloco = page.locator(`${SEC} .react-flow__node[data-id="acao-1"]`)
    const antes = (await json(page)).nodes.find((n) => n.id === 'acao-1')!.position
    await bloco.focus()
    await page.keyboard.press('Space')
    await expect(bloco).toHaveClass(/selected/)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect
      .poll(async () => (await json(page)).nodes.find((n) => n.id === 'acao-1')!.position.x)
      .toBeGreaterThan(antes.x)
  })
})

/*
 * Tema (B1 do parecer): as variáveis --xy-* no style do contêiner só valem se o estilo
 * COMPUTADO sair igual ao token do Rendra, no claro e no escuro. O CSS da biblioteca não tem
 * camada e vence qualquer regra em @layer, então só o computado prova.
 */
test.describe('tema pelos tokens', () => {
  test.use({ viewport: { width: 1280, height: 1000 } })
  for (const mode of ['light', 'dark'] as const) {
    test(`traço, alça, bloco e atribuição seguem os tokens (${mode})`, async ({ page }) => {
      await abrir(page, { brand: 'safira', mode })
      const r = await page.evaluate(() => {
        const token = (nome: string) => {
          const p = document.createElement('span')
          p.style.color = `var(${nome})`
          document.body.append(p)
          const c = getComputedStyle(p).color
          p.remove()
          return c
        }
        const sec = document.querySelector('#fluxo-editor')!
        const q = (s: string) => sec.querySelector(s) as HTMLElement
        const att = q('.react-flow__attribution a')
        const box = att.getBoundingClientRect()
        return {
          traco: getComputedStyle(q('.react-flow__edge-path')).stroke,
          alca: getComputedStyle(q('.react-flow__handle')).backgroundColor,
          bloco: getComputedStyle(q('[data-flow-node]')).backgroundColor,
          fundo: getComputedStyle(q('.react-flow')).backgroundColor,
          atribuicao: getComputedStyle(att).color,
          atribuicaoFundo: getComputedStyle(q('.react-flow__attribution')).backgroundColor,
          toque: { w: box.width, h: box.height },
          esperado: {
            traco: token('--rendra-muted-foreground'),
            alca: token('--rendra-primary'),
            bloco: token('--rendra-card'),
            fundo: token('--rendra-muted'),
            atribuicao: token('--rendra-primary-text'),
            atribuicaoFundo: token('--rendra-card'),
          },
        }
      })
      expect(r.traco).toBe(r.esperado.traco)
      expect(r.alca).toBe(r.esperado.alca)
      expect(r.bloco).toBe(r.esperado.bloco)
      expect(r.fundo).toBe(r.esperado.fundo)
      expect(r.atribuicao).toBe(r.esperado.atribuicao)
      expect(r.atribuicaoFundo).toBe(r.esperado.atribuicaoFundo)
      expect(r.toque.h).toBeGreaterThanOrEqual(43.5)
      expect(r.toque.w).toBeGreaterThanOrEqual(43.5)
    })
  }
})

test.describe('tablet (768 e 1024, toque)', () => {
  for (const width of [768, 1024]) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: 1000 }, hasTouch: true })

      test('arrastar da paleta e ligar por toque, e Editar abre a gaveta', async ({ page }) => {
        await abrir(page)
        const item = page
          .locator(SEC)
          .getByRole('group', { name: 'Blocos' })
          .getByRole('button', { name: 'Ação' })
        const from = await centro(item)
        const canvas = (await page.locator(`${SEC} .flow-surface`).boundingBox())!
        const dest = { x: canvas.x + canvas.width * 0.1, y: canvas.y + canvas.height * 0.5 }
        const scroll0 = await page.evaluate(
          () => document.querySelector('main#conteudo')!.scrollTop,
        )
        await toque(page, reta(from, dest, 14))
        await expect(nodes(page)).toHaveCount(8)
        // a página não rolou durante o gesto na paleta
        expect(await page.evaluate(() => document.querySelector('main#conteudo')!.scrollTop)).toBe(
          scroll0,
        )

        const novo = page.locator(`${SEC} .react-flow__node[data-id="acao-3"]`)
        const saida = await centro(novo.locator('.react-flow__handle.source'))
        const entrada = await centro(
          page.locator(`${SEC} .react-flow__node[data-id="fim-2"] .react-flow__handle.target`),
        )
        await toque(page, reta(saida, entrada, 14))
        await expect(edges(page)).toHaveCount(7)

        await page.locator(`${SEC} .react-flow__node[data-id="acao-1"] [data-flow-edit]`).tap()
        await expect(page.getByRole('dialog')).toBeVisible()
      })
    })
  }
})

test.describe('celular (360, toque)', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true })

  test('só ver e navegar: sem paleta nem alças; um dedo move o canvas e a página não rola', async ({
    page,
  }) => {
    await abrir(page)
    await expect(page.locator(SEC).getByRole('group', { name: 'Blocos' })).toHaveCount(0)
    await expect(page.locator(`${SEC} .react-flow__handle.connectable`)).toHaveCount(0)
    for (const nome of ['Aproximar', 'Afastar', 'Enquadrar']) {
      const b = (await page.locator(SEC).getByRole('button', { name: nome }).boundingBox())!
      expect(b.width).toBeGreaterThanOrEqual(43.5)
      expect(b.height).toBeGreaterThanOrEqual(43.5)
    }
    const surface = await centro(page.locator(`${SEC} .flow-surface`))
    // dedo em área vazia do canvas (canto direito, abaixo do nível dos blocos)
    const inicio = {
      x: surface.box.x + surface.box.width - 40,
      y: surface.box.y + surface.box.height / 2,
    }
    const scroll0 = await page.evaluate(() => document.querySelector('main#conteudo')!.scrollTop)
    const t0 = await translateOf(page)
    await toque(page, reta(inicio, { x: inicio.x - 90, y: inicio.y - 60 }, 10))
    await expect.poll(() => translateOf(page)).not.toBe(t0)
    expect(await page.evaluate(() => document.querySelector('main#conteudo')!.scrollTop)).toBe(
      scroll0,
    )
  })

  test('um dedo começando em cima de um bloco também move o canvas, sem rolar a página', async ({
    page,
  }) => {
    await abrir(page)
    const bloco = await centro(page.locator(`${SEC} .react-flow__node[data-id="acao-1"]`))
    const scroll0 = await page.evaluate(() => document.querySelector('main#conteudo')!.scrollTop)
    const t0 = await translateOf(page)
    await toque(page, reta(bloco, { x: bloco.x - 40, y: bloco.y + 50 }, 10))
    await expect.poll(() => translateOf(page)).not.toBe(t0)
    expect(await page.evaluate(() => document.querySelector('main#conteudo')!.scrollTop)).toBe(
      scroll0,
    )
  })

  test('pinça muda o zoom', async ({ page }) => {
    await abrir(page)
    const s = await centro(page.locator(`${SEC} .flow-surface`))
    const zoom0 = await zoomOf(page)
    const cdp = await page.context().newCDPSession(page)
    const c = { x: s.x, y: s.y + 20 }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: c.x - 20, y: c.y },
        { x: c.x + 20, y: c.y },
      ],
    })
    for (let i = 1; i <= 10; i++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: c.x - 20 - i * 6, y: c.y },
          { x: c.x + 20 + i * 6, y: c.y },
        ],
      })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(zoom0)
  })

  test('tocar no bloco abre a gaveta em tela inteira; ligar ao próximo e excluir funcionam por ali', async ({
    page,
  }) => {
    await abrir(page)
    await page
      .locator(`${SEC} .react-flow__node[data-id="acao-1"]`)
      .getByText('Enviar confirmação')
      .tap()
    const gaveta = page.getByRole('dialog')
    await expect(gaveta).toBeVisible()
    const caixa = (await gaveta.boundingBox())!
    expect(Math.round(caixa.width)).toBe(360)
    expect(Math.round(caixa.height)).toBe(800)
    await gaveta.getByRole('combobox', { name: 'Próximo bloco' }).tap()
    await page.getByRole('option', { name: /Pedido cancelado/ }).tap()
    await gaveta.getByRole('button', { name: 'Aplicar' }).tap()
    await expect(gaveta).toBeHidden()
    expect((await json(page)).edges.some((e) => e.id === 'acao-1->fim-2')).toBe(true)

    await page
      .locator(`${SEC} .react-flow__node[data-id="acao-2"]`)
      .getByText('Liberar acesso')
      .tap()
    await page.getByRole('dialog').getByRole('button', { name: 'Mais ações' }).tap()
    await page.getByRole('menuitem', { name: 'Excluir bloco' }).tap()
    await page.getByRole('button', { name: 'Excluir', exact: true }).tap()
    await expect(nodes(page)).toHaveCount(6)
    expect((await json(page)).nodes.some((n) => n.id === 'acao-2')).toBe(false)
  })
})

/* Layout e acessibilidade com a gaveta, o relatório e a simulação abertos. */
type Estado = 'base' | 'gaveta' | 'validacao' | 'simulacao' | 'erro'

async function levarAoEstado(page: Page, estado: Estado) {
  const mobile = (page.viewportSize()?.width ?? 1280) < MOBILE
  if (estado === 'gaveta') {
    const bloco = page.locator(`${SEC} .react-flow__node[data-id="acao-1"]`)
    if (mobile) await bloco.getByText('Enviar confirmação').tap()
    else await bloco.locator('[data-flow-edit]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  } else if (estado === 'validacao') {
    await page.locator(SEC).getByRole('button', { name: 'Validar' }).click()
    await expect(page.locator(SEC).getByText('Fluxo válido')).toBeVisible()
  } else if (estado === 'erro') {
    // só nas larguras de montar: um bloco solto deixa o fluxo com problemas
    await arrastarPaleta(page, 'Ação')
    await expect(nodes(page)).toHaveCount(8)
    await page.locator(SEC).getByRole('button', { name: 'Validar' }).click()
    await expect(
      page.locator(SEC).getByRole('region', { name: 'Validação do fluxo' }),
    ).toContainText('problema')
  } else if (estado === 'simulacao') {
    await page.locator(SEC).getByRole('button', { name: 'Testar fluxo' }).click()
    const painel = page.locator(SEC).getByRole('region', { name: 'Teste do fluxo' })
    await painel.getByRole('button', { name: 'Avançar' }).click()
    await painel.getByRole('button', { name: 'Avançar' }).click()
    await expect(painel.getByRole('button', { name: 'Sim' })).toBeVisible()
  }
  await page.waitForTimeout(300)
}

const estados: Estado[] = ['base', 'gaveta', 'validacao', 'simulacao']
const estadosDeCaptura: Estado[] = [...estados, 'erro']
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
      test.use({ viewport: { width, height: 900 }, hasTouch: width < MOBILE })
      for (const estado of estados) {
        test(`${estado}: sem rolagem horizontal, sem alvo pequeno, sem erro`, async ({ page }) => {
          const errors = await abrir(page, { brand, mode })
          await levarAoEstado(page, estado)
          const res = await auditLayout(page, width < MOBILE)
          expect.soft(errors, 'erros de JavaScript').toEqual([])
          expect.soft(res.scroll, 'rolagem horizontal').toBeLessThanOrEqual(0)
          expect.soft(res.pageOverflowY, 'página mais alta que a tela').toBeLessThanOrEqual(0)
          expect.soft(res.wide, 'elementos maiores que a tela').toEqual([])
          if (width < MOBILE) expect.soft(res.small, 'alvos de toque menores que 44px').toEqual([])
        })
      }
    })
  }
}

const temas: (Theme & { width: number })[] = [
  ...templates.flatMap((brand) =>
    (['light', 'dark'] as const).flatMap((mode) => [
      { brand, mode, width: 1280 },
      { brand, mode, width: 360 },
    ]),
  ),
  { brand: 'safira', palette: 'ardosia', mode: 'light', width: 1280 },
  { brand: 'safira', palette: 'ardosia', mode: 'dark', width: 1280 },
  { brand: 'safira', palette: 'ardosia', mode: 'light', width: 360 },
]

for (const tema of temas) {
  const nome = `${tema.brand}${tema.palette ? `+${tema.palette}` : ''} ${tema.mode === 'dark' ? 'escuro' : 'claro'} @ ${tema.width}px`
  test.describe(`a11y ${nome}`, () => {
    test.use({ viewport: { width: tema.width, height: 900 }, hasTouch: tema.width < MOBILE })
    for (const estado of estados) {
      test(`${estado}`, async ({ page }) => {
        await abrir(page, tema)
        await levarAoEstado(page, estado)
        const { violations } = await new AxeBuilder({ page })
          .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        const relatorio = violations.map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help}\n${v.nodes
              .slice(0, 5)
              .map(
                (n) =>
                  `    ${n.target.join(' ')}\n      ${n.failureSummary?.split('\n').slice(1).join(' ')}`,
              )
              .join('\n')}`,
        )
        expect(relatorio, 'violações de acessibilidade').toEqual([])
      })
    }
  })
}

/* Capturas para revisão a olho (não comparam nada): screenshots/flow/<modelo>[+paleta]-<modo>-<largura>-<estado>.png */
test.describe('capturas do fluxo', () => {
  test.skip(!process.env.FLOW_SHOTS, 'só com FLOW_SHOTS=1')
  test.use({ hasTouch: true })
  const combos: (Theme & { width: number })[] = [
    ...templates.flatMap((brand) =>
      (['light', 'dark'] as const).flatMap((mode) => [
        { brand, mode, width: 1280 },
        { brand, mode, width: 360 },
      ]),
    ),
    ...['equilibrio', 'aurora', 'ardosia'].map((palette) => ({
      brand: 'safira',
      palette,
      mode: 'light' as const,
      width: 1280,
    })),
  ]
  for (const t of combos) {
    for (const estado of estadosDeCaptura) {
      if (estado === 'erro' && t.width < MOBILE) continue
      test(`${t.brand}${t.palette ? `+${t.palette}` : ''} ${t.mode} ${t.width} ${estado}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: t.width, height: t.width < MOBILE ? 900 : 1100 })
        await abrir(page, t)
        await levarAoEstado(page, estado)
        const dir = process.env.FLOW_SHOTS_DIR ?? 'screenshots/flow'
        mkdirSync(dir, { recursive: true })
        await page.screenshot({
          path: `${dir}/${t.brand}${t.palette ? `+${t.palette}` : ''}-${t.mode}-${t.width}-${estado}.png`,
        })
      })
    }
  }
})
