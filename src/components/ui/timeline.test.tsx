// @vitest-environment jsdom
import { screen, cleanup, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'
import { Timeline } from './timeline'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, reduceMotion } from '@/test/motion'

describe('Timeline', () => {
  it('usa o código do catálogo', () => {
    renderApp(<Timeline events={[{ id: '1', title: 'Criado', date: '22/09/2026 10:00' }]} />)
    expect(screen.getByText('Criado').closest('[data-rendra="TLN-001"]')).toBeInTheDocument()
  })

  it('status mostra o texto do resultado (nunca só a cor): sucesso, falha e ignorado', () => {
    renderApp(
      <Timeline
        events={[
          { id: '1', title: 'Contrato assinado', date: '22/09/2026', status: 'succeeded' },
          { id: '2', title: 'Cobrança recusada', date: '15/09/2026', status: 'failed' },
          { id: '3', title: 'Lembrete ignorado', date: '13/09/2026', status: 'skipped' },
          { id: '4', title: 'Cadastro', date: '02/09/2026' },
        ]}
      />,
    )
    expect(screen.getByText('Concluído')).toBeInTheDocument()
    expect(screen.getByText('Falhou')).toBeInTheDocument()
    expect(screen.getByText('Ignorado')).toBeInTheDocument()
    // Sem status, nenhum dos três textos aparece perto do evento "Cadastro".
    expect(screen.queryAllByText('Concluído')).toHaveLength(1)
  })
})

describe('Timeline com motion', () => {
  const eventos = [
    { id: '1', title: 'Criado', date: '22/09/2026 10:00' },
    { id: '2', title: 'Enviado', date: '22/09/2026 11:00', status: 'succeeded' as const },
    { id: '3', title: 'Lido', date: '22/09/2026 12:00' },
  ]

  it('em on, todos os eventos aparecem na ordem, dentro da raiz com o código do catálogo', async () => {
    renderApp(
      <MotionProvider mode="on">
        <Timeline events={eventos} />
      </MotionProvider>,
    )
    const itens = screen.getAllByRole('listitem')
    expect(itens.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Criado'),
      expect.stringContaining('Enviado'),
      expect.stringContaining('Lido'),
    ])
    expect(itens[0]!.closest('[data-rendra="TLN-001"]')).toBeInTheDocument()
    for (const li of itens) await waitFor(() => expect(li.style.opacity).toBe('1'))
  })

  it('em on, os eventos entram por deslocamento curto; reduzido, só por opacidade', async () => {
    const ui = (
      <MotionProvider mode="on">
        <Timeline events={eventos} />
      </MotionProvider>
    )
    renderApp(ui)
    await expectSettled(screen.getAllByRole('listitem')[2]!, 'none')
    cleanup()
    const restore = reduceMotion()
    try {
      renderApp(ui)
      await expectSettled(screen.getAllByRole('listitem')[2]!, 'absent')
    } finally {
      restore()
    }
  })
})
