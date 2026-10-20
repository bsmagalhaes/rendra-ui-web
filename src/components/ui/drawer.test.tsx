// @vitest-environment jsdom
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { Drawer } from './drawer'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, reduceMotion } from '@/test/motion'

function Harness({ dirty }: { dirty?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <span data-testid="estado">{open ? 'aberto' : 'fechado'}</span>
      <Drawer open={open} onOpenChange={setOpen} title="Novo cliente" dirty={dirty}>
        <p>Campos</p>
      </Drawer>
    </>
  )
}

describe('Drawer', () => {
  it('abre com título e o conteúdo visível, e fecha pelo Esc fazendo o conteúdo sumir', async () => {
    renderApp(<Harness />)
    expect(screen.getByRole('dialog', { name: 'Novo cliente' })).toHaveAttribute(
      'data-rendra',
      'GAV-001',
    )
    expect(screen.getByText('Campos')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
    expect(screen.queryByText('Campos')).not.toBeInTheDocument()
  })

  it('com alterações, pede confirmação antes de descartar', async () => {
    renderApp(<Harness dirty />)
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByRole('dialog', { name: 'Descartar alterações?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }))
    expect(screen.getByTestId('estado')).toHaveTextContent('aberto')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
  })
})

describe('Drawer com motion', () => {
  const emOn = (dirty?: boolean) =>
    renderApp(
      <MotionProvider mode="on">
        <Harness dirty={dirty} />
      </MotionProvider>,
    )

  it('em on, abre com o código do catálogo e fecha pelo Esc: o painel sai do DOM', async () => {
    emOn()
    expect(screen.getByRole('dialog', { name: 'Novo cliente' })).toHaveAttribute(
      'data-rendra',
      'GAV-001',
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('estado')).toHaveTextContent('fechado')
    expect(screen.queryByText('Campos')).not.toBeInTheDocument()
  })

  it('em on, com alterações não salvas o Esc pede confirmação; continuar editando mantém o painel', async () => {
    emOn(true)
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByRole('dialog', { name: 'Descartar alterações?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Descartar alterações?' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Campos')).toBeInTheDocument()
    expect(screen.getByTestId('estado')).toHaveTextContent('aberto')
  })

  it('em on, descartar fecha o painel e a confirmação', async () => {
    emOn(true)
    await userEvent.keyboard('{Escape}')
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('estado')).toHaveTextContent('fechado')
  })

  it('em on, o painel só desliza pela borda (transform, sem opacidade); com movimento reduzido, só opacidade', async () => {
    emOn()
    const painel = screen.getByRole('dialog')
    await waitFor(() => expect(painel.style.transform).toBe('none'))
    expect(painel.style.opacity).toBe('')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn()
      await expectSettled(screen.getByRole('dialog'), 'absent')
    } finally {
      restore()
    }
  })
})
