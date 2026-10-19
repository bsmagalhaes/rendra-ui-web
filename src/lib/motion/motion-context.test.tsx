// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { m } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { MotionModeScope, MotionProvider, useMotionMode } from './motion-context'

function Probe() {
  return <p>modo: {useMotionMode()}</p>
}

describe('MotionProvider', () => {
  it('sem provider, o modo é off', () => {
    render(<Probe />)
    expect(screen.getByText('modo: off')).toBeInTheDocument()
  })

  it('mode="on" entrega on', () => {
    render(
      <MotionProvider mode="on">
        <Probe />
      </MotionProvider>,
    )
    expect(screen.getByText('modo: on')).toBeInTheDocument()
  })

  it('mode="off" entrega off e não acrescenta nenhum nó ao DOM', () => {
    const nu = render(<p>filho</p>).container.innerHTML
    const { container } = render(
      <MotionProvider mode="off">
        <p>filho</p>
      </MotionProvider>,
    )
    expect(container.innerHTML).toBe(nu)
  })

  it('on dentro de off e off dentro de on: vale o mais interno', () => {
    render(
      <MotionProvider mode="off">
        <MotionProvider mode="on">
          <Probe />
        </MotionProvider>
      </MotionProvider>,
    )
    expect(screen.getByText('modo: on')).toBeInTheDocument()
    render(
      <MotionProvider mode="on">
        <MotionModeScope mode="off">
          <p>
            <Probe />
          </p>
        </MotionModeScope>
      </MotionProvider>,
    )
    expect(screen.getByText('modo: off')).toBeInTheDocument()
  })

  it('em on, um m.div com layout carrega o domMax sob demanda e renderiza sem erro', async () => {
    render(
      <MotionProvider mode="on">
        <m.div layout data-testid="alvo">
          conteúdo
        </m.div>
      </MotionProvider>,
    )
    expect(screen.getByTestId('alvo')).toHaveTextContent('conteúdo')
    // o carregador assíncrono termina e o elemento segue montado
    await waitFor(() => expect(screen.getByTestId('alvo')).toBeInTheDocument())
  })
})
