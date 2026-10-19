import { createContext, useContext, type ReactNode } from 'react'
import type { ShellLayout } from './layout'
import type { NavigationTarget } from './navigation-utils'
import type {
  NavGroup,
  NavItem,
  ShellMenuItem,
  ShellNotificationsConfig,
  ShellUser,
  ShellUserMenuConfig,
  ShellWorkspacesConfig,
} from './types'

export interface ShellContextValue {
  /** Layout efetivo: padrão interno + prop `layout` do AppShell + escolha do usuário. */
  layout: ShellLayout
  /** Altera uma opção de layout (guardada no navegador do usuário). */
  setLayout: <K extends keyof ShellLayout>(key: K, value: ShellLayout[K]) => void
  /** Altera várias opções de uma vez (ex.: um código de menu M1 a M6). */
  applyLayout: (partial: Partial<ShellLayout>) => void
  /** Volta ao layout padrão do projeto. */
  resetLayout: () => void
  /** Gaveta de navegação aberta no mobile. */
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  /**
   * Espaço do rodapé fixo da página, entre o conteúdo e a barra inferior. A ActionBar
   * sticky é desenhada aqui: fica sempre colada embaixo, na largura inteira.
   */
  footerSlot: HTMLElement | null
  /** Texto orientativo da tela (PageHeader help): o header mostra o ícone ao lado do título. */
  pageHelp: ReactNode
  setPageHelp: (help: ReactNode) => void
  /** Busca global (Ctrl+K). */
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  /** Menu do sistema, recebido pela prop `navigation` do AppShell (obrigatória). */
  navigation: NavGroup[]
  /** Até 4 itens marcados `bottomNav`, calculados a partir de `navigation`. */
  bottomNavItems: NavItem[]
  /** Lista plana de destinos: busca global e cálculo do item ativo. */
  navigationTargets: NavigationTarget[]
  /** Usuário exibido no menu do avatar e no rodapé da sidebar. */
  user: ShellUser
  /** Itens do menu do avatar (ex.: "Meu perfil", "Configurações"). */
  userMenuItems: ShellMenuItem[]
  /** Chamado ao selecionar "Sair". Sem ele, o botão não faz nada. */
  onLogout?: () => void
  /** Rótulo do destino inicial na trilha do header. */
  homeLabel: string
  /** Ações rápidas da busca global (ex.: "Novo cliente"). */
  quickActions: ShellMenuItem[]
  /** Notificações do sino do header. Sem esta prop, o sino não aparece. */
  notifications?: ShellNotificationsConfig
  /** Submenus Tema, Template e Layout do menu do avatar. Sem esta prop, os três aparecem. */
  userMenu?: ShellUserMenuConfig
  /** Seletor de espaço no topo do menu do avatar. Sem esta prop, não aparece. */
  workspaces?: ShellWorkspacesConfig
  /** Logo que ocupa o lugar do título e da trilha no header, abaixo de `md`. */
  headerLogo?: ReactNode
}

export const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell precisa estar dentro de <AppShell>.')
  return ctx
}
