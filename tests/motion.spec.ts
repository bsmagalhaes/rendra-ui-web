import { expect, test, type Page } from '@playwright/test'

/*
 * MOTION NO NAVEGADOR (linguagem única): mede o que o jsdom não vê, em /componentes-motion, que
 * monta os componentes em `on` e deixa trocar para `off`. Cada teste afirma um efeito que o
 * usuário vê (escala, opacidade, origem, tempo até assentar, tempo até sair, recorte da aba),
 * lido quadro a quadro com `requestAnimationFrame`.
 *
 *   BASE_URL=http://localhost:5211 npx playwright test --project=motion
 *
 * O tempo é real (as animações do Motion e as de CSS correm no relógio do navegador), então os
 * limites têm folga e comparam entrada com saída na mesma execução; o que é de fato fixo (curva,
 * escala de partida, propriedade transicionada) é afirmado exato.
 */

test.use({ viewport: { width: 1280, height: 900 } })

interface Frame {
  t: number
  gone?: boolean
  opacity?: number
  transform?: string
  origin?: string
  clip?: string
  x?: number
  y?: number
}

/** Instala o amostrador: lê estilo computado de `selector` a cada quadro durante `ms`. */
async function installSampler(page: Page) {
  await page.addInitScript(() => {
    ;(window as unknown as Record<string, unknown>).__frames = (selector: string, ms: number) =>
      new Promise<Frame[]>((resolve) => {
        const out: Frame[] = []
        const t0 = performance.now()
        const tick = () => {
          const t = performance.now()
          const el = document.querySelector(selector)
          if (!el) out.push({ t, gone: true })
          else {
            const cs = getComputedStyle(el)
            const r = el.getBoundingClientRect()
            out.push({
              t,
              opacity: Number(cs.opacity),
              transform: cs.transform,
              origin: cs.transformOrigin,
              clip: cs.clipPath,
              x: r.x,
              y: r.y,
            })
          }
          if (t - t0 < ms) requestAnimationFrame(tick)
          else resolve(out)
        }
        requestAnimationFrame(tick)
      })
  })
}

/** Instante (relógio da página) agora: o que marca o começo de uma saída. */
const agora = (page: Page) => page.evaluate(() => performance.now())

/**
 * Instala um observador que grava o atributo `style` de um elemento no instante em que ele entra
 * no DOM: o estado de partida de uma entrada, que o amostrador de quadros pode perder quando a
 * página trava ao montar.
 */
async function observarPrimeiroEstilo(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const w = window as unknown as { __primeiro?: Record<string, string> }
    w.__primeiro = w.__primeiro ?? {}
    delete w.__primeiro[sel]
    const obs = new MutationObserver((muts) => {
      for (const m of muts)
        for (const n of m.addedNodes) {
          if (!(n instanceof Element)) continue
          const el = n.matches(sel) ? n : n.querySelector(sel)
          if (el && !(sel in w.__primeiro!)) {
            w.__primeiro![sel] = el.getAttribute('style') ?? ''
            obs.disconnect()
          }
        }
    })
    obs.observe(document.body, { childList: true, subtree: true })
  }, selector)
}
const primeiroEstilo = (page: Page, selector: string) =>
  page.evaluate(
    (sel) =>
      (window as unknown as { __primeiro?: Record<string, string> }).__primeiro?.[sel] ?? null,
    selector,
  )

const frames = (page: Page, selector: string, ms: number) =>
  page.evaluate(
    ([s, d]) =>
      (window as unknown as { __frames: (s: string, d: number) => Promise<Frame[]> }).__frames(
        s as string,
        d as number,
      ),
    [selector, ms] as const,
  )

/** Escala X e Y de uma matriz CSS (`none` é 1) e o deslocamento. */
function parse(transform: string | undefined) {
  if (!transform || transform === 'none') return { sx: 1, sy: 1, tx: 0, ty: 0 }
  const m = /matrix\(([^)]+)\)/.exec(transform)
  if (!m) return { sx: 1, sy: 1, tx: 0, ty: 0 }
  const [a, , , d, e, f] = m[1]!.split(',').map(Number)
  return { sx: a!, sy: d!, tx: e!, ty: f! }
}

/**
 * Tempo, em ms, entre o primeiro quadro em que o elemento existe e o primeiro em que está inteiro
 * (opacidade 1, escala 1, sem deslocamento). `Infinity` se nunca assenta.
 */
function settledAt(fs: Frame[]) {
  const first = fs.find((x) => !x.gone)
  if (!first) return Infinity
  const f = fs.find((x) => {
    if (x.gone) return false
    const p = parse(x.transform)
    return (x.opacity ?? 0) >= 0.99 && Math.abs(p.sx - 1) < 0.005 && Math.abs(p.ty) < 0.5
  })
  return f ? f.t - first.t : Infinity
}

/** Tempo, em ms, entre `marca` (o instante do pedido de saída) e o elemento sumir ou ficar transparente. */
function goneAt(fs: Frame[], marca: number) {
  const f = fs.find((x) => x.t >= marca && (x.gone || (x.opacity ?? 1) <= 0.01))
  return f ? f.t - marca : Infinity
}

const section = (page: Page, id: string) => page.locator(`#${id}`)

test.beforeEach(async ({ page }) => {
  await installSampler(page)
})

async function abrir(page: Page, mode: 'on' | 'off' = 'on') {
  await page.goto('/componentes-motion', { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('heading', { name: 'Componentes com motion' }).waitFor()
  if (mode === 'off') await page.getByRole('radio', { name: 'Desligado' }).first().click()
  // espera o chunk do domMax (layout e arraste) e a primeira pintura da vitrine
  await page.waitForTimeout(1500)
}

test.describe('overlays em on: mola na entrada, saída curta, origem no gatilho', () => {
  /** Abre e fecha um overlay medindo entrada, saída e origem. `abrir` clica; Escape fecha. */
  async function medir(page: Page, selector: string, abrirOverlay: () => Promise<void>) {
    const entrada = frames(page, selector, 2500)
    await abrirOverlay()
    await page.waitForTimeout(900)
    const marca = await agora(page)
    await page.keyboard.press('Escape')
    const fs = await entrada
    return { fs, marca }
  }

  test('popover: parte de 0,95 sem quique, assenta cedo, sai mais rápido e nasce do gatilho', async ({
    page,
  }) => {
    await abrir(page)
    const gatilho = section(page, 'popover-tooltip').getByRole('button', { name: 'Filtros' })
    await gatilho.scrollIntoViewIfNeeded()
    const { fs, marca } = await medir(page, '[data-rendra="POP-001"]', () => gatilho.click())
    const visivel = fs.filter((f) => !f.gone)
    const escalas = visivel.map((f) => parse(f.transform).sx)
    expect(Math.min(...escalas)).toBeGreaterThanOrEqual(0.9)
    // sem quique: nunca passa de 1
    expect(Math.max(...escalas)).toBeLessThanOrEqual(1.003)
    const entrou = settledAt(fs)
    expect(entrou).toBeLessThan(450)
    // origem no gatilho: o ponto vertical da escala é a borda do gatilho, não o meio do painel
    const meio = visivel.find((f) => (f.opacity ?? 0) > 0.5 && f.t < visivel[0]!.t + 300)!
    const oy = parseFloat(meio.origin!.split(' ')[1]!)
    expect(oy, `origem ${meio.origin}`).toBeLessThan(2)
    const saiu = goneAt(fs, marca)
    expect(saiu).toBeLessThan(300)
    // a saída é mais curta que a entrada (com folga de medição)
    expect(saiu).toBeLessThanOrEqual(entrou + 80)
  })

  test('menu: nasce do gatilho e sai em tempo curto', async ({ page }) => {
    await abrir(page)
    const gatilho = section(page, 'menu-suspenso')
      .getByRole('button', { name: 'Ações', exact: true })
      .first()
    await gatilho.scrollIntoViewIfNeeded()
    const { fs, marca } = await medir(page, '[data-rendra="DDM-001"]', () => gatilho.click())
    const ok = fs.find((f) => !f.gone && (f.opacity ?? 0) > 0.5)!
    expect(parseFloat(ok.origin!.split(' ')[1]!), `origem ${ok.origin}`).toBeLessThan(2)
    expect(goneAt(fs, marca)).toBeLessThan(300)
  })

  test('tooltip: aberto pelo foco do teclado não anima; aberto pelo mouse anima em ~120 ms', async ({
    page,
  }) => {
    await abrir(page)
    const alvo = section(page, 'popover-tooltip').getByRole('button', { name: 'Passe o mouse' })
    await alvo.scrollIntoViewIfNeeded()
    const instantaneo = frames(page, '[data-rendra="TIP-001"]', 1500)
    await alvo.focus()
    const fs = await instantaneo
    const primeiro = fs.find((f) => !f.gone)!
    expect(primeiro, 'o tooltip abre pelo foco').toBeTruthy()
    // sem animação: inteiro no primeiro ou no segundo quadro em que existe (o primeiro pode
    // mostrar a partida de uma duração zero)
    const idx = fs.indexOf(primeiro)
    const inteiro = fs.findIndex(
      (f) => !f.gone && (f.opacity ?? 0) >= 0.99 && Math.abs(parse(f.transform).sx - 1) < 0.003,
    )
    expect(inteiro, 'quadros até assentar').toBeGreaterThanOrEqual(0)
    expect(inteiro - idx).toBeLessThanOrEqual(2)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.mouse.move(2, 2)
    await page.waitForTimeout(300)
    const atrasado = frames(page, '[data-rendra="TIP-001"]', 2500)
    await alvo.hover()
    const gs = await atrasado
    const aparece = gs.find((f) => !f.gone)!
    expect(aparece, 'o tooltip abre pelo mouse').toBeTruthy()
    expect(aparece.opacity).toBeLessThan(0.99)
    expect(parse(aparece.transform).sx).toBeGreaterThanOrEqual(0.96)
    expect(settledAt(gs)).toBeLessThan(300)
  })

  test('modal no desktop parte de 0,95 no centro; no celular parte de baixo, sem escala', async ({
    page,
  }) => {
    await abrir(page)
    const botao = section(page, 'modal').getByRole('button', { name: 'Confirmação' })
    await botao.scrollIntoViewIfNeeded()
    await observarPrimeiroEstilo(page, '[role="dialog"]')
    const { fs, marca } = await medir(page, '[role="dialog"]', () => botao.click())
    // a partida da entrada: opacidade 0 e escala 0,95 (o modal fica no centro: sem deslocamento)
    const partida = (await primeiroEstilo(page, '[role="dialog"]'))!
    expect(partida).toContain('opacity: 0')
    expect(partida).toContain('scale(0.95)')
    expect(settledAt(fs)).toBeLessThan(450)
    expect(goneAt(fs, marca)).toBeLessThan(350)

    await page.setViewportSize({ width: 360, height: 800 })
    await page.waitForTimeout(600)
    await observarPrimeiroEstilo(page, '[role="dialog"]')
    await medir(page, '[role="dialog"]', () =>
      section(page, 'modal').getByRole('button', { name: 'Confirmação' }).click(),
    )
    // no celular a partida é um deslocamento de 8 px, sem escala
    const celular = (await primeiroEstilo(page, '[role="dialog"]'))!
    expect(celular).toContain('translateY(8px)')
    expect(celular).not.toContain('scale')
  })
})

test.describe('drawer: a vitrine tem a demo e a saída é mais rápida que a entrada nos dois ramos', () => {
  for (const modo of ['on', 'off'] as const) {
    test(`gaveta em ${modo}: entra deslizando e sai em fast`, async ({ page }) => {
      await abrir(page, modo)
      const botao = section(page, 'drawer').getByRole('button').first()
      await botao.scrollIntoViewIfNeeded()
      const entrada = frames(page, '[data-rendra="GAV-001"]', 2500)
      await botao.click()
      await page.waitForTimeout(1200)
      const marca = await agora(page)
      await page.keyboard.press('Escape')
      const fs = await entrada
      expect(
        fs.some((f) => !f.gone),
        'a gaveta abre',
      ).toBe(true)
      const saiu = goneAt(fs, marca)
      // 120 ms de animação mais a latência de quadro; com a máquina em load 20 a medição passa de 280
      expect(saiu, 'saída em fast (120 ms, com folga de medição)').toBeLessThan(400)
      // a entrada (slow, 320 ms) é mais longa que a saída (fast, 120 ms): provado nos presets
      // (`presets.test.ts`); aqui só o tempo real de saída, porque a gaveta não muda opacidade.
    })
  }
})

test.describe('toque: o CSS não disputa o transform e o toque é de 120 ms sem quique', () => {
  test('botão em on: transition sem transform e escala até 0,97 sem passar', async ({ page }) => {
    await abrir(page)
    const botao = page.getByRole('button', { name: 'Primário', exact: true }).first()
    await botao.scrollIntoViewIfNeeded()
    await botao.evaluate((el) => el.setAttribute('data-probe', 'botao'))
    const prop = await botao.evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(prop).not.toContain('transform')
    expect(prop).toContain('box-shadow')
    await botao.hover()
    const amostra = frames(page, '[data-probe="botao"]', 400)
    await page.mouse.down()
    await page.waitForTimeout(250)
    await page.mouse.up()
    const fs = await amostra
    const escalas = fs.map((f) => parse(f.transform).sx)
    expect(Math.min(...escalas)).toBeCloseTo(0.97, 2)
    // não afunda mais que o alvo (sem mola com quique)
    expect(Math.min(...escalas)).toBeGreaterThanOrEqual(0.965)
    // e volta sem passar de 1
    expect(Math.max(...escalas)).toBeLessThanOrEqual(1.003)
  })

  test('botão em off: o CSS escala (active:scale-97) com a duração do token press', async ({
    page,
  }) => {
    await abrir(page, 'off')
    const botao = page.getByRole('button', { name: 'Primário', exact: true }).first()
    await botao.scrollIntoViewIfNeeded()
    const css = await botao.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { prop: cs.transitionProperty, dur: cs.transitionDuration }
    })
    expect(css.prop).toContain('transform')
    expect(css.dur.split(',')[0]!.trim()).toBe('0.12s')
  })

  test('switch em on: o polegar só transiciona translate, em 200 ms', async ({ page }) => {
    await abrir(page)
    const chave = section(page, 'checkbox-radio').getByRole('switch').first()
    await chave.scrollIntoViewIfNeeded()
    const css = await chave
      .locator('span')
      .first()
      .evaluate((el) => {
        const cs = getComputedStyle(el)
        return {
          prop: cs.transitionProperty,
          dur: cs.transitionDuration,
          ease: cs.transitionTimingFunction,
        }
      })
    expect(css.prop).toBe('translate')
    expect(css.dur).toBe('0.2s')
    expect(css.ease).toContain('0.77')
  })

  test('radio em on: a bolinha nunca chega a scale(0) na troca de opção', async ({ page }) => {
    await abrir(page)
    const grupo = section(page, 'checkbox-radio').getByRole('radiogroup').first()
    await grupo.scrollIntoViewIfNeeded()
    const radios = grupo.getByRole('radio')
    const a = radios.nth(0)
    const b = radios.nth(1)
    await a.click()
    await page.waitForTimeout(400)
    await a.locator('.size-2').evaluate((el) => el.setAttribute('data-probe', 'ponto-a'))
    const amostra = frames(page, '[data-probe="ponto-a"]', 500)
    await b.click()
    const fs = await amostra
    const escalas = fs.map((f) => parse(f.transform).sx)
    expect(Math.min(...escalas)).toBeGreaterThanOrEqual(0.88)
    expect(Math.min(...escalas)).toBeLessThan(0.95)
    expect(Math.min(...fs.map((f) => f.opacity ?? 1))).toBeLessThan(0.1)
  })
})

test.describe('dados: tabela direta, aba com recorte, estado vazio em cascata', () => {
  test('tabela: ordenar não faz nenhuma linha piscar (opacidade sempre 1)', async ({ page }) => {
    await abrir(page)
    const tabela = section(page, 'table')
    await tabela.scrollIntoViewIfNeeded()
    const cab = tabela.getByRole('button', { name: /^Cliente/ }).first()
    await tabela
      .locator('tbody tr')
      .first()
      .evaluate((el) => el.setAttribute('data-probe', 'linha'))
    const amostra = frames(page, '[data-probe="linha"]', 500)
    await cab.click()
    const fs = await amostra
    for (const f of fs.filter((x) => !x.gone)) expect(f.opacity).toBe(1)
  })

  test('abas: o indicador desliza em ~250 ms com ease-move e a cor do texto troca por recorte', async ({
    page,
  }) => {
    await abrir(page)
    const abas = section(page, 'tabs')
    await abas.scrollIntoViewIfNeeded()
    const lista = abas.getByRole('tablist').first()
    await expect(lista.locator('[data-indicator="tabs"]')).toHaveCount(1)
    const copia = abas.locator('[data-tabs-copy]').first()
    const antes = await copia.evaluate((el) => getComputedStyle(el).clipPath)
    // o indicador é remontado dentro da aba nova (layoutId): amostra pelo seletor, não pelo nó
    await copia.evaluate((el) => el.setAttribute('data-probe-copia', '1'))
    const amostra = frames(page, '#tabs [data-indicator="tabs"]', 1500)
    const recorte = frames(page, '[data-probe-copia="1"]', 1500)
    await lista.getByRole('tab', { name: /^Contratos/ }).click()
    const fs = await amostra
    const cs = await recorte
    const xs = fs.filter((f) => !f.gone).map((f) => f.x!)
    const final = xs[xs.length - 1]!
    const inicio = xs[0]!
    expect(Math.abs(final - inicio)).toBeGreaterThan(20)
    // tempo entre sair do lugar e assentar (relógio da página, em ms)
    const saiu = fs.find((f) => !f.gone && Math.abs(f.x! - inicio) > 0.6)!
    const chegou = fs.find((f) => !f.gone && f.t > saiu.t && Math.abs(f.x! - final) < 0.6)!
    expect(chegou.t - saiu.t, 'tempo até o indicador assentar').toBeGreaterThan(120)
    expect(chegou.t - saiu.t).toBeLessThan(600)
    // o recorte também anda (clip-path em transição), e ao fim difere do inicial
    const clips = cs.map((f) => f.clip)
    expect(new Set(clips).size).toBeGreaterThan(2)
    expect(clips[clips.length - 1]).not.toBe(antes)
    // o painel novo aparece inteiro de imediato (sem entrada)
    await expect(abas.getByRole('tabpanel').first()).toContainText(/.+/)
  })

  test('estado vazio: ícone, título, descrição e ações entram (nascem transparentes e assentam)', async ({
    page,
  }) => {
    await abrir(page, 'off')
    const vazio = section(page, 'empty-state')
    await vazio.scrollIntoViewIfNeeded()
    await observarPrimeiroEstilo(page, '#empty-state [data-rendra="VAZ-001"] p')
    // religa o motion: o painel remonta e o estado vazio entra. O escalonamento de 60 ms é
    // conferido no Vitest (relógio real, motion-dados.test.tsx); aqui, com a página inteira
    // remontando, os quadros iniciais se perdem e o espaçamento não é medível.
    await page.getByRole('radio', { name: 'Ligado' }).first().click()
    await page.waitForTimeout(2500)
    const partida = (await primeiroEstilo(page, '#empty-state [data-rendra="VAZ-001"] p'))!
    expect(partida).toContain('opacity: 0')
    const final = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '#empty-state [data-rendra="VAZ-001"] [style*="opacity"]',
        ),
      ].map((e) => ({ o: Number(getComputedStyle(e).opacity), t: getComputedStyle(e).transform })),
    )
    expect(final.length).toBeGreaterThanOrEqual(3)
    for (const p of final) {
      expect(p.o).toBe(1)
      expect(p.t === 'none' || p.t === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
    }
  })
})

test.describe('reduzido: só opacidade, nos dois caminhos', () => {
  test.use({ reducedMotion: 'reduce' })

  test('on: o popover nunca escala nem desloca; só esmaece, e não em duração zero', async ({
    page,
  }) => {
    await abrir(page)
    const gatilho = section(page, 'popover-tooltip').getByRole('button', { name: 'Filtros' })
    await gatilho.scrollIntoViewIfNeeded()
    await observarPrimeiroEstilo(page, '[data-rendra="POP-001"]')
    const entrada = frames(page, '[data-rendra="POP-001"]', 2500)
    await gatilho.click()
    const fs = (await entrada).filter((f) => !f.gone)
    for (const f of fs) {
      const p = parse(f.transform)
      expect(Math.abs(p.sx - 1)).toBeLessThan(0.002)
    }
    // só opacidade: a partida é transparente, sem escala nem deslocamento
    const partida = (await primeiroEstilo(page, '[data-rendra="POP-001"]'))!
    expect(partida).toContain('opacity: 0')
    expect(partida).not.toMatch(/scale|translate/)
  })

  test('off: o popover só esmaece (variáveis do tw-animate neutralizadas) em 200 ms', async ({
    page,
  }) => {
    await abrir(page, 'off')
    const gatilho = section(page, 'popover-tooltip').getByRole('button', { name: 'Filtros' })
    await gatilho.scrollIntoViewIfNeeded()
    const entrada = frames(page, '[data-rendra="POP-001"]', 700)
    await gatilho.click()
    const fs = (await entrada).filter((f) => !f.gone)
    for (const f of fs) expect(Math.abs(parse(f.transform).sx - 1)).toBeLessThan(0.002)
    // a duração do esmaecimento é a do token base (200 ms), não os 150 ms do tw-animate
    const dur = await page
      .locator('[data-rendra="POP-001"]')
      .evaluate((el) => getComputedStyle(el).animationDuration)
    expect(dur).toBe('0.2s')
  })

  test('off: o acordeão não anima a altura (só opacidade)', async ({ page }) => {
    await abrir(page, 'off')
    const acordeao = section(page, 'accordion')
    await acordeao.scrollIntoViewIfNeeded()
    await acordeao.getByRole('button').first().click()
    const regiao = acordeao.locator('[data-state="open"][role="region"]').first()
    await expect(regiao).toBeVisible()
    const nome = await regiao.evaluate((el) => getComputedStyle(el).animationName)
    expect(nome).toBe('rd-reduced-in')
    const chaves = await regiao.evaluate((el) => {
      const a = el
        .getAnimations()
        .find((x) => (x as CSSAnimation).animationName === 'rd-reduced-in')
      return a ? (a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k)) : []
    })
    expect(chaves).not.toContain('height')
  })
})

test.describe('off: a saída dura o token fast e o tooltip instantâneo não anima', () => {
  test('popover em off sai em 120 ms (animate-out com duration do token fast)', async ({
    page,
  }) => {
    await abrir(page, 'off')
    const gatilho = section(page, 'popover-tooltip').getByRole('button', { name: 'Filtros' })
    await gatilho.scrollIntoViewIfNeeded()
    await gatilho.click()
    const popover = page.locator('[data-rendra="POP-001"]')
    await popover.waitFor()
    await page.waitForTimeout(400)
    const entrada = await popover.evaluate((el) => getComputedStyle(el).transformOrigin)
    expect(entrada).not.toMatch(/^50% 50%$/)
    await page.keyboard.press('Escape')
    const saida = await popover.evaluate((el) =>
      el.getAnimations().map((a) => a.effect!.getComputedTiming().duration),
    )
    expect(saida).toContain(120)
  })
})

test.describe('off: a agulha do gauge não tinha transição de verdade', () => {
  test('x2 e y2 não são propriedades de CSS: `transition-all` na agulha era letra morta', async ({
    page,
  }) => {
    await page.goto('/componentes-motion', { waitUntil: 'load' })
    const r = await page.evaluate(async () => {
      const ns = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(ns, 'svg')
      const line = document.createElementNS(ns, 'line')
      line.setAttribute('x2', '10')
      line.style.transition = 'all 700ms'
      svg.append(line)
      document.body.append(svg)
      line.setAttribute('x2', '100')
      await new Promise((resolve) => setTimeout(resolve, 100))
      const out = {
        x2: CSS.supports('x2', '5px'),
        y2: CSS.supports('y2', '5px'),
        transicoes: line.getAnimations().length,
      }
      svg.remove()
      return out
    })
    expect(r).toEqual({ x2: false, y2: false, transicoes: 0 })
  })
})

test.describe('celular: a folha do Select acompanha o dedo', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true })

  async function arrastar(
    page: Page,
    de: [number, number],
    para: [number, number],
    passos: number,
    intervalo: number,
  ) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: de[0], y: de[1] }],
    })
    for (let i = 1; i <= passos; i++) {
      const x = de[0] + ((para[0] - de[0]) * i) / passos
      const y = de[1] + ((para[1] - de[1]) * i) / passos
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
      await page.waitForTimeout(intervalo)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }

  async function abrirFolha(page: Page) {
    await abrir(page)
    const campo = section(page, 'select').getByRole('combobox').first()
    await campo.scrollIntoViewIfNeeded()
    await campo.tap()
    const alca = page.locator('[data-sheet-handle]')
    await alca.waitFor()
    await page.waitForTimeout(700)
    const caixa = (await alca.boundingBox())!
    return { alca, centro: [caixa.x + caixa.width / 2, caixa.y + 16] as [number, number] }
  }

  test('arrastar mais de 40% da altura fecha a folha', async ({ page }) => {
    const { centro } = await abrirFolha(page)
    const altura = await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.getBoundingClientRect().height)
    await arrastar(page, centro, [centro[0], centro[1] + altura * 0.6], 12, 20)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 2000 })
  })

  test('arrastar pouco e soltar devagar volta à origem e mantém a folha aberta', async ({
    page,
  }) => {
    const { centro } = await abrirFolha(page)
    const altura = await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.getBoundingClientRect().height)
    const topo = await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.getBoundingClientRect().top)
    await arrastar(page, centro, [centro[0], centro[1] + altura * 0.1], 10, 60)
    await page.waitForTimeout(900)
    await expect(page.locator('[role="dialog"]')).toHaveCount(1)
    const depois = await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.getBoundingClientRect().top)
    expect(Math.abs(depois - topo)).toBeLessThan(1.5)
  })

  test('um arremesso curto e rápido fecha, mesmo abaixo de 40%', async ({ page }) => {
    const { centro } = await abrirFolha(page)
    const altura = await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.getBoundingClientRect().height)
    await arrastar(page, centro, [centro[0], centro[1] + altura * 0.15], 4, 6)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 2000 })
  })

  test('puxar para cima da posição de repouso tem fricção, não um muro: anda menos que o dedo', async ({
    page,
  }) => {
    const { centro } = await abrirFolha(page)
    const topo = await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.getBoundingClientRect().top)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: centro[0], y: centro[1] }],
    })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: centro[0], y: centro[1] - i * 20 }],
      })
      await page.waitForTimeout(20)
    }
    const durante = await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.getBoundingClientRect().top)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const subiu = topo - durante
    expect(subiu).toBeGreaterThan(5)
    expect(subiu).toBeLessThan(160 * 0.5)
  })
})
