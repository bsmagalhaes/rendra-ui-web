// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('mostra o título da página e a trilha própria (breadcrumb), usado fora do AppShell', () => {
    renderApp(
      <PageHeader
        title="Detalhe do cliente"
        breadcrumb={[{ label: 'Clientes', to: '/clientes' }, { label: 'Detalhe do cliente' }]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Detalhe do cliente' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Trilha de navegação' })).toBeInTheDocument()
    expect(screen.getAllByText('Clientes').length).toBeGreaterThan(0)
  })

  it('sem a prop breadcrumb, não mostra a trilha', () => {
    renderApp(<PageHeader title="Painel" />)
    expect(
      screen.queryByRole('navigation', { name: 'Trilha de navegação' }),
    ).not.toBeInTheDocument()
  })

  it('showTitle mostra o título também no corpo da página (fora do sr-only)', () => {
    renderApp(<PageHeader title="Cliente Acme" showTitle />)
    expect(screen.getByRole('heading', { name: 'Cliente Acme' })).not.toHaveClass('sr-only')
  })

  it('sem showTitle (padrão), o título fica só para leitor de tela', () => {
    renderApp(<PageHeader title="Relatório mensal" />)
    expect(screen.getByRole('heading', { name: 'Relatório mensal' })).toHaveClass('sr-only')
  })

  it('fora do AppShell, o ícone de ajuda abre o modal com o conteúdo visível', async () => {
    renderApp(
      <PageHeader title="Relatórios" showTitle help="Estes números já incluem os impostos.">
        Conteúdo abaixo
      </PageHeader>,
    )
    expect(screen.queryByText('Estes números já incluem os impostos.')).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Sobre: Relatórios'))
    expect(await screen.findByText('Estes números já incluem os impostos.')).toBeInTheDocument()
  })

  describe('className (item 24: zerar a margem negativa)', () => {
    it('sem className a margem negativa continua', () => {
      renderApp(<PageHeader title="Painel" description="Resumo" />)
      const c = screen.getByText('Resumo').closest('header')!
      expect(c).toHaveClass('-mb-2', 'md:-mb-4')
    })

    it('className="mb-0 md:mb-0" vence as margens negativas e preserva as demais classes', () => {
      renderApp(<PageHeader title="Painel" description="Resumo" className="mb-0 md:mb-0" />)
      const c = screen.getByText('Resumo').closest('header')!
      expect(c).not.toHaveClass('-mb-2')
      expect(c).not.toHaveClass('md:-mb-4')
      expect(c).toHaveClass('mb-0', 'md:mb-0', 'flex', 'min-w-0', 'flex-col', 'gap-4')
    })
  })

  describe('bodyTitle (item 37)', () => {
    const h1 = () => screen.getByRole('heading', { level: 1, name: 'Relatório mensal' })

    it('título discreto no corpo abaixo de md e só de leitor de tela a partir dele', () => {
      renderApp(<PageHeader title="Relatório mensal" bodyTitle />)
      expect(h1()).toHaveClass('text-base', 'md:sr-only')
      expect(h1()).not.toHaveClass('sr-only')
      expect(h1().closest('header')).not.toHaveClass('sr-only')
    })

    it('showTitle vence: o título fica sempre visível, com as classes de hoje', () => {
      renderApp(<PageHeader title="Relatório mensal" bodyTitle showTitle />)
      expect(h1()).toHaveClass('text-2xl', 'md:text-3xl')
      expect(h1()).not.toHaveClass('md:sr-only')
      expect(h1()).not.toHaveClass('sr-only')
    })

    it('bodyTitle={false} é igual ao padrão: só leitor de tela e header oculto', () => {
      renderApp(<PageHeader title="Relatório mensal" bodyTitle={false} />)
      expect(h1()).toHaveClass('sr-only')
      expect(h1().closest('header')).toHaveClass('sr-only')
    })
  })

  describe('titleSpace (item 38)', () => {
    const acoes = <button type="button">Novo</button>
    const linha = (h1: HTMLElement) => h1.parentElement!

    it('padrão (reserve): o título fica num bloco próprio, que ocupa lugar na linha', () => {
      renderApp(<PageHeader title="Painel" actions={acoes} />)
      const h1 = screen.getByRole('heading', { level: 1, name: 'Painel' })
      // h1 dentro de div > div > div (linha): o bloco do título é filho da linha.
      expect(linha(linha(linha(h1))).tagName).toBe('DIV')
      const row = linha(linha(linha(h1)))
      expect(row.children).toHaveLength(2)
      expect(row.children[0]).not.toBe(h1)
    })

    it('titleSpace="reserve" explícito é igual ao padrão', () => {
      renderApp(<PageHeader title="Painel" actions={acoes} titleSpace="reserve" />)
      const h1 = screen.getByRole('heading', { level: 1, name: 'Painel' })
      const row = linha(linha(linha(h1)))
      expect(row.children[0]).not.toBe(h1)
    })

    it('none com título só de leitor de tela e sem description: não há bloco, o h1 segue no DOM', () => {
      renderApp(<PageHeader title="Painel" actions={acoes} titleSpace="none" />)
      const h1 = screen.getByRole('heading', { level: 1, name: 'Painel' })
      expect(h1).toHaveClass('sr-only')
      const row = linha(h1)
      // O h1 é filho direto da linha, absoluto (sr-only); o único bloco em fluxo são as ações.
      expect(Array.from(row.children).filter((c) => c !== h1)).toHaveLength(1)
      expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument()
      expect(row.children[1]).toContainElement(screen.getByRole('button', { name: 'Novo' }))
    })

    it('none com description continua reservando o bloco', () => {
      renderApp(
        <PageHeader title="Painel" actions={acoes} description="Resumo" titleSpace="none" />,
      )
      const h1 = screen.getByRole('heading', { level: 1, name: 'Painel' })
      expect(linha(h1).tagName).toBe('DIV')
      expect(linha(h1)).not.toBe(linha(linha(linha(h1))))
      expect(screen.getByText('Resumo')).toBeInTheDocument()
    })

    it('none com showTitle ou bodyTitle continua reservando o bloco (o título é visível)', () => {
      const { unmount } = renderApp(
        <PageHeader title="Painel" actions={acoes} showTitle titleSpace="none" />,
      )
      let h1 = screen.getByRole('heading', { level: 1, name: 'Painel' })
      expect(h1).not.toHaveClass('sr-only')
      expect(linha(linha(linha(h1))).children[0]).not.toBe(h1)
      unmount()
      renderApp(<PageHeader title="Painel" actions={acoes} bodyTitle titleSpace="none" />)
      h1 = screen.getByRole('heading', { level: 1, name: 'Painel' })
      expect(linha(linha(linha(h1))).children[0]).not.toBe(h1)
    })
  })
})
