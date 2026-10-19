# Changelog

O que mudou em cada versão e o que um projeto derivado precisa fazer para atualizar. Segue o [versionamento semântico](https://semver.org/lang/pt-BR/). Datas em DD/MM/AAAA.

## Não publicado

`rendra auditar` ganha a varredura completa (`--all`), `--ignore`, várias pastas e o `rendra.config.json`, e os componentes ganham opções novas: espaços e logo no AppShell, menu do usuário enxuto, `orientation` no ButtonGroup, três opções no BrandFeedbackIcon, rótulos e "Pular" no Wizard, `back` na ErrorPage, `bodyTitle` e `titleSpace` no PageHeader, mais duas correções de acessibilidade. Sem quebra: toda prop nova é opcional e o padrão reproduz o que já era, e `rendra auditar` e `rendra auditar <pasta>`, sem flag e sem `rendra.config.json`, imprimem e saem como antes.

### Corrigido

- **Botão do menu do usuário (WCAG 2.5.3, `label-content-name-mismatch`):** sem foto o botão mostra as iniciais ("AS"), mas o nome acessível era "Menu de Ana Souza", sem o texto visível. Agora é "AS, menu de Ana Souza", com ou sem foto. Quem consulta o botão por rótulo nos testes troca `getByLabelText('Menu de Ana Souza')` por `getByLabelText(/menu de Ana Souza/i)`. O teste de acessibilidade passa a rodar essa regra do axe.
- **Botão "Fechar" do Modal sem cabeçalho visível (`confirm`, `destructive` e `info`):** o corpo cobria o botão e o clique não chegava (o Playwright acusava "intercepts pointer events"). Agora o botão fica fora do cabeçalho oculto, invisível como antes, recebe clique e aparece quando ganha foco de teclado. O visual de repouso é o mesmo. A área do botão (canto superior direito) segue clicável mesmo invisível.

### Adicionado

- **`rendra auditar --all`:** aplica no projeto de destino as 17 regras do `npm run check:rules` (as sete genéricas mais `var-inline`, `svg-marca`, `classe-dinamica`, `texto-estreito`, `primaria-como-texto`, `componente-duplicado`, `css-fora-do-lugar`, `botao-solto`, `texto-orientativo` e `variavel-sem-prefixo-rendra`). Com `--all`, `.test.`, `.stories.`, `node_modules`, `dist` e `build` não entram, e as pastas de marca só passam pelo prefixo `--rendra-`.
- **`--ignore a,b`:** pula pastas por prefixo de pasta, relativo ao projeto (também `--ignore a --ignore b` e `--ignore=a,b`), com ou sem `--all`.
- **Várias pastas:** `rendra auditar src extra`. Com uma pasta, ela é a base do projeto; com duas ou mais, a base é a pasta atual. Pasta fora da base dá erro claro.
- **`rendra.config.json`** na base do projeto, opcional, com `pastas`, `ignorar`, `regras` (`{ "<id>": false }` desliga qualquer das 17 regras), `pastasMarca` e `pastasTelas`. A flag vence o config e não soma. JSON inválido, chave ou regra desconhecida e tipo errado dão mensagem em português e código de saída 1.
- **`rendra auditar --help`** mostra a ajuda geral e sai com 0.
- **AppShell `workspaces`:** seletor de espaço (empresa, unidade) no topo do menu do usuário, `{ items: { id, label }[], activeId, onSelect(id), label? }`. Sem a prop, o menu é o de antes.
- **AppShell `userMenu`:** `{ theme?, template?, layout? }`, todos `true` por padrão, esconde o submenu Tema, Template ou Layout do menu do usuário.
- **AppShell `headerLogo`:** logo do header no celular (abaixo de `md`), no lugar do título e da trilha. O título continua anunciado ao leitor de tela, a seta de voltar e o ícone de ajuda ficam. O nó não pode ser interativo (o contêiner é `aria-hidden`).
- **ButtonGroup `orientation`:** `horizontal` (padrão), `vertical` e `responsive` (vertical abaixo de `md`), só no modo agrupado. Códigos de catálogo `BTNG-002` (vertical) e `BTNG-003` (responsive); `BTNG-001` passa a ser a variante padrão.
- **BrandFeedbackIcon `symbolTone`, `statusBadge` e `animation`:** `symbolTone="brand"` pinta o símbolo com a cor primária da marca; `statusBadge` põe o ícone do estado ao lado do símbolo no lugar do selo sobreposto; `animation="encaixe"` entra em 240 ms, sem quique, sem desenho e sem tremor. Novo token `--animate-encaixe`.
- **Modal `cancelLabel` em `info`:** o segundo botão (cancelar) aparece só quando `cancelLabel` é passado. Em `confirm` e `destructive`, `cancelLabel` troca o "Cancelar".
- **Wizard `cancelLabel`, `backLabel`, `nextLabel`, `onSkip` e `skipLabel`:** rótulos próprios e etapa opcional. "Pular" fica em "Mais ações" da barra de ações, avança sem validar e não aparece na última etapa.
- **ErrorPage `back`:** `back={false}` tira o Voltar e a ação principal ocupa 100% da largura. Padrão `true`.
- **PageHeader `bodyTitle` e `titleSpace`:** `bodyTitle` põe um título discreto (`text-base`) no topo do corpo abaixo de `md`; `titleSpace="none"` não reserva o bloco do título (o vão de 16 px no celular) quando o título é só de leitor de tela e não há `description`. Padrões `false` e `reserve`.
- **Guia do host** em `docs/COMO_APLICAR.md` ("O CSS do pacote e as classes das suas telas") e no `README.md`: o que o `components.css` traz e não traz, receita para host com Tailwind v4 e sem Tailwind, e a lista das 51 `@utility`, com teste que barra a lista velha.
- `PageHeader` e `EmptyState` documentam o `className` que zera a margem negativa (`mb-0 md:mb-0`) e o respiro vertical (`py-0 md:py-0`), com teste.

### Alterado

- **Flag desconhecida em `rendra auditar`** (`--foo`) e `--ignore` sem valor agora dão erro claro e código de saída 1, em vez de a flag ser ignorada em silêncio ou o valor virar a pasta a auditar.
- **Onde moram as regras:** `help-length.ts` e `var-prefix.ts` foram de `scripts/lib` para `src/cli` (entram no pacote da CLI); `scripts/lib` só reexporta. O `scripts/check-design-rules.mjs` virou um chamador fino de `src/cli/auditar-tudo.ts`, com a mesma saída de antes. Quem copiou `scripts/` e `src/cli` para outro projeto copia as duas pastas de novo, e, se o `tsconfig` do projeto checa `src/cli`, ativa `allowImportingTsExtensions`.
- **`userConfigurable`** segue como era: ignora o layout que o usuário guardou no navegador ao montar. Não esconde o submenu Layout. `DESIGN_RULES.md` e `docs/COMO_APLICAR.md` passam a dizer isso e a apontar `userMenu` para esconder Tema, Template e Layout.
- **`Modal`:** `cancelLabel` perdeu o valor padrão do parâmetro (o padrão "Cancelar" agora é resolvido em `confirm` e `destructive`), sem mudar o comportamento de quem já usa.
- **`initials()`** saiu do `Avatar` para `src/lib/initials.ts`; não é export público.

## 2.3.0 (02/10/2026)

Novidade no Select múltiplo, correção no Input secret e uma página de apresentação para o projeto. Sem quebra: quem não quer a linha "Selecionar todos" em listas longas passa `selectAll={false}`.

### Corrigido

- **Input `variant="secret"` com `clearable`:** em edição, o botão "Limpar campo" olhava o `value` do consumidor, então aparecia por causa do valor salvo (que nunca deve chegar ao campo) e não esvaziava o que a pessoa digitou. Agora o campo tem rascunho próprio, abre vazio, o botão aparece só depois de digitar e "Limpar campo" esvazia o campo e avisa `onChange` e `onValueChange`.

### Adicionado

- **Página de apresentação do Rendra Design System** (hero, seções, galeria com lightbox e FAQ), `og-image` composta, `sitemap`, `llms.txt` e stubs de redirecionamento com canonical para as rotas antigas. A demo passa a viver em `/demo/` e o Pages é montado por um script só, igual no CI e no local. O README e o briefing do web foram atualizados com a demo em `/demo/`.
- **Matriz de modelos** no `CLAUDE.md` do projeto (levantamento, plano, validação do plano, execução e validação da entrega por modelos diferentes).

### Alterado

- **Select múltiplo com "Selecionar todos" automático:** com mais de 5 opções (todas as mostradas, incluindo desabilitadas e de qualquer grupo), a linha aparece sem passar `selectAll`. `selectAll={false}` desliga; com 5 opções ou menos continua opt-in por `selectAll`. A linha é uma só e alterna: vira "Desmarcar todos" quando todas as opções habilitadas estão marcadas. Quem não quer a linha em listas longas passa `selectAll={false}`.
- **Sem robôs como colaboradores:** o workflow "Atualizar referências visuais" agora faz o commit com autor e committer do mantenedor, em vez de `github-actions[bot]`. O Dependabot de versões (`.github/dependabot.yml`) foi removido; ficam só os alertas de segurança do GitHub. A atualização de dependências passa a ser manual, como descrito no `CONTRIBUTING.md`.
- **Textos públicos sem promessa de gratuidade:** metas, JSON-LD, FAQ e o texto da demo não prometem mais que não haverá versão paga, com teste que barra a volta.
- **Limpeza do clone:** a lista "Limpeza do clone" do `docs/COMO_APLICAR.md` cresceu: passa a incluir os arquivos da página de apresentação e os testes dela (`7fddd16`, `01ccb8b`) e o `scripts/lib/texto-publico.test.ts`, que só vale para os textos do Rendra.
- **Início por chat sem terminal:** o `AGENTS.md` ganhou o ramo (d), que conduz o briefing em texto e entrega o `docs/BRIEFING.md` com as linhas de continuação, e os ramos (b) e (c) aceitam briefing colado sem refazer as perguntas. O `CLAUDE.md` deixa claro que a matriz de modelos vale para a manutenção do próprio Rendra.
- Simulação dos dois leigos aprovada em 02/10/2026 (Regra um, item 7): começar um sistema novo e migrar um sistema existente, nos três perfis de IA (com terminal e agentes, com terminal sem agentes, chat sem terminal), com o clone no ar e as verificações verdes a partir do link, sem lacuna bloqueadora.

## 2.2.2 (29/09/2026)

O repositório e o site mudaram de endereço, para alinhar o nome ao do pacote (`@rendra-ui/web`). O código do pacote é o mesmo da 2.2.1. O pacote agora também aparece na busca do npm por "rendra" e "rendra-ui". Sem quebra no código.

### Alterado

- **Repositório:** `github.com/bsmagalhaes/rendra-design-system` passou a `github.com/bsmagalhaes/rendra-ui-web`. Os links antigos do GitHub continuam redirecionando; o `repository`, o `homepage` e o `bugs` do pacote já apontam para o endereço novo.
- **Site (demo, galeria e Storybook):** agora em `https://bsmagalhaes.github.io/rendra-ui-web/`. O endereço antigo (`/rendra-design-system/`) deixou de responder, porque o GitHub Pages não redireciona.
- **Registry do shadcn:** agora em `https://bsmagalhaes.github.io/rendra-ui-web/r/{name}.json`. Quem copiou o `components.json` do Rendra (registry `@rendra`) ou usa `npx shadcn@latest add https://.../r/<item>.json` precisa trocar a URL para o endereço novo; a antiga deixou de funcionar.
- **Busca no npm:** a descrição do pacote começa com "Rendra" e as palavras-chave `rendra`, `rendra-ui` e `rendra-design-system` foram acrescentadas.

## 2.2.1 (27/09/2026)

Mesmo código da 2.2.0, agora publicado pelo trusted publishing do npm, com atestado de proveniência (o pacote mostra de qual commit e de qual workflow do GitHub ele saiu). A 2.2.0 saiu pelo token, sem atestado. Sem quebra.

### Alterado

- `.github/workflows/publish.yml` publica com `npm publish --provenance --access public` e `id-token: write`, sem o segredo `NPM_TOKEN`.

## 2.2.0 (27/09/2026)

Tabela na `@tanstack/react-table` 9, rede de testes de comportamento em todos os componentes antigos e orientação completa para quem chega pelo link sem saber programar. Nenhuma quebra: atualizar é só subir a versão.

### Adicionado

- **Jornada do leigo:** `AGENTS.md`, `README.md`, `docs/COMO_APLICAR.md`, `docs/PROMPT_MIGRACAO.md` e `docs/BRIEFING_MODELO.md` guiam a IA desde o link (clonar, instalar, subir o app, escolher entre pacote, cópia ou clone pelo React do projeto) até o briefing, com "não sei, sugira" nos blocos de marca. `docs/BRIEFING.md` passa a ser artefato local, fora do git.
- **Registry:** itens `app-shell-test` (os sete testes da casca) e `layout-test` (`page-header` e `primitives`); `kanban-test` passa a levar `kanban.test.ts`. Mudança só aditiva, 127 para 129 itens.
- **Stories:** DataToolbar, RichTextEditor, WidgetGrid, BrandLogo, Wizard com validação, ConversationList, Form com FormSection, ImageCropper, ImageViewer, CardFooter e subitens do DropdownMenu.

### Testes

- Testes de comportamento (efeito visível, não só chamada) para toast, card, date-picker, calendar, data-toolbar, chat, rich-text-editor, wizard, widget-grid, brand-logo, avatar, badge, brand-feedback-icon, action-bar, dropdown-menu, empty-state, tooltip, popover, button-group, error-page, chart, separator, slider, stat-card, skeleton, form, breadcrumb, otp-input, pagination, drawer, notifications, page-header e primitives.
- Piso de cobertura com chave própria por arquivo em `vite.config.ts`; `src/components/layout` entra na medição. Cobertura de linhas de 82,8% para mais de 86%.

### Dependências

- **`@tanstack/react-table` 8.21.3 para 9.2.4**, em `src/components/ui/table.tsx`: `useReactTable` vira `useTable({ features, ... })`, com `features` declarado por `tableFeatures({...})` como constante de módulo (`rowSortingFeature`, `columnFilteringFeature`, `globalFilteringFeature`, `rowPaginationFeature`, `rowSelectionFeature`, `rowExpandingFeature`, `columnVisibilityFeature`, mais os quatro modelos de linha e os registros de `sortFn`/`filterFn`). A alternância entre local e remoto continua só pelas flags `manualSorting`/`manualFiltering`/`manualPagination` e por `rowCount`, sem UI nova. `@tanstack/react-store` entra como dependência transitiva do `@tanstack/react-table` (não é peer nesta versão). Nenhuma assinatura pública de `TableProps`, `TableColumn`, `RowAction`, `TableQuery`, `TablePage` ou `Table` mudou.

## 2.1.0 (26/09/2026)

Pacote publicável pronto para uso externo (`import { Button } from '@rendra-ui/web'`, `import '@rendra-ui/web/tokens.css'`), CLI `rendra`, skill de migração parcial completa, seção de comandos no README, publicação por tag e robots.txt liberando busca (inclusive de assistente de IA) e bloqueando só o treino de modelo.

### Adicionado

- **Pacote npm** (`@rendra-ui/web`, escopado na organização npm `rendra-ui`): `npm run build:lib` gera `dist/index.js` e as entradas por subcaminho (`router-bridge`, `document-viewer`, `rich-text-editor`, `chart`, `widget-grid`) mais `dist/tokens.css`, `dist/base.css` e `dist/components.css`, pré-compilados (estratégia A: o host recebe CSS puro, sem precisar do Tailwind). `react-router` fica fora dos peers e das dependências, só existe na entrada opcional `/router-bridge`. `npm run verify:pack` empacota de verdade (`npm pack`), instala num projeto à parte e confere: sem erro ao renderizar, sem `react-router` no `package.json` publicado, `package.json` publicado sem `private: true` (o `npm pack` empacotaria normalmente e mascararia o problema, então `verify:pack` falha explícito antes disso), banner com a versão exata (e a autoria) em cada arquivo, `--rendra-primary`/`--rendra-background` presentes e nenhuma variável do namespace do Tailwind (`--color-*`, `--radius-*`, `--spacing-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--container-*`, `--ease-*`, `--animate-*`, `--default-*`) declarada em nenhum dos três arquivos CSS: as dez que mudam a partir de md (`--spacing-control-*`, `--spacing-header`, `--text-xl/2xl/3xl`) saem renomeadas para `--rendra-*`; o resto do namespace, que nunca muda em tempo de execução, entra direto como valor literal nas utilities compiladas.
- **Publicação por tag** (`.github/workflows/publish.yml`, novo): `push` de uma tag `v*` builda o pacote, roda `verify:pack` e publica no npm com `npm publish --provenance --access public`, depois de conferir que a tag bate com `version` do `package.json`; dispensa o segredo `NPM_TOKEN` com o _trusted publishing_ do npm configurado, ou usa esse segredo como alternativa. `npm run build:lib` e `npm run verify:pack` entram no job `qualidade` do CI, e `npm run test:css-layers` entra no job `navegador`.
- **CLI `rendra`** (`bin/rendra.mjs`, compilada em `dist/cli/*.js`, nunca lida do `.ts` fonte no pacote publicado): `rendra codigos` lista o catálogo de componentes; `rendra auditar [cwd]` reaplica as sete regras genéricas de `DESIGN_RULES.md` (`cor-fixa`, `valor-arbitrario`, `estilo-inline`, `fonte-fixa`, `100vh`, `fora-da-escala` e a nova `raio-fixo`) num projeto qualquer; `rendra trocar <DE> <PARA> [--dry-run]` reescreve a prop literal que distingue duas variantes do catálogo, preservando formatação, cobrindo também o elemento sem a prop (a variante padrão do componente, marcada `isDefault` em `src/catalog/components.ts`: insere a prop ao trocar para fora do padrão, remove ao trocar para o padrão, nunca escreve o valor padrão por extenso); nunca toca prop dinâmica (`variant={x}`, listada para revisão manual) nem troca entre componentes diferentes (só lista onde aparecem). `typescript` é `peerDependency` opcional: `rendra trocar` carrega o `typescript` do projeto de destino por import dinâmico e sai com mensagem clara, em código de saída diferente de zero, quando não encontra.
- **`scripts/check-design-rules.mjs`** passa a importar as seis regras genéricas mais `fora-da-escala` de `src/cli/auditar.ts`, a mesma lógica da CLI, em vez de manter uma segunda cópia; a saída do `check:rules` deste repositório continua igual.
- **Skill `rendra-migracao-parcial`** completa: os três níveis (tokens, padrões, componentes) com o passo a passo, usando `rendra auditar` e `rendra trocar` como os comandos que o agente de destino chama.
- **README:** seção de comandos e formas de uso, ampliando "Receber atualizações", com boilerplate, registry, pacote npm, CLI, skill e códigos de modelo e de componente.
- **robots.txt** (`scripts/seo-build.mjs`, `scripts/lib/robots.ts`) libera todo robô de busca, inclusive os seis que buscam ou respondem por assistente de IA a pedido de alguém (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`), e bloqueia só os sete que rastreiam o site inteiro para treinar modelo (`GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`, `Google-Extended`, `Bytespider`, `Applebot-Extended`); `index.html` mantém as metas `noai`/`noimageai` ao lado do `robots` já existente.
- **`llms.txt`** (`scripts/lib/llms-txt.ts`, testado à parte de `scripts/seo-build.mjs`) ganha as seções "Para quem", instalação (`npm install @rendra-ui/web react react-dom radix-ui`) e os comandos da CLI `rendra`, além do que já tinha ("O que é", "Regras de interface", "Telas do demo", "Documentação").

### Dependências

- `vite` 8.3.1, `vitest`/`@vitest/coverage-v8` 5.0.2, `@types/node` 26.6.3, `lucide-react` 1.48.0 e `react-hook-form` 7.89.0 (patch/minor). `eslint` 10.11.0 com `@eslint/js` 10.0.1, sem alterar `eslint.config.js` nem desativar regra do projeto.
- **`overrides` no `package.json`, restrito a `eslint-plugin-jsx-a11y`:** essa é a versão mais recente publicada do plugin e o `peerDependencies` dele ainda só declara suporte até `eslint@^9`, então um `npm ci` sem flag falhava com ERESOLVE depois do bump para o ESLint 10 (o plugin funciona normal sob o ESLint 10; é só o `peerDependencies` publicado que está desatualizado). O override força a versão real do `eslint` do projeto (`$eslint`) só nessa dependência, sem usar `.npmrc` com `legacy-peer-deps` (que desligaria a checagem de peers do repositório inteiro).

### Pendências

- **`@tanstack/react-table` fica em 8.x nesta versão.** A 9 muda a API de colunas e os tipos; subir exige revisar `src/components/ui/table.tsx` e os testes da tabela, o que fica para um lote futuro dedicado (feito na 2.2.0).

## 2.0.0 (26/09/2026)

Versão major para desacoplar rotas, config e CSS do Rendra da forma como o boilerplate os usa, aproximando o repositório das práticas de mercado de design system (peer deps, camadas de CSS, contrato público explícito). Guia de migração das quatro quebras abaixo.

### Quebras e guia de migração

- **Prefixo `--rendra-` em toda variável CSS própria do tema.** `--primary`, `--radius`, `--sidebar`, `--brand-font`, `--shape-control`, `--elevation-md` e todas as outras viram `--rendra-primary`, `--rendra-radius`, `--rendra-sidebar`, `--rendra-brand-font`, `--rendra-shape-control`, `--rendra-elevation-md` etc. As classes do Tailwind no JSX **não mudam** (`bg-primary`, `rounded-control` continuam existindo: o `@theme inline` de `globals.css` mapeia `--color-primary: var(--rendra-primary)`). O namespace do próprio Tailwind (`--color-*`, `--spacing-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--container-*`) continua sem o prefixo, porque renomeá-lo mudaria toda classe que depende dele. **Migração:** troque toda referência direta a `var(--nome)` (fora de classe Tailwind) para `var(--rendra-nome)`; `npm run check:rules` (regra `variavel-sem-prefixo-rendra`) acusa o que faltar.
- **`RendraProvider` no lugar do acoplamento direto ao `react-router`.** Navegação (link, rota atual, navegar com voltar) chega por `linkComponent`, `useCurrentPath` e `navigate`, resolvidos pelo `RendraProvider`; quem usa `react-router` direto passa o adaptador de `rendra-router-bridge` (entrada separada do pacote, único ponto que o importa). **Migração:** envolva o app em `<RendraProvider linkComponent={...} useCurrentPath={...} navigate={...}>` (ou use a ponte pronta do React Router) antes de renderizar o `AppShell` ou qualquer link do design system.
- **`AppShell` desacoplado, por props.** `navigation`, `layout`, dados do usuário, itens do menu do usuário, `logout`, `homeLabel`, `quickActions` e `notifications` chegam por prop, não mais importados direto de `@/config` dentro do componente. **Migração:** monte esses valores no projeto (a partir de `src/config/navigation.ts` e `src/config/layout.ts`, como já era) e passe todos como prop do `AppShell`.
- **CSS em camadas** (`@layer theme, base, rendra.base, components, rendra.components, utilities`), com escopo por `[data-rendra-root]` além de `:root`: o reset e o estilo de componente do Rendra (`rendra.base`, `rendra.components`) perdem de qualquer `base`/`components`/utility do host, de propósito, para nunca sobrescrever a tela de quem consome o pacote. **Migração:** nenhuma ação se o projeto só usa classes Tailwind; um override direto de seletor precisa entrar na camada certa (ou fora de camada nenhuma, que sempre vence).

### Adicionado

- Catálogo de código por componente e variante (`src/catalog/components.ts`, `data-rendra` no elemento raiz, código na vitrine e no `registry.json`).
- `createTheme`/`applyTheme` (tema puro, compatível com SSR) e `BrandProvider` controlado (`mode`, `brandId`, `paletteId` com os `on*Change`, `storage` plugável).
- Texto orientativo curto abaixo do campo (regra C7), com limite de caracteres pela largura.
- Crédito "Feito com Rendra" no rodapé do login (`RendraCredit`, código `CRED-001`), removível por prop, texto e link substituíveis.

## 1.1.0 (24/09/2026)

Paleta a partir de 4 cores e do degradê, white label em tempo de execução, testes de comportamento e correções do modelo Aurora.

### Corrigido

- **Teste visual:** a tolerância por pixel caiu de 0,2 para 0,05. A padrão não via mudanças em superfícies claras, e os círculos do Aurora passaram sem ser notados. As referências foram geradas de novo.

- **Modelo Aurora:** cartões do kanban e blocos de informação viravam círculo ou pílula, porque usavam o raio de controle ou de item (9999px). Agora controle e item usam 1,75rem, que deixa 100% redondo tudo que tem até 56px e dá cantos de 28px ao que é mais alto. Papel novo **`rounded-block`** (canto pequeno em todos os modelos) para o cartão do kanban, os valores dentro dele, as citações do chat, os eventos da agenda e o skeleton.

### Adicionado

- **Paleta a partir de 4 cores e do degradê** (`src/brand/palette.ts`): `createPalette(sementes)` gera o claro e o escuro de uma paleta (texto sobre cada cor, fundo suave, primária como texto, foco, sidebar, degradês, gráficos, sombra e superfícies do escuro) com contraste AA conferido e ajustado, e registra os ajustes. As paletas prontas são só as sementes em `src/brand/palettes.ts`; `npm run palettes:build` gera `src/styles/palettes.css`, e o CI confere se está em dia.
- **White label em tempo de execução:** `applyPalette(sementes)` injeta a paleta de um cliente sem build, com o mesmo resultado do build.
- **Input:** `onCentsChange` entrega moeda em centavos inteiros (R$ 1.250,50 vira 125050), e `onLookup` faz a busca de CEP e CNPJ dentro do próprio campo (ViaCEP e BrasilAPI), com carregamento e cancelamento; `toCents` e `formatCents` em `src/lib/masks.ts`. Hook `useLookup` para outros campos.
- **Testes de comportamento** com Vitest e Testing Library para Table, Select, Input, Modal, Drawer, Button, Alert, Tabs, Pagination, Accordion, InfoHint, EmptyState e os campos de formulário, cada um ao lado do componente; `renderApp` com os provedores do app; `npm run test:coverage` com piso de cobertura por arquivo, cobrado no CI. De 28 para 98 testes.
- **Verificador de regras:** `classe-dinamica` (classe montada por template string, que o Tailwind não gera) e `css-fora-do-lugar` (arquivo .css fora de `src/styles` e `src/brand`). A regra de fonte fixa só olha contexto de fonte, e não reprova mais a palavra "Inter" num texto.
- **Documentação de entrada para agentes:** "Em um minuto" no `AGENTS.md` e a seção "Cor: três camadas" no `DESIGN_RULES.md` (modelo, paleta de 4 cores e degradê, e sistema fixo), com o briefing de cores perguntando só as 4 cores e o degradê, e a pergunta de white label (5.7).

### Alterado

- **Neutros e cores de sistema iguais em todas as paletas** (fundo, card, borda, texto, erro, sucesso, alerta e informação): antes cada paleta os redefinia à mão. As superfícies do modo escuro saem do fundo do degradê de cada paleta, com o brilho numa faixa fixa. A tela Novo cliente passou a usar a busca embutida do Input.
- **Chart:** anima só a entrada; com a largura mudando, vai direto à nova forma (e não anima com "reduzir movimento").

### Removido

- `src/brand/palettes/ardosia.css` e os blocos de paleta de `src/brand/examples/*/theme.css`: as quatro paletas saem do gerador. **Projeto derivado:** passe as 4 cores e o degradê da sua marca para `src/brand/palettes.ts` e rode `npm run palettes:build`; os valores escritos à mão no `theme.css` para primária, secundária, sidebar, degradês e gráficos deixam de ser usados.

## 1.0.0 (24/09/2026)

Primeira versão publicada: design system, boilerplate, três templates, quatro paletas, mais de 50 componentes, AppShell, telas base, vitrine, Storybook e fluxo de início para IAs.

### Adicionado

- **Demo online** no GitHub Pages: app, vitrine e Storybook, atualizados a cada push na `main`.
- **Registry do shadcn/ui**: cada componente, mais `core`, `tokens`, `layout` e `app-shell`, instalável com `npx shadcn@latest add`. Veja "Receber atualizações" no README.
- **CI no GitHub Actions** em todo Pull Request: tipos, lint, formatação, regras de design, unitários, build, Storybook, layout, acessibilidade e regressão visual.
- **Testes de acessibilidade** com axe-core (WCAG 2.1 AA): todas as rotas, três templates, claro e escuro, paleta Ardósia e celular.
- **Regressão visual** com capturas de referência e um workflow para atualizá-las.
- **Modo escuro nos testes de layout** (360px e 1280px).
- **Testes unitários** com Vitest: validadores, máscaras e navegação.
- **Dependabot** semanal para npm e GitHub Actions.
- **ImageViewer**: visualizador de imagens em popup, com anterior e próxima, setas do teclado, Esc, arrastar para o lado e pinça para ampliar no celular.
- **Galeria** (`/galeria`): as capturas do README, abertas no ImageViewer sem sair da página. O README aponta para ela e agrupa as telas extras em blocos que abrem na própria página.
- **Token `--primary-text`**: a primária usada como texto ou ícone sobre o fundo, com tom próprio no escuro. Classe `text-primary-text`. O verificador de regras barra `text-primary`.
- **`src/styles/themes.css`**: lista os temas carregados. O `globals.css` deixou de importar marca e pode ser atualizado pelo registry.
- **Briefing em fluxo guiado**: navegação (com o caminho da sidebar ou do menu superior), depois tema, depois cores (do tema, de outra paleta pronta ou da identidade do cliente).

- **Calendar**: calendário e agenda num componente só, com as visões mês, semana, dia e agenda em lista (prop `view`). No celular, o mês vira compacto com a lista do dia e a semana vira o dia com a faixa dos 7 dias.
- **Kanban**: colunas e cards, arrastar no computador, menu "Mover para" no toque e no teclado, uma coluna por vez no celular e limite por coluna. `moveKanbanCard` ajuda a atualizar a lista.
- **Telas de agenda (`/agenda`) e funil de vendas em kanban (`/kanban`)**, com capturas na galeria e no README.
- **Códigos de modelo** (`src/config/presets.ts`): T1 a T3 para o tema, C1 a C4 para as cores e M1 a M6 para o menu. A galeria mostra o código de cada captura e tem o bloco "Monte seu código"; o briefing pergunta pelo código antes do fluxo guiado; `?codigo=T1-C4-M5` no endereço aplica o modelo no demo.
- **Telefone com DDI**: o Input com `mask="phone"` tem um seletor de país embutido, +55 por padrão, com as props `ddi`, `onDdiChange`, `ddiOptions` e `hideDdi`, e a função `toE164`.

- **Chat de atendimento** (`ConversationList`, `ChatThread`, `ChatComposer`) e a tela **Atendimento** (`/atendimento`), omnichannel: WhatsApp, Instagram, Facebook, site, e-mail e SMS, com as etapas URA/IA, Fila, Atendimento e Encerrado, busca e filtros de canal e atendente, e as ações assumir, transferir, encerrar e reabrir. O campo de mensagem aceita arrastar, soltar e colar arquivos e prints.
- **Editor de texto rico** (`RichTextEditor`, Tiptap): formatação completa, listas, alinhamento, links, tabela, imagem com 4 alças para redimensionar, colar print (Ctrl+V), arrastar imagens e modo HTML.
- **Painel em widgets** (`WidgetGrid`, react-grid-layout): botão "Ajustar dashboard" para arrastar e redimensionar, arrumação salva e "Restaurar padrão".
- **Buscas de CEP e CNPJ** (`lookupCep`, `lookupCnpj`) no formulário de cliente, com CEP e CNPJ primeiro.
- **Grade de formulário** de 12 colunas (`<Grid form>`, `FormSection`), 3 campos por linha, com `span` (`xs` a `full`) e `newRow` no Field.
- **Table**: `details` (linhas extras na coluna) e `href` (título que abre o cadastro).
- **Kanban**: altura da tela com rolagem por etapa e rolagem infinita, (+) no título da etapa, totais de valores por etapa (`valueFields`), card com CNPJ e contato, e 7 etapas no demo.
- **Galeria**: "Monte seu código" aplica o tema, as cores e o menu em tempo real, sem sair da página; `?imagem=nome` abre a imagem em popup (as imagens do README levam para lá).
- **Barra de rolagem discreta** (`scrollbar-subtle`) nas áreas internas.

- **Chat completo**: botão direito ou "…" na mensagem para responder, reagir, editar e excluir (a excluída fica riscada em vermelho claro; a editada mostra o texto anterior); clicar na citação leva à mensagem original, com destaque; áudio com 1x, 1,5x e 2x; baixar imagens, vídeos, áudios e arquivos; emoji; **mensagens rápidas** (`quickReplies`); gravação de áudio com contador e ondas. No celular e em conversa estreita, o campo ocupa a linha com o enviar e um botão de ações que abre as outras opções. Mensagem longa, inclusive link sem espaço, quebra dentro do balão.
- **Atendimento**: filtro de canal e atendente num ícone ao lado da busca, (+) para nova conversa, busca que acha também pessoas do time, time interno com rolagem lateral, fotos nos contatos e o logotipo do canal (WhatsApp, WhatsApp Web, Instagram, Facebook, TikTok, Google Meu Negócio e Reclame Aqui) no selo da foto.
- **Texto orientativo em modal** (`InfoHint`): o `help` do `PageHeader` põe um ícone de informação ao lado do título, no header fixo, que abre um modal; `CardTitle help` e `FormSection help` fazem o mesmo no card. **`CardHeader actions`**: o lugar das ações de um card.
- **Regras novas no `check:rules`** (telas do sistema): `texto-orientativo` (descrição de texto no `PageHeader` e subtítulo que começa com verbo de instrução) e `botao-solto` (botão no conteúdo de um card).
- **SEO e AEO**: título e descrição por tela (`src/config/seo.ts`) no app e no build (`scripts/seo-build.mjs`), com página estática por rota (link direto responde 200), `sitemap.xml`, `robots.txt`, `llms.txt`, Open Graph com imagem, dados estruturados (JSON-LD com perguntas frequentes) e conteúdo em `<noscript>`. Perguntas frequentes no README.
- **Avisos no login e no 2FA do demo**, com o que digitar para entrar.

### Alterado

- **Primária do Safira** de #0C78F4 para #0B6FE0: 4,8:1 com texto branco (AA). A anterior dava 4,2:1.
- **Telas carregadas sob demanda**: cada rota é um arquivo no build, e a primeira abertura baixa só o AppShell e a tela pedida.
- O botão de limpar do Select e do DatePicker saiu de dentro do botão que abre o painel (HTML válido e leitores de tela). O PickerPanel ganhou a prop `adornment`.
- Select fora de um Field usa a prop `label` como nome acessível do gatilho.
- **Table remota** (`source`): pede ao servidor só a página visível, com busca, ordenação e filtros aplicados a todos os registros. Cancela a requisição anterior ao mudar de página ou digitar. **15 registros por página** em todas as tabelas (`TABLE_PAGE_SIZE`).
- **Listagem**: a ação principal (Novo) entrou na barra da tabela (`toolbar.primaryAction`), com Filtros à esquerda. Sem descrição nem contagem acima da tabela.
- **Salvar sempre no rodapé fixo**: Configurações passou a usar a `ActionBar sticky`, como o formulário de novo cliente.
- **Fundo do modo claro** #F5F6F7 (tela e campos) com cards brancos, para o campo se destacar do card.
- **Ardósia**: botão laranja com texto branco, no tom #C94F0A (AA; o #EA600D com branco dá 3,4:1).
- **Menu superior** com botão "Mais": os itens que não cabem na largura vão para ele, e o menu nunca passa por cima da busca e dos ícones.
- **Login, esqueci a senha e nova senha** sem rolagem lateral em telas estreitas: a coluna do formulário agora encolhe (antes ficava presa à largura do conteúdo e estourava com a fonte do Linux).
- **Rodapé fixo de ações** agora desenhado pelo AppShell, abaixo da área rolável: sempre embaixo e na largura inteira, mesmo com formulário curto. O wizard deixou de usar rodapé fixo (os botões seguem o card).
- **Drawer** com largura padrão de 30% e as opções 40%, 50% e 75%.
- **Nunca botão solto**: "Ligar" (detalhe do cliente), "Encerrar outras sessões" e "Voltar ao padrão" (configurações) foram para o cabeçalho do card; as instruções do painel, do novo cliente, das configurações e do cadastro guiado foram para o ícone de informação.
- **Respiro da página** igual nos quatro lados: 16px no celular e 24px a partir do tablet.
- **Kanban**: 5 etapas visíveis com rolagem lateral (também pelo touchpad, no sentido do gesto) e 3 etapas a mais no demo.
- **Velocímetro** em meio círculo com degradê vermelho, amarelo e verde, e **funil** com etapas que afunilam e a conversão entre elas.
- **Sidebar recolhida** fecha ao tirar o mouse mesmo depois de um clique; abrir pelo foco só vale para o teclado.
- **Rolagem por âncora corrigida**: o `<main>` do AppShell passou a ser `relative`. Antes, elementos absolutos (texto para leitor de tela, inputs ocultos) esticavam a página, e um link com `#âncora` (como `/componentes#primitivas`) rolava a página inteira, encolhendo a sidebar e deixando um vão em branco. O teste de layout agora falha se a página ficar mais alta que a tela.
- Títulos das categorias da vitrine em negrito.
- **Seta de voltar no header** nas telas de segundo nível, à esquerda do título e da trilha, levando à tela-pai; no celular ocupa o lugar do menu, e título e trilha encurtam com reticências em vez de quebrar.
- **Gráficos novos no Chart**: `gauge` (velocímetro de meta com faixas de cor e marca da meta), `funnel` (etapas com a conversão entre elas e a total), `combo` (barras e linhas juntas, com uma ou mais séries de barras), barras com uma cor por categoria (`colorByCategory`) e empilhadas (`stacked`). O painel ganhou meta do mês, funil de vendas, receita e meta, contratos e carteira por segmento.
- **DatePicker com seletores de mês e ano** (padrão ligado, prop `dropdowns`), de 1900 até 10 anos à frente ou dentro de `minDate` e `maxDate`: data de nascimento em dois cliques.
- **Menu no centro da barra inferior** do celular, em botão redondo; o header deixa de ter o botão de menu quando há barra inferior.
- **Texto em 100% da largura**: descrições de página, seção, vitrine e tokens sem largura máxima; nova regra `texto-estreito` no `check:rules`.
- **Tamanho médio como padrão** também na barra das tabelas (busca, Colunas, Filtros, Novo e seleção) e na barra do calendário.
- **Espaço entre campos** padronizado em 16px com o novo `gap="fields"` (Grid, Stack e FormSection). O Field não reserva mais uma linha vazia para a mensagem: ela aparece só com ajuda ou erro, 4px abaixo do controle (`reserveMessage` volta a reservar; `compact` ficou obsoleto). No drawer de novo cliente o espaço caiu de 40px para 16px.

### Para atualizar um projeto que já usa o Rendra

1. Em cada tema do projeto, no claro e no escuro, acrescente `--primary-text` (a primária, ou um tom mais claro no escuro, que passe AA sobre `--card`). Confira em `/tokens`.
2. Crie `src/styles/themes.css` com os `@import` de tema que hoje estão no `globals.css` e troque-os por `@import './themes.css';`.
3. Rode `npx shadcn@latest add @rendra/tokens @rendra/core` e depois os componentes que quiser atualizar.
4. Troque `text-primary` por `text-primary-text` no código do projeto (`npm run check:rules` aponta cada ocorrência).
