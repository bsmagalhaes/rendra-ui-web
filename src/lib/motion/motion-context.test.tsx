// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { m } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { MotionModeScope, MotionProvider, useLayoutReady, useMotionMode } from './motion-context'

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

  it('em on, quem lê o modo renderiza de novo quando o chunk do domMax chega (m.* ganha o nó de projeção do layout); em off não', async () => {
    let renders = 0
    function Contador() {
      renders++
      return <p>modo: {useMotionMode()}</p>
    }
    const { unmount } = render(
      <MotionProvider mode="on">
        <Contador />
      </MotionProvider>,
    )
    const aoMontar = renders
    await waitFor(() => expect(renders).toBeGreaterThan(aoMontar))
    unmount()
    renders = 0
    render(
      <MotionProvider mode="off">
        <Contador />
      </MotionProvider>,
    )
    await new Promise((r) => setTimeout(r, 100))
    expect(renders).toBe(1)
  })

  it('useLayoutReady: false até o domMax chegar e true depois, só em on', async () => {
    function Pronto() {
      return <p>pronto: {String(useLayoutReady())}</p>
    }
    render(
      <MotionProvider mode="on">
        <Pronto />
      </MotionProvider>,
    )
    expect(screen.getByText('pronto: false')).toBeInTheDocument()
    expect(await screen.findByText('pronto: true')).toBeInTheDocument()
    cleanup()
    render(
      <MotionProvider mode="off">
        <Pronto />
      </MotionProvider>,
    )
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.getByText('pronto: false')).toBeInTheDocument()
  })
})
