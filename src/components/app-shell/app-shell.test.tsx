// @vitest-environment jsdom
import { LayoutDashboard, Users } from 'lucide-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { activeBrand, availableBrands, availablePalettes, BrandProvider } from '@/brand'
import { RendraProvider } from '@/components/rendra-provider'
import { AppShell } from './app-shell'
import type { NavGroup } from './types'

/*
 * O AppShell não importa @/config nem react-router: este teste monta um menu e um
 * usuário falsos e um RendraProvider falso (sem MemoryRouter nenhum), para provar que
 * o componente funciona só com as props documentadas. Os três mocks abaixo travam
 * (lançam) se algo no grafo de import do AppShell tentar carregar @/config/*; se
 * acontecer, o arquivo inteiro falha ao importar, antes de qualquer teste rodar.
 */
vi.mock('@/config/seo', () => {
  throw new Error('AppShell não pode depender de @/config/seo (use-route-meta é do boilerplate)')
})
vi.mock('@/config/navigation', () => {
  throw new Error('AppShell não pode depender de @/config/navigation')
})
vi.mock('@/config/layout', () => {
  throw new Error('AppShell não pode depender de @/config/layout')
})
const navigation: NavGroup[] = [
  {
    title: 'Geral',
    items: [
      { title: 'Painel', to: '/', icon: LayoutDashboard, bottomNav: true },
      { title: 'Clientes', to: '/clientes', icon: Users, bottomNav: true },
    ],
  },
]

function FakeLink({ to, children, ...rest }: { to: string; children?: React.ReactNode }) {
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  )
}

function renderShell(overrides: Partial<ComponentProps<typeof AppShell>> = {}) {
  const navigate = vi.fn()
  const tree = (o: Partial<ComponentProps<typeof AppShell>>) => (
    <BrandProvider
      brands={availableBrands}
      palettes={availablePalettes}
      defaultBrand={activeBrand}
      forcedMode="light"
    >
      <RendraProvider
        linkComponent={FakeLink}
        useCurrentPath={() => '/'}
        navigate={navigate}
        goBack={() => {}}
      >
        <AppShell navigation={navigation} user={{ name: 'Ana Ribeiro' }} {...o}>
          <p>Conteúdo da tela</p>
        </AppShell>
      </RendraProvider>
    </BrandProvider>
  )
  const { rerender } = render(tree(overrides))
  return { navigate, rerender: (o: Partial<ComponentProps<typeof AppShell>>) => rerender(tree(o)) }
}

describe('AppShell', () => {
  it('renderiza o menu e o conteúdo a partir das props (sem @/config)', () => {
    renderShell()
    expect(screen.getByText('Conteúdo da tela')).toBeInTheDocument()
    expect(screen.getAllByText('Painel').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/menu de Ana Ribeiro/i)).toBeInTheDocument()
  })

  it('sem a prop notifications, o sino não aparece', () => {
    renderShell()
    expect(screen.queryByLabelText('Notificações')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Notificações,/)).not.toBeInTheDocument()
  })

  it('com a prop notifications, o sino aparece', () => {
    renderShell({
      notifications: {
        items: [{ id: '1', type: 'info', title: 'Aviso', time: 'agora', read: false }],
      },
    })
    expect(screen.getByLabelText('Notificações, 1 não lidas')).toBeInTheDocument()
  })

  it('logout vem da prop onLogout, chamado a partir do menu do avatar', async () => {
    const onLogout = vi.fn()
    renderShell({ onLogout })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/menu de Ana Ribeiro/i))
    await user.click(await screen.findByText('Sair'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('quickActions vêm da prop, não de um destino fixo dentro do AppShell', async () => {
    const { navigate } = renderShell({
      quickActions: [{ label: 'Novo cliente', to: '/clientes/novo' }],
    })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Buscar'))
    await user.click(await screen.findByText('Novo cliente'))
    expect(navigate).toHaveBeenCalledWith('/clientes/novo')
  })

  it('userMenuItems vêm da prop (padrão vazio)', async () => {
    renderShell({ userMenuItems: [{ label: 'Meu perfil', to: '/configuracoes' }] })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/menu de Ana Ribeiro/i))
    expect(await screen.findByText('Meu perfil')).toBeInTheDocument()
  })

  describe('userMenu', () => {
    const itemDoMenu = (nome: string) => screen.queryByRole('menuitem', { name: nome })

    it('a prop atravessa o contexto até o menu do avatar', async () => {
      renderShell({ userMenu: { template: false } })
      const user = userEvent.setup()
      await user.click(screen.getByLabelText(/menu de Ana Ribeiro/i))
      await screen.findByText('Sair')
      expect(itemDoMenu('Tema')).toBeInTheDocument()
      expect(itemDoMenu('Template')).not.toBeInTheDocument()
      expect(itemDoMenu('Layout')).toBeInTheDocument()
    })

    it('mudar userMenu por rerender atualiza o menu', async () => {
      const { rerender } = renderShell({ userMenu: { layout: false } })
      rerender({ userMenu: { theme: false } })
      const user = userEvent.setup()
      await user.click(screen.getByLabelText(/menu de Ana Ribeiro/i))
      await screen.findByText('Sair')
      expect(itemDoMenu('Tema')).not.toBeInTheDocument()
      expect(itemDoMenu('Layout')).toBeInTheDocument()
    })

    it('userConfigurable={false} não esconde o submenu Layout (comportamento de hoje)', async () => {
      renderShell({ userConfigurable: false })
      const user = userEvent.setup()
      await user.click(screen.getByLabelText(/menu de Ana Ribeiro/i))
      await screen.findByText('Sair')
      expect(itemDoMenu('Layout')).toBeInTheDocument()
    })
  })

  describe('workspaces', () => {
    const itens = [
      { id: 'a', label: 'Espaço A' },
      { id: 'b', label: 'Espaço B' },
    ]

    it('a prop atravessa o contexto e o item ativo vem de activeId', async () => {
      renderShell({ workspaces: { items: itens, activeId: 'a', onSelect: () => {} } })
      const user = userEvent.setup()
      await user.click(screen.getByLabelText(/menu de Ana Ribeiro/i))
      expect(await screen.findByRole('menuitemradio', { name: 'Espaço A' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })

    it('rerender com outro activeId troca o item marcado', async () => {
      const onSelect = () => {}
      const { rerender } = renderShell({ workspaces: { items: itens, activeId: 'a', onSelect } })
      rerender({ workspaces: { items: itens, activeId: 'b', onSelect } })
      const user = userEvent.setup()
      await user.click(screen.getByLabelText(/menu de Ana Ribeiro/i))
      expect(await screen.findByRole('menuitemradio', { name: 'Espaço B' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      expect(screen.getByRole('menuitemradio', { name: 'Espaço A' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })
  })

  describe('headerLogo', () => {
    it('a prop atravessa o contexto e o logo aparece no header', () => {
      renderShell({ headerLogo: <span data-testid="logo-da-marca">Marca</span> })
      expect(screen.getByTestId('logo-da-marca')).toBeInTheDocument()
    })

    it('sem a prop, nenhum logo é desenhado no lugar do título', () => {
      renderShell()
      expect(screen.queryByTestId('logo-da-marca')).not.toBeInTheDocument()
    })
  })
})
