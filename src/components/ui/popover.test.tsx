// @vitest-environment jsdom
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, expectTypeOf, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Popover as P } from 'radix-ui'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, reduceMotion } from '@/test/motion'

describe('PopoverContent', () => {
  it('abre e usa o código do catálogo', async () => {
    renderApp(
      <Popover>
        <PopoverTrigger>Filtros</PopoverTrigger>
        <PopoverContent>Conteúdo do filtro</PopoverContent>
      </Popover>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    const content = await screen.findByText('Conteúdo do filtro')
    expect(content.closest('[data-rendra="POP-001"]')).toBeInTheDocument()
  })

  it('fecha com Esc e o conteúdo some da tela', async () => {
    const user = userEvent.setup()
    renderApp(
      <Popover>
        <PopoverTrigger>Filtros</PopoverTrigger>
        <PopoverContent>Conteúdo do filtro</PopoverContent>
      </Popover>,
    )
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    await screen.findByText('Conteúdo do filtro')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Conteúdo do filtro')).not.toBeInTheDocument())
  })
})

describe('Popover com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)

  it('o Root aceita exatamente as props do Root do Radix (mesmos tipos)', () => {
    expectTypeOf<ComponentProps<typeof Popover>>().toEqualTypeOf<ComponentProps<typeof P.Root>>()
  })

  it('em on, não controlado: abre, usa o código do catálogo, e fecha com Esc tirando o conteúdo do DOM', async () => {
    const user = userEvent.setup()
    emOn(
      <Popover>
        <PopoverTrigger>Filtros</PopoverTrigger>
        <PopoverContent>Conteúdo do filtro</PopoverContent>
      </Popover>,
    )
    expect(screen.queryByText('Conteúdo do filtro')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    const content = await screen.findByText('Conteúdo do filtro')
    expect(content.closest('[data-rendra="POP-001"]')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Conteúdo do filtro')).not.toBeInTheDocument())
  })

  it('em on, defaultOpen abre já aberto', async () => {
    emOn(
      <Popover defaultOpen>
        <PopoverTrigger>Filtros</PopoverTrigger>
        <PopoverContent>Conteúdo do filtro</PopoverContent>
      </Popover>,
    )
    expect(await screen.findByText('Conteúdo do filtro')).toBeInTheDocument()
  })

  it('em on, controlado: segue o open do pai e avisa onOpenChange', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    function Controlado() {
      const [open, setOpen] = useState(false)
      return (
        <Popover
          open={open}
          onOpenChange={(o) => {
            onOpenChange(o)
            setOpen(o)
          }}
        >
          <PopoverTrigger>Filtros</PopoverTrigger>
          <PopoverContent>Conteúdo do filtro</PopoverContent>
        </Popover>
      )
    }
    emOn(<Controlado />)
    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(await screen.findByText('Conteúdo do filtro')).toBeInTheDocument()
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Conteúdo do filtro')).not.toBeInTheDocument())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('em on, o conteúdo é animado por transform; com movimento reduzido, só opacidade', async () => {
    const ui = (
      <Popover defaultOpen>
        <PopoverTrigger>Filtros</PopoverTrigger>
        <PopoverContent>Conteúdo do filtro</PopoverContent>
      </Popover>
    )
    emOn(ui)
    const content = (await screen.findByText('Conteúdo do filtro')).closest<HTMLElement>(
      '[data-rendra="POP-001"]',
    )!
    await expectSettled(content, 'none')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(ui)
      const reduced = (await screen.findByText('Conteúdo do filtro')).closest<HTMLElement>(
        '[data-rendra="POP-001"]',
      )!
      await expectSettled(reduced, 'absent')
    } finally {
      restore()
    }
  })
})
