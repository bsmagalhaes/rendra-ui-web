/**
 * SEO e AEO (buscadores e assistentes de IA). Título e descrição de cada tela: o app aplica
 * no document.title e na meta description ao navegar, e o build (scripts/seo-build.mjs) gera
 * uma página estática por rota com esses dados, mais o sitemap.xml, o robots.txt e o llms.txt.
 * Em um sistema real, troque pelos textos do seu produto (ou deixe `indexable: false`).
 */

export interface RouteSeo {
  title: string
  description: string
  /** Entra no sitemap e pode ser indexada. Padrão: true. */
  indexable?: boolean
}

export const siteSeo = {
  name: 'Rendra Design System',
  /** Frase curta que aparece nos resultados de busca e no compartilhamento. */
  tagline: 'Template de sistema e layout de sistema administrativo em React',
  description:
    'Template de sistema open source, sob licença MIT, em React, TypeScript e Tailwind CSS: layout de sistema administrativo com dashboard, tabelas, formulários, CRM kanban, agenda, chat omnichannel e mais de 50 componentes. Mobile-first, acessível (WCAG 2.1 AA), em português do Brasil e pronto para white label.',
  keywords: [
    'template de sistema',
    'layout de sistema',
    'template de sistema administrativo',
    'template admin React',
    'dashboard React',
    'painel administrativo',
    'design system',
    'boilerplate React',
    'Tailwind CSS',
    'shadcn/ui',
    'template CRM',
    'kanban React',
    'chat omnichannel',
    'white label',
    'mobile-first',
  ],
  repository: 'https://github.com/bsmagalhaes/rendra-ui-web',
  /** Endereço público da demo (em /demo/). O build troca por SITE_URL quando definido. */
  url: 'https://bsmagalhaes.github.io/rendra-ui-web/demo/',
}

export const routeSeo: Record<string, RouteSeo> = {
  '/': {
    title: 'Painel (dashboard) administrativo',
    description:
      'Dashboard administrativo em React com widgets ajustáveis, indicadores, velocímetro, funil de vendas e gráficos de barras, linhas e pizza. Template de painel pronto e responsivo.',
  },
  '/clientes': {
    title: 'Listagem de clientes com tabela',
    description:
      'Tela de listagem com tabela paginada no servidor, busca, filtros, colunas com nome e documento, ações por linha e versão em cartões no celular.',
  },
  '/clientes/novo': {
    title: 'Formulário de cadastro de cliente',
    description:
      'Formulário de cadastro com grade de 12 colunas, busca de CNPJ e CEP, máscaras, validação e rodapé fixo com Salvar e Cancelar.',
  },
  '/clientes/1000': {
    title: 'Detalhe do cliente',
    description:
      'Tela de detalhe com abas, linha do tempo, dados do cadastro e ações no cabeçalho, em layout de sistema responsivo.',
  },
  '/cadastro': {
    title: 'Cadastro em etapas (wizard)',
    description:
      'Wizard de cadastro em etapas com progresso, validação por etapa e botões que acompanham o card.',
  },
  '/tarefas': {
    title: 'Lista de tarefas',
    description: 'Lista de tarefas em tabela com prioridade, prazo, seleção e ações em massa.',
  },
  '/atendimento': {
    title: 'Chat de atendimento omnichannel',
    description:
      'Tela de atendimento omnichannel com WhatsApp, Instagram, Facebook, TikTok, e-mail e site: fila, URA/IA, respostas citadas, reações, áudio, mensagens rápidas e anexos.',
  },
  '/agenda': {
    title: 'Agenda e calendário',
    description: 'Agenda com visões de mês, semana, dia e lista, eventos coloridos e hora atual.',
  },
  '/kanban': {
    title: 'CRM kanban (funil de vendas)',
    description:
      'CRM em kanban com status do card por cor e cadência, calendário da atividade, barra com busca, filtros e totais em R$ e arraste para ganhar ou perder.',
  },
  '/configuracoes': {
    title: 'Configurações',
    description:
      'Tela de configurações em seções: perfil, empresa, notificações, segurança e aparência.',
  },
  '/componentes': {
    title: 'Componentes do design system',
    description:
      'Vitrine com todos os componentes: botões, campos, select, tabela, modal, drawer, abas, gráficos, calendário, kanban, editor de texto rico, upload e chat.',
  },
  '/tokens': {
    title: 'Tokens de cor, tipografia e espaço',
    description:
      'Tokens do design system: paletas, contraste AA conferido, tipografia, escala de espaço e raios.',
  },
  '/galeria': {
    title: 'Galeria de modelos e paletas',
    description:
      'Galeria de modelos de layout, paletas de cores e tipos de menu, com o código de cada combinação para aplicar no seu sistema.',
  },
  '/login': {
    title: 'Tela de login',
    description: 'Tela de login responsiva com marca, validação e acesso com duas etapas.',
  },
  '/esqueci-senha': {
    title: 'Recuperar senha',
    description: 'Tela de recuperação de senha por e-mail.',
  },
  '/verificacao': {
    title: 'Verificação em duas etapas (2FA)',
    description: 'Tela de verificação em duas etapas com código de 6 dígitos.',
  },
  '/nova-senha': {
    title: 'Criar nova senha',
    description: 'Tela de nova senha com medidor de força.',
  },
  '/cadastre-se': {
    title: 'Criar conta',
    description: 'Tela de criação de conta com validação dos campos.',
  },
  '/pagina-inexistente': {
    title: 'Página não encontrada',
    description: 'Tela de erro 404.',
    indexable: false,
  },
}

/** Dados da rota (as rotas de detalhe, como /clientes/123, usam o modelo de /clientes/1000). */
export function seoFor(pathname: string): RouteSeo | undefined {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (routeSeo[path]) return routeSeo[path]
  if (/^\/clientes\/[^/]+$/.test(path)) return routeSeo['/clientes/1000']
  return undefined
}
