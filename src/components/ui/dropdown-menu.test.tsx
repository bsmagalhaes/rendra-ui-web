// @vitest-environment jsdom
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { describe, expect, it, expectTypeOf } from 'vitest'
import { renderApp } from '@/test/render'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { DropdownMenu as D } from 'radix-ui'
import { MotionProvider } from '@/lib/motion'
import { expectSettled, motionOn, reduceMotion } from '@/test/motion'

describe('DropdownMenuContent', () => {
  it('abre e usa o código do catálogo', async () => {
    renderApp(
      <DropdownMenu>
        <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Editar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ações' }))
    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('menu')).toHaveAttribute('data-rendra', 'DDM-001')
  })
})

/** Rótulo do gatilho muda com o valor escolhido no submenu: efeito visível fora do menu. */
function MenuComSubitem() {
  const [selecionado, setSelecionado] = useState('Nenhum')
  return (
    <div>
      <p>Selecionado: {selecionado}</p>
      <DropdownMenu>
        <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mais opções</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => setSelecionado('Exportar')}>
                Exportar
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

describe('DropdownMenu com subitens', () => {
  it('abre o submenu, escolhe o subitem e fecha o menu com o efeito aplicado', async () => {
    const user = userEvent.setup()
    renderApp(<MenuComSubitem />)
    await user.click(screen.getByRole('button', { name: 'Ações' }))
    await screen.findByRole('menuitem', { name: 'Mais opções' })
    // Navegação pelo teclado: mais estável que clique em jsdom para menu aninhado.
    await user.keyboard('{ArrowDown}{ArrowRight}')
    await screen.findByRole('menuitem', { name: 'Exportar' })
    await user.keyboard('{ArrowDown}{Enter}')

    expect(await screen.findByText('Selecionado: Exportar')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryAllByRole('menu')).toHaveLength(0))
  })
})

describe('DropdownMenu com motion', () => {
  const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode={motionOn}>{ui}</MotionProvider>)

  it('os Roots aceitam exatamente as props do Radix (mesmos tipos)', () => {
    expectTypeOf<ComponentProps<typeof DropdownMenu>>().toEqualTypeOf<
      ComponentProps<typeof D.Root>
    >()
    expectTypeOf<ComponentProps<typeof DropdownMenuSub>>().toEqualTypeOf<
      ComponentProps<typeof D.Sub>
    >()
  })

  it('em on, abre com o código do catálogo e fechar com Esc tira o menu do DOM', async () => {
    const user = userEvent.setup()
    emOn(
      <DropdownMenu>
        <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Editar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await user.click(screen.getByRole('button', { name: 'Ações' }))
    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('menu')).toHaveAttribute('data-rendra', 'DDM-001')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('em on, escolher um item chama o efeito e fecha o menu', async () => {
    const user = userEvent.setup()
    function Com() {
      const [feito, setFeito] = useState('Nada')
      return (
        <>
          <p>Feito: {feito}</p>
          <DropdownMenu>
            <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setFeito('Editar')}>Editar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )
    }
    emOn(<Com />)
    await user.click(screen.getByRole('button', { name: 'Ações' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }))
    expect(screen.getByText('Feito: Editar')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('em on, o submenu abre, anima e some ao voltar com a seta para a esquerda', async () => {
    const user = userEvent.setup()
    emOn(
      <DropdownMenu>
        <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mais opções</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Exportar</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await user.click(screen.getByRole('button', { name: 'Ações' }))
    await screen.findByRole('menuitem', { name: 'Mais opções' })
    // Abre o submenu só pelo teclado. Um clique no gatilho do submenu manda um pointermove, e o
    // Radix agenda um setTimeout de 100 ms que chama onOpenChange(true) sem conferir o estado:
    // se a seta para a esquerda fechar o submenu antes desse timer, ele reabre e o submenu nunca
    // sai (era a falha intermitente do CI, com a saída animada ainda em curso aos 100 ms).
    await user.keyboard('{ArrowDown}{ArrowRight}')
    const item = await screen.findByRole('menuitem', { name: 'Exportar' })
    // A seta para a esquerda só fecha se o foco já estiver dentro do submenu.
    const submenu = item.closest('[role="menu"]') as HTMLElement
    await waitFor(() => expect(submenu).toContainElement(document.activeElement as HTMLElement))
    await user.keyboard('{ArrowLeft}')
    // Com as animações do teste desligadas (setup.ts) a saída termina no quadro seguinte; o
    // waitFor cobre esse quadro (a espera é por um estado, não por tempo fixo).
    await waitFor(() => expect(item).not.toBeInTheDocument(), { timeout: 5_000 })
    expect(screen.getByRole('menuitem', { name: 'Mais opções' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  }, 20_000)

  it('em on, o menu é animado por transform; com movimento reduzido, só opacidade', async () => {
    const user = userEvent.setup()
    const ui = (
      <DropdownMenu>
        <DropdownMenuTrigger>Ações</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Editar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    emOn(ui)
    await user.click(screen.getByRole('button', { name: 'Ações' }))
    await expectSettled(await screen.findByRole('menu'), 'none')
    cleanup()
    const restore = reduceMotion()
    try {
      emOn(ui)
      await user.click(screen.getByRole('button', { name: 'Ações' }))
      await expectSettled(await screen.findByRole('menu'), 'absent')
    } finally {
      restore()
    }
  })
})
