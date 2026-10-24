// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Toaster } from '@/components/ui/toast'
import { automations } from '@/mocks/automations'
import { renderApp } from '@/test/render'
import { AutomationsListPage } from './automations-list-page'

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>
}

const open = () =>
  renderApp(
    <>
      <Toaster />
      <Where />
      <AutomationsListPage />
    </>,
  )

describe('AutomationsListPage', { timeout: 30_000 }, () => {
  it('lista as seis automações, com situação em selo de texto', async () => {
    open()
    for (const a of automations) expect(await screen.findByText(a.name)).toBeInTheDocument()
    const tabela = screen.getByRole('table', { name: 'Automações' })
    expect(within(tabela).getAllByText('Ativo').length).toBe(3)
    expect(within(tabela).getAllByText('Desativado').length).toBe(2)
    expect(within(tabela).getAllByText('Rascunho').length).toBe(1)
  })

  it('buscar filtra; o nome é um link para /automacoes/nova', async () => {
    open()
    await screen.findByText('Aviso de novo pedido')
    await userEvent.type(screen.getByLabelText('Buscar por nome ou gatilho'), 'cobrança')
    await waitFor(() => expect(screen.queryByText('Aviso de novo pedido')).toBeNull())
    const link = await screen.findByRole('link', { name: 'Cobrança de fatura vencida' })
    expect(link).toHaveAttribute('href', '/automacoes/nova')
  })

  it('filtro por situação "Ativo" deixa só as ativas e mostra o chip', async () => {
    open()
    await screen.findByText('Aviso de novo pedido')
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(await screen.findByRole('combobox', { name: 'Situação' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Ativo' }))
    await waitFor(() => expect(screen.queryByText('Pesquisa de satisfação')).toBeNull())
    expect(await screen.findByText('Boas-vindas ao novo cliente')).toBeInTheDocument()
    expect(screen.getByText('Situação: Ativo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remover filtro Situação: Ativo' }))
    expect(await screen.findByText('Pesquisa de satisfação')).toBeInTheDocument()
  })

  it('"Nova automação" navega para a tela cheia', async () => {
    open()
    await screen.findByText('Aviso de novo pedido')
    expect(screen.getByTestId('where')).toHaveTextContent('/')
    await userEvent.click(screen.getByRole('button', { name: 'Nova automação' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/automacoes/nova')
  })

  it('Excluir pede confirmação e avisa', async () => {
    open()
    await screen.findByText('Aviso de novo pedido')
    await userEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]!)
    const modal = await screen.findByRole('dialog')
    expect(modal).toHaveTextContent('Esta ação não pode ser desfeita')
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir automação' }))
    expect(await screen.findByText('Automação excluída')).toBeInTheDocument()
  })
})
