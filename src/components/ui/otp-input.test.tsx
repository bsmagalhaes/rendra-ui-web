// @vitest-environment jsdom
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { OtpInput } from './otp-input'
import type { ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { reduceMotion } from '@/test/motion'

describe('OtpInput', () => {
  it('colar o código preenche tudo e completa', async () => {
    const onComplete = vi.fn()
    function Harness() {
      const [v, setV] = useState('')
      return <OtpInput value={v} onChange={setV} onComplete={onComplete} />
    }
    const { container } = renderApp(<Harness />)
    const [first] = screen.getAllByRole('textbox')
    await userEvent.click(first!)
    await userEvent.paste('123456')
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('123456'))
    expect(container.querySelector('[data-rendra="OTP-001"]')).toBeInTheDocument()
  })

  it('digitar um dígito move o foco para a caixa seguinte e preencher tudo completa (efeito visível, não só o callback)', async () => {
    const onComplete = vi.fn()
    function Harness() {
      const [v, setV] = useState('')
      return <OtpInput value={v} onChange={setV} onComplete={onComplete} />
    }
    renderApp(<Harness />)
    const boxes = screen.getAllByRole('textbox')
    await userEvent.click(boxes[0]!)
    for (const [i, digit] of ['1', '2', '3', '4', '5'].entries()) {
      await userEvent.keyboard(digit)
      expect(document.activeElement).toBe(boxes[i + 1])
    }
    await userEvent.keyboard('6')
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('123456'))
    // Efeito visível: cada caixa mostra o próprio dígito.
    boxes.forEach((box, i) => expect(box).toHaveValue(String(i + 1)))
  })

  it('no celular usa o espaço menor entre as casas (44px de toque dentro de um card em 360px)', () => {
    const { container } = renderApp(<OtpInput value="" onChange={() => {}} />)
    const group = container.querySelector('[data-rendra="OTP-001"]')
    expect(group).toHaveClass('gap-1', 'sm:gap-2')
    expect(group).not.toHaveClass('gap-2')
  })
})

describe('OtpInput com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
  function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
    const [v, setV] = useState('')
    return <OtpInput value={v} onChange={setV} onComplete={onComplete} />
  }

  it('em on: digitar preenche e avança o foco como em off, e completar chama onComplete', async () => {
    const onComplete = vi.fn()
    emOn(<Harness onComplete={onComplete} />)
    const boxes = screen.getAllByRole('textbox')
    await userEvent.click(boxes[0]!)
    for (const [i, digit] of ['1', '2', '3', '4', '5'].entries()) {
      await userEvent.keyboard(digit)
      expect(document.activeElement).toBe(boxes[i + 1])
    }
    await userEvent.keyboard('6')
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('123456'))
    boxes.forEach((box, i) => expect(box).toHaveValue(String(i + 1)))
  })

  it('em on, colar o código preenche tudo; invalid mantém a borda destrutiva', async () => {
    const onComplete = vi.fn()
    const { container } = emOn(
      <OtpInput value="" onChange={() => {}} onComplete={onComplete} invalid />,
    )
    const [first] = screen.getAllByRole('textbox')
    expect(first).toHaveClass('border-destructive')
    expect(container.querySelector('[data-rendra="OTP-001"]')).toBeInTheDocument()
  })

  it('em on, a célula preenchida faz o salto curto (transform final none) e a vazia não tem transform; reduzido, nenhuma tem', async () => {
    emOn(<OtpInput value="12" onChange={() => {}} />)
    const boxes = screen.getAllByRole('textbox')
    await waitFor(() => expect(boxes[0]!.style.transform).toBe('none'))
    expect(boxes[1]!.style.transform).toBe('none')
    expect(boxes[2]!.style.transform).toBe('')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(<OtpInput value="12" onChange={() => {}} />)
      expect(screen.getAllByRole('textbox')[0]!.style.transform).toBe('')
    } finally {
      restore()
    }
  })
})
