// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('mostra título, descrição e a ação', () => {
    const { container } = renderApp(
      <EmptyState
        title="Nenhum contrato ainda"
        description="Os contratos aparecem aqui."
        actions={<button type="button">Novo contrato</button>}
      />,
    )
    expect(screen.getByText('Nenhum contrato ainda')).toBeInTheDocument()
    expect(screen.getByText('Os contratos aparecem aqui.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo contrato' })).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="VAZ-001"]')).toBeInTheDocument()
  })

  it('sem ação, não mostra nenhum botão', () => {
    renderApp(<EmptyState title="Nenhum contrato ainda" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('o tipo escolhido muda o ícone de feedback mostrado', () => {
    const { container } = renderApp(<EmptyState title="Falha ao carregar" type="error" />)
    const svgs = container.querySelectorAll('[data-rendra="BFI-001"] svg')
    const glyphPath = svgs[svgs.length - 1]?.querySelector('path')
    expect(glyphPath).toHaveAttribute('d', 'M4 4l4 4M8 4 4 8')
  })

  describe('respiro vertical e className', () => {
    const raiz = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-rendra="VAZ-001"]')!

    it('sem className, o respiro de hoje', () => {
      const { container } = renderApp(<EmptyState title="Vazio" />)
      expect(raiz(container)).toHaveClass('py-12', 'md:py-16')
      const compacto = renderApp(<EmptyState title="Vazio" size="compact" />)
      expect(raiz(compacto.container)).toHaveClass('py-8')
    })

    it('className="py-0 md:py-0" zera o respiro vertical e preserva o resto', () => {
      const { container } = renderApp(<EmptyState title="Vazio" className="py-0 md:py-0" />)
      const el = raiz(container)
      expect(el).toHaveClass('py-0', 'md:py-0', 'px-4', 'flex', 'flex-col', 'text-center')
      expect(el).not.toHaveClass('py-12')
      expect(el).not.toHaveClass('md:py-16')
    })

    it('o mesmo vale com size="compact"', () => {
      const { container } = renderApp(
        <EmptyState title="Vazio" size="compact" className="py-0 md:py-0" />,
      )
      const el = raiz(container)
      expect(el).toHaveClass('py-0', 'md:py-0')
      expect(el).not.toHaveClass('py-8')
    })
  })
})
