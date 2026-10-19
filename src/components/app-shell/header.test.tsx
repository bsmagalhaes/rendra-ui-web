// @vitest-environment jsdom
import { LayoutDashboard, Settings } from 'lucide-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { activeBrand, availableBrands, availablePalettes, BrandProvider } from '@/brand'
import { RendraProvider, type RendraBreadcrumbItem } from '@/components/rendra-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from './header'
import { ShellContext, type ShellContextValue } from './shell-context'
import type { NavGroup } from './types'

/*
 * Header sem @/config e sem react-router: os itens do menu do usuário, o logout, o
 * rótulo do destino inicial e as notificações vêm todos do ShellContext (prop do
 * AppShell), nunca de literal dentro do componente. Os valores usados aqui são
 * diferentes dos antigos ("Meu perfil", "/configuracoes", "Início"), para provar que
 * vêm mesmo da prop, e não de um resquício do código anterior.
 */
const baseLayout: ShellContextValue['layout'] = {
  navigation: 'sidebar',
  sidebar: 'collapsed',
  expandOnHover: true,
  submenu: 'panel',
  topbarSubmenu: 'dropdown',
  bottomNav: true,
}

function fakeShellValue(overrides: Partial<ShellContextValue> = {}): ShellContextValue {
  return {
    layout: baseLayout,
    setLayout: () => {},
    applyLayout: () => {},
    resetLayout: () => {},
    mobileNavOpen: false,
    setMobileNavOpen: () => {},
    footerSlot: null,
    pageHelp: null,
    setPageHelp: () => {},
    searchOpen: false,
    setSearchOpen: () => {},
    navigation: [],
    bottomNavItems: [],
    navigationTargets: [],
    user: { name: 'Marina Alves' },
    userMenuItems: [],
    onLogout: undefined,
    homeLabel: 'Painel inicial',
    quickActions: [],
    notifications: undefined,
    ...overrides,
  }
}

function renderHeader(
  overrides: Partial<ShellContextValue> = {},
  breadcrumbs: RendraBreadcrumbItem[] = [],
) {
  render(
    <BrandProvider
      brands={availableBrands}
      palettes={availablePalettes}
      defaultBrand={activeBrand}
      forcedMode="light"
    >
      <RendraProvider
        linkComponent={({ to, children, ...rest }) => (
          <a href={to} {...rest}>
            {children}
          </a>
        )}
        useCurrentPath={() => '/relatorio-mensal'}
        navigate={() => {}}
        goBack={() => {}}
        useBreadcrumbs={() => breadcrumbs}
      >
        <TooltipProvider>
          <ShellContext.Provider value={fakeShellValue(overrides)}>
            <Header />
          </ShellContext.Provider>
        </TooltipProvider>
      </RendraProvider>
    </BrandProvider>,
  )
}

describe('Header', () => {
  describe('userMenu (Tema, Template e Layout no menu do usuário)', () => {
    async function abrirMenu(overrides: Partial<ShellContextValue> = {}) {
      renderHeader(overrides)
      const user = userEvent.setup()
      await user.click(screen.getByLabelText(/menu de Marina Alves/i))
      await screen.findByText('Sair')
      return screen.getByRole('menu')
    }
    const tem = (nome: string) => screen.queryByRole('menuitem', { name: nome }) !== null
    const papeis = (menu: HTMLElement) =>
      Array.from(menu.children).map((el) => el.getAttribute('role'))

    it('sem userMenu mostra Tema, Template e Layout (padrão de hoje)', async () => {
      await abrirMenu()
      expect(tem('Tema')).toBe(true)
      expect(tem('Template')).toBe(true)
      expect(tem('Layout')).toBe(true)
    })

    it('theme: false esconde só o Tema', async () => {
      await abrirMenu({ userMenu: { theme: false } })
      expect(tem('Tema')).toBe(false)
      expect(tem('Template')).toBe(true)
      expect(tem('Layout')).toBe(true)
    })

    it('template: false esconde só o Template', async () => {
      await abrirMenu({ userMenu: { template: false } })
      expect(tem('Tema')).toBe(true)
      expect(tem('Template')).toBe(false)
      expect(tem('Layout')).toBe(true)
    })

    it('layout: false esconde só o Layout', async () => {
      await abrirMenu({ userMenu: { layout: false } })
      expect(tem('Tema')).toBe(true)
      expect(tem('Template')).toBe(true)
      expect(tem('Layout')).toBe(false)
    })

    it('os três false não deixam separador órfão: sobra só o separador antes de Sair', async () => {
      const menu = await abrirMenu({ userMenu: { theme: false, template: false, layout: false } })
      expect(tem('Tema') || tem('Template') || tem('Layout')).toBe(false)
      const seq = papeis(menu)
      expect(seq.filter((r) => r === 'separator')).toHaveLength(1)
      expect(seq[seq.length - 2]).toBe('separator')
      expect(seq[seq.length - 1]).toBe('menuitem')
    })

    it('com os três visíveis há separador antes do grupo e antes de Sair', async () => {
      const menu = await abrirMenu()
      expect(papeis(menu).filter((r) => r === 'separator')).toHaveLength(2)
    })
  })

  describe('nome acessível do botão do menu do usuário (WCAG 2.5.3)', () => {
    it('contém o texto visível (as iniciais) e continua trazendo o nome', async () => {
      renderHeader({ user: { name: 'Ana Souza' } })
      const botao = screen.getByRole('button', { name: /menu de Ana Souza/i })
      const visivel = (await screen.findByText('AS')).textContent ?? ''
      expect(botao).toHaveAccessibleName(`AS, menu de Ana Souza`)
      expect(botao.getAttribute('aria-label')).toContain(visivel)
    })

    it('nome de uma palavra só e nome com três partes seguem a regra das iniciais', async () => {
      renderHeader({ user: { name: 'Madonna' } })
      expect(screen.getByRole('button', { name: 'M, menu de Madonna' })).toBeInTheDocument()
    })

    it('nome com três partes usa a primeira e a última', async () => {
      renderHeader({ user: { name: 'maria da Silva' } })
      expect(screen.getByRole('button', { name: 'MS, menu de maria da Silva' })).toBeInTheDocument()
    })

    it('com avatarUrl o rótulo continua contendo o nome do usuário', () => {
      renderHeader({ user: { name: 'Ana Souza', avatarUrl: 'https://exemplo.test/ana.png' } })
      expect(screen.getByRole('button', { name: /menu de Ana Souza/i })).toHaveAccessibleName(
        'AS, menu de Ana Souza',
      )
    })
  })

  it('mostra os itens de userMenuItems (prop), não um literal fixo', async () => {
    renderHeader({
      userMenuItems: [{ label: 'Minha conta', to: '/minha-conta', icon: Settings }],
    })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/menu de Marina Alves/i))
    expect(await screen.findByText('Minha conta')).toBeInTheDocument()
  })

  it('sem userMenuItems (padrão vazio), o menu não mostra itens de navegação além do próprio usuário', async () => {
    renderHeader()
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/menu de Marina Alves/i))
    expect(await screen.findByText('Sair')).toBeInTheDocument()
    expect(screen.queryByText('Meu perfil')).not.toBeInTheDocument()
  })

  it('onLogout vem da prop, chamado ao selecionar Sair, e o menu fecha (efeito visível)', async () => {
    const onLogout = vi.fn()
    renderHeader({ onLogout })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText(/menu de Marina Alves/i))
    const sair = await screen.findByText('Sair')
    await user.click(sair)
    expect(onLogout).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Sair')).not.toBeInTheDocument()
  })

  it('homeLabel (prop) aparece na trilha quando o primeiro item não é a raiz', () => {
    renderHeader({ homeLabel: 'Painel inicial' }, [
      { label: 'Relatório mensal', to: '/relatorio-mensal' },
    ])
    expect(screen.getAllByText('Painel inicial').length).toBeGreaterThan(0)
  })

  it('sem a prop notifications, o sino não aparece', () => {
    renderHeader()
    expect(screen.queryByLabelText(/Notificações/)).not.toBeInTheDocument()
  })

  it('com a prop notifications, o sino aparece', () => {
    renderHeader({
      notifications: {
        items: [{ id: '1', type: 'info', title: 'Aviso', time: 'agora', read: false }],
      },
    })
    expect(screen.getByLabelText('Notificações, 1 não lidas')).toBeInTheDocument()
  })

  it('mostra a seta de voltar para o item-pai da trilha', () => {
    renderHeader({}, [
      { label: 'Relatórios', to: '/relatorios' },
      { label: 'Detalhe do relatório' },
    ])
    expect(screen.getByLabelText('Voltar para Relatórios')).toBeInTheDocument()
  })

  it('recolhe/expande a sidebar pelo botão do header (layout vem do ShellContext)', async () => {
    const setLayout = vi.fn()
    renderHeader({ setLayout })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Expandir menu'))
    expect(setLayout).toHaveBeenCalledWith('sidebar', 'expanded')
  })

  it('abre a busca (Ctrl K) pelo botão de ícone', async () => {
    const setSearchOpen = vi.fn()
    renderHeader({ setSearchOpen })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Buscar'))
    expect(setSearchOpen).toHaveBeenCalledWith(true)
  })

  it('abre a gaveta de navegação pelo botão de menu', async () => {
    const setMobileNavOpen = vi.fn()
    renderHeader({ setMobileNavOpen })
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Abrir menu'))
    expect(setMobileNavOpen).toHaveBeenCalledWith(true)
  })

  it('troca o modo de cor pelo menu Tema do header', async () => {
    renderHeader()
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Tema'))
    expect(await screen.findByText('Escuro')).toBeInTheDocument()
  })

  it('layout topbar com submenu dropdown renderiza o menu a partir da prop navigation', () => {
    const navigation: NavGroup[] = [
      {
        title: 'Grupo',
        items: [
          { title: 'Painel de indicadores', to: '/indicadores', icon: LayoutDashboard },
          {
            title: 'Registros',
            icon: Settings,
            children: [{ title: 'Novo registro', to: '/registros/novo' }],
          },
        ],
      },
    ]
    renderHeader({
      layout: { ...baseLayout, navigation: 'topbar', topbarSubmenu: 'dropdown' },
      navigation,
    })
    expect(screen.getAllByText('Painel de indicadores').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Registros').length).toBeGreaterThan(0)
  })
})
