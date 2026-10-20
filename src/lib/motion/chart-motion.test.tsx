// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import {
  cloneElement,
  createElement,
  forwardRef,
  type ComponentType,
  type ReactElement,
} from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '@/components/ui/chart'
import { MotionProvider } from '@/lib/motion'
import { reduceMotion } from '@/test/motion'
import { renderApp } from '@/test/render'

/*
 * O recharts não desenha no jsdom (sem tamanho), então a duração e a curva que o gráfico passa
 * para ele são conferidas nas props de cada série. O componente real continua montado por baixo.
 */
const seen = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }))
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  // Sem tamanho o ResponsiveContainer do jsdom não monta os filhos: entrega um tamanho fixo.
  const Sized = ({ children }: { children: ReactElement<Record<string, unknown>> }) =>
    cloneElement(children, { width: 400, height: 300 })
  const spy = (Original: ComponentType<Record<string, unknown>>) =>
    forwardRef<unknown, Record<string, unknown>>((props, ref) => {
      seen.props.push(props)
      return createElement(Original, { ...props, ref })
    })
  return {
    ...actual,
    Bar: spy(actual.Bar as never),
    Line: spy(actual.Line as never),
    Area: spy(actual.Area as never),
    Pie: spy(actual.Pie as never),
    ResponsiveContainer: Sized,
  }
})

const data = [
  { mes: 'Jan', valor: 10 },
  { mes: 'Fev', valor: 12 },
]
const series = [{ key: 'valor', label: 'Valor' }]

describe.each(['bar', 'line', 'area', 'pie'] as const)('Chart %s com motion', (type) => {
  it('em on liga a entrada do recharts com a duração e a curva dos presets', () => {
    seen.props.length = 0
    renderApp(
      <MotionProvider mode="on">
        <Chart type={type} aria-label="Vendas" data={data} xKey="mes" series={series} />
      </MotionProvider>,
    )
    expect(seen.props.length).toBeGreaterThan(0)
    for (const p of seen.props) {
      expect(p.animationDuration).toBe(900)
      expect(p.animationEasing).toBe('cubic-bezier(0.22,1,0.36,1)')
      expect(p.isAnimationActive).toBe(true)
    }
  })

  it('em off não recebe nenhuma prop nova de animação', () => {
    seen.props.length = 0
    renderApp(<Chart type={type} aria-label="Vendas" data={data} xKey="mes" series={series} />)
    expect(seen.props.length).toBeGreaterThan(0)
    for (const p of seen.props) {
      expect('animationDuration' in p).toBe(false)
      expect('animationEasing' in p).toBe(false)
    }
  })

  it('em on com movimento reduzido, a animação segue desligada (lógica de antes)', () => {
    const restore = reduceMotion()
    try {
      seen.props.length = 0
      renderApp(
        <MotionProvider mode="on">
          <Chart type={type} aria-label="Vendas" data={data} xKey="mes" series={series} />
        </MotionProvider>,
      )
      for (const p of seen.props) expect(p.isAnimationActive).toBe(false)
    } finally {
      restore()
    }
  })
})

describe('Gauge e Funnel com motion', () => {
  it('em on, a agulha do gauge anima de 0 até o valor e o gauge mantém o código e o texto', async () => {
    renderApp(
      <MotionProvider mode="on">
        <Chart type="gauge" aria-label="Meta do mês" value={80} max={100} />
      </MotionProvider>,
    )
    const figure = screen.getByRole('figure', { name: 'Meta do mês' })
    expect(figure).toHaveAttribute('data-rendra', 'CHT-006')
    const needle = figure.querySelector('line')!
    await vi.waitFor(() => {
      // 80% do arco: o ponteiro termina fora do ponto inicial (0%)
      expect(Number(needle.getAttribute('x2'))).toBeGreaterThan(120)
    })
  })

  it('em on, o funil entra com fade e mantém o código e as etapas', async () => {
    renderApp(
      <MotionProvider mode="on">
        <Chart
          type="funnel"
          aria-label="Funil de vendas"
          stages={[
            { label: 'Topo', value: 100 },
            { label: 'Fundo', value: 20 },
          ]}
        />
      </MotionProvider>,
    )
    const figure = screen.getByRole('figure', { name: 'Funil de vendas' })
    expect(figure).toHaveAttribute('data-rendra', 'CHT-007')
    expect(screen.getByText('Topo')).toBeInTheDocument()
    await vi.waitFor(() => expect(figure.style.opacity).toBe('1'))
  })
})
