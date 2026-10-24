import {
  Blocks,
  CalendarDays,
  ClipboardList,
  Headset,
  Images,
  LayoutDashboard,
  ListChecks,
  Palette,
  Settings,
  SquareKanban,
  Users,
  Workflow,
} from 'lucide-react'
import type { NavGroup } from '@/components/app-shell/types'

/*
 * MENU DO SISTEMA
 * Única fonte da sidebar, da barra inferior do mobile e da busca global (Ctrl+K), passada
 * por prop ao <AppShell navigation={navigation}>. Os tipos (NavItem, NavChild, NavGroup)
 * vêm de src/components/app-shell/types.ts: o AppShell nunca importa este arquivo.
 */

export type { NavChild, NavGroup, NavItem } from '@/components/app-shell/types'

export const navigation: NavGroup[] = [
  {
    title: 'Geral',
    description: 'Visão rápida do que importa hoje.',
    items: [
      {
        title: 'Painel',
        to: '/',
        icon: LayoutDashboard,
        bottomNav: true,
        description: 'Indicadores, evolução e atividade recente.',
      },
    ],
  },
  {
    title: 'Operação',
    description: 'O dia a dia da equipe.',
    items: [
      {
        title: 'Clientes',
        to: '/clientes',
        icon: Users,
        badge: 3,
        bottomNav: true,
        description: 'Busque, filtre e acompanhe a carteira.',
      },
      {
        title: 'Cadastros',
        icon: ClipboardList,
        bottomNav: true,
        description: 'Crie registros novos.',
        children: [
          {
            title: 'Novo cliente',
            to: '/clientes/novo',
            description: 'Formulário completo em seções.',
          },
          { title: 'Cadastro guiado', to: '/cadastro', description: 'Passo a passo em etapas.' },
        ],
      },
      {
        title: 'Tarefas',
        to: '/tarefas',
        icon: ListChecks,
        description: 'Pendências e prazos da equipe.',
      },
      {
        title: 'Atendimento',
        to: '/atendimento',
        icon: Headset,
        badge: 3,
        description: 'WhatsApp, redes sociais, site e e-mail em um lugar só.',
      },
      {
        title: 'Agenda',
        to: '/agenda',
        icon: CalendarDays,
        description: 'Compromissos por mês, semana, dia ou lista.',
      },
      {
        title: 'Funil de vendas',
        shortTitle: 'Funil',
        to: '/kanban',
        icon: SquareKanban,
        description: 'Negócios em kanban, de contato a fechado.',
      },
      {
        title: 'Automações',
        to: '/automacoes',
        icon: Workflow,
        description: 'Fluxos com gatilho, mensagens, condição e webhook.',
      },
    ],
  },
  {
    title: 'Sistema',
    description: 'Padrões, identidade e ajustes.',
    items: [
      {
        title: 'Componentes',
        icon: Blocks,
        description: 'Vitrine com variantes e estados.',
        children: [
          { title: 'Vitrine', to: '/componentes', description: 'Variantes e estados.' },
          {
            title: 'Com motion',
            to: '/componentes-motion',
            description: 'As animações do Motion, ligadas e desligadas.',
          },
          {
            title: 'Dashboard com motion',
            to: '/dashboard-motion',
            description: 'Um painel entrando com contagem, gráficos e cascata.',
          },
        ],
      },
      {
        title: 'Tokens',
        to: '/tokens',
        icon: Palette,
        description: 'Cores, tipografia e formato.',
      },
      {
        title: 'Galeria',
        to: '/galeria',
        icon: Images,
        description: 'Capturas de todos os templates e paletas.',
      },
      {
        title: 'Configurações',
        shortTitle: 'Ajustes',
        to: '/configuracoes',
        icon: Settings,
        bottomNav: true,
        description: 'Preferências da conta e da empresa.',
      },
    ],
  },
]

/** Usuário de demonstração. Troque pela sessão real. Passado por prop: <AppShell user={...}>. */
export const currentUser = {
  name: 'Ana Ribeiro',
  email: 'ana.ribeiro@empresa.com.br',
  role: 'Administradora',
}
