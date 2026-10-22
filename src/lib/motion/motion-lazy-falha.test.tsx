// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/*
 * `motion="on"` (texto) quando o chunk do Motion não carrega (rede caiu, arquivo removido do
 * servidor): a tela segue em `off`, nada lança e o aviso sai uma única vez.
 */
vi.mock('./motion-on', () => {
  throw new Error('rede caiu')
})

import { MotionProvider, useMotionMode } from './motion-context'

function Modo() {
  return <p>modo: {useMotionMode()}</p>
}

describe('motion="on" (texto) sem o chunk', () => {
  it('continua em off, não lança e avisa uma única vez, mesmo remontando o provider (a falha fica guardada)', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ui = (mode: 'on' | 'off') => (
      <MotionProvider mode={mode}>
        <Modo />
      </MotionProvider>
    )
    const { rerender } = render(ui('on'))
    await waitFor(() => expect(aviso).toHaveBeenCalled())
    expect(screen.getByText('modo: off')).toBeInTheDocument()
    rerender(ui('off'))
    rerender(ui('on'))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.getByText('modo: off')).toBeInTheDocument()
    expect(aviso.mock.calls.filter((a) => String(a[0]).startsWith('Rendra:'))).toHaveLength(1)
    aviso.mockRestore()
  })
})
