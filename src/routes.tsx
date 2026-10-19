import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { AppLayout } from '@/app/app-layout'
import { RendraRouterBridge, type RouteHandle } from '@/components/rendra-router-bridge'
import { ErrorPage } from '@/components/ui/error-page'

/*
 * Cada tela é carregada sob demanda (um arquivo por tela no build), então a primeira
 * abertura baixa só o AppShell e a tela pedida. Gráficos e calendário ficam fora do início.
 */
const page =
  <M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) =>
  async () => ({ Component: (await load())[name] as ComponentType })

const h = (crumb: RouteHandle['crumb']): RouteHandle => ({ crumb })

/** Rotas da aplicação. Os testes de layout percorrem todas as rotas listadas em publicRoutes. */
export const routes: RouteObject[] = [
  {
    // Elemento raiz das rotas: liga o RendraProvider ao react-router (link, caminho atual,
    // navegar e a trilha) antes de qualquer tela do AppShell ou de autenticação.
    element: <RendraRouterBridge />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <ErrorPage code={500} fullScreen />,
        children: [
          {
            index: true,
            handle: h('Painel'),
            lazy: page(() => import('@/pages/app/dashboard-page'), 'DashboardPage'),
          },
          {
            path: 'clientes',
            handle: h('Clientes'),
            children: [
              {
                index: true,
                lazy: page(() => import('@/pages/app/clients-list-page'), 'ClientsListPage'),
              },
              {
                path: 'novo',
                handle: h('Novo cliente'),
                lazy: page(() => import('@/pages/app/client-form-page'), 'ClientFormPage'),
              },
              {
                path: ':id',
                handle: h('Detalhe do cliente'),
                lazy: page(() => import('@/pages/app/client-detail-page'), 'ClientDetailPage'),
              },
            ],
          },
          {
            path: 'cadastro',
            handle: h('Cadastro guiado'),
            lazy: page(() => import('@/pages/app/client-wizard-page'), 'ClientWizardPage'),
          },
          {
            path: 'atendimento',
            handle: h('Atendimento'),
            lazy: page(() => import('@/pages/app/atendimento-page'), 'AtendimentoPage'),
          },
          {
            path: 'agenda',
            handle: h('Agenda'),
            lazy: page(() => import('@/pages/app/agenda-page'), 'AgendaPage'),
          },
          {
            path: 'kanban',
            handle: h('Funil de vendas'),
            lazy: page(() => import('@/pages/app/kanban-page'), 'KanbanPage'),
          },
          {
            path: 'tarefas',
            handle: h('Tarefas'),
            lazy: page(() => import('@/pages/app/tasks-page'), 'TasksPage'),
          },
          {
            path: 'configuracoes',
            handle: h('Configurações'),
            lazy: page(() => import('@/pages/app/settings-page'), 'SettingsPage'),
          },
          {
            path: 'componentes',
            handle: h('Componentes'),
            lazy: page(() => import('@/pages/components-page'), 'ComponentsPage'),
          },
          {
            path: 'componentes-motion',
            handle: h('Componentes com motion'),
            lazy: page(() => import('@/pages/components-motion-page'), 'ComponentsMotionPage'),
          },
          {
            path: 'dashboard-motion',
            handle: h('Dashboard com motion'),
            lazy: page(() => import('@/pages/dashboard-motion-page'), 'DashboardMotionPage'),
          },
          {
            path: 'galeria',
            handle: h('Galeria'),
            lazy: page(() => import('@/pages/gallery-page'), 'GalleryPage'),
          },
          {
            path: 'tokens',
            handle: h('Tokens'),
            lazy: page(() => import('@/pages/tokens-page'), 'TokensPage'),
          },
          { path: '*', handle: h('Página não encontrada'), element: <ErrorPage code={404} /> },
        ],
      },
      { path: 'login', lazy: page(() => import('@/pages/auth/auth-pages'), 'LoginPage') },
      {
        path: 'esqueci-senha',
        lazy: page(() => import('@/pages/auth/auth-pages'), 'ForgotPasswordPage'),
      },
      {
        path: 'verificacao',
        lazy: page(() => import('@/pages/auth/auth-pages'), 'VerifyCodePage'),
      },
      {
        path: 'nova-senha',
        lazy: page(() => import('@/pages/auth/auth-pages'), 'ResetPasswordPage'),
      },
      { path: 'cadastre-se', lazy: page(() => import('@/pages/auth/auth-pages'), 'SignupPage') },
    ],
  },
]

export { publicRoutes } from '@/config/routes-list'
