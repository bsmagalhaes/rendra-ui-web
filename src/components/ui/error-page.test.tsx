// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { activeBrand, availableBrands, availablePalettes, BrandProvider } from '@/brand'
import { RendraRouterBridge } from '@/components/rendra-router-bridge'
import { renderApp } from '@/test/render'
import { ErrorPage } from './error-page'

/** Roteador de memória de verdade (react-router), para provar a navegação real. */
function buildRouter(entries: string[], initialIndex = entries.length - 1) {
  return createMemoryRouter(
    [
      {
        element: (
          <RendraRouterBridge>
            <BrandProvider
              brands={availableBrands}
              palettes={availablePalettes}
              defaultBrand={activeBrand}
              forcedMode="light"
            >
              <Outlet />
            </BrandProvider>
          </RendraRouterBridge>
        ),
        children: [
          { path: '/', element: <span>Painel</span> },
          { path: '/pagina-inexistente', element: <ErrorPage code={404} /> },
        ],
      },
    ],
    { initialEntries: entries, initialIndex },
  )
}

describe('ErrorPage', () => {
  it('404 mostra o título e usa o código do catálogo', () => {
    const { container } = renderApp(<ErrorPage code={404} />)
    expect(screen.getByText('Página não encontrada')).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="ERRO-001"]')).toBeInTheDocument()
  })

  it('Voltar navega de fato para a entrada anterior do histórico', async () => {
    const router = buildRouter(['/', '/pagina-inexistente'])
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Página não encontrada')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Painel')).toBeInTheDocument()
  })

  it('o link "Ir para o painel" navega de fato para a rota raiz', async () => {
    const router = buildRouter(['/pagina-inexistente'])
    render(<RouterProvider router={router} />)

    await userEvent.click(screen.getByRole('link', { name: /painel/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Painel')).toBeInTheDocument()
  })

  it('500: Tentar de novo mostra o título; o recarregamento entra só como espião complementar', async () => {
    const reload = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    })
    try {
      renderApp(<ErrorPage code={500} />)
      expect(screen.getByText('Algo deu errado do nosso lado')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  describe('back={false}', () => {
    it('padrão: Voltar aparece e a ação principal ocupa 7 de 10 colunas', () => {
      renderApp(<ErrorPage code={404} />)
      expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /painel/i }).className).toContain('col-span-7')
    })

    it('404 sem Voltar: só o link do painel, na largura toda', () => {
      renderApp(<ErrorPage code={404} back={false} />)
      expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()
      const link = screen.getByRole('link', { name: /painel/i })
      expect(link.className).toContain('col-span-10')
      expect(link.className).not.toContain('col-span-7')
    })

    it('500 sem Voltar: Tentar de novo na largura toda e recarrega a página', async () => {
      const reload = vi.fn()
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, reload },
      })
      try {
        renderApp(<ErrorPage code={500} back={false} />)
        expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()
        const botao = screen.getByRole('button', { name: 'Tentar de novo' })
        expect(botao.className).toContain('col-span-10')
        expect(botao.className).not.toContain('col-span-7')
        await userEvent.click(botao)
        expect(reload).toHaveBeenCalledTimes(1)
      } finally {
        Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
      }
    })
  })
})
