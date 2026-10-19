// @vitest-environment jsdom
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './select'
import type { ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, reduceMotion } from '@/test/motion'

const options = [
  { value: 'sp', label: 'São Paulo' },
  { value: 'rj', label: 'Rio de Janeiro' },
  { value: 'mg', label: 'Minas Gerais' },
]

const open = () => userEvent.click(screen.getByRole('combobox', { name: 'Estado' }))

describe('Select', () => {
  it('abre a lista e escolhe uma opção', async () => {
    const onChange = vi.fn()
    render(<Select label="Estado" options={options} onChange={onChange} />)
    await open()
    await userEvent.click(await screen.findByRole('option', { name: /Rio de Janeiro/ }))
    expect(onChange).toHaveBeenCalledWith('rj')
    expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveTextContent('Rio de Janeiro')
    expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveAttribute(
      'data-rendra',
      'SEL-001',
    )
  })

  it('com busca, filtra as opções pelo texto', async () => {
    render(<Select label="Estado" options={options} searchable />)
    await open()
    await userEvent.type(await screen.findByPlaceholderText('Buscar...'), 'minas')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option', { name: /Minas Gerais/ })).toBeInTheDocument()
  })

  it('múltiplo: marca várias e selecionar todos marca o resto', async () => {
    const onChange = vi.fn()
    render(<Select label="Estado" options={options} multiple selectAll onChange={onChange} />)
    await open()
    await userEvent.click(await screen.findByRole('option', { name: /São Paulo/ }))
    expect(onChange).toHaveBeenLastCalledWith(['sp'])
    await userEvent.click(screen.getByRole('option', { name: /Selecionar todos/ }))
    expect(onChange).toHaveBeenLastCalledWith(['sp', 'rj', 'mg'])
  })

  it('cria uma opção nova a partir do texto digitado', async () => {
    const onCreate = vi.fn((label: string) => ({ value: 'es', label }))
    const onChange = vi.fn()
    render(
      <Select
        label="Estado"
        options={options}
        searchable
        creatable
        onCreate={onCreate}
        onChange={onChange}
      />,
    )
    await open()
    await userEvent.type(await screen.findByPlaceholderText('Buscar ou criar...'), 'Espírito Santo')
    await userEvent.click(await screen.findByRole('option', { name: /Criar/ }))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('es'))
    expect(onCreate).toHaveBeenCalledWith('Espírito Santo')
  })

  it('limpar volta para vazio', async () => {
    const onChange = vi.fn()
    render(<Select label="Estado" options={options} value="sp" clearable onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('desativado não abre', async () => {
    render(<Select label="Estado" options={options} disabled />)
    await open()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  describe('múltiplo: "Selecionar todos" automático', () => {
    const make = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Item ${i}` }))

    it('com 6 opções aparece sem a prop', async () => {
      render(<Select label="Estado" options={make(6)} multiple />)
      await open()
      expect(await screen.findByRole('option', { name: /Selecionar todos/ })).toBeInTheDocument()
    })

    it('com 5 opções não aparece', async () => {
      render(<Select label="Estado" options={make(5)} multiple />)
      await open()
      await screen.findByRole('option', { name: /Item 0/ })
      expect(screen.queryByText(/Selecionar todos/)).not.toBeInTheDocument()
    })

    it('com 5 opções e selectAll aparece', async () => {
      render(<Select label="Estado" options={make(5)} multiple selectAll />)
      await open()
      expect(await screen.findByRole('option', { name: /Selecionar todos/ })).toBeInTheDocument()
    })

    it('selectAll={false} com 6 opções não aparece', async () => {
      render(<Select label="Estado" options={make(6)} multiple selectAll={false} />)
      await open()
      await screen.findByRole('option', { name: /Item 0/ })
      expect(screen.queryByText(/Selecionar todos/)).not.toBeInTheDocument()
    })

    it('o texto vira "Desmarcar todos" com tudo marcado e volta depois', async () => {
      render(<Select label="Estado" options={make(6)} multiple />)
      await open()
      await userEvent.click(await screen.findByRole('option', { name: /Selecionar todos/ }))
      expect(await screen.findByRole('option', { name: /Desmarcar todos/ })).toBeInTheDocument()
      expect(screen.queryByText('Selecionar todos')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('option', { name: /Item 0/ }))
      expect(await screen.findByRole('option', { name: /Selecionar todos/ })).toBeInTheDocument()
      expect(screen.queryByText('Desmarcar todos')).not.toBeInTheDocument()
    })
  })
})

describe('Select com motion', () => {
  const emOn = (ui: ReactNode) => render(<MotionProvider mode="on">{ui}</MotionProvider>)

  it('em on, no desktop: abre a lista, escolhe e a lista sai do DOM', async () => {
    const onChange = vi.fn()
    emOn(<Select label="Estado" options={options} onChange={onChange} />)
    await open()
    await userEvent.click(await screen.findByRole('option', { name: /Rio de Janeiro/ }))
    expect(onChange).toHaveBeenCalledWith('rj')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveTextContent('Rio de Janeiro')
  })

  it('em on, no mobile: o bottom sheet abre e, ao escolher, sai do DOM', async () => {
    ;(globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(360)
    try {
      const onChange = vi.fn()
      emOn(<Select label="Estado" options={options} onChange={onChange} />)
      await open()
      expect(await screen.findByRole('dialog')).toBeInTheDocument()
      await userEvent.click(await screen.findByRole('option', { name: /Minas Gerais/ }))
      expect(onChange).toHaveBeenCalledWith('mg')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    } finally {
      ;(globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(1280)
    }
  })

  it('em on, o painel é animado por transform; com movimento reduzido, só opacidade', async () => {
    emOn(<Select label="Estado" options={options} />)
    await open()
    const panel = (await screen.findByRole('listbox')).parentElement!.parentElement!
    await expectSettled(panel, 'none')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<Select label="Estado" options={options} />)
      await open()
      const reduced = (await screen.findByRole('listbox')).parentElement!.parentElement!
      await expectSettled(reduced, 'absent')
    } finally {
      restore()
    }
  })
})
