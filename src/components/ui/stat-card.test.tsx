// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { StatCard } from './stat-card'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { realAnimations, reduceMotion } from '@/test/motion'

describe('StatCard', () => {
  it('usa o código do catálogo, sobrepondo o do Card em que se apoia', () => {
    renderApp(<StatCard label="Receita" value="R$ 1.250,00" />)
    const card = screen.getByText('Receita').closest('[data-rendra]')
    expect(card).toHaveAttribute('data-rendra', 'STAT-001')
  })

  it('variação positiva mostra o ícone de alta e a cor de sucesso', () => {
    const { container } = renderApp(<StatCard label="Receita" value="R$ 1.250,00" change={12.5} />)
    const badge = screen.getByText('+12,5%').closest('span')
    expect(badge).toHaveClass('bg-success-soft')
    expect(container.querySelector('path[d="M7 7h10v10"]')).toBeInTheDocument()
  })

  it('variação negativa mostra o ícone de baixa e a cor de erro', () => {
    const { container } = renderApp(<StatCard label="Receita" value="R$ 1.250,00" change={-8} />)
    const badge = screen.getByText('-8%').closest('span')
    expect(badge).toHaveClass('bg-destructive-soft')
    expect(container.querySelector('path[d="m7 7 10 10"]')).toBeInTheDocument()
  })

  it('inverse troca as cores: variação negativa (custo caindo) mostra a cor de sucesso', () => {
    const { container } = renderApp(
      <StatCard label="Custo" value="R$ 1.250,00" change={-8} inverse />,
    )
    const badge = screen.getByText('-8%').closest('span')
    expect(badge).toHaveClass('bg-success-soft')
    expect(container.querySelector('path[d="m7 7 10 10"]')).toBeInTheDocument()
  })

  it('loading mostra o esqueleto no lugar do valor', () => {
    const { container } = renderApp(<StatCard label="Receita" value="R$ 1.250,00" loading />)
    expect(screen.queryByText('R$ 1.250,00')).not.toBeInTheDocument()
    expect(container.querySelector('[data-rendra="SKEL-001"]')).toBeInTheDocument()
  })
})

describe('StatCard com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)

  it.each([
    [1234, '1234'],
    ['R$ 1.234,50', 'R$ 1.234,50'],
    ['98%', '98%'],
    ['12,5 mil', '12,5 mil'],
  ])('em on, %j conta e termina exatamente no texto original', async (value, texto) => {
    emOn(<StatCard label="Receita" value={value} />)
    const card = screen.getByText('Receita').closest('[data-rendra]') as HTMLElement
    expect(card).toHaveAttribute('data-rendra', 'STAT-001')
    await waitFor(() => expect(card.querySelector('.tabular-nums')).toHaveTextContent(texto))
  })

  it('em on, texto que não é número só aparece (fade), sem contar', async () => {
    emOn(<StatCard label="Plano" value="Sem dados" />)
    expect(screen.getByText('Sem dados')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Sem dados').style.opacity).toBe('1'))
  })

  it('em on, ReactNode e undefined seguem como em off', () => {
    emOn(
      <>
        <StatCard label="A" value={<b>Negrito</b>} />
        <StatCard label="B" value={undefined} />
      </>,
    )
    expect(screen.getByText('Negrito')).toBeInTheDocument()
  })

  it('em on, o contador passa por valores intermediários antes do final (animação de verdade)', async () => {
    const stop = realAnimations()
    try {
      emOn(<StatCard label="Receita" value={1000} />)
      const span = () =>
        (screen.getByText('Receita').closest('[data-rendra]') as HTMLElement).querySelector(
          '.tabular-nums',
        )!
      const seen = new Set<string>()
      await waitFor(
        () => {
          seen.add(span().textContent ?? '')
          expect(span().textContent).toBe('1000')
        },
        { timeout: 2000, interval: 10 },
      )
      expect(seen.size).toBeGreaterThan(1)
    } finally {
      stop()
    }
  })

  it('em on, loading troca o esqueleto pelo valor', async () => {
    function Demo() {
      const [loading, setLoading] = useState(true)
      return (
        <>
          <StatCard label="Receita" value="R$ 10,00" loading={loading} />
          <button type="button" onClick={() => setLoading(false)}>
            carregar
          </button>
        </>
      )
    }
    const { container } = emOn(<Demo />)
    expect(container.querySelector('[data-rendra="SKEL-001"]')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'carregar' }))
    expect(container.querySelector('[data-rendra="SKEL-001"]')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('R$ 10,00')).toBeInTheDocument())
  })

  it('em on com movimento reduzido, o valor final aparece sem contar', () => {
    const restore = reduceMotion()
    try {
      emOn(<StatCard label="Receita" value="R$ 1.234,50" />)
      expect(screen.getByText('R$ 1.234,50')).toBeInTheDocument()
    } finally {
      restore()
    }
  })
})
