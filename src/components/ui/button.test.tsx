// @vitest-environment jsdom
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Button } from './button'
import { createRef, type ReactElement, type ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { reduceMotion } from '@/test/motion'

describe('Button', () => {
  it('clica e chama a ação', async () => {
    const onClick = vi.fn()
    renderApp(<Button onClick={onClick}>Salvar</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('carregando: bloqueia o clique e avisa leitores de tela', async () => {
    const onClick = vi.fn()
    renderApp(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    )
    const button = screen.getByRole('button', { name: /Salvar/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('só ícone tem o nome acessível do aria-label', () => {
    renderApp(<Button iconOnly aria-label="Excluir" icon={<svg />} />)
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })

  it('data-rendra muda com a variante (catálogo de componentes)', () => {
    const { rerender } = renderApp(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('data-rendra', 'BTN-001')
    rerender(<Button variant="destructive">Excluir</Button>)
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveAttribute(
      'data-rendra',
      'BTN-005',
    )
  })
})

describe('Button com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)

  it('em on: clica, mantém o código do catálogo, o type e a ref aponta para o HTMLButtonElement', async () => {
    const onClick = vi.fn()
    const ref = createRef<HTMLButtonElement>()
    emOn(
      <Button ref={ref} onClick={onClick}>
        Salvar
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Salvar' })
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute('data-rendra', 'BTN-001')
    expect(button).toHaveAttribute('type', 'button')
    expect(ref.current).toBe(button)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('em on a classe active:scale-98 sai (não soma com o whileTap); em off continua', () => {
    emOn(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' }).className).not.toContain(
      'active:scale-98',
    )
    expect(screen.getByRole('button', { name: 'Salvar' }).className).toContain('active:scale-100')
    cleanup()
    renderApp(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' }).className).toContain('active:scale-98')
  })

  it('em on o toque comprime discretamente; com movimento reduzido, não', async () => {
    emOn(<Button>Salvar</Button>)
    const button = screen.getByRole('button', { name: 'Salvar' })
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, isPrimary: true })
    await waitFor(() => expect(button.style.transform).toContain('scale(0.98)'))
    fireEvent.pointerUp(button, { pointerId: 1, button: 0, isPrimary: true })
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Button>Salvar</Button>)
      const reduced = screen.getByRole('button', { name: 'Salvar' })
      fireEvent.pointerDown(reduced, { pointerId: 1, button: 0, isPrimary: true })
      expect(reduced.style.transform).toBe('')
    } finally {
      restore()
    }
  })

  it('em on, asChild renderiza o filho como em off (só CSS, sem m.button)', () => {
    const html = (ui: ReactElement) => renderApp(ui).container.innerHTML
    const comAsChild = (
      <Button asChild>
        <a href="/x">Ir</a>
      </Button>
    )
    const off = html(comAsChild)
    cleanup()
    const on = html(<MotionProvider mode="on">{comAsChild}</MotionProvider>)
    expect(on).toBe(off)
  })

  it('em on, os eventos nativos que o Motion toma (dragstart, dragend, animationstart) chegam ao consumidor', () => {
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()
    const onAnimationStart = vi.fn()
    emOn(
      <Button
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onAnimationStart={onAnimationStart}
      >
        Arrastar
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Arrastar' })
    fireEvent.dragStart(button)
    fireEvent.dragEnd(button)
    fireEvent.animationStart(button)
    expect(onDragStart).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onAnimationStart).toHaveBeenCalledTimes(1)
  })

  it('em on, loading bloqueia o clique e marca aria-busy', async () => {
    const onClick = vi.fn()
    emOn(
      <Button loading onClick={onClick}>
        Salvando
      </Button>,
    )
    const button = screen.getByRole('button', { name: /Salvando/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
