/**
 * Catálogo de códigos de componente (etapa 1.2.0-alpha.1 do plano da v2).
 *
 * Cada componente de `src/components/ui` (menos os internos `overlay-shell` e
 * `picker-panel`, e menos os arquivos de teste) tem ao menos um código aqui. Uma variante
 * visual relevante (a prop que muda o formato do componente, não tom nem tamanho) ganha o
 * seu próprio código, numerado 001, 002... na ordem em que aparece neste arquivo.
 *
 * O código é o que o cliente escolhe no `docs/BRIEFING_MODELO.md` ("Componentes e
 * variantes") e o que aparece na vitrine (`/componentes`), no `data-rendra` do elemento
 * raiz de cada componente e no `registry.json` (`meta.codes`).
 *
 * Formato: `^[A-Z]{3,4}-\d{3}$` (ex.: "ABA-001", "BTN-006"). Nunca editar um código depois
 * de publicado: ele é o identificador estável de uma variante.
 */

export interface ComponentCatalogEntry {
  /** Formato ^[A-Z]{3,4}-\d{3}$, ex.: "ABA-001". Único no catálogo inteiro. */
  code: string
  /** Nome em português do Brasil, ex.: "Abas em linha". */
  name: string
  /** Nome do componente React, ex.: "Tabs". */
  component: string
  /** Caminho relativo a partir de src/, ex.: "components/ui/tabs.tsx". */
  file: string
  /** Props (nome: valor) que definem esta variante especificamente. */
  variantProps: Record<string, string | number | boolean>
  /** Frase curta de quando usar esta variante, para o BRIEFING_MODELO. */
  whenToUse: string
  /**
   * Esta é a variante que o componente usa quando a prop não é passada (o valor padrão de
   * `variantProps` no próprio componente React, ex.: `variant = 'line'` em `tabs.tsx`)? No
   * máximo uma por componente (nenhuma, para o componente sem variante ou sem um padrão real,
   * como `Chart`, cuja prop `type` é obrigatória); um componente com mais de uma variante tem
   * exatamente uma marcada `true` (teste de integridade, `assertCatalogIntegrity`). Usada por
   * `rendra trocar`: um elemento sem a prop conta como esta variante, e trocar para uma
   * variante `isDefault` remove a prop em vez de escrever o valor por extenso.
   */
  isDefault?: true
}

/** Formato do código: de 3 a 4 letras maiúsculas, hífen, três dígitos. */
export const COMPONENT_CODE_PATTERN = /^[A-Z]{3,4}-\d{3}$/

/**
 * Arquivos de `src/components/ui` que não entram no catálogo: são peças internas, sem uso
 * direto em tela (nunca aparecem sozinhos numa tela, só dentro de outro componente).
 */
export const CATALOG_EXCLUDED_FILES = [
  'components/ui/overlay-shell.tsx',
  'components/ui/picker-panel.tsx',
  'components/ui/sortable-handle.tsx',
]

export const CATALOG: ComponentCatalogEntry[] = [
  // ---------------------------------------------------------------- accordion
  {
    code: 'ACRN-001',
    name: 'Acordeão',
    component: 'Accordion',
    file: 'components/ui/accordion.tsx',
    variantProps: {},
    whenToUse: 'Para agrupar conteúdo que a pessoa abre um de cada vez, como perguntas frequentes.',
  },
  // ---------------------------------------------------------------- action-bar
  {
    code: 'ACB-001',
    name: 'Barra de ação',
    component: 'ActionBar',
    file: 'components/ui/action-bar.tsx',
    variantProps: {},
    whenToUse:
      'Para os botões de salvar, cancelar e ações extras de um formulário, drawer ou modal.',
  },
  // ---------------------------------------------------------------- alert
  {
    code: 'ALRT-001',
    name: 'Alerta',
    component: 'Alert',
    file: 'components/ui/alert.tsx',
    variantProps: {},
    whenToUse: 'Para um aviso de sucesso, erro, atenção ou informação dentro do corpo da tela.',
  },
  // ---------------------------------------------------------------- avatar
  {
    code: 'AVT-001',
    name: 'Avatar',
    component: 'Avatar',
    file: 'components/ui/avatar.tsx',
    variantProps: {},
    whenToUse: 'Para a foto ou as iniciais de uma pessoa.',
  },
  {
    code: 'AVT-002',
    name: 'Avatar em grupo',
    component: 'AvatarGroup',
    file: 'components/ui/avatar.tsx',
    variantProps: {},
    whenToUse: 'Para mostrar várias pessoas sobrepostas, com contador do excedente.',
  },
  // ---------------------------------------------------------------- badge
  {
    code: 'BDG-001',
    name: 'Selo',
    component: 'Badge',
    file: 'components/ui/badge.tsx',
    variantProps: {},
    whenToUse: 'Para marcar situação, categoria ou contagem curta ao lado de um texto.',
  },
  // ---------------------------------------------------------------- brand-feedback-icon
  {
    code: 'BFI-001',
    name: 'Ícone de feedback da marca',
    component: 'BrandFeedbackIcon',
    file: 'components/ui/brand-feedback-icon.tsx',
    variantProps: {},
    whenToUse:
      'Para o símbolo da marca tingido pela cor semântica em toast, alerta e telas de status.',
  },
  // ---------------------------------------------------------------- brand-logo
  {
    code: 'LOGO-001',
    name: 'Logotipo',
    component: 'BrandLogo',
    file: 'components/ui/brand-logo.tsx',
    variantProps: {},
    whenToUse: 'Para o logotipo da marca na sidebar, no header ou no painel do login.',
  },
  // ---------------------------------------------------------------- breadcrumb
  {
    code: 'BRD-001',
    name: 'Trilha responsiva',
    component: 'Breadcrumb',
    file: 'components/ui/breadcrumb.tsx',
    variantProps: { variant: 'responsive' },
    whenToUse: 'Dentro do corpo da página: trilha no desktop e botão voltar no celular.',
    isDefault: true,
  },
  {
    code: 'BRD-002',
    name: 'Trilha em texto',
    component: 'Breadcrumb',
    file: 'components/ui/breadcrumb.tsx',
    variantProps: { variant: 'trail' },
    whenToUse: 'No header do AppShell, abaixo do título, sempre em texto pequeno.',
  },
  // ---------------------------------------------------------------- button
  {
    code: 'BTN-001',
    name: 'Botão primário',
    component: 'Button',
    file: 'components/ui/button.tsx',
    variantProps: { variant: 'primary' },
    whenToUse: 'Para a ação principal da tela, do formulário ou da barra de ações.',
    isDefault: true,
  },
  {
    code: 'BTN-002',
    name: 'Botão secundário',
    component: 'Button',
    file: 'components/ui/button.tsx',
    variantProps: { variant: 'secondary' },
    whenToUse:
      'Para uma segunda cor de destaque da marca, quando a primária já está em uso na tela.',
  },
  {
    code: 'BTN-003',
    name: 'Botão contornado',
    component: 'Button',
    file: 'components/ui/button.tsx',
    variantProps: { variant: 'outline' },
    whenToUse: 'Para a ação de cancelar ou para ações secundárias ao lado de um botão primário.',
  },
  {
    code: 'BTN-004',
    name: 'Botão fantasma',
    component: 'Button',
    file: 'components/ui/button.tsx',
    variantProps: { variant: 'ghost' },
    whenToUse: 'Para ações discretas dentro de cards, linhas de tabela e barras de ferramenta.',
  },
  {
    code: 'BTN-005',
    name: 'Botão destrutivo',
    component: 'Button',
    file: 'components/ui/button.tsx',
    variantProps: { variant: 'destructive' },
    whenToUse: 'Para uma ação irreversível, como excluir ou encerrar.',
  },
  {
    code: 'BTN-006',
    name: 'Botão link',
    component: 'Button',
    file: 'components/ui/button.tsx',
    variantProps: { variant: 'link' },
    whenToUse: 'Para uma ação com aparência de link de texto, dentro de uma frase ou de um rodapé.',
  },
  // ---------------------------------------------------------------- button-group
  {
    code: 'BTNG-001',
    name: 'Grupo de botões',
    component: 'ButtonGroup',
    file: 'components/ui/button-group.tsx',
    variantProps: { orientation: 'horizontal' },
    whenToUse: 'Para botões encostados ou um controle segmentado de escolha única.',
    isDefault: true,
  },
  {
    code: 'BTNG-002',
    name: 'Grupo de botões vertical',
    component: 'ButtonGroup',
    file: 'components/ui/button-group.tsx',
    variantProps: { orientation: 'vertical' },
    whenToUse: 'Para botões de ação empilhados, na largura do grupo, com as bordas unidas.',
  },
  {
    code: 'BTNG-003',
    name: 'Grupo de botões responsivo',
    component: 'ButtonGroup',
    file: 'components/ui/button-group.tsx',
    variantProps: { orientation: 'responsive' },
    whenToUse: 'Para botões que empilham no celular e ficam lado a lado a partir do tablet.',
  },
  // ---------------------------------------------------------------- calendar
  {
    code: 'CAL-001',
    name: 'Calendário',
    component: 'Calendar',
    file: 'components/ui/calendar.tsx',
    variantProps: {},
    whenToUse: 'Para agenda com visão de mês, semana, dia ou lista de eventos.',
  },
  // ---------------------------------------------------------------- card
  {
    code: 'CARD-001',
    name: 'Card',
    component: 'Card',
    file: 'components/ui/card.tsx',
    variantProps: {},
    whenToUse: 'Para agrupar conteúdo de página com borda e sem sombra pesada.',
  },
  // ---------------------------------------------------------------- chart
  {
    code: 'CHT-001',
    name: 'Gráfico de linha',
    component: 'Chart',
    file: 'components/ui/chart.tsx',
    variantProps: { type: 'line' },
    whenToUse: 'Para mostrar a evolução de um valor ao longo do tempo.',
    // A prop `type` do Chart é obrigatória (sem valor padrão no componente): marcado aqui só
    // para satisfazer o teste de integridade (um padrão por componente com mais de uma
    // variante); "rendra trocar" nunca encontra um <Chart> sem `type`, porque não compila.
    isDefault: true,
  },
  {
    code: 'CHT-002',
    name: 'Gráfico de barras',
    component: 'Chart',
    file: 'components/ui/chart.tsx',
    variantProps: { type: 'bar' },
    whenToUse: 'Para comparar valores entre categorias.',
  },
  {
    code: 'CHT-003',
    name: 'Gráfico de área',
    component: 'Chart',
    file: 'components/ui/chart.tsx',
    variantProps: { type: 'area' },
    whenToUse: 'Para mostrar volume acumulado ao longo do tempo.',
  },
  {
    code: 'CHT-004',
    name: 'Gráfico de pizza',
    component: 'Chart',
    file: 'components/ui/chart.tsx',
    variantProps: { type: 'pie' },
    whenToUse: 'Para mostrar a proporção de poucas categorias dentro de um total.',
  },
  {
    code: 'CHT-005',
    name: 'Gráfico combinado',
    component: 'Chart',
    file: 'components/ui/chart.tsx',
    variantProps: { type: 'combo' },
    whenToUse: 'Para juntar barras e linha no mesmo gráfico, como receita e meta.',
  },
  {
    code: 'CHT-006',
    name: 'Velocímetro de meta',
    component: 'Chart',
    file: 'components/ui/chart.tsx',
    variantProps: { type: 'gauge' },
    whenToUse: 'Para o percentual de uma meta batida, com faixas de cor.',
  },
  {
    code: 'CHT-007',
    name: 'Funil',
    component: 'Chart',
    file: 'components/ui/chart.tsx',
    variantProps: { type: 'funnel' },
    whenToUse: 'Para etapas que afunilam, com a conversão entre elas.',
  },
  // ---------------------------------------------------------------- chat
  {
    code: 'CHAT-001',
    name: 'Lista de conversas',
    component: 'ConversationList',
    file: 'components/ui/chat.tsx',
    variantProps: {},
    whenToUse: 'Para a coluna de conversas do atendimento.',
  },
  {
    code: 'CHAT-002',
    name: 'Linha do tempo da conversa',
    component: 'ChatThread',
    file: 'components/ui/chat.tsx',
    variantProps: {},
    whenToUse: 'Para o histórico de mensagens de uma conversa aberta.',
  },
  {
    code: 'CHAT-003',
    name: 'Campo de mensagem',
    component: 'ChatComposer',
    file: 'components/ui/chat.tsx',
    variantProps: {},
    whenToUse: 'Para escrever, anexar e enviar uma mensagem no atendimento.',
  },
  // ---------------------------------------------------------------- checkbox
  {
    code: 'CHK-001',
    name: 'Caixa de seleção',
    component: 'Checkbox',
    file: 'components/ui/checkbox.tsx',
    variantProps: {},
    whenToUse: 'Para uma escolha independente, ligada ou desligada (inclusive indeterminada).',
  },
  {
    code: 'CHK-002',
    name: 'Grupo de caixas de seleção',
    component: 'CheckboxGroup',
    file: 'components/ui/checkbox.tsx',
    variantProps: {},
    whenToUse: 'Para uma lista de opções fixas com "selecionar todos".',
  },
  // ---------------------------------------------------------------- checklist
  {
    code: 'CKLT-001',
    name: 'Lista de verificação',
    component: 'Checklist',
    file: 'components/ui/checklist.tsx',
    variantProps: {},
    whenToUse:
      'Para uma lista de itens que a pessoa cria, renomeia, marca e remove, tudo por teclado.',
  },
  // ---------------------------------------------------------------- color-picker
  {
    code: 'COR-001',
    name: 'Seletor de cor',
    component: 'ColorPicker',
    file: 'components/ui/color-picker.tsx',
    variantProps: {},
    whenToUse: 'Para escolher uma cor entre amostras da marca ou uma cor livre por hexadecimal.',
  },
  // ---------------------------------------------------------------- data-toolbar
  {
    code: 'DTB-001',
    name: 'Barra de ferramentas da listagem',
    component: 'DataToolbar',
    file: 'components/ui/data-toolbar.tsx',
    variantProps: {},
    whenToUse: 'Para busca, filtros, colunas e a ação Novo, sempre dentro do card da tabela.',
  },
  // ---------------------------------------------------------------- date-picker
  {
    code: 'DTP-001',
    name: 'Seletor de data',
    component: 'DatePicker',
    file: 'components/ui/date-picker.tsx',
    variantProps: {},
    whenToUse: 'Para escolher uma data, um período ou um horário.',
  },
  // ---------------------------------------------------------------- document-viewer
  {
    code: 'DOC-001',
    name: 'Visualizador de documentos',
    component: 'DocumentViewer',
    file: 'components/ui/document-viewer.tsx',
    variantProps: {},
    whenToUse: 'Para abrir um PDF (contrato, nota fiscal, comprovante) sem sair da tela.',
  },
  // ---------------------------------------------------------------- drawer
  {
    code: 'GAV-001',
    name: 'Gaveta',
    component: 'Drawer',
    file: 'components/ui/drawer.tsx',
    variantProps: {},
    whenToUse: 'Para formulário ou detalhe de volume médio, até cerca de 12 campos.',
  },
  // ---------------------------------------------------------------- dropdown-menu
  {
    code: 'DDM-001',
    name: 'Menu suspenso',
    component: 'DropdownMenuContent',
    file: 'components/ui/dropdown-menu.tsx',
    variantProps: {},
    whenToUse: 'Para uma lista de ações ou opções que abre a partir de um botão ou de um item.',
  },
  // ---------------------------------------------------------------- empty-state
  {
    code: 'VAZ-001',
    name: 'Estado vazio',
    component: 'EmptyState',
    file: 'components/ui/empty-state.tsx',
    variantProps: {},
    whenToUse: 'Para quando uma lista, busca ou seção não tem nenhum dado ainda.',
  },
  // ---------------------------------------------------------------- error-page
  {
    code: 'ERRO-001',
    name: 'Tela de erro',
    component: 'ErrorPage',
    file: 'components/ui/error-page.tsx',
    variantProps: {},
    whenToUse: 'Para página não encontrada (404) ou falha do lado do servidor (500).',
  },
  // ---------------------------------------------------------------- field
  {
    code: 'FLD-001',
    name: 'Campo com rótulo e ajuda',
    component: 'Field',
    file: 'components/ui/field.tsx',
    variantProps: {},
    whenToUse: 'Para envolver qualquer controle de formulário com rótulo, ajuda e erro.',
  },
  {
    code: 'FLD-002',
    name: 'Rótulo',
    component: 'Label',
    file: 'components/ui/field.tsx',
    variantProps: {},
    whenToUse: 'Para um rótulo avulso, quando o Field completo não se aplica.',
  },
  // ---------------------------------------------------------------- form
  {
    code: 'FORM-001',
    name: 'Formulário',
    component: 'Form',
    file: 'components/ui/form.tsx',
    variantProps: {},
    whenToUse: 'Para envolver um formulário inteiro, ligado ao React Hook Form.',
  },
  {
    code: 'FORM-002',
    name: 'Seção de formulário',
    component: 'FormSection',
    file: 'components/ui/form.tsx',
    variantProps: {},
    whenToUse: 'Para agrupar campos relacionados dentro de um card com título.',
  },
  // ---------------------------------------------------------------- image-cropper
  {
    code: 'CROP-001',
    name: 'Recorte de imagem',
    component: 'ImageCropper',
    file: 'components/ui/image-cropper.tsx',
    variantProps: {},
    whenToUse:
      'Para recortar uma imagem numa proporção fixa antes de enviar (foto de perfil, capa).',
  },
  // ---------------------------------------------------------------- image-viewer
  {
    code: 'IMG-001',
    name: 'Visualizador de imagens',
    component: 'ImageViewer',
    file: 'components/ui/image-viewer.tsx',
    variantProps: {},
    whenToUse: 'Para abrir uma ou mais imagens em tela cheia, com legenda e navegação.',
  },
  // ---------------------------------------------------------------- info-hint
  {
    code: 'INFO-001',
    name: 'Dica de informação',
    component: 'InfoHint',
    file: 'components/ui/info-hint.tsx',
    variantProps: {},
    whenToUse: 'Para texto orientativo que não tem um título de tela, card ou seção ao lado.',
  },
  // ---------------------------------------------------------------- input
  {
    code: 'CAMP-001',
    name: 'Campo de texto',
    component: 'Input',
    file: 'components/ui/input.tsx',
    variantProps: {},
    whenToUse: 'Para texto, número, senha, telefone, moeda ou qualquer valor de uma linha.',
  },
  // ---------------------------------------------------------------- kanban
  {
    code: 'KANB-001',
    name: 'Quadro kanban',
    component: 'Kanban',
    file: 'components/ui/kanban.tsx',
    // variantProps fica vazio de propósito: a diferença para KANB-002 é a prop `dropTargets`
    // (um array de destinos de arraste), não um literal de string/número/booleano, e o
    // `rendra trocar` não tem como inventar um array, então ele recusa a troca com uma
    // mensagem clara ("sem prop que os distinga"), e a variante certa fica documentada aqui.
    variantProps: {},
    whenToUse: 'Para um funil de etapas com cartões que se movem entre colunas.',
    isDefault: true,
  },
  {
    code: 'KANB-002',
    name: 'Quadro kanban com destinos de arraste',
    component: 'Kanban',
    file: 'components/ui/kanban.tsx',
    variantProps: { hasDropTargets: true },
    whenToUse:
      'Quando o card pode ir para uma ação além de outra coluna (ex.: "Marcar como ganho"), ' +
      'mostrada numa barra durante o arraste e no menu "Mover para".',
  },
  // ---------------------------------------------------------------- list
  {
    code: 'LIST-001',
    name: 'Lista',
    component: 'List',
    file: 'components/ui/list.tsx',
    // variantProps fica vazio de propósito: a diferença para LIST-002 é a prop `onReorder`
    // (uma função de callback), não um literal de string/número/booleano, e o `rendra trocar`
    // não tem como inventar uma função, então ele recusa a troca com uma mensagem clara ("sem
    // prop que os distinga"), e a variante certa fica documentada aqui.
    variantProps: {},
    whenToUse: 'Para linhas simples com início, título, descrição e fim, navegáveis ou não.',
    isDefault: true,
  },
  {
    code: 'LIST-002',
    name: 'Lista reordenável',
    component: 'List',
    file: 'components/ui/list.tsx',
    variantProps: { sortable: true },
    whenToUse: 'Quando a pessoa pode mudar a ordem das linhas, por arraste ou pelas setas da alça.',
  },
  // ---------------------------------------------------------------- modal
  {
    code: 'MOD-001',
    name: 'Modal de confirmação',
    component: 'Modal',
    file: 'components/ui/modal.tsx',
    variantProps: { type: 'confirm' },
    whenToUse:
      'Para confirmar uma ação com uma principal e uma de cancelar; type="destructive" usa o ' +
      'mesmo código, porque só muda a cor.',
    isDefault: true,
  },
  {
    code: 'MOD-002',
    name: 'Modal de formulário',
    component: 'Modal',
    file: 'components/ui/modal.tsx',
    variantProps: { type: 'form' },
    whenToUse: 'Para um formulário de até 3 campos simples, sem sair da tela atual.',
  },
  {
    code: 'MOD-003',
    name: 'Modal informativo',
    component: 'Modal',
    file: 'components/ui/modal.tsx',
    variantProps: { type: 'info' },
    whenToUse:
      'Para só informar algo, sem decisão a tomar: um botão só, de largura total, que fecha o modal.',
  },
  // ---------------------------------------------------------------- otp-input
  {
    code: 'OTP-001',
    name: 'Código de verificação',
    component: 'OtpInput',
    file: 'components/ui/otp-input.tsx',
    variantProps: {},
    whenToUse: 'Para confirmar um código enviado por SMS ou e-mail (2FA).',
  },
  // ---------------------------------------------------------------- pagination
  {
    code: 'PAG-001',
    name: 'Paginação',
    component: 'Pagination',
    file: 'components/ui/pagination.tsx',
    variantProps: {},
    whenToUse: 'Para navegar entre páginas de uma listagem.',
  },
  // ---------------------------------------------------------------- popover
  {
    code: 'POP-001',
    name: 'Popover',
    component: 'PopoverContent',
    file: 'components/ui/popover.tsx',
    variantProps: {},
    whenToUse: 'Para um painel curto que abre perto de um botão, como um filtro.',
  },
  // ---------------------------------------------------------------- progress
  {
    code: 'PROG-001',
    name: 'Barra de progresso',
    component: 'Progress',
    file: 'components/ui/progress.tsx',
    variantProps: {},
    whenToUse: 'Para o andamento de uma tarefa ou de um envio.',
  },
  // ---------------------------------------------------------------- qr-code
  {
    code: 'QRC-001',
    name: 'Código QR',
    component: 'QrCode',
    file: 'components/ui/qr-code.tsx',
    variantProps: {},
    whenToUse: 'Para gerar um código QR (link, código de acesso) sem depender de serviço externo.',
  },
  // ---------------------------------------------------------------- radio-group
  {
    code: 'RDO-001',
    name: 'Opções em lista',
    component: 'RadioGroup',
    file: 'components/ui/radio-group.tsx',
    variantProps: { variant: 'list' },
    whenToUse: 'Para poucas opções simples, uma escolha só, em lista com bolinha e texto.',
    isDefault: true,
  },
  {
    code: 'RDO-002',
    name: 'Opções em cartões',
    component: 'RadioGroup',
    file: 'components/ui/radio-group.tsx',
    variantProps: { variant: 'cards' },
    whenToUse: 'Para opções com ícone e descrição, quando cada uma merece mais destaque.',
  },
  // ---------------------------------------------------------------- rating
  {
    code: 'RTG-001',
    name: 'Avaliação em estrelas',
    component: 'Rating',
    file: 'components/ui/rating.tsx',
    variantProps: { variant: 'stars' },
    whenToUse: 'Para uma nota rápida de satisfação, em estrelas.',
    isDefault: true,
  },
  {
    code: 'RTG-002',
    name: 'Avaliação em escala',
    component: 'Rating',
    file: 'components/ui/rating.tsx',
    variantProps: { variant: 'scale' },
    whenToUse: 'Para uma nota de 0 a 10 (NPS e pesquisas parecidas), com rótulo nas pontas.',
  },
  // ---------------------------------------------------------------- rendra-credit
  {
    code: 'CRED-001',
    name: 'Crédito Feito com Rendra',
    component: 'RendraCredit',
    file: 'components/ui/rendra-credit.tsx',
    variantProps: {},
    whenToUse:
      'No rodapé da tela de login, discreto; pode ser removido (credit={false}) ou levado para ' +
      'outro lugar visível, como uma tela Sobre.',
  },
  // ---------------------------------------------------------------- repeatable-field
  {
    code: 'REP-001',
    name: 'Campo repetível',
    component: 'RepeatableField',
    file: 'components/ui/repeatable-field.tsx',
    variantProps: {},
    whenToUse:
      'Para uma lista de campos do mesmo tipo (telefones, e-mails, endereços), com um principal.',
  },
  // ---------------------------------------------------------------- rich-text-editor
  {
    code: 'RTE-001',
    name: 'Editor de texto rico',
    component: 'RichTextEditor',
    file: 'components/ui/rich-text-editor.tsx',
    variantProps: {},
    whenToUse: 'Para conteúdo com formatação, listas e imagens, como a descrição de um artigo.',
  },
  // ---------------------------------------------------------------- select
  {
    code: 'SEL-001',
    name: 'Select',
    component: 'Select',
    file: 'components/ui/select.tsx',
    variantProps: {},
    whenToUse: 'Para escolher uma ou mais opções de uma lista, com ou sem busca.',
  },
  // ---------------------------------------------------------------- separator
  {
    code: 'SEP-001',
    name: 'Separador',
    component: 'Separator',
    file: 'components/ui/separator.tsx',
    variantProps: {},
    whenToUse: 'Para dividir conteúdo dentro de um card, no lugar de um card dentro de card.',
  },
  // ---------------------------------------------------------------- skeleton
  {
    code: 'SKEL-001',
    name: 'Esqueleto de carregamento',
    component: 'Skeleton',
    file: 'components/ui/skeleton.tsx',
    variantProps: {},
    whenToUse: 'Para o estado de carregamento, com a mesma estrutura do conteúdo final.',
  },
  // ---------------------------------------------------------------- slider
  {
    code: 'SLD-001',
    name: 'Slider',
    component: 'Slider',
    file: 'components/ui/slider.tsx',
    variantProps: {},
    whenToUse: 'Para escolher um número ou uma faixa dentro de um intervalo, arrastando.',
  },
  // ---------------------------------------------------------------- spinner
  {
    code: 'SPIN-001',
    name: 'Indicador de carregamento',
    component: 'Spinner',
    file: 'components/ui/spinner.tsx',
    variantProps: {},
    whenToUse:
      'Para um carregamento breve dentro de um botão, campo ou lista, sem barra de progresso.',
  },
  // ---------------------------------------------------------------- stat-card
  {
    code: 'STAT-001',
    name: 'Card de indicador',
    component: 'StatCard',
    file: 'components/ui/stat-card.tsx',
    variantProps: {},
    whenToUse: 'Para um número de destaque com variação, num painel ou dashboard.',
  },
  // ---------------------------------------------------------------- switch
  {
    code: 'SWT-001',
    name: 'Switch',
    component: 'Switch',
    file: 'components/ui/switch.tsx',
    variantProps: {},
    whenToUse: 'Para ligar ou desligar uma opção com efeito imediato.',
  },
  // ---------------------------------------------------------------- table
  {
    code: 'TAB-001',
    name: 'Tabela',
    component: 'Table',
    file: 'components/ui/table.tsx',
    variantProps: {},
    whenToUse: 'Para qualquer listagem de registros, com busca, filtros e paginação.',
  },
  // ---------------------------------------------------------------- tabs
  {
    code: 'ABA-001',
    name: 'Abas em linha',
    component: 'Tabs',
    file: 'components/ui/tabs.tsx',
    variantProps: { variant: 'line' },
    whenToUse: 'Padrão para dividir o conteúdo de uma tela em seções, com sublinhado na aba ativa.',
    isDefault: true,
  },
  {
    code: 'ABA-002',
    name: 'Abas em pílula',
    component: 'Tabs',
    file: 'components/ui/tabs.tsx',
    variantProps: { variant: 'pill' },
    whenToUse: 'Quando as abas precisam de mais destaque visual, como pílulas sobre fundo suave.',
  },
  // ---------------------------------------------------------------- textarea
  {
    code: 'TXT-001',
    name: 'Área de texto',
    component: 'Textarea',
    file: 'components/ui/textarea.tsx',
    variantProps: {},
    whenToUse: 'Para texto longo, com contador de caracteres opcional.',
  },
  // ---------------------------------------------------------------- timeline
  {
    code: 'TLN-001',
    name: 'Linha do tempo',
    component: 'Timeline',
    file: 'components/ui/timeline.tsx',
    variantProps: {},
    whenToUse: 'Para uma sequência de eventos em ordem, cada um com um tom semântico.',
  },
  // ---------------------------------------------------------------- toast
  {
    code: 'TST-001',
    name: 'Toast',
    component: 'toast',
    file: 'components/ui/toast.tsx',
    variantProps: {},
    whenToUse: 'Para uma confirmação rápida depois de uma ação, sem interromper a tela.',
  },
  // ---------------------------------------------------------------- tooltip
  {
    code: 'TIP-001',
    name: 'Tooltip',
    component: 'Tooltip',
    file: 'components/ui/tooltip.tsx',
    variantProps: {},
    whenToUse: 'Para informação complementar, nunca essencial, que aparece ao passar o mouse.',
  },
  // ---------------------------------------------------------------- upload
  {
    code: 'UPL-001',
    name: 'Upload',
    component: 'Upload',
    file: 'components/ui/upload.tsx',
    // A prop que distingue de UPL-002 é `layout` ('list' | 'gallery', padrão 'list'): declarar
    // o valor padrão aqui (em vez de {}) é o que permite ao `rendra trocar` inserir
    // layout="gallery" num elemento sem a prop, ao trocar para UPL-002.
    variantProps: { layout: 'list' },
    whenToUse: 'Para arrastar e soltar ou escolher arquivos, com lista e progresso por arquivo.',
    isDefault: true,
  },
  {
    code: 'UPL-002',
    name: 'Upload em galeria',
    component: 'Upload',
    file: 'components/ui/upload.tsx',
    variantProps: { layout: 'gallery' },
    whenToUse: 'Para upload de fotos e vídeos, com miniatura em vez de linha de lista.',
  },
  // ---------------------------------------------------------------- flow
  {
    code: 'FLX-001',
    name: 'Editor de fluxo',
    component: 'FlowEditor',
    file: 'components/ui/flow-editor.tsx',
    variantProps: {},
    whenToUse:
      'Para montar, ligar, validar e testar um fluxo de automação (gatilho, ação, condição, espera e fim).',
  },
  {
    code: 'FLX-002',
    name: 'Visualizador de fluxo',
    component: 'FlowViewer',
    file: 'components/ui/flow-viewer.tsx',
    variantProps: {},
    whenToUse: 'Para mostrar um fluxo de automação só para ler, sem editar.',
  },
  // ---------------------------------------------------------------- widget-grid
  {
    code: 'WDG-001',
    name: 'Grade de widgets',
    component: 'WidgetGrid',
    file: 'components/ui/widget-grid.tsx',
    variantProps: {},
    whenToUse: 'Para um painel com blocos que a pessoa pode arrastar e redimensionar.',
  },
  // ---------------------------------------------------------------- wizard
  {
    code: 'WIZ-001',
    name: 'Wizard',
    component: 'Wizard',
    file: 'components/ui/wizard.tsx',
    variantProps: {},
    whenToUse: 'Para um cadastro longo dividido em etapas, com validação por etapa.',
  },
  {
    code: 'WIZ-002',
    name: 'Indicador de etapas',
    component: 'Stepper',
    file: 'components/ui/wizard.tsx',
    variantProps: {},
    whenToUse: 'Para mostrar o progresso em etapas por conta própria, sem o Wizard inteiro.',
  },
]

/** Um código específico do catálogo (ex.: para montar a vitrine ou o registry). */
export function getCatalogEntry(code: string): ComponentCatalogEntry | undefined {
  return CATALOG.find((entry) => entry.code === code)
}

/** Todos os códigos de um componente (ex.: as duas variantes do Tabs), na ordem cadastrada. */
export function catalogByComponent(component: string): ComponentCatalogEntry[] {
  return CATALOG.filter((entry) => entry.component === component)
}

/**
 * Resolve o código de catálogo de um componente a partir das props que definem a variante.
 * Sem variante (um código só, ou nenhuma prop bate), devolve o primeiro código cadastrado
 * para o componente. Usado pelos próprios componentes para calcular o `data-rendra`, sem
 * duplicar a tabela de variantes.
 */
export function resolveCatalogCode(component: string, props: Record<string, unknown> = {}): string {
  const entries = catalogByComponent(component)
  if (entries.length === 0) {
    throw new Error(`Catálogo: nenhum código cadastrado para o componente "${component}".`)
  }
  const match = entries.find(
    (entry) =>
      Object.keys(entry.variantProps).length > 0 &&
      Object.entries(entry.variantProps).every(([key, value]) => props[key] === value),
  )
  // entries.length > 0 já foi conferido acima: entries[0] sempre existe aqui.
  return (match ?? entries[0]!).code
}

/*
 * Regras de integridade (usadas pelo teste em components.test.ts e por assertCatalogIntegrity).
 * São funções puras, sem acesso a arquivo: recebem a lista de entradas e devolvem o que
 * está errado, para o teste poder provar a regra com uma lista fabricada, não só com o
 * catálogo real.
 */

/** Código que aparece mais de uma vez na lista. */
export function findDuplicateCodes(entries: ComponentCatalogEntry[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.code)) duplicates.add(entry.code)
    seen.add(entry.code)
  }
  return [...duplicates]
}

/** Código fora do formato ^[A-Z]{3,4}-\d{3}$. */
export function findInvalidFormatCodes(entries: ComponentCatalogEntry[]): string[] {
  return entries
    .filter((entry) => !COMPONENT_CODE_PATTERN.test(entry.code))
    .map((entry) => entry.code)
}

/**
 * Código que colidiria com um código de modelo (T1, C4, M5...) de src/config/presets.ts,
 * cujo padrão é /[TCM]\d+/ (uma letra T, C ou M seguida direto de dígitos, sem hífen).
 */
export function findPresetCollisions(entries: ComponentCatalogEntry[]): string[] {
  return entries.filter((entry) => /[TCM]\d+/.test(entry.code)).map((entry) => entry.code)
}

/** Arquivo (caminho relativo a src/) que não tem nenhuma entrada no catálogo. */
export function filesMissingCatalogEntry(
  files: string[],
  entries: ComponentCatalogEntry[],
): string[] {
  const covered = new Set(entries.map((entry) => entry.file))
  return files.filter((file) => !covered.has(file))
}

/** Componente (nome) com mais de uma variante no catálogo, agrupadas na ordem cadastrada. */
function groupByComponentWithMultipleVariants(
  entries: ComponentCatalogEntry[],
): Map<string, ComponentCatalogEntry[]> {
  const byComponent = new Map<string, ComponentCatalogEntry[]>()
  for (const entry of entries) {
    const list = byComponent.get(entry.component) ?? []
    list.push(entry)
    byComponent.set(entry.component, list)
  }
  for (const [component, list] of byComponent) if (list.length <= 1) byComponent.delete(component)
  return byComponent
}

/**
 * Componente com mais de uma variante que não tem nenhuma marcada `isDefault` (fase 3, Lote
 * B: `rendra trocar` precisa saber qual variante um elemento sem a prop representa).
 */
export function findComponentsWithoutDefault(entries: ComponentCatalogEntry[]): string[] {
  const groups = groupByComponentWithMultipleVariants(entries)
  return [...groups]
    .filter(([, list]) => !list.some((entry) => entry.isDefault))
    .map(([component]) => component)
}

/** Componente com mais de uma variante marcada `isDefault` ao mesmo tempo (só pode uma). */
export function findComponentsWithMultipleDefaults(entries: ComponentCatalogEntry[]): string[] {
  const groups = groupByComponentWithMultipleVariants(entries)
  return [...groups]
    .filter(([, list]) => list.filter((entry) => entry.isDefault).length > 1)
    .map(([component]) => component)
}

/**
 * Lança se houver código duplicado, fora do formato, colidindo com um código de modelo, ou
 * componente com mais de uma variante sem exatamente uma marcada `isDefault`.
 */
export function assertCatalogIntegrity(): void {
  const duplicates = findDuplicateCodes(CATALOG)
  if (duplicates.length > 0) {
    throw new Error(`Catálogo: código duplicado: ${duplicates.join(', ')}.`)
  }
  const invalid = findInvalidFormatCodes(CATALOG)
  if (invalid.length > 0) {
    throw new Error(`Catálogo: código fora do formato ^[A-Z]{3,4}-\\d{3}$: ${invalid.join(', ')}.`)
  }
  const collisions = findPresetCollisions(CATALOG)
  if (collisions.length > 0) {
    throw new Error(
      `Catálogo: código colide com um código de modelo (T/C/M): ${collisions.join(', ')}.`,
    )
  }
  const semPadrao = findComponentsWithoutDefault(CATALOG)
  if (semPadrao.length > 0) {
    throw new Error(
      `Catálogo: componente com mais de uma variante sem nenhuma marcada isDefault: ${semPadrao.join(', ')}.`,
    )
  }
  const padraoDuplicado = findComponentsWithMultipleDefaults(CATALOG)
  if (padraoDuplicado.length > 0) {
    throw new Error(
      `Catálogo: componente com mais de uma variante marcada isDefault: ${padraoDuplicado.join(', ')}.`,
    )
  }
}
