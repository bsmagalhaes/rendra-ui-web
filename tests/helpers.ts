import type { Page } from '@playwright/test'

/* Funções comuns aos testes de layout, temas, acessibilidade e regressão visual. */

export const MOBILE = 768
export const templates = (process.env.TEMPLATES ?? 'safira,equilibrio,aurora').split(',')

export interface Theme {
  /** Modelo: safira, equilibrio ou aurora. */
  brand: string
  /** Paleta de cores; sem valor, usa a do próprio modelo. */
  palette?: string
  mode: 'light' | 'dark'
}

/** Nome de arquivo para a rota: "/" vira "painel", "/clientes/novo" vira "clientes_novo". */
export const routeName = (route: string) =>
  route === '/' ? 'painel' : route.slice(1).replace(/\//g, '_')

/** Define modelo, paleta e modo antes de a página carregar (o mesmo que o usuário escolhe). */
export async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    localStorage.setItem('ui-brand', t.brand)
    localStorage.setItem('ui-mode', t.mode)
    if (t.palette) localStorage.setItem('ui-palette', t.palette)
    else localStorage.removeItem('ui-palette')
    localStorage.removeItem('ui-shell-layout')
    localStorage.removeItem('ui-sidebar-collapsed')
  }, theme)
}

/** Abre a rota, espera fontes e animações de entrada e devolve os erros de JavaScript. */
export async function openRoute(page: Page, route: string) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(route, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // Tabelas remotas: espera a primeira página chegar.
  await page.waitForFunction(() => !document.querySelector('[data-remote-loading]'), undefined, {
    timeout: 10_000,
  })
  await page.waitForTimeout(300)
  return errors
}

/**
 * Auditoria de layout. Aponta:
 *   1. rolagem horizontal na página (scrollWidth > clientWidth);
 *   2. elemento que ultrapassa a largura da tela (exceto o que rola no próprio contêiner,
 *      marcado com data-allow-overflow);
 *   3. no mobile, elemento clicável com área de toque menor que 44x44px.
 *   4. no AppShell, a página mais alta que a tela (algo escapou da rolagem do <main>).
 */
export async function auditLayout(page: Page, mobile: boolean) {
  return page.evaluate((mobile) => {
    const vw = document.documentElement.clientWidth
    const wide: string[] = []
    const small: string[] = []
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}"`
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.right > vw + 1 && !el.closest('[data-allow-overflow]')) wide.push(describe(el))
      const clickable = el.matches(
        'a[href], button, [role="button"], input, select, textarea, [role="radio"], [role="tab"], [role="combobox"]',
      )
      if (
        mobile &&
        clickable &&
        !el.closest('.sr-only') &&
        // o canvas do fluxo escala os blocos pelo zoom: o alvo dos botões do card é de 44 px em zoom 1
        !el.closest('.react-flow__viewport') &&
        el.getAttribute('aria-hidden') !== 'true' &&
        cs.pointerEvents !== 'none'
      ) {
        // Área de toque real: rótulo que envolve, moldura do campo ou área ampliada.
        const target = el.closest('label') ?? el.closest('[data-slot="control"]') ?? el
        let t: { width: number; height: number } = target.getBoundingClientRect()
        if (el.getAttribute('data-touch') === 'expanded')
          t = { width: t.width + 24, height: t.height + 24 }
        if (t.width < 43.5 || t.height < 43.5)
          small.push(`${describe(el)} ${Math.round(t.width)}x${Math.round(t.height)}`)
      }
    }
    // No AppShell só o <main> rola: a página em si nunca pode ficar mais alta que a tela.
    const inShell = Boolean(document.querySelector('main#conteudo'))
    return {
      pageOverflowY: inShell
        ? document.documentElement.scrollHeight - document.documentElement.clientHeight
        : 0,
      scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      wide: [...new Set(wide)].slice(0, 10),
      small: [...new Set(small)].slice(0, 10),
    }
  }, mobile)
}

/** O AppShell rola só no <main>: cresce a janela até caber a página inteira na captura. */
export async function fitViewportToContent(page: Page, width: number, height = 800) {
  const extra = await page.evaluate(() => {
    const m = document.querySelector('main#conteudo')
    return m ? m.scrollHeight - m.clientHeight : 0
  })
  if (extra > 0) await page.setViewportSize({ width, height: Math.min(height + extra, 16000) })
}
