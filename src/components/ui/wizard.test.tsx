// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Stepper, Wizard } from './wizard'

const steps = [
  { id: 'a', title: 'Dados' },
  { id: 'b', title: 'Revisão' },
]

describe('Wizard', () => {
  it('mostra a etapa atual e usa o código do catálogo', () => {
    const { container } = renderApp(
      <Wizard steps={steps}>
        <p>Conteúdo da etapa 1</p>
        <p>Conteúdo da etapa 2</p>
      </Wizard>,
    )
    expect(screen.getByText('Conteúdo da etapa 1')).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="WIZ-001"]')).toBeInTheDocument()
  })

  it('avançar troca o conteúdo exibido para o da nova etapa', async () => {
    renderApp(
      <Wizard steps={steps}>
        <p>Conteúdo da etapa 1</p>
        <p>Conteúdo da etapa 2</p>
      </Wizard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(screen.getByText('Conteúdo da etapa 2')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo da etapa 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument()
  })

  it('avançar com a etapa inválida mantém a etapa atual e marca o erro', async () => {
    renderApp(
      <Wizard steps={steps} onValidateStep={() => false}>
        <p>Conteúdo da etapa 1</p>
        <p>Conteúdo da etapa 2</p>
      </Wizard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    // Continua na etapa 1: o conteúdo da etapa 2 nunca aparece.
    expect(screen.getByText('Conteúdo da etapa 1')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo da etapa 2')).not.toBeInTheDocument()
    // Indicador mobile compacto marca a etapa atual com erro.
    expect(screen.getByText('Revise esta etapa')).toBeInTheDocument()
  })

  function CadastroDemo() {
    const [nome, setNome] = useState('')
    return (
      <Wizard steps={steps}>
        <input aria-label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <p>Revisão: {nome || '(vazio)'}</p>
      </Wizard>
    )
  }

  it('voltar uma etapa mantém os dados já preenchidos visíveis', async () => {
    renderApp(<CadastroDemo />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Ana Ribeiro')
    await userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(screen.getByText('Revisão: Ana Ribeiro')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Ana Ribeiro')
  })
})

describe('Wizard: rótulos e Pular', () => {
  const conteudo = [<p key="1">Conteúdo da etapa 1</p>, <p key="2">Conteúdo da etapa 2</p>]
  const tres = [...steps, { id: 'c', title: 'Fim' }]
  const tresConteudos = [...conteudo, <p key="3">Conteúdo da etapa 3</p>]
  const botao = (nome: string) => screen.queryByRole('button', { name: nome })

  it('rótulos padrão: Avançar, Concluir, Voltar e Cancelar', async () => {
    renderApp(
      <Wizard steps={steps} onCancel={() => {}}>
        {conteudo}
      </Wizard>,
    )
    expect(botao('Cancelar')).toBeInTheDocument()
    expect(botao('Avançar')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(botao('Voltar')).toBeInTheDocument()
    expect(botao('Concluir')).toBeInTheDocument()
  })

  it('nextLabel, backLabel e cancelLabel trocam os textos; finishLabel segue valendo', async () => {
    renderApp(
      <Wizard
        steps={steps}
        onCancel={() => {}}
        nextLabel="Seguir"
        backLabel="Anterior"
        cancelLabel="Sair"
        finishLabel="Enviar"
      >
        {conteudo}
      </Wizard>,
    )
    expect(botao('Sair')).toBeInTheDocument()
    expect(botao('Cancelar')).not.toBeInTheDocument()
    expect(botao('Avançar')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    expect(botao('Anterior')).toBeInTheDocument()
    expect(botao('Voltar')).not.toBeInTheDocument()
    expect(botao('Enviar')).toBeInTheDocument()
  })

  it('sem onSkip não existe o menu Mais ações', () => {
    renderApp(<Wizard steps={steps}>{conteudo}</Wizard>)
    expect(botao('Mais ações')).not.toBeInTheDocument()
  })

  it('com onSkip, Mais ações mostra Pular; skipLabel troca o texto', async () => {
    const { unmount } = renderApp(
      <Wizard steps={tres} onSkip={() => {}}>
        {tresConteudos}
      </Wizard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }))
    expect(await screen.findByRole('menuitem', { name: 'Pular' })).toBeInTheDocument()
    unmount()
    renderApp(
      <Wizard steps={tres} onSkip={() => {}} skipLabel="Ignorar">
        {tresConteudos}
      </Wizard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }))
    expect(await screen.findByRole('menuitem', { name: 'Ignorar' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Pular' })).not.toBeInTheDocument()
  })

  it('Pular avança sem validar, chama onSkip uma vez e limpa o erro da etapa', async () => {
    const onSkip = vi.fn()
    const onValidateStep = vi.fn(() => false)
    renderApp(
      <Wizard steps={tres} onSkip={onSkip} onValidateStep={onValidateStep}>
        {tresConteudos}
      </Wizard>,
    )
    // Reprova a validação: fica na etapa 1 com o erro marcado.
    await userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(screen.getByText('Revise esta etapa')).toBeInTheDocument()
    expect(onValidateStep).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Pular' }))

    expect(screen.getByText('Conteúdo da etapa 2')).toBeInTheDocument()
    expect(screen.queryByText('Revise esta etapa')).not.toBeInTheDocument()
    expect(onValidateStep).toHaveBeenCalledTimes(1)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('na última etapa o Pular não aparece', async () => {
    renderApp(
      <Wizard steps={steps} onSkip={() => {}}>
        {conteudo}
      </Wizard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(screen.getByText('Conteúdo da etapa 2')).toBeInTheDocument()
    expect(botao('Mais ações')).not.toBeInTheDocument()
  })

  it('o carregamento da validação continua como hoje', async () => {
    let liberar = () => {}
    renderApp(
      <Wizard
        steps={steps}
        onValidateStep={() => new Promise<boolean>((r) => (liberar = () => r(true)))}
      >
        {conteudo}
      </Wizard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(screen.getByRole('button', { name: 'Validando...' })).toBeInTheDocument()
    liberar()
    expect(await screen.findByText('Conteúdo da etapa 2')).toBeInTheDocument()
  })
})

describe('Stepper', () => {
  it('usa o código do catálogo', () => {
    const { container } = renderApp(<Stepper steps={[{ id: 'a', title: 'Dados' }]} current={0} />)
    expect(container.querySelector('[data-rendra="WIZ-002"]')).toBeInTheDocument()
  })
})
