import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell/app-shell'
import { RendraRouterBridge } from '@/components/rendra-router-bridge'
import { Container, Grid, PageHeader, Section, Stack } from '@/components/layout'
import { BrandLogo } from '@/components/ui/brand-logo'
import { Button } from '@/components/ui/button'
import { routes } from '@/routes'
import { TokensPage } from '@/pages/tokens-page'

/*
 * Telas base e AppShell como stories de página, com alternância de template,
 * paleta e modo na toolbar. Cada story abre uma rota do app num roteador em memória.
 */

function Screen({ path }: { path: string }) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return (
    <div className="h-dvh">
      <RouterProvider router={router} />
    </div>
  )
}

const meta = {
  title: 'Telas/AppShell e telas base',
  component: Screen,
  parameters: { layout: 'fullscreen', router: false },
  args: { path: '/' },
} satisfies Meta<typeof Screen>
export default meta
type Story = StoryObj<typeof meta>

export const Painel: Story = { args: { path: '/' } }
export const ListagemDeClientes: Story = { args: { path: '/clientes' } }
export const DetalheComAbas: Story = { args: { path: '/clientes/1000' } }
export const FormularioLongo: Story = { args: { path: '/clientes/novo' } }
export const CadastroEmWizard: Story = { args: { path: '/cadastro' } }
export const Configuracoes: Story = { args: { path: '/configuracoes' } }
export const Tarefas: Story = { args: { path: '/tarefas' } }
export const Atendimento: Story = { args: { path: '/atendimento' } }
export const Agenda: Story = { args: { path: '/agenda' } }
export const FunilKanban: Story = { args: { path: '/kanban' } }
export const Galeria: Story = { args: { path: '/galeria' } }
export const Vitrine: Story = { args: { path: '/componentes' } }
export const VitrineMotion: Story = { args: { path: '/componentes-motion' } }
export const Pagina404: Story = { args: { path: '/nao-existe' } }
export const Login: Story = { args: { path: '/login' } }
export const EsqueciASenha: Story = { args: { path: '/esqueci-senha' } }
export const Verificacao2FA: Story = { args: { path: '/verificacao?origem=senha' } }
export const NovaSenha: Story = { args: { path: '/nova-senha' } }
export const Cadastro: Story = { args: { path: '/cadastre-se' } }

export const Tokens: Story = {
  name: 'Fundamentos: tokens e identidade',
  parameters: { router: true },
  render: () => <TokensPage />,
}

export const CabecalhoComTituloNoCorpo: Story = {
  name: 'Layout: PageHeader com bodyTitle e titleSpace="none"',
  parameters: { router: true, layout: 'padded' },
  render: () => (
    <Container padded>
      <Stack gap="section">
        <div data-testid="body-title">
          <PageHeader
            title="Relatório mensal"
            bodyTitle
            actions={<Button variant="outline">Exportar</Button>}
          />
        </div>
        <div data-testid="reserve">
          <PageHeader
            title="Reserva o bloco do título (padrão)"
            actions={<Button variant="outline">Exportar</Button>}
          />
        </div>
        <div data-testid="none">
          <PageHeader
            title="Sem reservar o bloco do título"
            titleSpace="none"
            actions={<Button variant="outline">Exportar</Button>}
          />
        </div>
      </Stack>
    </Container>
  ),
}

export const Primitivas: Story = {
  name: 'Layout: primitivas',
  parameters: { router: true, layout: 'padded' },
  render: () => (
    <Container padded>
      <Stack gap="section">
        <PageHeader
          title="Primitivas"
          showTitle
          description="Container, Stack, Inline, Grid, Section e PageHeader."
        />
        <Section title="Grid 1, 2 e 4 colunas" description="Uma coluna no celular.">
          <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex h-12 items-center justify-center rounded-control border border-primary bg-primary-soft text-sm font-medium text-primary-soft-foreground"
              >
                {n}
              </div>
            ))}
          </Grid>
        </Section>
      </Stack>
    </Container>
  ),
}

/** AppShell com as opções novas, num roteador de dados (o header lê a trilha com useMatches). */
function AppShellOpcoes() {
  const [ativo, setAtivo] = useState('matriz')
  const router = createMemoryRouter([
    {
      path: '*',
      element: (
        <RendraRouterBridge>
          <AppShell
            navigation={[
              {
                title: 'Geral',
                items: [{ title: 'Painel', to: '/', icon: LayoutDashboard, bottomNav: true }],
              },
            ]}
            user={{ name: 'Ana Souza', email: 'ana@exemplo.com.br' }}
            workspaces={{
              items: [
                { id: 'matriz', label: 'Matriz' },
                { id: 'filial', label: 'Filial Sul' },
              ],
              activeId: ativo,
              onSelect: setAtivo,
            }}
            userMenu={{ theme: false, template: false }}
            headerLogo={<BrandLogo on="surface" />}
          >
            <Container padded>
              <p>
                No celular o logo ocupa o lugar do título; abra o menu do usuário para ver os
                espaços.
              </p>
            </Container>
          </AppShell>
        </RendraRouterBridge>
      ),
    },
  ])
  return (
    <div className="h-dvh">
      <RouterProvider router={router} />
    </div>
  )
}

export const AppShellEspacosLogoMenuEnxuto: Story = {
  name: 'AppShell: espaços, logo no celular e menu do usuário enxuto',
  parameters: { router: false, layout: 'fullscreen' },
  render: () => <AppShellOpcoes />,
}
