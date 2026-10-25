import { mkdirSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  auditLayout,
  MOBILE,
  openRoute,
  templates,
  useTheme as aplicarTema,
  type Theme,
} from './helpers'

/*
 * FLUXOS DE AUTOMAÇÃO NO NAVEGADOR (FlowEditor e FlowViewer, na vitrine /componentes).
 * O jsdom não faz arrastar, ligar nem apagar de verdade; é aqui que isso se prova, afirmando o
 * que a pessoa vê (blocos e ligações no DOM, texto, destaque, medidas) e o estilo computado.
 *
 *   BASE_URL=http://localhost:5199 npx playwright test --project=flow
 */

const SEC = '#fluxo-editor'
const nodes = (page: Page) => page.locator(`${SEC} .react-flow__node`)
const edges = (page: Page) => page.locator(`${SEC} .react-flow__edge`)
const node = (page: Page, id: string) => page.locator(`${SEC} .react-flow__node[data-id="${id}"]`)
const painel = (page: Page) => page.locator(`${SEC} aside`)
const aviso = (page: Page) => page.locator(`${SEC} [data-flow-notice]`)
const json = async (page: Page) =>
  JSON.parse(await page.getByLabel('JSON do fluxo').inputValue()) as {
    version: number
    nodes: { id: string; type: string; position: { x: number; y: number } }[]
    edges: { id: string; branch?: string }[]
  }

async function abrir(page: Page, theme: Theme = { brand: 'safira', mode: 'light' }) {
  await aplicarTema(page, theme)
  const errors = await openRoute(page, '/componentes')
  // Servidor de desenvolvimento lento ou ocupado: uma carga que não chegou a desenhar a vitrine
  // é repetida uma vez; o motivo, se persistir, vai na mensagem de falha.
  const desenhou = await page
    .locator(SEC)
    .waitFor({ state: 'attached', timeout: 25_000 })
    .then(
      () => true,
      () => false,
    )
  if (!desenhou) {
    await page.reload({ waitUntil: 'networkidle' })
    await expect(
      page.locator(SEC),
      `a vitrine não desenhou o fluxo nem depois de recarregar (erros: ${errors.join(' | ') || 'nenhum'})`,
    ).toBeAttached({ timeout: 40_000 })
  }
  // O mouse nasce em (0, 0), sobre a barra lateral recolhida, e o hover a abre por cima do canvas.
  await page.mouse.move(640, 500)
  await page.waitForTimeout(300)
  // o canvas no meio da janela: o header fixo do AppShell não cobre os blocos
  await page
    .locator(`${SEC} .flow-surface`)
    .evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await expect(nodes(page)).toHaveCount(5)
  // os blocos só aparecem depois de medidos
  await expect(nodes(page).first()).toBeVisible()
  await expect(edges(page)).toHaveCount(4)
  return errors
}

async function centro(loc: Locator) {
  await loc.scrollIntoViewIfNeeded()
  const b = (await loc.boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b }
}

/** Arrasta com o mouse de um ponto a outro, em passos (o React Flow lê o caminho todo). */
async function arrastar(
  page: Page,
  de: { x: number; y: number },
  para: { x: number; y: number },
  passos = 12,
) {
  await page.mouse.move(de.x, de.y)
  await page.mouse.down()
  await page.mouse.move(para.x, para.y, { steps: passos })
  await page.mouse.up()
}

/** Liga arrastando da alça de saída de `origem` até o meio do corpo de `destino`. */
async function ligar(page: Page, origem: string, destino: string, saida = 0) {
  const alca = await centro(node(page, origem).locator('.react-flow__handle.source').nth(saida))
  const corpo = await centro(node(page, destino).locator('[data-flow-node]'))
  await arrastar(page, alca, corpo)
}

async function arrastarDoPainel(page: Page, nome: string) {
  const item = painel(page).getByRole('button', { name: nome })
  const from = await centro(item)
  const canvas = (await page.locator(`${SEC} .flow-surface`).boundingBox())!
  const to = { x: canvas.x + canvas.width * 0.1, y: canvas.y + canvas.height * 0.8 }
  await arrastar(page, from, to, 10)
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

/** Ponto, na tela, do meio de uma ligação (onde fica a lixeira). */
const pontoDaLigacao = (page: Page, id: string) =>
  page.evaluate((id) => {
    const p = document.querySelector(
      `#fluxo-editor .react-flow__edge[data-id="${id}"] path.react-flow__edge-interaction`,
    ) as SVGPathElement
    const m = p.getScreenCTM()!
    const pt = p.getPointAtLength(p.getTotalLength() / 2)
    return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f }
  }, id)

const caixas = (page: Page) =>
  nodes(page).evaluateAll((els) =>
    els.map((e) => {
      const b = e.getBoundingClientRect()
      return { id: e.getAttribute('data-id')!, x: b.x, y: b.y, w: b.width, h: b.height }
    }),
  )
const semCruzar = (r: { id: string; x: number; y: number; w: number; h: number }[]) => {
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const a = r[i]!
      const b = r[j]!
      const cruza = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
      expect(cruza, `${a.id} cruza ${b.id}`).toBe(false)
    }
}

test.describe('desktop (1280, claro, mouse)', () => {
  test.use({ viewport: { width: 1280, height: 1000 } })

  test('a vitrine tem as seções FlowEditor e FlowViewer, o fluxo corre da esquerda para a direita', async ({
    page,
  }) => {
    await abrir(page)
    await expect(page.locator('#fluxo-editor-t')).toHaveText('FlowEditor')
    await expect(page.locator('#fluxo-editor')).toContainText('FLX-001')
    await expect(page.locator('#fluxo-editor [data-rendra="FLX-001"]')).toBeVisible()
    await expect(page.locator('#fluxo-viewer h2')).toHaveText('FlowViewer')
    await expect(page.locator('#fluxo-viewer [data-rendra="FLX-002"]')).toBeVisible()
    await expect(page.locator('#fluxo-viewer .react-flow__handle.connectable')).toHaveCount(0)
    await expect(page.locator('#fluxo-viewer [data-flow-node][data-active="true"]')).toContainText(
      'Condição',
    )
    const j = await json(page)
    expect(j.version).toBe(2)
    const x = (id: string) => j.nodes.find((n) => n.id === id)!.position.x
    for (const e of j.edges) {
      const [a, b] = e.id.split(/:\w+->|->/)
      expect(x(b!)).toBeGreaterThan(x(a!))
    }
    // a barra lateral lista os 5 grupos
    for (const g of ['Gatilhos', 'Mensagens', 'Condicionais', 'Integrações', 'Ações internas'])
      await expect(painel(page).getByRole('group', { name: g })).toBeVisible()
  })

  test('alça: alvo de 44 px com ponto visível de 12 px; as saídas da condição não se cruzam', async ({
    page,
  }) => {
    await abrir(page)
    const zoom = await page
      .locator(`${SEC} .react-flow__viewport`)
      .evaluate((el) => Number(/scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform)![1]))
    const alca = (await node(page, 'webhook-saida-1')
      .locator('.react-flow__handle.target')
      .boundingBox())!
    expect(alca.width / zoom).toBeCloseTo(44, 0)
    expect(alca.height / zoom).toBeCloseTo(44, 0)
    const ponto = (await node(page, 'webhook-saida-1')
      .locator('.react-flow__handle.target [data-flow-dot]')
      .boundingBox())!
    expect(ponto.width / zoom).toBeCloseTo(12, 0)
    const saidas = await node(page, 'condicao-1')
      .locator('.react-flow__handle.source')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
    expect(saidas).toHaveLength(3)
    for (let i = 0; i < saidas.length; i++)
      for (let j = i + 1; j < saidas.length; j++) {
        const a = saidas[i]!
        const b = saidas[j]!
        expect(a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5).toBe(true)
      }
  })

  test('ligar soltando no meio do corpo do bloco de destino cria a ligação', async ({ page }) => {
    const errors = await abrir(page)
    await ligar(page, 'tarefa-1', 'whatsapp-1')
    await expect(edges(page)).toHaveCount(5)
    expect((await json(page)).edges.map((e) => e.id)).toContain('tarefa-1->whatsapp-1')
    expect(errors).toEqual([])
  })

  test('ligar uma saída que já tinha ligação troca e avisa com os nomes dos blocos', async ({
    page,
  }) => {
    await abrir(page)
    await ligar(page, 'whatsapp-1', 'tarefa-1')
    await expect(aviso(page)).toContainText(
      'A ligação anterior de "Enviar WhatsApp" para "Condição" foi trocada.',
    )
    await expect(edges(page)).toHaveCount(4)
    const ids = (await json(page)).edges.map((e) => e.id)
    expect(ids).toContain('whatsapp-1->tarefa-1')
    expect(ids).not.toContain('whatsapp-1->condicao-1')
  })

  test('soltar a uns 30 px fora do bloco não liga nada', async ({ page }) => {
    await abrir(page)
    const alca = await centro(node(page, 'tarefa-1').locator('.react-flow__handle.source'))
    const alvo = (await node(page, 'whatsapp-1').locator('[data-flow-node]').boundingBox())!
    await arrastar(page, alca, { x: alvo.x + alvo.width / 2, y: alvo.y - 40 })
    await expect(edges(page)).toHaveCount(4)
    await expect(aviso(page)).toBeEmpty()
  })

  test('ligar na saída "Regra 1" da condição, e o motivo de uma ligação recusada aparece', async ({
    page,
  }) => {
    await abrir(page)
    await ligar(page, 'condicao-1', 'tarefa-1', 0)
    expect((await json(page)).edges.find((e) => e.id === 'condicao-1:r1->tarefa-1')?.branch).toBe(
      'r1',
    )
    await ligar(page, 'tarefa-1', 'webhook-entrada-1')
    await expect(aviso(page)).toContainText('O gatilho começa o fluxo e não recebe ligação.')
  })

  test('arrastar da barra para o canvas e adicionar blocos por clique, sem cobrir nenhum', async ({
    page,
  }) => {
    await abrir(page)
    await arrastarDoPainel(page, 'Enviar e-mail')
    await expect(nodes(page)).toHaveCount(6)
    for (let i = 0; i < 3; i++) {
      await painel(page).getByRole('button', { name: 'Fechar configuração' }).click()
      await painel(page).getByRole('button', { name: 'Criar tarefa' }).click()
    }
    await expect(nodes(page)).toHaveCount(9)
    semCruzar(await caixas(page))
  })

  test('busca na barra e grupos', async ({ page }) => {
    await abrir(page)
    await painel(page).getByRole('textbox', { name: 'Buscar bloco' }).fill('whats')
    await expect(painel(page).locator('[data-flow-block]')).toHaveCount(1)
    await expect(painel(page).getByRole('button', { name: 'Enviar WhatsApp' })).toBeVisible()
    await painel(page).getByRole('textbox', { name: 'Buscar bloco' }).fill('xyz')
    await expect(painel(page).getByText('Nenhum bloco encontrado')).toBeVisible()
  })

  test('clicar na ligação mostra a lixeira; "Não" mantém, "Sim" apaga; Delete também apaga', async ({
    page,
  }) => {
    await abrir(page)
    const p = await pontoDaLigacao(page, 'whatsapp-1->condicao-1')
    await page.mouse.click(p.x, p.y)
    const lixeira = page.getByRole('button', {
      name: /Excluir ligação de Enviar WhatsApp para Condição/,
    })
    await expect(lixeira).toBeVisible()
    await lixeira.click()
    await expect(page.getByText('Excluir ligação?')).toBeVisible()
    await page.getByRole('button', { name: 'Não', exact: true }).click()
    await expect(edges(page)).toHaveCount(4)
    await lixeira.click()
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await expect(edges(page)).toHaveCount(3)
    // Delete pelo teclado apaga a ligação selecionada
    const q = await pontoDaLigacao(page, 'webhook-entrada-1->whatsapp-1')
    await page.mouse.click(q.x, q.y)
    await page.keyboard.press('Delete')
    await expect(edges(page)).toHaveCount(2)
  })

  test('excluir bloco: modal com ligações, só este (caixa CONFIRMO) e tudo depois (digitado)', async ({
    page,
  }) => {
    await abrir(page)
    await node(page, 'whatsapp-1')
      .getByRole('button', { name: /Excluir bloco/ })
      .click()
    const modal = page.getByRole('dialog')
    await expect(modal).toContainText('Ligado depois de')
    await expect(modal.getByText('Receber webhook')).toBeVisible()
    await expect(modal.getByText('Condição')).toBeVisible()
    await modal.getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(modal.getByRole('alert')).toContainText('Marque a caixa CONFIRMO')
    await expect(nodes(page)).toHaveCount(5)
    await modal.getByRole('checkbox', { name: 'CONFIRMO' }).check()
    await modal.getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(nodes(page)).toHaveCount(4)
    expect((await json(page)).edges.map((e) => e.id)).toContain('webhook-entrada-1->condicao-1')
    // tudo depois, digitando
    await node(page, 'condicao-1')
      .getByRole('button', { name: /Excluir bloco/ })
      .click()
    await page.getByRole('radio', { name: /tudo o que vem depois dele \(3 blocos\)/ }).check()
    await page.getByRole('textbox').last().fill('confirmo')
    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(nodes(page)).toHaveCount(1)
  })

  test('Receber webhook: simular chegada, mapear e ver o chip no card; Enviar webhook: simular envio', async ({
    page,
  }) => {
    await abrir(page)
    await node(page, 'webhook-entrada-1')
      .getByRole('button', { name: /Editar bloco/ })
      .click()
    await painel(page).getByRole('combobox', { name: 'Campo do sistema para cliente.nome' }).click()
    await page.getByRole('option', { name: /Cliente › E-mail/ }).click()
    await painel(page).getByRole('combobox', { name: 'Campo do sistema para cliente.nome' }).click()
    await painel(page)
      .getByRole('listitem')
      .filter({ hasText: 'cliente.nome' })
      .getByLabel('Limpar seleção')
      .click()
    await expect(
      node(page, 'webhook-entrada-1').locator('[data-flow-chip]', { hasText: '{{cliente.nome}}' }),
    ).toHaveCount(0)
    await painel(page).getByRole('combobox', { name: 'Campo do sistema para cliente.nome' }).click()
    await page.getByRole('option', { name: /Cliente › Nome/ }).click()
    await expect(
      node(page, 'webhook-entrada-1').locator('[data-flow-chip]', { hasText: '{{cliente.nome}}' }),
    ).toHaveCount(1)
    await painel(page).getByRole('button', { name: 'Fechar configuração' }).click()
    await node(page, 'webhook-saida-1')
      .getByRole('button', { name: /Editar bloco/ })
      .click()
    await painel(page).getByRole('button', { name: 'Simular envio' }).click()
    const sim = painel(page).getByRole('region', { name: 'Simulação do envio' })
    await expect(sim).toContainText('POST https://crm.exemplo/api')
    await expect(sim).toContainText('Ana Souza')
    await expect(sim).toContainText('200 OK')
  })

  test('condição: adicionar regra e testar o fluxo mostra qual regra bateu', async ({ page }) => {
    await abrir(page)
    await node(page, 'condicao-1')
      .getByRole('button', { name: /Editar bloco/ })
      .click()
    await painel(page).getByRole('button', { name: 'Adicionar regra' }).click()
    await expect(node(page, 'condicao-1').locator('.react-flow__handle.source')).toHaveCount(4)
    await expect(node(page, 'condicao-1')).toContainText('Regra 3')
    // a regra nova está vazia: o teste acusa antes de começar
    await painel(page).getByRole('button', { name: 'Excluir Regra 3' }).click()
    await page.locator(SEC).getByRole('button', { name: 'Testar fluxo' }).click()
    const regiao = page.locator(SEC).getByRole('region', { name: 'Teste do fluxo' })
    for (let i = 0; i < 3; i++) await regiao.getByRole('button', { name: 'Avançar' }).click()
    await expect(regiao).toContainText('Regra 1 bateu: pedido.valor é maior que 500')
  })

  test('as ligações são animadas e param com movimento reduzido', async ({ page }) => {
    await abrir(page)
    const anim = () =>
      page
        .locator(`${SEC} .react-flow__edge.animated path.react-flow__edge-path`)
        .first()
        .evaluate((el) => {
          const c = getComputedStyle(el)
          return { nome: c.animationName, duracao: c.animationDuration, dash: c.strokeDasharray }
        })
    const normal = await anim()
    expect(normal.nome).toBe('dashdraw')
    expect(normal.dash).not.toBe('none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduzido = await anim()
    expect(Number.parseFloat(reduzido.duracao)).toBeLessThan(0.001)
    expect(reduzido.dash).not.toBe('none')
  })

  test('teclado: Enter no bloco abre a configuração, Esc volta, Delete abre o modal, setas movem', async ({
    page,
  }) => {
    await abrir(page)
    const no = node(page, 'tarefa-1')
    await no.focus()
    await page.keyboard.press('Enter')
    await expect(painel(page).getByRole('textbox', { name: 'Responsável' })).toBeVisible()
    await painel(page).getByRole('textbox', { name: 'Nome do bloco' }).press('Escape')
    await expect(painel(page).getByText('Adicionar bloco')).toBeVisible()
    await no.click({ position: { x: 6, y: 6 } })
    await painel(page).getByRole('button', { name: 'Fechar configuração' }).click()
    await no.focus()
    await page.keyboard.press('Space')
    const antes = (await json(page)).nodes.find((n) => n.id === 'tarefa-1')!.position
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect
      .poll(async () => (await json(page)).nodes.find((n) => n.id === 'tarefa-1')!.position.x)
      .toBeGreaterThan(antes.x)
    await page.keyboard.press('Delete')
    await expect(page.getByRole('dialog')).toContainText('Excluir este bloco?')
    await expect(nodes(page)).toHaveCount(5)
  })

  test('o viewer não rola a página com a roda, e Ctrl+roda dá zoom no editor', async ({ page }) => {
    await abrir(page)
    const zoom = () =>
      page
        .locator(`${SEC} .react-flow__viewport`)
        .evaluate((el) => Number(/scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform)![1]))
    const c = await centro(page.locator(`${SEC} .flow-surface`))
    await page.mouse.move(c.x, c.y)
    const y0 = await page.evaluate(() => document.querySelector('main')!.scrollTop)
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => document.querySelector('main')!.scrollTop)).toBeGreaterThan(y0)
    // a página rolou: o mouse volta para o meio do canvas antes do zoom
    const c2 = await centro(page.locator(`${SEC} .flow-surface`))
    await page.mouse.move(c2.x, c2.y)
    const z0 = await zoom()
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -300)
    await page.keyboard.up('Control')
    await expect.poll(zoom).toBeGreaterThan(z0)
  })
})

test.describe('tema pelos tokens', () => {
  test.use({ viewport: { width: 1280, height: 1000 } })
  for (const mode of ['light', 'dark'] as const) {
    test(`traço, ponto da alça, bloco, fundo e atribuição seguem os tokens (${mode})`, async ({
      page,
    }) => {
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
          ponto: getComputedStyle(q('[data-flow-dot]')).backgroundColor,
          bloco: getComputedStyle(q('[data-flow-node]')).backgroundColor,
          fundo: getComputedStyle(q('.react-flow')).backgroundColor,
          atribuicao: getComputedStyle(att).color,
          atribuicaoFundo: getComputedStyle(q('.react-flow__attribution')).backgroundColor,
          toque: { w: box.width, h: box.height },
          esperado: {
            traco: token('--rendra-muted-foreground'),
            ponto: token('--rendra-primary-text'),
            bloco: token('--rendra-card'),
            fundo: token('--rendra-muted'),
            atribuicao: token('--rendra-primary-text'),
            atribuicaoFundo: token('--rendra-card'),
          },
        }
      })
      expect(r.traco).toBe(r.esperado.traco)
      expect(r.alca).toBe('rgba(0, 0, 0, 0)')
      expect(r.ponto).toBe(r.esperado.ponto)
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
      test.use({ viewport: { width, height: 1500 }, hasTouch: true })

      test('arrastar da barra e ligar soltando no corpo do bloco, por toque', async ({ page }) => {
        await abrir(page)
        const item = await centro(painel(page).getByRole('button', { name: 'Enviar e-mail' }))
        const canvas = (await page.locator(`${SEC} .flow-surface`).boundingBox())!
        await toque(
          page,
          reta(item, { x: canvas.x + canvas.width * 0.2, y: canvas.y + canvas.height * 0.85 }),
        )
        await expect(nodes(page)).toHaveCount(6)
        await page.locator(SEC).getByRole('button', { name: 'Enquadrar' }).tap()
        await page.waitForTimeout(500)
        const alca = await centro(node(page, 'tarefa-1').locator('.react-flow__handle.source'))
        const corpo = await centro(node(page, 'whatsapp-1').locator('[data-flow-node]'))
        await toque(page, reta(alca, corpo, 16))
        await expect(edges(page)).toHaveCount(5)
        expect((await json(page)).edges.map((e) => e.id)).toContain('tarefa-1->whatsapp-1')
      })

      test('os botões do card têm 44 px e Editar abre a configuração na barra', async ({
        page,
      }) => {
        await abrir(page)
        const zoom = await page
          .locator(`${SEC} .react-flow__viewport`)
          .evaluate((el) =>
            Number(/scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform)![1]),
          )
        const b = (await node(page, 'webhook-entrada-1')
          .getByRole('button', { name: /Editar bloco/ })
          .boundingBox())!
        expect(b.width / zoom).toBeGreaterThanOrEqual(43.5)
        await node(page, 'webhook-entrada-1')
          .getByRole('button', { name: /Editar bloco/ })
          .tap()
        await expect(painel(page).getByRole('textbox', { name: 'Nome do bloco' })).toBeVisible()
      })
    })
  }
})

test.describe('celular (360)', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true })

  test('só ver e navegar: sem alças, a página não rola sob o dedo; a barra vem num Drawer', async ({
    page,
  }) => {
    await abrir(page)
    await expect(page.locator(`${SEC} .react-flow__handle.connectable`)).toHaveCount(0)
    await expect(painel(page)).toHaveCount(0)
    // abre legível: zoom de 50 % ou mais, começando pelo gatilho
    await expect
      .poll(() =>
        page
          .locator(`${SEC} .react-flow__viewport`)
          .evaluate((el) =>
            Number(/scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform)?.[1]),
          ),
      )
      .toBeGreaterThanOrEqual(0.5)
    const superficie = (await page.locator(`${SEC} .flow-surface`).boundingBox())!
    const gatilho = (await node(page, 'webhook-entrada-1').boundingBox())!
    expect(gatilho.x).toBeGreaterThanOrEqual(superficie.x)
    const c = await centro(page.locator(`${SEC} .flow-surface`))
    const rolagem = () => page.evaluate(() => document.querySelector('main')!.scrollTop)
    const y0 = await rolagem()
    const antes = await page
      .locator(`${SEC} .react-flow__viewport`)
      .evaluate((el) => (el as HTMLElement).style.transform)
    await toque(page, reta({ x: c.x, y: c.y + 40 }, { x: c.x - 60, y: c.y - 40 }))
    await expect
      .poll(() =>
        page
          .locator(`${SEC} .react-flow__viewport`)
          .evaluate((el) => (el as HTMLElement).style.transform),
      )
      .not.toBe(antes)
    expect(await rolagem()).toBe(y0)
    await page.locator(SEC).getByRole('button', { name: 'Blocos' }).tap()
    const gaveta = page.getByRole('dialog')
    await expect(gaveta.getByRole('button', { name: 'Enviar e-mail' })).toBeVisible()
    await gaveta.getByRole('button', { name: 'Enviar e-mail' }).tap()
    await expect(nodes(page)).toHaveCount(6)
    await expect(gaveta.getByRole('textbox', { name: 'Assunto' })).toBeVisible()
  })

  test('editar pelo toque: "Próximo bloco" liga e excluir abre o modal', async ({ page }) => {
    await abrir(page)
    await node(page, 'webhook-entrada-1')
      .getByRole('button', { name: /Editar bloco/ })
      .tap()
    const gaveta = page.getByRole('dialog')
    await gaveta.getByRole('combobox', { name: 'Próximo bloco' }).tap()
    await page.getByRole('option', { name: /Criar tarefa/ }).tap()
    expect((await json(page)).edges.map((e) => e.id)).toContain('webhook-entrada-1->tarefa-1')
    await expect(page.locator(`${SEC} [data-flow-notice]`)).toContainText('foi trocada')
  })
})

/* Layout e acessibilidade com a barra em cada modo. */
type Estado = 'base' | 'configuracao' | 'validacao' | 'teste' | 'exclusao' | 'erro'

async function levarAoEstado(page: Page, estado: Estado) {
  const mobile = (page.viewportSize()?.width ?? 1280) < MOBILE
  const tocar = (l: Locator) => (mobile ? l.tap() : l.click())
  if (estado === 'configuracao') {
    await tocar(node(page, 'webhook-entrada-1').getByRole('button', { name: /Editar bloco/ }))
    await expect(mobile ? page.getByRole('dialog') : painel(page)).toContainText('Mapeamento')
  } else if (estado === 'validacao') {
    await tocar(page.locator(SEC).getByRole('button', { name: 'Validar' }))
    await expect(page.getByText('Fluxo válido')).toBeVisible()
  } else if (estado === 'exclusao') {
    await tocar(node(page, 'webhook-entrada-1').getByRole('button', { name: /Excluir bloco/ }))
    await expect(page.getByRole('dialog')).toContainText('Excluir este bloco?')
  } else if (estado === 'erro') {
    // um bloco novo, sem configuração, deixa o fluxo com problemas
    await tocar(painel(page).getByRole('button', { name: 'Enviar e-mail' }))
    await tocar(page.locator(SEC).getByRole('button', { name: 'Validar' }))
    await expect(page.getByText(/problemas? encontrados?/)).toBeVisible()
  } else if (estado === 'teste') {
    await tocar(page.locator(SEC).getByRole('button', { name: 'Testar fluxo' }))
    const regiao = page.getByRole('region', { name: 'Teste do fluxo' })
    await tocar(regiao.getByRole('button', { name: 'Avançar' }))
    await tocar(regiao.getByRole('button', { name: 'Avançar' }))
    await expect(regiao).toContainText('Passo 2')
  }
  await page.waitForTimeout(300)
}

const estados: Estado[] = ['base', 'configuracao', 'validacao', 'teste', 'exclusao']
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

/* O estado de erro (bloco novo sem configuração) só nas larguras de montar e em um modelo. */
test.describe('estado de erro', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('um bloco novo, sem configuração, deixa a validação acusar o problema', async ({ page }) => {
    await abrir(page)
    await levarAoEstado(page, 'erro')
    const res = await auditLayout(page, false)
    expect(res.scroll).toBeLessThanOrEqual(0)
    expect(res.wide).toEqual([])
  })
})

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
  ]
  for (const t of combos) {
    for (const estado of estadosDeCaptura) {
      if (estado === 'erro' && t.width < MOBILE) continue
      test(`${t.brand} ${t.mode} ${t.width} ${estado}`, async ({ page }) => {
        await page.setViewportSize({ width: t.width, height: t.width < MOBILE ? 900 : 1100 })
        await abrir(page, t)
        await levarAoEstado(page, estado)
        const dir = process.env.FLOW_SHOTS_DIR ?? 'screenshots/flow'
        mkdirSync(dir, { recursive: true })
        await page.screenshot({ path: `${dir}/${t.brand}-${t.mode}-${t.width}-${estado}.png` })
      })
    }
  }
})
