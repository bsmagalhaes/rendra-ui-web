// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionGlobalConfig } from 'motion/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Modal } from '@/components/ui/modal'
import { MotionProvider } from '@/lib/motion'
import { motionOn, realAnimations } from '@/test/motion'
import { renderApp } from '@/test/render'

function Harness() {
  const [open, setOpen] = useState(true)
  return (
    <MotionProvider mode={motionOn}>
      <Modal open={open} onOpenChange={setOpen} title="Excluir cliente?" />
    </MotionProvider>
  )
}

describe('saída animada de verdade (tempo real, sem skipAnimations)', () => {
  it('ao cancelar, o diálogo ainda existe no instante seguinte e some até 1 s depois', async () => {
    const stop = realAnimations()
    try {
      renderApp(<Harness />)
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      // a saída roda: o nó segue montado logo após o clique (é a prova de que não foi instantâneo)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
        timeout: 1000,
      })
    } finally {
      stop()
    }
    expect(MotionGlobalConfig.skipAnimations).toBe(true)
  })
})
