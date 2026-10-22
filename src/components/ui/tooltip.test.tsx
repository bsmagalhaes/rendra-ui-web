// @vitest-environment jsdom
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { Tooltip } from './tooltip'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, motionOn, reduceMotion } from '@/test/motion'

describe('Tooltip', () => {
  it('mostra o conteúdo ao focar o gatilho e some ao apertar Esc', async () => {
    const user = userEvent.setup()
    renderApp(
      <Tooltip content="Configurações">
        <button type="button">Ícone</button>
      </Tooltip>,
    )
    await user.tab()
    const content = await screen.findByText('Configurações')
    expect(content).toHaveAttribute('data-rendra', 'TIP-001')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Configurações')).not.toBeInTheDocument())
  })
})

describe('Tooltip com motion', () => {
  const emOn = () =>
    renderApp(
      <MotionProvider mode={motionOn}>
        <Tooltip content="Configurações">
          <button type="button">Ícone</button>
        </Tooltip>
      </MotionProvider>,
    )

  it('em on, mostra ao focar, com o código do catálogo, e some do DOM com Esc', async () => {
    const user = userEvent.setup()
    emOn()
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
    await user.tab()
    expect(await screen.findByText('Configurações')).toHaveAttribute('data-rendra', 'TIP-001')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Configurações')).not.toBeInTheDocument())
  })

  it('em on, respeita o atraso do provider: passar o mouse não abre na hora', async () => {
    const user = userEvent.setup()
    emOn()
    await user.hover(screen.getByRole('button', { name: 'Ícone' }))
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
    expect(await screen.findByText('Configurações', {}, { timeout: 2000 })).toBeInTheDocument()
  })

  it('disabled devolve só o filho, também em on', () => {
    renderApp(
      <MotionProvider mode={motionOn}>
        <Tooltip content="Configurações" disabled>
          <button type="button">Ícone</button>
        </Tooltip>
      </MotionProvider>,
    )
    expect(screen.getByRole('button', { name: 'Ícone' })).toBeInTheDocument()
  })

  it('em on, o conteúdo é animado por transform; com movimento reduzido, só opacidade', async () => {
    const user = userEvent.setup()
    emOn()
    await user.tab()
    await expectSettled(await screen.findByText('Configurações'), 'none')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn()
      await user.tab()
      await expectSettled(await screen.findByText('Configurações'), 'absent')
    } finally {
      restore()
    }
  })
})
