// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/ui/toast'
import { mockFlowLayout, restoreFlowLayout } from '@/test/flow-layout'
import { renderApp } from '@/test/render'
import { AutomationEditorPage } from './automation-editor-page'

beforeEach(mockFlowLayout)
afterEach(restoreFlowLayout)

const open = () =>
  renderApp(
    <>
      <Toaster />
      <AutomationEditorPage />
    </>,
  )
const settle = () => waitFor(() => expect(document.querySelector('.react-flow__node')).toBeTruthy())
const aba = (nome: string) => userEvent.click(screen.getByRole('tab', { name: nome }))

describe('AutomationEditorPage', { timeout: 30_000 }, () => {
  it('tela cheia: sem sidebar nem header do sistema e sem #conteudo; voltar aponta para a listagem', async () => {
    const { container } = open()
    await settle()
    expect(container.querySelectorAll('aside:not([aria-label="Painel do fluxo"])')).toHaveLength(0)
    expect(container.querySelector('header.h-header')).toBeNull()
    expect(container.querySelector('#conteudo')).toBeNull()
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Voltar para Automações' })).toHaveAttribute(
      'href',
      '/automacoes',
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Boas-vindas ao novo cliente',
    )
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
  })

  it('tem as quatro abas, e o Workflow é a que abre', async () => {
    open()
    await settle()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Geral',
      'Workflow',
      'Configurações',
      'Histórico de execuções',
    ])
    expect(screen.getByRole('tab', { name: 'Workflow' })).toHaveAttribute('aria-selected', 'true')
  })

  it('"Salvar" com o fluxo válido mostra o aviso; com a regra esvaziada, os problemas', async () => {
    open()
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Automação salva')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Editar bloco Condição' }))
    await userEvent.clear(screen.getByRole('textbox', { name: 'Valor da regra 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('1 problema no fluxo')).toBeInTheDocument()
  })

  it('"Testar fluxo" muda para o Workflow e mostra a região de teste', async () => {
    open()
    await settle()
    await aba('Geral')
    expect(screen.queryByRole('region', { name: 'Teste do fluxo' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    expect(await screen.findByRole('region', { name: 'Teste do fluxo' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Workflow' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Geral: editar o nome muda o nome na barra, e as abas guardam o que foi digitado', async () => {
    open()
    await settle()
    await aba('Geral')
    const nome = screen.getByRole('textbox', { name: /Nome/ })
    await userEvent.clear(nome)
    await userEvent.type(nome, 'Cobrança automática')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cobrança automática')
    await aba('Workflow')
    await aba('Geral')
    expect(screen.getByRole('textbox', { name: /Nome/ })).toHaveValue('Cobrança automática')
  })

  it('Configurações: o card "Ativo" muda o selo; o alerta mostra os destinatários', async () => {
    open()
    await settle()
    await aba('Configurações')
    await userEvent.click(screen.getByRole('radio', { name: /Ativo/ }))
    expect(within(screen.getByRole('banner')).getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Destinatários' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Avisar quando houver erro' }))
    expect(screen.queryByRole('combobox', { name: 'Destinatários' })).toBeNull()
    await userEvent.click(screen.getByRole('switch', { name: 'Avisar quando houver erro' }))
    expect(screen.getByRole('combobox', { name: 'Destinatários' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'WhatsApp' }))
    expect(screen.getByRole('checkbox', { name: 'WhatsApp' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Também nos registros existentes' }))
    expect(screen.getByRole('radio', { name: 'Também nos registros existentes' })).toBeChecked()
  })

  it('Geral: módulo, responsável e tags editam o rascunho', async () => {
    open()
    await settle()
    await aba('Geral')
    await userEvent.click(screen.getByRole('combobox', { name: 'Módulo ou funil' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Atendimento' }))
    expect(screen.getByRole('combobox', { name: 'Módulo ou funil' })).toHaveTextContent(
      'Atendimento',
    )
    await userEvent.type(screen.getByRole('textbox', { name: 'Descrição' }), ' Teste.')
    expect(screen.getByRole('textbox', { name: 'Descrição' })).toHaveValue(
      'Avisa o cliente por WhatsApp e cria uma tarefa para o time comercial. Teste.',
    )
  })

  it('Histórico: 15 linhas na primeira página e 5 na segunda; filtro "Erro"; detalhe com passo que falhou', async () => {
    open()
    await settle()
    await aba('Histórico de execuções')
    const tabela = await screen.findByRole('table', { name: 'Histórico de execuções' })
    const linhas = () =>
      within(screen.getByRole('table', { name: 'Histórico de execuções' })).getAllByRole('row')
        .length - 1
    await waitFor(() => expect(linhas()).toBe(15))
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(linhas()).toBe(5))
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    await waitFor(() => expect(linhas()).toBe(15))
    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(await screen.findByRole('combobox', { name: 'Situação' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Erro' }))
    await waitFor(() => expect(linhas()).toBe(4))
    expect(within(tabela).getAllByText('Erro').length).toBe(4)
    await userEvent.click(within(tabela).getAllByRole('button', { name: 'Ver detalhes' })[0]!)
    const gaveta = await screen.findByRole('dialog')
    expect(within(gaveta).getAllByText('Falhou').length).toBeGreaterThan(0)
    expect(within(gaveta).getByText('Passo 1')).toBeInTheDocument()
  })
})
