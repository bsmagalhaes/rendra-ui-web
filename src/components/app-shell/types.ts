import type { LucideIcon } from 'lucide-react'
import type { FeedbackType } from '@/brand/types'

/*
 * Contrato do menu, do usuário, do menu do usuário, das ações rápidas e das notificações
 * do AppShell. O AppShell nunca importa @/config: quem monta a aplicação (o boilerplate,
 * em src/routes.tsx) passa estes tipos preenchidos por prop. src/config/navigation.ts
 * continua sendo o exemplo, importando os tipos daqui.
 */

export interface NavItem {
  title: string
  /** Rota. Item com children e sem rota só abre o submenu. */
  to?: string
  icon: LucideIcon
  /** Contador exibido à direita (ex.: pendências). */
  badge?: number
  /** Aparece na barra de navegação inferior do mobile (no máximo 4 itens no total). */
  bottomNav?: boolean
  /** Rótulo curto para a barra inferior, quando o título não cabe. */
  shortTitle?: string
  /** Frase curta exibida no mega menu. */
  description?: string
  children?: NavChild[]
}

export interface NavChild {
  title: string
  to: string
  description?: string
}

export interface NavGroup {
  title: string
  /** Frase curta da seção, exibida no mega menu. */
  description?: string
  items: NavItem[]
}

/** Usuário exibido no menu do avatar e no rodapé da sidebar. */
export interface ShellUser {
  name: string
  email?: string
  avatarUrl?: string
}

/** Item do menu do usuário ou de ação rápida na busca global. */
export interface ShellMenuItem {
  label: string
  to?: string
  onSelect?: () => void
  icon?: LucideIcon
}

export interface ShellNotificationItem {
  id: string
  type: FeedbackType
  title: string
  time: string
  read: boolean
}

export interface ShellNotificationsConfig {
  items: ShellNotificationItem[]
  onMarkAllRead?: () => void
  onItemClick?: (id: string) => void
}

/** Quais submenus o menu do avatar mostra. Cada um é `true` por padrão. */
export interface ShellUserMenuConfig {
  /** Submenu "Tema" (claro, escuro, automático). */
  theme?: boolean
  /** Submenu "Template" (modelo e paleta de cores). */
  template?: boolean
  /** Submenu "Layout" (posição e comportamento do menu). */
  layout?: boolean
}
