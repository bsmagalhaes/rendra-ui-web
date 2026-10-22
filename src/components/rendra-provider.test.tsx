// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnchorHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMotionMode } from '@/lib/motion'
import { motionOn } from '@/test/motion'
import {
  RendraProvider,
  useCurrentPath,
  useRendraBreadcrumbs,
  useRendraLink,
  useRendraNavigate,
  type RendraLinkProps,
} from './rendra-provider'

/** Link falso, sem react-router nenhum: prova que o `linkComponent` do provider é usado. */
function FakeLink({ to, children, ...rest }: RendraLinkProps) {
  return (
    <a href={to} data-fake="1" {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </a>
  )
}

/**
 * jsdom não deixa espionar `window.location.assign`/`replace` direto (propriedade não
 * configurável). Troca `window.location` por uma cópia com os métodos como espiões.
 */
function stubLocation(overrides: Partial<Location>) {
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...original, ...overrides },
  })
  return () => Object.defineProperty(window, 'location', { configurable: true, value: original })
}

/** Componente de teste que expõe os hooks do RendraProvider na tela. */
function Probe() {
  const Link = useRendraLink()
  const path = useCurrentPath()
  const { navigate, goBack } = useRendraNavigate()
  const crumbs = useRendraBreadcrumbs()
  return (
    <div>
      <span data-testid="path">{path}</span>
      <span data-testid="crumbs">{crumbs.map((c) => c.label).join(',')}</span>
      <Link to="/destino">Ir</Link>
      <button type="button" onClick={() => navigate('/destino')}>
        Navegar
      </button>
      <button type="button" onClick={goBack}>
        Voltar
      </button>
    </div>
  )
}

describe('RendraProvider', () => {
  describe('sem provider na árvore', () => {
    afterEach(() => vi.restoreAllMocks())

    it('o link cai para um <a href> simples', () => {
      render(<Probe />)
      const link = screen.getByRole('link', { name: 'Ir' })
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href', '/destino')
    })

    it('useCurrentPath lê window.location.pathname', () => {
      render(<Probe />)
      expect(screen.getByTestId('path')).toHaveTextContent(window.location.pathname)
    })

    it('navigate usa window.location.assign', async () => {
      const assign = vi.fn()
      const restore = stubLocation({ assign })
      render(<Probe />)
      await userEvent.click(screen.getByRole('button', { name: 'Navegar' }))
      expect(assign).toHaveBeenCalledWith('/destino')
      restore()
    })

    it('navigate com replace usa window.location.replace', async () => {
      const replaceFn = vi.fn()
      const restore = stubLocation({ replace: replaceFn })
      function ReplaceProbe() {
        const { navigate } = useRendraNavigate()
        return (
          <button type="button" onClick={() => navigate('/destino', { replace: true })}>
            Substituir
          </button>
        )
      }
      render(<ReplaceProbe />)
      await userEvent.click(screen.getByRole('button', { name: 'Substituir' }))
      expect(replaceFn).toHaveBeenCalledWith('/destino')
      restore()
    })

    it('goBack usa history.back', async () => {
      const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
      render(<Probe />)
      await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
      expect(back).toHaveBeenCalled()
    })

    it('useRendraBreadcrumbs devolve lista vazia', () => {
      render(<Probe />)
      expect(screen.getByTestId('crumbs')).toHaveTextContent('')
    })
  })

  describe('com provider na árvore', () => {
    it('usa o linkComponent, o navigate, o goBack e a trilha informados', async () => {
      const navigate = vi.fn()
      const goBack = vi.fn()
      render(
        <RendraProvider
          linkComponent={FakeLink}
          useCurrentPath={() => '/rota-falsa'}
          navigate={navigate}
          goBack={goBack}
          useBreadcrumbs={() => [{ label: 'Início', to: '/' }, { label: 'Atual' }]}
        >
          <Probe />
        </RendraProvider>,
      )
      const link = screen.getByRole('link', { name: 'Ir' })
      expect(link).toHaveAttribute('data-fake', '1')
      expect(screen.getByTestId('path')).toHaveTextContent('/rota-falsa')
      expect(screen.getByTestId('crumbs')).toHaveTextContent('Início,Atual')

      await userEvent.click(screen.getByRole('button', { name: 'Navegar' }))
      expect(navigate).toHaveBeenCalledWith('/destino')

      await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
      expect(goBack).toHaveBeenCalled()
    })
  })

  describe('prop motion', () => {
    const props = {
      linkComponent: FakeLink,
      useCurrentPath: () => '/',
      navigate: () => {},
      goBack: () => {},
    }
    function Modo() {
      return <p>modo: {useMotionMode()}</p>
    }

    it('sem provider, o modo de motion é off', () => {
      render(<Modo />)
      expect(screen.getByText('modo: off')).toBeInTheDocument()
    })

    it('com o provider e sem a prop, continua off e o DOM é o de sempre', () => {
      const semProvider = render(<p>filho</p>).container.innerHTML
      const { container } = render(
        <RendraProvider {...props}>
          <p>filho</p>
        </RendraProvider>,
      )
      expect(container.innerHTML).toBe(semProvider)
      render(
        <RendraProvider {...props}>
          <Modo />
        </RendraProvider>,
      )
      expect(screen.getByText('modo: off')).toBeInTheDocument()
    })

    it('motion={objeto} liga o modo na hora, para os componentes de dentro', () => {
      render(
        <RendraProvider {...props} motion={motionOn}>
          <Modo />
        </RendraProvider>,
      )
      expect(screen.getByText('modo: on')).toBeInTheDocument()
    })

    it('motion="on" (texto) começa em off e liga quando o chunk do Motion chega', async () => {
      render(
        <RendraProvider {...props} motion="on">
          <Modo />
        </RendraProvider>,
      )
      expect(screen.getByText('modo: off')).toBeInTheDocument()
      expect(await screen.findByText('modo: on')).toBeInTheDocument()
    })
  })
})
