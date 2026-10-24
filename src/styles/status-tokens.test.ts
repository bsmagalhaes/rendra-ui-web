// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/contrast'

/**
 * Lê `theme.css` (e `palettes.css`, para os neutros escuros) como texto e confere o AA dos
 * pares de status do Kanban sem depender do CSS carregado no jsdom.
 */
const dir = join(process.cwd(), 'src/styles')
const theme = readFileSync(join(dir, 'theme.css'), 'utf8')
const palettes = readFileSync(join(dir, 'palettes.css'), 'utf8')

function block(css: string, selector: RegExp) {
  const start = css.search(selector)
  expect(start, `bloco ${selector}`).toBeGreaterThanOrEqual(0)
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) return css.slice(open, i)
  }
  throw new Error('bloco sem fim')
}

const light = block(theme, /:root\s*\{/)
const dark = block(theme, /\.dark\s*\{/)

function hex(css: string, name: string) {
  const m = css.match(new RegExp(`--rendra-${name}: *(#[0-9a-fA-F]{6})`))
  expect(m, `--rendra-${name}`).not.toBeNull()
  return m![1]!
}

/** Todos os valores de um neutro escuro que as paletas definem (o pior caso vale). */
function paletteValues(name: string) {
  return [...palettes.matchAll(new RegExp(`--rendra-${name}: *(#[0-9a-fA-F]{6})`, 'g'))].map(
    (m) => m[1]!,
  )
}

const MIN = 4.5

describe('tokens de status do Kanban', () => {
  it('par novo: texto próprio sobre o fundo, claro e escuro', () => {
    for (const [mode, css] of [
      ['claro', light],
      ['escuro', dark],
    ] as const) {
      for (const name of ['critical-soft', 'warning-mid']) {
        const ratio = contrastRatio(hex(css, `${name}-foreground`), hex(css, name))
        expect(ratio, `${name} ${mode}`).toBeGreaterThanOrEqual(MIN)
      }
    }
  })

  it('título e texto secundário do card passam AA sobre cada fundo de status (claro)', () => {
    const fg = hex(light, 'foreground')
    const muted = hex(light, 'muted-foreground')
    for (const bg of ['critical-soft', 'destructive-soft', 'warning-soft', 'card']) {
      const color = hex(light, bg)
      expect(contrastRatio(fg, color), `foreground sobre ${bg}`).toBeGreaterThanOrEqual(MIN)
      expect(contrastRatio(muted, color), `muted sobre ${bg}`).toBeGreaterThanOrEqual(MIN)
    }
  })

  it('título e texto secundário do card passam AA sobre os fundos de status (escuro, todas as paletas)', () => {
    const fgs = paletteValues('foreground')
    const muteds = paletteValues('muted-foreground')
    expect(fgs.length).toBeGreaterThan(0)
    expect(muteds.length).toBeGreaterThan(0)
    for (const bg of ['critical-soft', 'destructive-soft', 'warning-soft']) {
      const color = hex(dark, bg)
      for (const fg of fgs)
        expect(contrastRatio(fg, color), `foreground ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(MIN)
      for (const fg of muteds)
        expect(contrastRatio(fg, color), `muted ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(MIN)
    }
  })

  it('rodapé flutuante realçado: texto do -foreground sobre o fundo forte, claro e escuro', () => {
    for (const css of [light, dark]) {
      for (const name of ['info', 'destructive', 'success']) {
        expect(
          contrastRatio(hex(css, `${name}-foreground`), hex(css, name)),
          name,
        ).toBeGreaterThanOrEqual(MIN)
      }
    }
  })

  it('descrição do destino (muted-foreground) passa AA sobre o fundo claro de cada destino', () => {
    const muteds = paletteValues('muted-foreground')
    for (const bg of ['muted', 'info-soft', 'success-soft', 'destructive-soft']) {
      expect(
        contrastRatio(hex(light, 'muted-foreground'), hex(light, bg)),
        `claro ${bg}`,
      ).toBeGreaterThanOrEqual(MIN)
      if (bg === 'muted') continue // o muted escuro vem da paleta
      for (const fg of muteds) {
        expect(contrastRatio(fg, hex(dark, bg)), `escuro ${bg} ${fg}`).toBeGreaterThanOrEqual(MIN)
      }
    }
  })
})
