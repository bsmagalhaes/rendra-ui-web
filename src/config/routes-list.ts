/**
 * Todas as telas navegáveis. Usada pelo app (documentação) e pelos testes de layout,
 * que abrem cada uma nas larguras 360, 390, 768, 1280 e 1920. Rota nova entra aqui.
 */
export const publicRoutes = [
  '/',
  '/clientes',
  '/clientes/novo',
  '/clientes/1000',
  '/cadastro',
  '/tarefas',
  '/atendimento',
  '/agenda',
  '/kanban',
  '/configuracoes',
  '/componentes',
  '/tokens',
  '/galeria',
  '/pagina-inexistente',
  '/login',
  '/esqueci-senha',
  '/verificacao',
  '/nova-senha',
  '/cadastre-se',
] as const

/**
 * Telas navegáveis que ficam de fora das suítes de layout, acessibilidade e regressão visual
 * (elas leem só `publicRoutes`), para não exigir referências visuais novas. Hoje: a tela de
 * comparação do motion, com animações que não se prestam a captura fixa.
 */
export const experimentalRoutes = ['/componentes-motion'] as const
