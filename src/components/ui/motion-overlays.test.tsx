// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { MotionProvider } from '@/lib/motion'
import { realAnimations } from '@/test/motion'
import { renderApp } from '@/test/render'
import { Drawer } from './drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Modal } from './modal'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Select } from './select'
import { Tooltip } from './tooltip'

/*
 * Bloco C da linguagem única (W5, W6, W7, W15): overlays. A duração real de entrada e de saída
 * e o transform-origin computado são provados no navegador (tests/motion.spec.ts, com relógio
 * falso). Aqui ficam os efeitos que o jsdom enxerga: a classe que fixa a origem em cada
 * overlay, o estado de partida de cada entrada e o tooltip que abre sem animar.
 */

const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)
let stop: (() => void) | undefined
afterEach(() => {
  stop?.()
  stop = undefined
  setViewportWidth(1280)
})

const origem = (v: string) => `origin-(--radix-${v}-content-transform-origin)`

describe.each(['on', 'off'] as const)('transform-origin do gatilho (W6), motion %s', (modo) => {
  const render = (ui: ReactNode) =>
    modo === 'on' ? emOn(ui) : renderApp(<MotionProvider mode="off">{ui}</MotionProvider>)

  it('o popover nasce do gatilho, não do centro', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PopoverContent>Conteúdo</PopoverContent>
      </Popover>,
    )
    expect(document.querySelector('[data-rendra="POP-001"]')!.className).toContain(
      origem('popover'),
    )
  })

  it('o menu e o submenu nascem do gatilho', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Editar</DropdownMenuItem>
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>Mais</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Exportar</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ações' }))
    const menus = await screen.findAllByRole('menu')
    expect(menus.length).toBeGreaterThanOrEqual(1)
    for (const m of menus) expect(m.className).toContain(origem('dropdown-menu'))
  })

  it('o tooltip nasce do gatilho', async () => {
    render(
      <Tooltip content="Dica">
        <button type="button">Alvo</button>
      </Tooltip>,
    )
    await userEvent.tab()
    const tip = await screen.findByRole('tooltip')
    expect(tip.closest('[data-rendra="TIP-001"]')!.className).toContain(origem('tooltip'))
  })

  it('o painel do select (desktop) nasce do campo', async () => {
    render(<Select label="Estado" options={[{ value: 'sp', label: 'São Paulo' }]} />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Estado' }))
    const opcao = await screen.findByRole('option', { name: /São Paulo/ })
    expect(opcao.closest('[data-radix-popper-content-wrapper] > *')!.className).toContain(
      origem('popover'),
    )
  })
})

describe('o modal em tela cheia não escala do centro (W15) e o drawer não esmaece à toa', () => {
  it('em on no celular, o modal parte de baixo (translateY de 8px), sem escala', () => {
    stop = realAnimations()
    setViewportWidth(360)
    emOn(<Modal open onOpenChange={() => {}} title="Excluir" description="Sem volta." />)
    const dialogo = screen.getByRole('dialog')
    expect(dialogo.style.transform).toContain('translateY(8px)')
    expect(dialogo.style.transform).not.toContain('scale')
  })

  it('em on no desktop, o modal segue centralizado e parte de 0,95', () => {
    stop = realAnimations()
    emOn(<Modal open onOpenChange={() => {}} title="Excluir" description="Sem volta." />)
    expect(screen.getByRole('dialog').style.transform).toContain('scale(0.95)')
  })

  it('em on, o painel do drawer entra só deslizando pela borda (translateX 100%), sem opacidade', () => {
    stop = realAnimations()
    emOn(
      <Drawer open onOpenChange={() => {}} title="Cliente">
        <p>Corpo</p>
      </Drawer>,
    )
    const painel = screen.getByRole('dialog')
    expect(painel.style.transform).toContain('translateX(100%)')
    expect(painel.style.opacity).toBe('')
  })
})

describe('Tooltip: aberto em instant-open não anima (W7)', () => {
  const alvo = (
    <Tooltip content="Dica">
      <button type="button">Alvo</button>
    </Tooltip>
  )

  it('aberto pelo foco do teclado (instant-open), a dica já está inteira 40 ms depois', async () => {
    stop = realAnimations()
    emOn(alvo)
    await userEvent.tab()
    const tip = await screen.findByRole('tooltip')
    const conteudo = tip.closest<HTMLElement>('[data-state]')!
    expect(conteudo).toHaveAttribute('data-state', 'instant-open')
    await act(() => new Promise((r) => setTimeout(r, 40)))
    expect(conteudo.style.opacity).toBe('1')
  })

  it('aberto pelo mouse depois do atraso (delayed-open), a dica ainda está entrando no começo', async () => {
    stop = realAnimations()
    emOn(alvo)
    await userEvent.hover(screen.getByRole('button', { name: 'Alvo' }))
    const tip = await screen.findByRole('tooltip', undefined, { timeout: 2000 })
    const conteudo = tip.closest<HTMLElement>('[data-state]')!
    expect(conteudo).toHaveAttribute('data-state', 'delayed-open')
    expect(Number(conteudo.style.opacity)).toBeLessThan(1)
    await waitFor(() => expect(conteudo.style.opacity).toBe('1'), { timeout: 1500 })
  })
})
