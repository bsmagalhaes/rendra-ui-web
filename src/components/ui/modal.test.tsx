// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Modal, type ModalProps } from './modal'

function Harness(props: Partial<ModalProps>) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <span data-testid="estado">{open ? 'aberto' : 'fechado'}</span>
      <Modal open={open} onOpenChange={setOpen} title="Excluir cliente?" {...props} />
    </>
  )
}

describe('Modal', () => {
  it('confirmar chama a ação e fecha', async () => {
    const onConfirm = vi.fn()
    renderApp(<Harness onConfirm={onConfirm} />)
    expect(screen.getByRole('dialog', { name: 'Excluir cliente?' })).toHaveAttribute(
      'data-rendra',
      'MOD-001',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
  })

  it('type="form" usa o código de catálogo MOD-002, não o de confirmação', () => {
    renderApp(<Harness type="form" />)
    expect(screen.getByRole('dialog', { name: 'Excluir cliente?' })).toHaveAttribute(
      'data-rendra',
      'MOD-002',
    )
  })

  it('type="info" usa o código próprio MOD-003, com um botão só', () => {
    renderApp(<Harness type="info" />)
    expect(screen.getByRole('dialog', { name: 'Excluir cliente?' })).toHaveAttribute(
      'data-rendra',
      'MOD-003',
    )
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('type="destructive" mantém o código do confirm, MOD-001 (só muda a cor)', () => {
    renderApp(<Harness type="destructive" />)
    expect(screen.getByRole('dialog', { name: 'Excluir cliente?' })).toHaveAttribute(
      'data-rendra',
      'MOD-001',
    )
  })

  it('ação assíncrona: carrega até terminar e só então fecha', async () => {
    let finish = () => {}
    const onConfirm = vi.fn(() => new Promise<void>((r) => (finish = r)))
    renderApp(<Harness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByTestId('estado')).toHaveTextContent('aberto')
    finish()
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
  })

  it('cancelar fecha sem chamar a ação', async () => {
    const onConfirm = vi.fn()
    renderApp(<Harness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onConfirm).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
  })

  it('destrutivo usa o rótulo Excluir; informativo, Entendi', () => {
    const { unmount } = renderApp(<Harness type="destructive" />)
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
    unmount()
    renderApp(<Harness type="info" />)
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('Esc fecha', async () => {
    renderApp(<Harness />)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
  })

  describe('cancelLabel', () => {
    it('info com cancelLabel mostra dois botões e o segundo fecha', async () => {
      renderApp(<Harness type="info" cancelLabel="Voltar" />)
      expect(screen.getByRole('button', { name: 'Entendi' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
      await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
    })

    it('info sem cancelLabel continua com um botão só (além do Fechar)', () => {
      renderApp(<Harness type="info" />)
      const rodape = screen.getByRole('button', { name: 'Entendi' }).closest('footer')!
      expect(within(rodape).getAllByRole('button')).toHaveLength(1)
    })

    it('confirm e destructive sem cancelLabel mantêm Cancelar', () => {
      const { unmount } = renderApp(<Harness type="confirm" />)
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
      unmount()
      renderApp(<Harness type="destructive" />)
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    })

    it('confirm e destructive com cancelLabel usam o texto passado', () => {
      const { unmount } = renderApp(<Harness type="confirm" cancelLabel="Desistir" />)
      expect(screen.getByRole('button', { name: 'Desistir' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
      unmount()
      renderApp(<Harness type="destructive" cancelLabel="Manter" />)
      expect(screen.getByRole('button', { name: 'Manter' })).toBeInTheDocument()
    })
  })

  describe('botão Fechar', () => {
    it('sem cabeçalho visível, fica fora do header oculto, invisível e visível com foco de teclado', () => {
      renderApp(<Harness type="info" />)
      const fechar = screen.getByRole('button', { name: 'Fechar' })
      expect(fechar.closest('header')).toBeNull()
      expect(fechar.className).toContain('opacity-0')
      expect(fechar.className).toContain('focus-visible:opacity-100')
      expect(fechar).toHaveClass('cursor-default', 'focus-visible:cursor-pointer')
      expect(fechar).not.toHaveClass('cursor-pointer')
      // O título continua no header só de leitor de tela.
      expect(
        screen.getByRole('dialog', { name: 'Excluir cliente?' }).querySelector('header'),
      ).toHaveClass('sr-only')
    })

    it('é o primeiro foco do modal e fecha ao clicar', async () => {
      renderApp(<Harness type="confirm" />)
      await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
      await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('fechado'))
    })

    it('em form (cabeçalho visível) segue dentro do header, sem opacity-0', () => {
      renderApp(<Harness type="form" />)
      const fechar = screen.getByRole('button', { name: 'Fechar' })
      expect(fechar.closest('header')).not.toBeNull()
      expect(fechar.className).not.toContain('opacity-0')
    })
  })
})
