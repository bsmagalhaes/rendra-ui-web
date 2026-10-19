// @vitest-environment jsdom
import { screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { Accordion } from './accordion'
import type { ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { reduceMotion } from '@/test/motion'

describe('Accordion', () => {
  it('abre e fecha a seção pelo título', async () => {
    const { container } = renderApp(
      <Accordion
        items={[{ value: 'a', title: 'Como pagar?', content: <p>Por boleto ou Pix.</p> }]}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Como pagar?' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Por boleto ou Pix.')).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="ACRN-001"]')).toBeInTheDocument()
  })
})

describe('Accordion com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
  const items = [
    { value: 'a', title: 'Como pagar?', content: <p>Por boleto ou Pix.</p> },
    { value: 'b', title: 'Posso cancelar?', content: <p>Sim, a qualquer hora.</p> },
  ]

  it('em on, abrir mostra o conteúdo; fechar tira o conteúdo do DOM e aria-expanded acompanha', async () => {
    emOn(<Accordion items={items} />)
    const trigger = screen.getByRole('button', { name: 'Como pagar?' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Por boleto ou Pix.')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Por boleto ou Pix.')).toBeVisible()
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryByText('Por boleto ou Pix.')).not.toBeInTheDocument())
  })

  it('em on, single collapsible: abrir outro fecha o primeiro; defaultValue abre já aberto', async () => {
    emOn(<Accordion items={items} defaultValue={['a']} />)
    expect(screen.getByText('Por boleto ou Pix.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Posso cancelar?' }))
    expect(await screen.findByText('Sim, a qualquer hora.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Por boleto ou Pix.')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Como pagar?' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('em on, multiple: abrir vários ao mesmo tempo', async () => {
    emOn(<Accordion items={items} multiple defaultValue={['a']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Posso cancelar?' }))
    expect(await screen.findByText('Sim, a qualquer hora.')).toBeInTheDocument()
    expect(screen.getByText('Por boleto ou Pix.')).toBeInTheDocument()
  })

  it('em on, o conteúdo fechado não fica acessível (nada de hidden=false com filhos)', async () => {
    emOn(<Accordion items={items} />)
    expect(document.querySelector('[role="region"]')).toBeNull()
  })

  it('em on, o conteúdo anima a altura; com movimento reduzido, só opacidade', async () => {
    emOn(<Accordion items={items} defaultValue={['a']} />)
    const content = screen.getByText('Por boleto ou Pix.').parentElement!.parentElement!
    await waitFor(() => expect(content.style.opacity).toBe('1'))
    expect(content.style.height).toBe('auto')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Accordion items={items} defaultValue={['a']} />)
      const reduced = screen.getByText('Por boleto ou Pix.').parentElement!.parentElement!
      await waitFor(() => expect(reduced.style.opacity).toBe('1'))
      expect(reduced.style.transform).toBe('')
    } finally {
      restore()
    }
  })
})
