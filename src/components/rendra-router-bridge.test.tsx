// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import {
  useCurrentPath,
  useRendraBreadcrumbs,
  useRendraNavigate,
} from '@/components/rendra-provider'
import { useMotionMode } from '@/lib/motion'
import { motionOn } from '@/test/motion'
import { RendraRouterBridge } from './rendra-router-bridge'

function Crumbs() {
  const crumbs = useRendraBreadcrumbs()
  return (
    <ul>
      {crumbs.map((c) => (
        <li key={c.label}>{c.to ? `${c.label}:${c.to}` : c.label}</li>
      ))}
    </ul>
  )
}

function PathAndNav() {
  const pathname = useCurrentPath()
  const { navigate, goBack } = useRendraNavigate()
  return (
    <div>
      <span>Caminho: {pathname}</span>
      <button onClick={() => navigate('/destino')}>Ir</button>
      <button onClick={() => goBack()}>Voltar</button>
    </div>
  )
}

function Screen() {
  return (
    <>
      <Crumbs />
      <PathAndNav />
    </>
  )
}

function buildRouter(initialPath: string) {
  return createMemoryRouter(
    [
      {
        element: <RendraRouterBridge />,
        children: [
          {
            path: '/',
            handle: { crumb: 'Início' },
            children: [
              {
                path: 'clientes/:id',
                handle: {
                  crumb: (params: Record<string, string | undefined>) => `Cliente ${params.id}`,
                },
                element: <Screen />,
              },
            ],
          },
          { path: '*', element: <Screen /> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
}

describe('RendraRouterBridge', () => {
  it('monta a trilha com crumb string (ancestral) e crumb função (rota atual)', () => {
    const router = buildRouter('/clientes/42')
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Início:/')).toBeInTheDocument()
    expect(screen.getByText('Cliente 42')).toBeInTheDocument()
  })

  it('useCurrentPath reflete o caminho do react-router', () => {
    const router = buildRouter('/clientes/42')
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Caminho: /clientes/42')).toBeInTheDocument()
  })

  it('navigate leva a um novo caminho e goBack retorna', async () => {
    const router = buildRouter('/clientes/42')
    render(<RouterProvider router={router} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Ir'))
    expect(router.state.location.pathname).toBe('/destino')
    await user.click(screen.getByText('Voltar'))
    expect(router.state.location.pathname).toBe('/clientes/42')
  })

  it('navigate e goBack mantêm a mesma referência entre renderizações (useCallback)', async () => {
    const seen: { navigate: unknown; goBack: unknown }[] = []
    function Capture() {
      const pathname = useCurrentPath()
      const { navigate, goBack } = useRendraNavigate()
      seen.push({ navigate, goBack })
      return <span>Caminho: {pathname}</span>
    }
    const router = createMemoryRouter(
      [{ element: <RendraRouterBridge />, children: [{ path: '*', element: <Capture /> }] }],
      { initialEntries: ['/a'] },
    )
    render(<RouterProvider router={router} />)
    // Navega de verdade (muda o caminho) para forçar uma nova renderização real do
    // componente, não um simples `rerender` com as mesmas props.
    await router.navigate('/b')
    expect(await screen.findByText('Caminho: /b')).toBeInTheDocument()
    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen[0]?.navigate).toBe(seen[seen.length - 1]?.navigate)
    expect(seen[0]?.goBack).toBe(seen[seen.length - 1]?.goBack)
  })

  it('sem children, renderiza o Outlet da rota', () => {
    const router = createMemoryRouter(
      [
        {
          element: <RendraRouterBridge />,
          children: [{ path: '*', element: <span>Conteúdo da rota</span> }],
        },
      ],
      { initialEntries: ['/qualquer'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Conteúdo da rota')).toBeInTheDocument()
  })

  it('repassa a prop motion ao provider; sem ela, o modo é off', () => {
    function Modo() {
      return <span>modo: {useMotionMode()}</span>
    }
    const monta = (motion?: typeof motionOn) =>
      render(
        <RouterProvider
          router={createMemoryRouter([
            {
              element: <RendraRouterBridge motion={motion} />,
              children: [{ path: '*', element: <Modo /> }],
            },
          ])}
        />,
      )
    monta()
    expect(screen.getByText('modo: off')).toBeInTheDocument()
    monta(motionOn)
    expect(screen.getByText('modo: on')).toBeInTheDocument()
  })
})
