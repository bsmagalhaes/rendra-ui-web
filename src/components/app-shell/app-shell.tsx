import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { useCurrentPath, useRendraLink } from '@/components/rendra-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { CommandSearch } from './command-search'
import { Header } from './header'
import { defaultShellLayout, type ShellLayout } from './layout'
import { getBottomNavItems, getNavigationTargets, resolveActiveTo } from './navigation-utils'
import { ShellContext, useShell, type ShellContextValue } from './shell-context'
import { Sidebar } from './sidebar'
import type {
  NavGroup,
  ShellMenuItem,
  ShellNotificationsConfig,
  ShellUser,
  ShellUserMenuConfig,
} from './types'

const LAYOUT_KEY = 'ui-shell-layout'

function readUserLayout(): Partial<ShellLayout> {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') as Partial<ShellLayout>
  } catch {
    return {}
  }
}

const defaultUser: ShellUser = { name: 'Usuário' }

/**
 * Barra inferior do celular: até 4 atalhos e, no centro, o botão redondo do menu, subindo
 * metade acima da linha da barra, ao alcance do polegar. Com ela, o header não precisa do
 * botão de menu e sobra espaço para a seta de voltar.
 */
function BottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = useCurrentPath()
  const Link = useRendraLink()
  const { bottomNavItems, navigationTargets } = useShell()
  const active = resolveActiveTo(navigationTargets, pathname)
  const item = (entry: (typeof bottomNavItems)[number]) => {
    const to = entry.to ?? entry.children?.[0]?.to ?? '/'
    const Icon = entry.icon
    return (
      <li key={entry.title}>
        <Link
          to={to}
          className={cn(
            'flex min-h-touch flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
            to === active || entry.children?.some((c) => c.to === active)
              ? 'text-primary-text'
              : 'text-muted-foreground active:text-foreground',
          )}
        >
          <Icon className="size-icon-md" aria-hidden />
          <span className="max-w-full truncate px-1">{entry.shortTitle ?? entry.title}</span>
        </Link>
      </li>
    )
  }
  const half = Math.ceil(bottomNavItems.length / 2)
  return (
    <nav
      aria-label="Navegação rápida"
      className="relative shrink-0 border-t bg-card pb-safe-inset md:hidden"
    >
      <ul className="grid grid-cols-5 items-end">
        {bottomNavItems.slice(0, half).map(item)}
        <li className="flex justify-center">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Abrir menu"
            className="-mt-6 mb-1 flex size-12 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-card transition-transform outline-none focus-visible:ring-ring active:scale-95"
          >
            <Menu className="size-icon-lg" aria-hidden />
          </button>
        </li>
        {bottomNavItems.slice(half).map(item)}
      </ul>
    </nav>
  )
}

export interface AppShellProps {
  /** Menu do sistema: sidebar, barra inferior e busca global. Único obrigatório. */
  navigation: NavGroup[]
  /** Sobrescreve o padrão interno (defaultShellLayout), chave a chave. */
  layout?: Partial<ShellLayout>
  /** Usuário exibido no menu do avatar e no rodapé da sidebar. */
  user?: ShellUser
  /** Itens do menu do avatar (ex.: "Meu perfil", "Configurações"). Padrão: nenhum. */
  userMenuItems?: ShellMenuItem[]
  /** Chamado ao selecionar "Sair", na sidebar e no menu do avatar. */
  onLogout?: () => void
  /** Rótulo do destino inicial na trilha do header. */
  homeLabel?: string
  /** Ações rápidas da busca global (Ctrl+K), além do atalho de tema. Padrão: nenhuma. */
  quickActions?: ShellMenuItem[]
  /** Notificações do sino do header. Sem esta prop, o sino não aparece. */
  notifications?: ShellNotificationsConfig
  /**
   * Quais submenus o menu do avatar mostra: `theme` (Tema), `template` (Template) e
   * `layout` (Layout). Todos `true` por padrão; `{ theme: false }` esconde só o Tema.
   * É o caminho para tirar essas escolhas do usuário (`userConfigurable` não faz isso).
   */
  userMenu?: ShellUserMenuConfig
  /**
   * Permite que o usuário troque o layout pelo menu do avatar (guardado no navegador).
   * Desligue em produção se o layout do projeto for fixo.
   */
  userConfigurable?: boolean
  /** Tela atual. O boilerplate passa o <Outlet /> do react-router. */
  children?: ReactNode
}

/**
 * Estrutura da aplicação. Uma única área de rolagem: o <main>.
 * Nunca importa @/config nem um roteador: recebe o menu, o layout, o usuário e as
 * notificações por prop; quem navega é o RendraProvider (useCurrentPath/useRendraLink).
 * Título da aba e meta description (SEO) não são responsabilidade do AppShell: o
 * boilerplate (src/app/app-layout.tsx) aplica isso com useRouteMeta, que lê @/config/seo.
 */
export function AppShell({
  navigation,
  layout: layoutProp,
  user = defaultUser,
  userMenuItems = [],
  onLogout,
  homeLabel = 'Início',
  quickActions = [],
  notifications,
  userMenu,
  userConfigurable = true,
  children,
}: AppShellProps) {
  const [userLayout, setUserLayout] = useState<Partial<ShellLayout>>(() =>
    userConfigurable ? readUserLayout() : {},
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null)
  const [pageHelp, setPageHelp] = useState<ReactNode>(null)
  const pathname = useCurrentPath()
  const mainRef = useRef<HTMLElement>(null)

  const layoutPropKey = JSON.stringify(layoutProp ?? {})
  const layout = useMemo<ShellLayout>(
    () => ({
      ...defaultShellLayout,
      ...(JSON.parse(layoutPropKey) as Partial<ShellLayout>),
      ...userLayout,
    }),
    [layoutPropKey, userLayout],
  )

  const bottomNavItems = useMemo(() => getBottomNavItems(navigation), [navigation])
  const navigationTargets = useMemo(() => getNavigationTargets(navigation), [navigation])

  // Troca de tela: fecha a gaveta e volta a rolagem ao topo.
  useEffect(() => {
    setMobileNavOpen(false)
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo<ShellContextValue>(() => {
    const persist = (next: Partial<ShellLayout>) => {
      setUserLayout(next)
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(next))
      } catch {
        // segue só em memória
      }
    }
    return {
      layout,
      setLayout: (key, v) => persist({ ...userLayout, [key]: v }),
      applyLayout: (partial) => persist({ ...userLayout, ...partial }),
      resetLayout: () => persist({}),
      mobileNavOpen,
      setMobileNavOpen,
      searchOpen,
      setSearchOpen,
      footerSlot,
      pageHelp,
      setPageHelp,
      navigation,
      bottomNavItems,
      navigationTargets,
      user,
      userMenuItems,
      onLogout,
      homeLabel,
      quickActions,
      notifications,
      userMenu,
    }
  }, [
    layout,
    userLayout,
    mobileNavOpen,
    searchOpen,
    footerSlot,
    pageHelp,
    navigation,
    bottomNavItems,
    navigationTargets,
    user,
    userMenuItems,
    onLogout,
    homeLabel,
    quickActions,
    notifications,
    userMenu,
  ])

  return (
    <ShellContext.Provider value={value}>
      <TooltipProvider>
        <div className="flex h-dvh overflow-hidden">
          <a
            href="#conteudo"
            className="sr-only z-50 rounded-control bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            Pular para o conteúdo
          </a>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main
              ref={mainRef}
              id="conteudo"
              tabIndex={-1}
              // relative: elementos absolutos do conteúdo (texto só para leitor de tela, inputs
              // ocultos) ficam presos à rolagem do main. Sem isso eles esticam o <html>, e um
              // link com #âncora rola a página inteira, deixando um vão em branco embaixo.
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
            >
              {children}
            </main>
            {/* Rodapé fixo das telas de formulário (ActionBar sticky). Vazio, não ocupa espaço. */}
            <div ref={setFooterSlot} className="shrink-0 empty:hidden" />
            {layout.bottomNav && <BottomNav onMenu={() => setMobileNavOpen(true)} />}
          </div>
        </div>
        <CommandSearch />
      </TooltipProvider>
    </ShellContext.Provider>
  )
}
