import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * Linguagem única de movimento: nenhuma duração nem curva fora dos tokens, nos 32 componentes da
 * lista (mais o painel interno do select e do date-picker) e nos keyframes do globals.css, e o
 * contrato do `off` corrigido (tabela do parecer, B4). Estes são testes estruturais: leem o
 * código-fonte, porque o que importa aqui é a ausência de literal; o efeito (duração e origem
 * computados) é provado no navegador em tests/motion.spec.ts.
 */

const COMPONENTES = [
  'modal',
  'drawer',
  'popover',
  'dropdown-menu',
  'tooltip',
  'toast',
  'select',
  'date-picker',
  'tabs',
  'accordion',
  'wizard',
  'kanban',
  'widget-grid',
  'flow-editor',
  'flow-viewer',
  'flow-sidebar',
  'flow-config-panels',
  'flow-simulation-panel',
  'list',
  'table',
  'timeline',
  'pagination',
  'button',
  'switch',
  'checkbox',
  'radio-group',
  'slider',
  'input',
  'otp-input',
  'upload',
  'stat-card',
  'chart',
  'progress',
  'skeleton',
  'empty-state',
  'picker-panel',
] as const
const fonte = (nome: string) => readFileSync(`src/components/ui/${nome}.tsx`, 'utf8')
const css = readFileSync('src/styles/globals.css', 'utf8')

describe('nenhum literal de duração ou de curva nos componentes', () => {
  it.each(COMPONENTES)(
    '%s não tem duração, atraso nem curva literais, nem transition-all',
    (nome) => {
      const src = fonte(nome)
      expect(src).not.toMatch(/(?<![\w-])duration-\d/)
      expect(src).not.toMatch(new RegExp(`(?<![\\w-])duration-${'\\['}`))
      expect(src).not.toMatch(/(?<![\w-])delay-\d/)
      expect(src).not.toMatch(new RegExp(`(?<![\\w-])ease-${'\\['}`))
      expect(src).not.toMatch(/(?<![\w-])transition-all(?![\w-])/)
      expect(src).not.toMatch(/cubic-bezier\(/)
    },
  )

  it.each(COMPONENTES)(
    '%s não escreve duração em milissegundos nem em segundos no código',
    (nome) => {
      const src = fonte(nome)
      // `duration: 0.4` / `transition={{ duration: 1 }}` literal: tem de vir dos presets e dos tokens
      expect(src).not.toMatch(/(?<![\w-])duration:\s*(?!0\b)[0-9]/)
      expect(src).not.toMatch(/(?<![\w-])delay:\s*(?!0\b)[0-9]/)
    },
  )

  it('o mapa de nomes está completo: os 35 componentes da lista existem (mais o painel interno)', () => {
    expect(COMPONENTES).toHaveLength(36)
    for (const nome of COMPONENTES) expect(() => fonte(nome)).not.toThrow()
  })

  it('os keyframes de ícone do globals.css (--animate-*) leem os tokens, sem milissegundos soltos', () => {
    const linhas = css.split('\n').filter((l) => /--animate-(draw|pop|shake|encaixe):/.test(l))
    expect(linhas).toHaveLength(4)
    const bloco = css.slice(css.indexOf('--animate-draw:'), css.indexOf('@keyframes rd-draw'))
    expect(bloco).not.toMatch(/\d+ms/)
    expect(bloco).toContain('var(--rendra-duration-draw)')
    expect(bloco).toContain('var(--rendra-duration-fast)')
  })

  it('o progress indeterminado e o skeleton leem o tempo do token pulse (sem literal) e a curva certa', () => {
    const slide = /@utility progress-slide \{([\s\S]*?)\n\}/.exec(css)![1]!
    expect(slide).toContain('var(--rendra-duration-pulse)')
    expect(slide).toContain('linear')
    expect(slide).not.toMatch(/\d+(\.\d+)?m?s\b/)
    const shimmer = /@utility skeleton-shimmer \{([\s\S]*?)\n\}/.exec(css)![1]!
    expect(shimmer).toContain('var(--rendra-duration-pulse)')
    expect(shimmer).toContain('var(--rendra-ease-move)')
    expect(shimmer).toContain('prefers-reduced-motion')
  })

  it('rd-pop não parte de 0,4: o ícone de feedback da marca nasce de 0,8', () => {
    const pop = /@keyframes rd-pop \{([\s\S]*?)\n {2}\}/.exec(css)![1]!
    expect(pop).toContain('scale(0.8)')
    expect(pop).not.toContain('scale(0.4)')
  })
})

describe('o `off` corrigido: a tabela fechada do parecer (B4)', () => {
  const origem = (v: string) => `origin-(--radix-${v}-content-transform-origin)`
  const fast = 'data-[state=closed]:duration-(--rendra-duration-fast)'

  it('W5: toda saída do off dura o token fast (overlay, popover, menu, tooltip, painel do select)', () => {
    for (const nome of ['modal', 'drawer', 'popover', 'dropdown-menu', 'tooltip', 'picker-panel']) {
      const src = fonte(nome)
      const saidas = src.match(/data-\[state=closed\]:animate-out/g) ?? []
      const fasts = src.match(/data-\[state=closed\]:duration-\(--rendra-duration-fast\)/g) ?? []
      expect(saidas.length, nome).toBeGreaterThan(0)
      expect(fasts.length, nome).toBeGreaterThanOrEqual(saidas.length)
    }
    expect(fonte('modal')).toContain(fast)
  })

  it('W6: popover, menu (e submenu), tooltip e painel do select nascem do gatilho', () => {
    expect(fonte('popover')).toContain(origem('popover'))
    expect(fonte('dropdown-menu')).toContain(origem('dropdown-menu'))
    expect(fonte('tooltip')).toContain(origem('tooltip'))
    expect(fonte('picker-panel')).toContain(origem('popover'))
  })

  it('W6: o modal fica no centro (isento): nenhuma origem do gatilho nele', () => {
    expect(fonte('modal')).not.toMatch(/origin-/)
  })

  it('W7: o tooltip aberto em instant-open não anima no off', () => {
    expect(fonte('tooltip')).toContain('data-[state=instant-open]:animate-none')
  })

  it('W8: o check do checkbox entra de 90%, não de 50%', () => {
    expect(fonte('checkbox')).toContain('zoom-in-90')
    expect(fonte('checkbox')).not.toContain('zoom-in-50')
  })

  it('W1/W13: o botão e o switch leem press e base dos tokens; o botão comprime a 0,97', () => {
    expect(fonte('button')).toContain('duration-(--rendra-duration-press)')
    expect(fonte('button')).toContain('active:scale-97')
    expect(fonte('switch')).toContain('duration-(--rendra-duration-base)')
  })

  it('W14: o progress lê o token e as chevrons (accordion, select, table) também', () => {
    expect(fonte('progress')).toContain('duration-(--rendra-duration-base)')
    for (const nome of ['accordion', 'select', 'table'])
      expect(fonte(nome), nome).toContain(
        'transition-transform duration-(--rendra-duration-base) ease-move',
      )
  })

  it('o que está fora do escopo segue intocado (pendência registrada): app-shell, image-viewer, rich-text-editor', () => {
    for (const f of [
      'src/components/app-shell/sidebar.tsx',
      'src/components/app-shell/mega-menu.tsx',
      'src/components/app-shell/command-search.tsx',
    ])
      expect(readFileSync(f, 'utf8')).not.toContain('--rendra-duration-')
  })
})

describe('reduzido: o bloco global do off (B5)', () => {
  const bloco = /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}\n/g

  it('os overlays do off só esmaecem: as variáveis de deslocamento, escala e desfoque do tw-animate são neutralizadas', () => {
    const reduzido = css.match(bloco)?.join('\n') ?? ''
    for (const v of ['scale', 'translate-x', 'translate-y', 'rotate', 'blur'])
      for (const lado of ['enter', 'exit'])
        expect(reduzido, `${lado}-${v}`).toContain(`--tw-${lado}-${v}`)
  })

  it('os overlays (data-state) ganham a duração base e o resto do documento segue cortado', () => {
    const reduzido = css.match(bloco)?.join('\n') ?? ''
    expect(reduzido).toContain('animation-duration: var(--rendra-duration-base) !important')
    expect(reduzido).toContain('transition-duration: 0.01ms !important')
  })
})
