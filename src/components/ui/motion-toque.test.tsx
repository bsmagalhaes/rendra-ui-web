// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MotionProvider } from '@/lib/motion'
import { reduceMotion } from '@/test/motion'
import { renderApp } from '@/test/render'
import { Button, buttonVariants } from './button'
import { Checkbox } from './checkbox'
import { RadioGroup } from './radio-group'
import { Switch } from './switch'

/*
 * Bloco A da linguagem única (W1, W2, W8, W13, O5): o toque. A mudança é de tempo, curva e
 * estado intermediário; o que o teste afirma é o efeito que o usuário vê (classe que o
 * navegador aplica e o estilo que o Motion grava), nunca só a chamada.
 */

const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
const down = (el: Element) =>
  fireEvent.pointerDown(el, { pointerId: 1, button: 0, isPrimary: true })
const props = (className: string) => className.match(/(?<!\S)transition-\[[^\]]*\]/g)?.at(-1) ?? ''

describe('Button: o CSS não disputa o transform com o Motion (W1) e usa o token press (W13)', () => {
  it('em on, a lista de transition perde `transform`; as outras propriedades continuam', () => {
    emOn(<Button>Salvar</Button>)
    const lista = props(screen.getByRole('button', { name: 'Salvar' }).className)
    expect(lista).toContain('box-shadow')
    expect(lista).toContain('background-color')
    expect(lista).not.toContain('transform')
  })

  it('em off, `transform` continua na lista: é o CSS que escala, com a duração e o ativo do token press', () => {
    renderApp(<Button>Salvar</Button>)
    const cls = screen.getByRole('button', { name: 'Salvar' }).className
    expect(props(cls)).toContain('transform')
    expect(cls).toContain('duration-(--rendra-duration-press)')
    expect(cls).toContain('active:scale-97')
    expect(cls).not.toContain('active:scale-98')
    expect(cls).not.toMatch(/duration-150/)
  })

  it('o buttonVariants (usado por asChild e por quem copia) tem a mesma classe de toque do off', () => {
    const cls = buttonVariants()
    expect(cls).toContain('duration-(--rendra-duration-press)')
    expect(cls).toContain('active:scale-97')
  })

  it('em on o toque comprime a 0,97, não a 0,98', async () => {
    emOn(<Button>Salvar</Button>)
    const button = screen.getByRole('button', { name: 'Salvar' })
    down(button)
    await waitFor(() => expect(button.style.transform).toContain('scale(0.97)'))
  })
})

describe('Switch: o polegar só transiciona `translate`; o toque é do Motion sem quique (W1)', () => {
  const thumbOf = () => screen.getByRole('switch').querySelector('span')!

  it('em on, o polegar não tem transition-transform: só `translate`, com os tokens base e move', () => {
    emOn(<Switch aria-label="Ativo" />)
    const cls = thumbOf().className
    expect(cls).not.toContain('transition-transform')
    expect(cls).toContain('transition-[translate]')
    expect(cls).toContain('duration-(--rendra-duration-base)')
    expect(cls).toContain('ease-move')
  })

  it('em off, o polegar usa os mesmos tokens (a classe do CSS é quem anima, inclusive o transform)', () => {
    renderApp(<Switch aria-label="Ativo" />)
    const cls = thumbOf().className
    expect(cls).toContain('transition-transform')
    expect(cls).toContain('duration-(--rendra-duration-base)')
    expect(cls).toContain('ease-move')
    expect(cls).not.toMatch(/duration-200/)
  })

  it('em on, o toque ainda cresce o polegar (1,15) e reduzido não', async () => {
    emOn(<Switch aria-label="Ativo" />)
    down(screen.getByRole('switch'))
    await waitFor(() => expect(thumbOf().style.transform).toContain('scale(1.15)'))
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Switch aria-label="Ativo" />)
      down(screen.getByRole('switch'))
      expect(thumbOf().style.transform).not.toContain('scale(1.15)')
    } finally {
      restore()
    }
  })
})

describe('Checkbox: indicador de 0,9 a 1 sem quique (W8) e resposta ao toque (O5)', () => {
  it('em on, o indicador marcado termina em escala 1 e opacidade 1, e nunca parte de zero', async () => {
    emOn(<Checkbox aria-label="Aceito" defaultChecked />)
    const mark = screen.getByRole('checkbox').querySelector<HTMLElement>('span')!
    await waitFor(() => expect(mark.style.opacity).toBe('1'))
    expect(mark.style.transform).toBe('none')
    expect(mark.style.transform).not.toContain('scale(0)')
  })

  it('em on, tocar na caixa comprime a 0,97; reduzido não comprime', async () => {
    emOn(<Checkbox aria-label="Aceito" />)
    const box = screen.getByRole('checkbox')
    down(box)
    await waitFor(() => expect(box.style.transform).toContain('scale(0.97)'))
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Checkbox aria-label="Aceito" />)
      const reduced = screen.getByRole('checkbox')
      down(reduced)
      expect(reduced.style.transform).toBe('')
    } finally {
      restore()
    }
  })

  it('em off, o indicador entra de 90% (zoom-in-90) na duração fast, não de 50%', () => {
    renderApp(<Checkbox aria-label="Aceito" defaultChecked />)
    const cls = screen.getByRole('checkbox').querySelector('span')!.className
    expect(cls).toContain('zoom-in-90')
    expect(cls).not.toContain('zoom-in-50')
    expect(cls).toContain('duration-(--rendra-duration-fast)')
  })
})

describe('RadioGroup: a bolinha nunca vai a scale(0) (W2) e o cartão responde ao toque (O5)', () => {
  const options = [
    { value: 'a', label: 'Plano A' },
    { value: 'b', label: 'Plano B' },
  ]
  const dot = (name: string) =>
    screen.getByRole('radio', { name }).querySelector<HTMLElement>('.size-2')!

  it('em on, a opção não marcada fica em 0,9 com opacidade 0 (nunca 0), e a marcada em 1', async () => {
    emOn(<RadioGroup aria-label="Plano" options={options} defaultValue="a" />)
    await waitFor(() => expect(dot('Plano A').style.opacity).toBe('1'))
    expect(dot('Plano A').style.transform).toBe('none')
    expect(dot('Plano B').style.opacity).toBe('0')
    expect(dot('Plano B').style.transform).toContain('scale(0.9)')
    await userEvent.click(screen.getByRole('radio', { name: 'Plano B' }))
    await waitFor(() => expect(dot('Plano B').style.opacity).toBe('1'))
    await waitFor(() => expect(dot('Plano A').style.transform).toContain('scale(0.9)'))
    for (const n of ['Plano A', 'Plano B']) expect(dot(n).style.transform).not.toContain('scale(0)')
  })

  it('em off, a bolinha parte de scale-90 com opacidade 0 e passa a 100% marcada, na duração fast', () => {
    renderApp(<RadioGroup aria-label="Plano" options={options} />)
    const cls = dot('Plano A').className
    expect(cls).toContain('scale-90')
    expect(cls).toContain('opacity-0')
    expect(cls).not.toMatch(/(?<![\w-])scale-0/)
    expect(cls).toContain('group-data-[state=checked]:scale-100')
    expect(cls).toContain('group-data-[state=checked]:opacity-100')
    expect(cls).toContain('duration-(--rendra-duration-fast)')
  })

  it('em on, o cartão (variant cards) comprime a 0,97 ao tocar', async () => {
    emOn(<RadioGroup aria-label="Plano" variant="cards" options={options} />)
    const card = screen.getByRole('radio', { name: /Plano A/ })
    down(card)
    await waitFor(() => expect(card.style.transform).toContain('scale(0.97)'))
  })
})
