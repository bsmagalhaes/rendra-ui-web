# Rendra Design System

**Template de sistema e layout de sistema administrativo em React, com código aberto sob a licença MIT: design system completo e boilerplate com tokens, três templates, componentes, AppShell, telas prontas (dashboard, listagem, cadastro, CRM kanban, agenda e chat omnichannel), Storybook e testes de layout.** Feito para ser o ponto de partida de todos os projetos: layouts previsíveis, espaçamento equilibrado e funcionamento completo no celular. Para aplicar a outro sistema, você troca cores, fonte e ícones da marca, e nenhum componente muda.

![React 19](https://img.shields.io/badge/React-19-149eca) ![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178c6) ![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8) ![Vite 8](https://img.shields.io/badge/Vite-8-646cff) ![Storybook 10](https://img.shields.io/badge/Storybook-10-ff4785) ![Playwright](https://img.shields.io/badge/testes-Vitest_e_Playwright-2ead33) [![CI](https://github.com/bsmagalhaes/rendra-ui-web/actions/workflows/ci.yml/badge.svg)](https://github.com/bsmagalhaes/rendra-ui-web/actions/workflows/ci.yml)

**Veja funcionando, sem instalar nada:** [página de apresentação](https://bsmagalhaes.github.io/rendra-ui-web/) · [demo do app](https://bsmagalhaes.github.io/rendra-ui-web/demo/) · [galeria com códigos de modelo](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/) · [Storybook](https://bsmagalhaes.github.io/rendra-ui-web/storybook/) · [vitrine de componentes](https://bsmagalhaes.github.io/rendra-ui-web/demo/componentes/) · [atendimento](https://bsmagalhaes.github.io/rendra-ui-web/demo/atendimento/) · [agenda](https://bsmagalhaes.github.io/rendra-ui-web/demo/agenda/) · [kanban](https://bsmagalhaes.github.io/rendra-ui-web/demo/kanban/). No demo, o menu do avatar troca modelo, paleta, modo e layout ao vivo.

| Atendimento omnichannel                                                                                                                    | Painel com widgets ajustáveis                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Atendimento](docs/images/safira-atendimento.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-atendimento) | [![Painel em widgets](docs/images/safira-dashboard-ajuste.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-dashboard-ajuste) |

| Calendário e agenda                                                                                                                            | Kanban                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [![Calendário do mês](docs/images/safira-calendario.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-calendario) | [![Kanban](docs/images/aurora-kanban.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=aurora-kanban) |

---

## O que é

O Rendra reúne, num único repositório, tudo o que uma equipe precisa para construir interfaces consistentes:

- um **sistema de tokens** travado (espaço, tipografia, cores, raio, sombra, degradê e densidade), em que o que está fora da escala simplesmente não existe;
- **três modelos** de formato e fonte (quadrado, intermediário e arredondado) e **quatro paletas**, combináveis entre si. Uma paleta é só **4 cores e o degradê da marca**: o resto (texto sobre cada cor, fundos suaves, sidebar, gráficos e o modo escuro) é gerado com contraste AA conferido, e as cores de sistema (erro, sucesso, alerta e informação) são as mesmas em todas;
- **mais de 50 componentes**, um por finalidade, todos reconstruídos para o celular sem versões paralelas;
- um **AppShell** configurável por props (menu lateral ou superior, sidebar recolhida, submenu em segunda barra, mega menu);
- **telas base** prontas (autenticação completa, painel, listagem, detalhe, formulário longo, wizard, configurações);
- uma **vitrine** navegável e um **Storybook** com mais de 100 stories;
- **regras escritas e verificadas por máquina**: verificador de regras de design, ESLint com acessibilidade, testes unitários e de componente (com cobertura mínima por arquivo), e testes no navegador de layout, acessibilidade (axe-core) e regressão visual, rodando no CI a cada Pull Request;
- um **registry do shadcn**: projetos criados a partir do Rendra recebem as melhorias dos componentes com um comando;
- **SEO e AEO prontos** no demo: título e descrição por tela (`src/config/seo.ts`), página estática por rota, `sitemap.xml`, `robots.txt`, `llms.txt`, Open Graph e dados estruturados (JSON-LD com perguntas frequentes).

Duas regras mestras guiam tudo:

1. **Um componente por finalidade.** Existe um Select, uma Table, um Modal, um Drawer, um Input. Diferenças são props, nunca arquivos novos.
2. **Mobile-first real.** Tudo é desenhado primeiro para 360px, sem rolagem horizontal, sem ação que dependa de hover e com toque mínimo de 44px.

E duas de boas práticas, verificadas pelo `npm run check:rules`: **nunca botão solto** (cada ação tem lugar previsto: rodapé fixo, barra da tabela, cabeçalho da tela ou do card, menu da linha) e **texto orientativo nunca solto no corpo da tela** (vai num ícone de informação ao lado do título, que abre um modal; só a orientação curta abaixo do campo fica visível, com limite de caracteres pela largura dele).

---

## Galeria

> **Clique em qualquer imagem** para abri-la em popup na [galeria do demo](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/), com setas para passar e Esc para fechar. (O GitHub não permite popup dentro do README; por isso as telas já aparecem em tamanho de leitura aqui e os grupos extras abrem na própria página.)

## Códigos de modelo

Cada escolha visual tem um código curto: **T** para o tema (formato e fonte), **C** para as cores e **M** para o menu. `T1-C4-M5`, por exemplo, é o tema Safira com as cores Ardósia e o menu superior. Escolha na [galeria](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/), onde cada captura mostra seu código e o bloco "Monte seu código" abre o demo já aplicado, e informe o código no briefing: a IA já sabe o que aplicar e pula essas perguntas.

| Tema                           | Cores                                    | Menu                                                |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------- |
| **T1** Safira (quadrado)       | **C1** Safira (azul e verde)             | **M1** lateral recolhida, submenu em segunda barra  |
| **T2** Equilíbrio (meio-termo) | **C2** Equilíbrio (violeta e ciano)      | **M2** lateral recolhida, submenu dentro da sidebar |
| **T3** Aurora (arredondado)    | **C3** Aurora (verde-petróleo e laranja) | **M3** lateral expandida, submenu em segunda barra  |
|                                | **C4** Ardósia (grafite e laranja)       | **M4** lateral expandida, submenu dentro da sidebar |
|                                |                                          | **M5** menu superior com lista suspensa             |
|                                |                                          | **M6** menu superior com mega menu                  |

No demo, o endereço também aplica um código: [`/?codigo=T1-C4-M5`](https://bsmagalhaes.github.io/rendra-ui-web/demo/?codigo=T1-C4-M5). Os códigos ficam em [`src/config/presets.ts`](src/config/presets.ts).

### Os três templates

Cada template tem formato, fonte, símbolo e paleta próprios.

**Rendra Safira**: quadrado, como uma pedra lapidada. Azul #0B6FE0, verde #98D10A e fonte Poppins.

| Painel                                                                                                                              | Listagem de clientes                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [![Safira: painel](docs/images/safira-painel.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-painel) | [![Safira: clientes](docs/images/safira-clientes.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-clientes) |

**Rendra Equilíbrio**: o meio-termo, nem quadrado nem 100% arredondado. Violeta, ciano e fonte DM Sans.

| Painel                                                                                                                                          | Listagem de clientes                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Equilíbrio: painel](docs/images/equilibrio-painel.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=equilibrio-painel) | [![Equilíbrio: clientes](docs/images/equilibrio-clientes.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=equilibrio-clientes) |

**Rendra Aurora**: 100% arredondado, como um novo dia. Verde-petróleo, laranja e fonte Inter.

| Painel                                                                                                                              | Listagem de clientes                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [![Aurora: painel](docs/images/aurora-painel.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=aurora-painel) | [![Aurora: clientes](docs/images/aurora-clientes.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=aurora-clientes) |

**Paleta Ardósia**: combinável com qualquer modelo. Azul-ardósia #2E414D e laranja #EA600D; com texto branco pedido, o gerador escurece o botão laranja para #C5510B, o tom mais próximo que passa AA (aqui no modelo Equilíbrio).

| Painel                                                                                                                                 | Listagem de clientes                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Ardósia: painel](docs/images/ardosia-painel.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=ardosia-painel) | [![Ardósia: clientes](docs/images/ardosia-clientes.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=ardosia-clientes) |

### Calendário, agenda e kanban

| Agenda da semana (T2-C2)                                                                                                                      | Kanban no celular (T1-C1)                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Agenda da semana](docs/images/equilibrio-agenda.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=equilibrio-agenda) | [![Kanban no celular](docs/images/safira-kanban-mobile.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-kanban-mobile) |

<details>
<summary><strong>Tipos de menu: M1 a M6</strong> (clique para abrir aqui mesmo)</summary>

| M1: lateral recolhida, segunda barra                                                                        | M2: lateral recolhida, submenu na sidebar                                                                   |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [![M1](docs/images/menu-m1.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=menu-m1) | [![M2](docs/images/menu-m2.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=menu-m2) |
| **M3: lateral expandida, segunda barra**                                                                    | **M4: lateral expandida, submenu na sidebar**                                                               |
| [![M3](docs/images/menu-m3.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=menu-m3) | [![M4](docs/images/menu-m4.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=menu-m4) |
| **M5: superior, lista suspensa**                                                                            | **M6: superior, mega menu**                                                                                 |
| [![M5](docs/images/menu-m5.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=menu-m5) | [![M6](docs/images/menu-m6.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=menu-m6) |

</details>

<details>
<summary><strong>Modelo × paleta de cores: as 12 combinações</strong> (clique para abrir aqui mesmo)</summary>

O modelo (formato, fonte e símbolo) e a paleta (cores, degradês e sidebar) são camadas independentes: qualquer modelo aceita qualquer paleta. São 12 combinações (3 modelos × 4 paletas), todas na mesma tela de detalhe do cliente.

| Modelo \ Paleta             | Safira                                                                                                                                      | Equilíbrio                                                                                                                                          | Aurora                                                                                                                                      | Ardósia                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Safira** (quadrado)       | [![](docs/images/matriz-safira-safira.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-safira-safira)         | [![](docs/images/matriz-safira-equilibrio.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-safira-equilibrio)         | [![](docs/images/matriz-safira-aurora.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-safira-aurora)         | [![](docs/images/matriz-safira-ardosia.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-safira-ardosia)         |
| **Equilíbrio** (meio-termo) | [![](docs/images/matriz-equilibrio-safira.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-equilibrio-safira) | [![](docs/images/matriz-equilibrio-equilibrio.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-equilibrio-equilibrio) | [![](docs/images/matriz-equilibrio-aurora.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-equilibrio-aurora) | [![](docs/images/matriz-equilibrio-ardosia.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-equilibrio-ardosia) |
| **Aurora** (arredondado)    | [![](docs/images/matriz-aurora-safira.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-aurora-safira)         | [![](docs/images/matriz-aurora-equilibrio.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-aurora-equilibrio)         | [![](docs/images/matriz-aurora-aurora.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-aurora-aurora)         | [![](docs/images/matriz-aurora-ardosia.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=matriz-aurora-ardosia)         |

</details>

<details>
<summary><strong>No celular</strong> (clique para abrir aqui mesmo)</summary>

Mesmo componente, mesma API: no celular a tabela vira cards, a sidebar vira gaveta e a navegação ganha uma barra inferior.

| Safira                                                                                                                | Equilíbrio                                                                                                                    | Aurora                                                                                                                | Tabela em cards                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [![](docs/images/safira-mobile.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-mobile) | [![](docs/images/equilibrio-mobile.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=equilibrio-mobile) | [![](docs/images/aurora-mobile.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=aurora-mobile) | [![](docs/images/equilibrio-mobile-tabela.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=equilibrio-mobile-tabela) |

</details>

<details>
<summary><strong>Modo escuro e outras telas</strong> (clique para abrir aqui mesmo)</summary>

| Modo escuro (Safira)                                                                                                  | Modo escuro (Equilíbrio)                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [![](docs/images/safira-escuro.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-escuro) | [![](docs/images/equilibrio-escuro.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=equilibrio-escuro) |

| Drawer com rodapé fixo (30/70)                                                                                        | Mega menu no menu superior                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [![](docs/images/safira-drawer.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=safira-drawer) | [![](docs/images/aurora-mega-menu.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=aurora-mega-menu) |

| Login (Aurora)                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- |
| [![](docs/images/aurora-login.webp)](https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/?imagem=aurora-login) |

</details>

> As imagens são geradas a partir do app real com `npm run docs:images`.

---

## O que tem dentro

### Tokens

| Token           | Como funciona                                                                                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Espaçamento** | Base de 4px, com os degraus 0, 1, 2, 3, 4, 6, 8, 12, 16 e 24. A escala padrão do Tailwind foi zerada: `p-5` ou `w-64` não geram CSS. Tamanhos de peça viram tokens nomeados (`h-control-md`, `size-touch`, `h-header`).                        |
| **Tipografia**  | 7 tamanhos (`xs` a `3xl`) com line-height e letter-spacing, títulos menores no celular, 3 pesos e campos com 16px no celular (sem zoom no iOS).                                                                                                |
| **Cores**       | Semânticas: `primary`, `secondary`, `destructive`, `success`, `warning` e `info`, cada uma com cor forte, cor de hover, texto, fundo suave e texto sobre o suave. Mais superfícies e neutros. Contraste AA medido ao vivo na página `/tokens`. |
| **Formato**     | `rounded-control`, `rounded-surface`, `rounded-item` e `rounded-avatar`, controlados pelo formato do template (quadrado, meio-termo ou 100% arredondado).                                                                                      |
| **Sombra**      | Três níveis sutis. Superfície de página usa borda de 1px.                                                                                                                                                                                      |
| **Degradê**     | Três por template (forte, suave e detalhe), com regra de uso: nunca em botão ou atrás de texto corrido, e no máximo um forte por tela.                                                                                                         |
| **Densidade**   | Input, botão e select com a mesma altura: 44 a 52px no celular e 32 a 48px no desktop.                                                                                                                                                         |

A marca fica isolada: as 4 cores e o degradê em `src/brand/palettes.ts`, o modelo (fonte e raio) em `src/styles/theme.css`, e o nome e o logotipo em `src/brand/brand.config.ts` e `src/brand/assets`. Nenhum componente tem cor, fonte ou logotipo fixo.

### Componentes

Todos em `src/components/ui`, um por finalidade, com o ícone de feedback da marca onde houver feedback.

| Grupo            | Componentes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ações**        | Button (6 variantes, tamanhos, ícone, só ícone, carregando, largura total), ButtonGroup (agrupado, na horizontal, vertical ou responsivo, ou segmentado), DropdownMenu e ActionBar (regra 100%, 30/70 e menu)                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Formulário**   | Input (máscaras de CPF, CNPJ, CPF ou CNPJ automático, telefone com seletor de DDI embutido e +55 por padrão, CEP, data, hora, moeda e percentual, com ícone, limpar e senha), Textarea com contador, Select (busca, múltiplo com chips, selecionar todos, contador, criar opção, busca remota), Checkbox com indeterminado e grupo, Radio em lista e em cards, Switch, DatePicker (data, período e horário, em pt-BR), Slider, Upload com arrastar e soltar e progresso, OtpInput (2FA), Field, Form, FormField e FormSection com React Hook Form e Zod, e validadores de CPF, CNPJ, telefone, CEP e data                                                 |
| **Navegação**    | Tabs (linha ou pílula, vira seletor quando não cabe), Breadcrumb, Pagination (completa, compacta ou "carregar mais") e Wizard/Stepper (rótulos próprios e etapa opcional com Pular em "Mais ações"; etapas concluída, atual, pendente e com erro, com validação por etapa)                                                                                                                                                                                                                                                                                                                                                                                |
| **Dados**        | Table com TanStack Table (seleção, expansão, ordenação, busca, colunas visíveis, ações em massa e por linha, densidade, estados vazio, carregando e erro, forma de cards no celular e **modo remoto**: 15 por página, carregando página por página, com busca e filtros em todos os registros), Card, StatCard, Badge, Avatar e grupo, List, Timeline, Accordion e Chart com Recharts (linha, barra, área e pizza)                                                                                                                                                                                                                                        |
| **Feedback**     | BrandFeedbackIcon animado (check se desenhando, X se riscando; cor da marca, selo ao lado e entrada `encaixe` por opção), Toast com Sonner, Alert, Modal (confirmação, destrutiva, informativo, com segundo botão opcional por `cancelLabel`, e formulário), InfoHint (texto orientativo num ícone de informação que abre modal; também como `help` em PageHeader, CardTitle e FormSection), Drawer (header e rodapé fixos, confirmação de descarte, 30%, 40%, 50% ou 75% da tela), Popover, Tooltip, EmptyState (`className="py-0 md:py-0"` zera o respiro vertical), ErrorPage (404 e 500, com `back={false}` para tirar o Voltar), Skeleton e Progress |
| **Atendimento**  | Chat omnichannel: ConversationList (foto com o logotipo do canal: WhatsApp, WhatsApp Web, Instagram, Facebook, TikTok, Google Meu Negócio e Reclame Aqui), ChatThread (cliente, atendente, robô e avisos; botão direito ou "…" para responder, reagir, editar e excluir; citação que leva à mensagem original; áudio em 1x, 1,5x e 2x; baixar anexos) e ChatComposer (textarea que cresce, anexos, emoji, mensagens rápidas, gravação de áudio, arrastar e soltar ou colar prints; no celular, campo, enviar e um botão de ações)                                                                                                                         |
| **Conteúdo**     | RichTextEditor (Tiptap): formatação completa, listas, alinhamento, links, tabela, imagem com 4 alças para redimensionar, colar print, arrastar imagens e modo HTML                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Painel**       | WidgetGrid: widgets que se arrastam e redimensionam no modo "Ajustar dashboard", com a arrumação salva; Chart com velocímetro de meta, funil com conversão, barras com linha, barras coloridas e empilhadas                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Fluxo**        | FlowEditor (monta o fluxo de automação com gatilho, ação, condição, espera e fim: paleta, arrastar, ligar, apagar, validar com mensagens e testar o caminho passo a passo; o JSON do fluxo vai e volta por `serializeFlow` e `parseFlow`; no celular só vê e navega, e a gaveta do bloco edita, liga ao próximo e exclui) e FlowViewer (só leitura), em `@rendra-ui/web/flow` com o React Flow                                                                                                                                                                                                                                                            |
| **Planejamento** | Calendar (mês, semana, dia e agenda em lista, no mesmo componente; no celular vira mês compacto com a lista do dia), Kanban (altura da tela, 5 etapas visíveis e rolagem lateral também pelo touchpad, rolagem infinita por etapa, (+) no título da etapa, totais em R$ de P&S e MRR por etapa e por cartão, arrastar no computador, menu "Mover para" no toque e no teclado, uma coluna por vez no celular, limite por coluna) e ImageViewer (imagens em popup, com setas, Esc, arrastar e pinça)                                                                                                                                                        |
| **Layout**       | Container (respiro igual em todos os lados), Stack, Inline, Grid (por tela ou por container query), Section e PageHeader (título no corpo do celular por `bodyTitle`, sem reservar o bloco do título por `titleSpace`)                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### AppShell

Tudo configurável por props, com o padrão em `src/config/layout.ts`:

- menu **lateral** ou **superior**;
- sidebar **recolhida** (só ícones, padrão) ou **expandida**, com opção de **abrir por cima do conteúdo** ao passar o mouse;
- submenu em **segunda barra lateral** ou **dentro da sidebar**, e, no menu superior, **submenu navegável** ou **mega menu** com seções;
- header sempre fixo, com título da página e trilha, busca global (**Ctrl+K**), notificações, tema e menu do usuário;
- logo no header do celular, no lugar do título e da trilha, pela prop `headerLogo`;
- seletor de espaço (empresa, unidade) no topo do menu do usuário, pela prop `workspaces`;
- menu do usuário enxuto: `userMenu` esconde Tema, Template ou Layout, um a um;
- no celular, gaveta de navegação e barra inferior com até 4 itens.

### Telas base

Login, esqueci a senha, verificação em duas etapas (2FA), nova senha, cadastro, painel com indicadores e gráficos, listagem com barra de ferramentas e filtros, detalhe com abas, formulário longo em seções, cadastro em wizard, configurações com navegação interna, criação e edição de registro em drawer (com busca de CNPJ e CEP), tarefas, atendimento omnichannel, agenda, funil de vendas em kanban, painel em widgets, galeria e página 404.

### Movimento (opcional, desligado por padrão)

O `RendraProvider` (e o `RendraRouterBridge`) aceita a prop `motion`: `'off'` (o padrão), `'on'` ou o objeto `rendraMotion` (de `@rendra-ui/web/motion`). Ligado, os componentes animam com o Motion (`motion` 14, já em `dependencies`). Em `'off'` o Motion nem entra no bundle inicial do app: ele só custa bytes a quem liga o `on`. A linguagem é uma só: o que se repete dezenas de vezes por dia (tabela, abas, teclado) não anima a entrada; o toque responde em 120 ms; overlays entram em mola sem quique e saem mais rápido que entram, a partir do gatilho; nada parte de `scale(0)`; movimento reduzido vira só opacidade.

```tsx
// Carrega o Motion sob demanda: o primeiro quadro sai em `off` e liga quando o chunk chega.
<RendraProvider motion="on">{/* ... */}</RendraProvider>
```

Com `motion="on"` (texto), a tela começa em `off` (nunca fica vazia) e liga assim que o chunk do Motion chega, sem remontar nada: estado, foco, campos e overlays abertos ficam como estavam, e o que já estava na tela não repete a animação de entrada (o número de um indicador não volta a 0). Em servidor (SSR) o HTML sai em `off`, e a hidratação bate. Para ter o `on` desde o primeiro quadro e no servidor, importe o objeto do subcaminho e passe-o no lugar do texto; o Motion então vai no bundle de quem importa o objeto:

```tsx
import { rendraMotion } from '@rendra-ui/web/motion'

;<RendraProvider motion={rendraMotion}>{/* ... */}</RendraProvider>
```

Com React Router, ponha a prop na ponte, que já entrega ao provider o link, o caminho atual e a navegação: `<RendraRouterBridge motion="on">` ou `<RendraRouterBridge motion={rendraMotion}>`. Montando o `RendraProvider` direto, ele também exige `linkComponent`, `useCurrentPath`, `navigate` e `goBack`. Quem testa a interface em `on` e afirma o resultado logo depois do `render` usa `motion={rendraMotion}` (síncrono); com o texto é preciso esperar o chunk. No clone deste repositório, `rendraMotion` vem de `@/lib/motion/motion-on`.

- **Tokens** (variáveis CSS que o host sobrescreve): `--rendra-duration-press|hover|fast|base|move|slow|draw|pulse`, `--rendra-reveal-enter|stagger|count|draw` (a chegada do painel, mais lenta, de uso único) e as curvas `--rendra-ease-out|in-out|spring|move|drawer`, com os aliases do Tailwind `ease-move` e `ease-drawer`.
- **Presets** em `src/lib/motion` (`presets.ts`, `tokens.ts`; no registry do shadcn vão todos os arquivos da pasta): `press`, `open`, `sheet`, `tooltip`, `swap`, `indicator`, `move`, `settle`, `reveal`, `stagger`. Os nomes antigos (`fade`, `scale`, `pop`, `slide`, `layout`, `tap`, `bump`) continuam.
- **Telas de comparação**: `/componentes-motion` (as mesmas seções de `/componentes`, com a chave Ligado/Desligado) e `/dashboard-motion` (painel que chega com contagem, gráficos desenhando e cascata). Ficam fora das suítes de captura.
- **O `off` também mudou nesta versão** (2.5.0), só em tempo, curva, origem e estado intermediário, nunca em quadro parado: o toque do botão é de 120 ms a 0,97; popover, menu, tooltip e painel do Select nascem do gatilho; toda saída de overlay dura 120 ms; o tooltip em `instant-open` não anima; a bolinha do radio e o check do checkbox partem de 0,9, não de zero; com movimento reduzido os overlays só esmaecem. As 152 capturas de referência não mudam.
- `npm run test:motion` mede tempo, escala, origem e gesto no navegador (`BASE_URL` para o seu servidor).

### Vitrine, Storybook e testes

- **Vitrine** na rota `/componentes`: cada componente com variantes, tamanhos e estados (padrão, hover, foco, ativo, desabilitado, carregando, erro) e as regras de composição.
- **Storybook 10** com mais de 100 stories: viewport de celular por padrão, com tablet e desktop, e alternância de template, paleta e modo claro/escuro na barra.
- **Testes de layout com Playwright** (`npm run test:layout`): 16 rotas × 5 larguras (360, 390, 768, 1280 e 1920) × 3 templates no modo claro, mais 360 e 1280 no escuro, somando 336 testes. Falham se houver rolagem horizontal, elemento maior que a tela, toque menor que 44px no celular ou erro de JavaScript, e geram capturas de todas as telas.
- **Testes de acessibilidade com axe-core** (`npm run test:a11y`): 144 testes, todas as rotas nos três templates, claro e escuro, mais a paleta Ardósia e o celular. Falham em qualquer violação WCAG 2.1 A ou AA, inclusive contraste.
- **Regressão visual** (`npm run test:visual`): 152 capturas comparadas com a referência aprovada. Pegam cor que mudou, espaçamento que quebrou e ícone que sumiu. As referências são geradas no Linux do CI; depois de uma mudança visual intencional, aplique o rótulo `atualizar-visual` no Pull Request.
- **Testes unitários e de componente com Vitest e Testing Library** (`npm test`; `npm run test:coverage` com o piso por arquivo): comportamento de Table (ordenação, busca, paginação, seleção, ações em massa, modo remoto e cartões no celular), Select, Input (máscaras, centavos e busca de CEP e CNPJ), Modal, Drawer, campos de formulário e navegação, além de validadores, máscaras, buscas e o gerador de paletas (AA garantido em todas). Cada componente tem o teste ao lado, e ele vai junto quando você copia o componente para outro projeto.
- **CI no GitHub Actions**: todo Pull Request passa por tipos, lint, formatação, regras, unitários, build, Storybook e os três testes no navegador. A `main` só aceita merge com tudo verde. Os alertas de segurança do GitHub avisam de dependência vulnerável; as atualizações de versão são feitas à mão (veja o `CONTRIBUTING.md`).
- **Verificador de regras** (`npm run check:rules`): barra cor fixa, valor arbitrário, degrau fora da escala, estilo inline, fonte fixa, `100vh` e arquivos duplicados ou mobile. A mesma varredura, com as 17 regras, roda em qualquer projeto por `npx @rendra-ui/web auditar --all`.

---

## Stack

React 19, TypeScript 5.9 (estrito), Vite 8, Tailwind CSS 4 (tema via `@theme`), shadcn/ui (copiado para o projeto), Radix UI, class-variance-authority, tailwind-merge com clsx, Lucide, React Router 8, TanStack Table 8, cmdk, Sonner, React Hook Form, Zod 4, IMask, React Day Picker 10, date-fns 4, Recharts 3, Storybook 10, Playwright com axe-core, Vitest, ESLint 9 (TypeScript, React Hooks e jsx-a11y) e Prettier com prettier-plugin-tailwindcss. Somente bibliotecas de código aberto.

---

## Começar com IA

O repositório vem preparado para agentes de IA de desenvolvimento. Ao abrir o projeto, a IA lê as instruções sozinha, pergunta se é **projeto novo**, **migração de layout** ou **contribuição**, conduz um **briefing** (negócio, usuários, menu, tema, cores, telas e dados; se você já tiver um **código de modelo** da galeria, ele pula essas escolhas), registra tudo em `docs/BRIEFING.md` e só então constrói, em etapas e com as verificações passando.

| Ferramenta                                   | Arquivo lido automaticamente                                         |
| -------------------------------------------- | -------------------------------------------------------------------- |
| OpenAI Codex, Jules, Gemini, Cursor e outras | [`AGENTS.md`](AGENTS.md)                                             |
| Claude Code                                  | [`CLAUDE.md`](CLAUDE.md)                                             |
| GitHub Copilot                               | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) |
| Cursor                                       | [`.cursor/rules/rendra.mdc`](.cursor/rules/rendra.mdc)               |
| Windsurf                                     | [`.windsurfrules`](.windsurfrules)                                   |
| Gemini CLI                                   | [`GEMINI.md`](GEMINI.md)                                             |

Todos apontam para o mesmo fluxo ([`AGENTS.md`](AGENTS.md)) e as mesmas regras ([`DESIGN_RULES.md`](DESIGN_RULES.md)).

**Para um projeto novo**, cole na sua IA:

```text
Clone https://github.com/bsmagalhaes/rendra-ui-web e use como base do meu novo sistema. Siga o AGENTS.md do repositório.
```

**Para migrar o layout de um sistema existente**, abra a IA na pasta do seu sistema e cole:

```text
Aplique neste projeto o design system https://github.com/bsmagalhaes/rendra-ui-web. Leia, nesta ordem: https://github.com/bsmagalhaes/rendra-ui-web/blob/main/AGENTS.md, https://github.com/bsmagalhaes/rendra-ui-web/blob/main/DESIGN_RULES.md, https://github.com/bsmagalhaes/rendra-ui-web/blob/main/docs/PROMPT_MIGRACAO.md e https://github.com/bsmagalhaes/rendra-ui-web/blob/main/docs/COMO_APLICAR.md, e siga o fluxo de migração, começando pelo briefing.
```

A versão completa do prompt de migração, que escolhe entre os três caminhos (pacote npm, cópia de arquivos-fonte ou clone e refazer) e aponta para as regras no repositório de referência, está em [docs/PROMPT_MIGRACAO.md](docs/PROMPT_MIGRACAO.md). O roteiro do briefing está em [docs/BRIEFING_MODELO.md](docs/BRIEFING_MODELO.md).

---

## Como rodar

Pré-requisito: Node.js 22 ou mais recente (o CI usa o 24).

```bash
npm install
npx playwright install chromium   # só na primeira vez, para os testes
npm run dev                       # app em http://localhost:5173
npm run storybook                 # Storybook em http://localhost:6006
```

| Comando                      | O que faz                                             |
| ---------------------------- | ----------------------------------------------------- |
| `npm run dev`                | Sobe o app com recarga automática                     |
| `npm run build`              | Checagem de tipos e build de produção                 |
| `npm run typecheck`          | Checagem de tipos                                     |
| `npm run lint`               | ESLint com TypeScript, React Hooks e acessibilidade   |
| `npm run check:rules`        | Verificador de regras de design                       |
| `npm test`                   | Testes unitários e de componente (Vitest)             |
| `npm run test:layout`        | Testes de layout (capturas em `screenshots/`)         |
| `npm run test:a11y`          | Testes de acessibilidade (axe-core)                   |
| `npm run test:visual`        | Regressão visual (referências do Linux, ver acima)    |
| `npm run test:layout:report` | Relatório dos testes                                  |
| `npm run storybook`          | Storybook                                             |
| `npm run build-storybook`    | Build estático do Storybook                           |
| `npm run registry:build`     | Gera o registry do shadcn (`registry.json`, `dist/r`) |
| `npm run docs:images`        | Regenera as imagens deste README (com o app rodando)  |
| `npm run docs:og-image`      | Regenera a imagem social do site (`og-image.png`)     |
| `npm run pages:build`        | Monta o site (página, demo, registry) em `.pages/`    |
| `npm run test:site`          | Testa a página de apresentação e a composição do site |

No app, o menu do avatar troca **modelo**, **paleta**, **tema** e **layout**. As mesmas opções estão em Configurações.

---

## Estrutura

```text
src/
  styles/        theme.css (marca), themes.css (temas carregados) e globals.css (tokens estruturais)
  brand/         brand.config.ts, assets (logotipos, símbolo, fontes) e examples (Equilíbrio, Aurora)
  components/
    ui/          componentes, um por finalidade
    layout/      Container, Stack, Inline, Grid, Section, PageHeader
    app-shell/   AppShell, Sidebar, Header, busca global, mega menu, notificações
  config/        navigation.ts (menu), layout.ts (padrão do AppShell), routes-list.ts
  hooks/         useBreakpoint
  lib/           cn, máscaras, validadores, estilos de campo
  pages/         telas base, vitrine (/componentes) e tokens (/tokens)
  stories/       Storybook
tests/           testes de layout (Playwright)
scripts/         verificador de regras, auditoria e geração de imagens
docs/            guia de aplicação, prompt de migração e imagens
```

---

## Como trocar a marca em 5 passos

1. **Cores:** em `src/brand/palettes.ts`, só as 4 cores (primária, hover, secundária, hover) e o degradê da marca; depois `npm run palettes:build`, que gera o resto com AA conferido. Erro, sucesso, alerta, informação e neutros não mudam.
2. **Modelo e identidade:** fonte e raio em `src/styles/theme.css` (se o modelo mudar); nome, empresa, frase, formato (`square`, `rounded` ou `pill`) e logotipo na sidebar em `src/brand/brand.config.ts`.
3. **Arte:** substitua os SVGs de `src/brand/assets`. O símbolo usa `fill="currentColor"`, porque os ícones de feedback o tingem.
4. **Contraste:** abra `/tokens` nos modos claro e escuro. Nenhum selo pode marcar "falha".
5. **Verificação:** rode `npm run typecheck`, `npm run lint`, `npm run check:rules`, `npm test`, `npm run test:layout` e `npm run test:a11y`.

Marca de cada cliente em tempo de execução (white label, sem build): `applyPalette(sementes)`. Exemplo em [docs/COMO_APLICAR.md](docs/COMO_APLICAR.md).

O passo a passo completo, inclusive como adotar o Equilíbrio ou o Aurora como marca principal, está em [docs/COMO_APLICAR.md](docs/COMO_APLICAR.md).

---

## Receber atualizações nos seus projetos

Um projeto criado a partir do Rendra não fica parado no tempo, e há mais de um jeito de trazer o design system para um projeto: clonar o boilerplate inteiro, trazer um componente pelo registry, instalar o pacote publicado, rodar a CLI `rendra` ou usar a skill de migração parcial. As subseções abaixo cobrem cada um.

### Boilerplate

Comece por este repositório (`degit`, ou clone e apague o `.git`) quando o projeto é novo: você recebe os três templates, as quatro paletas, o AppShell, as telas base e o Storybook, e edita a marca em `src/brand` como descrito em "Como trocar a marca em 5 passos", acima.

### Registry (shadcn/ui)

Os componentes são publicados como um **registry do shadcn/ui** junto com o demo. Para trazer a versão mais nova de um componente, com as dependências dele, num projeto que **não** nasceu deste boilerplate:

```bash
npx shadcn@latest add https://bsmagalhaes.github.io/rendra-ui-web/r/select.json
# ou, com o components.json do boilerplate:
npx shadcn@latest add @rendra/select
```

Itens disponíveis: cada componente de `src/components/ui` pelo nome do arquivo (`button`, `table`, `select`...), mais `core` (funções, hooks, provedor de marca e o gerador de paleta), `tokens` (`globals.css`), `layout` e `app-shell`. A lista completa está em [`registry.json`](registry.json).

**Testes junto com o componente (opcional):** cada componente testado tem um item `<nome>-test` (por exemplo `npx shadcn@latest add @rendra/table-test`), que traz o teste de comportamento e instala as dependências de teste só como desenvolvimento. O `test-utils` traz a preparação do Vitest (`src/test/setup.ts`) e o `renderApp`. Útil quando o seu projeto exige cobertura mínima de cada componente copiado.

O registry nunca traz marca nem configuração: `theme.css`, `themes.css`, `palettes.ts`, `palettes.css`, `brand.config.ts`, `src/brand/index.ts`, os assets e `src/config` são do seu projeto e não são tocados. Arquivos iguais são pulados, e o shadcn pergunta antes de sobrescrever um arquivo que você alterou. Quando uma versão pedir um token de cor novo no tema, o [CHANGELOG](CHANGELOG.md) diz qual e com que valor.

### Pacote npm

Para um projeto que já tem o próprio roteador e a própria estrutura de telas, e só quer os componentes prontos como dependência. O pacote é `@rendra-ui/web`, escopado na organização npm `rendra-ui`:

```bash
npm install @rendra-ui/web react react-dom radix-ui
```

```tsx
import { Button, Card } from '@rendra-ui/web'
import '@rendra-ui/web/tokens.css'
import '@rendra-ui/web/base.css'
import '@rendra-ui/web/components.css'
```

O CSS já sai compilado (estratégia A: o host recebe `tokens.css`, `base.css` e `components.css` prontos, sem precisar ter o Tailwind instalado, e sem nenhuma variável do namespace do Tailwind vazar para o seu tema). `react-router` fica fora das dependências: quem usa React Router importa a ponte, `@rendra-ui/web/router-bridge`; quem não usa, não precisa dela. Os componentes pesados (`document-viewer`, `rich-text-editor`, `chart`, `widget-grid`, `flow`) são subcaminhos próprios, para não engordar quem não usa. O `flow` (FlowEditor e FlowViewer) usa o React Flow (`@xyflow/react`, MIT): ele vem como dependência do pacote e você só importa `@rendra-ui/web/flow`, que já traz o CSS dele. No clone deste repositório, `FlowEditor` e `FlowViewer` vêm de `@/components/ui/flow-editor` e `@/components/ui/flow-viewer`, e `validateFlow`, `serializeFlow` e `parseFlow` de `@/lib/flow`.

**O que o `components.css` traz, e o que não traz.** Ele contém só as classes que os componentes do pacote usam por dentro e as `@utility` do Rendra. Classes de composição das suas próprias telas (`p-12`, `max-w-sm`, `flex-col`, `mb-0`) não estão garantidas: num host com Tailwind v4, deixe o seu Tailwind gerá-las e reproduza no `@theme` a escala do Rendra (espaço 0, px, 1, 2, 3, 4, 6, 8, 12, 16 e 24, raios por papel, cores `--rendra-*`); num host sem Tailwind, escreva o CSS de composição à mão com as variáveis `--rendra-*`. A receita completa e a lista de todas as `@utility` estão em [`docs/COMO_APLICAR.md`](docs/COMO_APLICAR.md), na seção "O CSS do pacote e as classes das suas telas".

**Publicação:** uma tag `vX.Y.Z` empurrada para o repositório (`git push origin vX.Y.Z`) dispara o `.github/workflows/publish.yml`, que builda o pacote, roda o `verify:pack` e publica com `npm publish --provenance --access public`, depois de conferir que a tag bate com a `version` do `package.json`. Com o _trusted publishing_ do npm configurado para este repositório, o workflow dispensa o segredo `NPM_TOKEN`.

### CLI (`rendra`)

Três comandos. Forma segura, que não exige instalar nada: `npx @rendra-ui/web <comando>`, direto do registry:

```bash
npx @rendra-ui/web codigos                    # lista o catálogo de códigos de componente
npx @rendra-ui/web auditar [pasta...] [--all] [--ignore a,b]   # regras de DESIGN_RULES.md no projeto de destino
npx @rendra-ui/web trocar <DE> <PARA> --dry-run   # simula a troca de uma variante do catálogo pela outra
```

Nota: `npx rendra <comando>` só funciona com o pacote instalado neste projeto (ou instalado global, como `rendra <comando>` direto). Sem instalar, não use `npx rendra`: o nome `rendra` no npm pertence a outro pacote, não a este.

`rendra auditar` aplica, por padrão, sete regras estáticas, sem IA (cor fixa, valor arbitrário, estilo inline, fonte fixa, `100vh`, degrau fora da escala, raio fixo), o mesmo tipo de checagem do `check:rules` deste repositório, aplicado a qualquer projeto. Sem flag e sem `rendra.config.json`, a saída e o código de saída são os de sempre (1 com violação, 0 sem).

**`--all`** liga as 17 regras do `check:rules`: as sete acima mais `var-inline`, `svg-marca`, `classe-dinamica`, `texto-estreito`, `primaria-como-texto`, `componente-duplicado`, `css-fora-do-lugar`, `botao-solto`, `texto-orientativo` e `variavel-sem-prefixo-rendra`. Use quando o projeto segue o vocabulário e as pastas do Rendra (`--rendra-*`, `src/brand`, `src/styles`, telas em `src/pages/app`); num projeto que não segue, desligue as regras que não fazem sentido em `rendra.config.json`. Com `--all`, pastas de marca e de estilos só passam pelo prefixo `--rendra-`, e `.test.`, `.stories.`, `node_modules`, `dist` e `build` não são varridos.

**`--ignore a,b`** pula pastas, por prefixo de pasta relativo ao projeto (sem glob): `src/brand` pula `src/brand` e tudo dentro, mas não `src/brand-novo`. Vale também `--ignore a --ignore b` e `--ignore=a,b`, com ou sem `--all`. **Várias pastas:** `auditar src extra` varre as duas. Com uma só pasta, ela é a base do projeto (o `file` da saída sai relativo a ela e o `rendra.config.json` é lido dela); com duas ou mais, a base é a pasta atual. Pasta fora da base dá erro claro, sem varrer nada.

**`rendra.config.json`** é opcional, fica na base do projeto e aceita cinco chaves, todas opcionais:

```json
{
  "pastas": ["src", "extra"],
  "ignorar": ["src/gerado"],
  "regras": { "botao-solto": false, "cor-fixa": false },
  "pastasMarca": ["src/brand", "src/styles"],
  "pastasTelas": ["src/pages/app"]
}
```

`pastas` substitui o atalho para `src`; `ignorar` tem o efeito de `--ignore`; `regras` desliga qualquer um dos 17 identificadores (`false`), com ou sem `--all`; `pastasMarca` e `pastasTelas` valem com `--all`, e os padrões são os do exemplo. A flag vence o config e não soma: `--ignore` substitui `ignorar`, e duas ou mais pastas posicionais substituem `pastas`. JSON inválido, chave desconhecida, tipo errado ou regra desconhecida dão mensagem em português e código de saída 1, assim como flag desconhecida (`--foo`) e `--ignore` sem valor. `rendra auditar --help` mostra a ajuda geral. `rendra trocar` reescreve a prop literal que distingue duas variantes do catálogo (`ABA-001` para `ABA-002`, por exemplo), sempre com `--dry-run` primeiro: um elemento sem a prop conta como a variante padrão do componente (troca também esse caso, inserindo ou removendo a prop conforme o lado); prop dinâmica (`variant={x}`) nunca é reescrita, só listada para revisão manual, e troca entre componentes diferentes nunca edita, só aponta onde o componente aparece. Só `rendra trocar` precisa do `typescript` instalado no projeto de destino (`peerDependency` opcional do pacote), para ler e reescrever o JSX; sem ele, avisa e sai com erro.

### Skill de migração parcial

[`skills/rendra-migracao-parcial/SKILL.md`](skills/rendra-migracao-parcial/SKILL.md), lida por Claude Code, Codex e Cursor: migra um sistema existente em três níveis (tokens, padrões, componentes), escolhidos por você, usando `rendra auditar` e `rendra trocar` por baixo.

### Códigos de modelo e de componente

- **Código de modelo** (`T1-C4-M5`: tema, cores e menu): a tabela completa está no item 3.0 do [`docs/BRIEFING_MODELO.md`](docs/BRIEFING_MODELO.md) e em `src/config/presets.ts`. Diz de uma vez qual template, qual paleta e qual posição de menu usar.
- **Código de componente** (`ABA-001`, `BTN-006`...): um por componente e por variante visual relevante, em `src/catalog/components.ts`. Aparece na vitrine (`/componentes`), no `data-rendra` do elemento raiz, no `registry.json` e na saída de `rendra codigos`.

---

## Documentação

- [DESIGN_RULES.md](DESIGN_RULES.md): todas as regras de interface, o que é proibido e o checklist de revisão. **Leitura obrigatória antes de alterar qualquer interface.**
- [docs/COMO_APLICAR.md](docs/COMO_APLICAR.md): projeto novo ou existente, troca de marca, ordem de migração, testes, problemas comuns e checklist de aceite.
- [docs/PROMPT_MIGRACAO.md](docs/PROMPT_MIGRACAO.md): prompt pronto para a IA do projeto de destino aplicar o design system.
- [AGENTS.md](AGENTS.md): fluxo de início para qualquer IA (tipo de trabalho, briefing e etapas).
- [docs/BRIEFING_MODELO.md](docs/BRIEFING_MODELO.md): roteiro do briefing.
- [CLAUDE.md](CLAUDE.md): instruções para o Claude Code.
- [CHANGELOG.md](CHANGELOG.md): o que mudou em cada versão e o que fazer para atualizar.
- [CONTRIBUTING.md](CONTRIBUTING.md): como propor mudanças.

---

## Perguntas frequentes

**O que é o Rendra Design System?**
Um template de sistema e design system open source em React, TypeScript e Tailwind CSS. Traz o layout de sistema administrativo pronto (menu, header fixo, rodapé de ações), telas base como dashboard, listagem, cadastro, CRM kanban, agenda e chat, e componentes acessíveis para criar sistemas novos ou migrar o layout de sistemas existentes.

**Posso usar em projeto comercial?**
Sim. Licença MIT: você pode usar, copiar, alterar e distribuir, inclusive em projetos comerciais, mantendo o aviso de copyright e o arquivo `LICENSE`. As bibliotecas usadas são de código aberto: React, Tailwind CSS, Radix, shadcn/ui, TanStack Table, Recharts e Tiptap.

**Funciona no celular?**
Sim, de verdade: tudo é escrito primeiro para 360px, tabelas viram cartões, o menu vai para a barra inferior, não há rolagem horizontal e os alvos de toque têm pelo menos 44px. Os testes abrem cada tela em cinco larguras, nos três modelos, no modo claro e no escuro.

**Dá para usar como white label, com a marca de cada cliente?**
Sim, de dois jeitos. No build: cada marca é uma entrada de 4 cores e um degradê em `src/brand/palettes.ts`. Em tempo de execução, quando cada cliente cadastra a própria marca: `applyPalette(sementes)` gera a paleta completa, claro e escuro, com o contraste AA conferido e ajustado. As cores de sistema e os neutros não mudam, e cada combinação pronta tem um código (por exemplo `T1-C2-M3`).

**Posso migrar o layout do meu sistema com uma IA?**
Sim. O [`AGENTS.md`](AGENTS.md) (e o `CLAUDE.md` e o `GEMINI.md`) conduz qualquer agente de IA por um briefing guiado, as regras de design e a ordem de migração; o [`docs/PROMPT_MIGRACAO.md`](docs/PROMPT_MIGRACAO.md) traz o prompt pronto.

**Qual a diferença para um template admin comum?**
As regras são verificadas por máquina: valor fora da escala, cor fixa, botão solto e texto de instrução no corpo da tela ou orientação de campo acima do limite da largura quebram o `check:rules`, e layout, acessibilidade e regressão visual rodam no CI a cada Pull Request.

## Autor

Criado e mantido por **Bruno Magalhaes**.

- Site: [www.brunomagalhaes.me](https://www.brunomagalhaes.me)
- E-mail: [contato@brunomagalhaes.me](mailto:contato@brunomagalhaes.me)
- Instagram: [@brunomagalhaes.me](https://www.instagram.com/brunomagalhaes.me/)

Contribuições são bem-vindas pelo fluxo descrito em [CONTRIBUTING.md](CONTRIBUTING.md): toda mudança passa por Pull Request e revisão.

## Licença

[MIT](LICENSE) © 2026 Bruno Magalhaes. Pode usar, copiar, alterar e distribuir, inclusive em projetos comerciais, mantendo o aviso de copyright.

## Créditos

Construído sobre Tailwind CSS, shadcn/ui, Radix UI, Lucide, TanStack Table, cmdk, Sonner, React Hook Form, Zod, IMask, React Day Picker, Recharts, Storybook e Playwright. As fontes Poppins, Inter e DM Sans são distribuídas sob a SIL Open Font License. Os símbolos dos templates são ilustrativos. O logotipo é montado pelo componente `BrandLogo` com as cores da paleta ativa.

### Ferramentas de movimento

A linguagem de movimento do Rendra (tempo, curva, origem, mola e o que não anima) foi desenhada e auditada com duas skills de agente de código. Elas ficam só na máquina de quem desenvolve; o Rendra não as redistribui.

- **Emil Kowalski**: as skills `emil-design-eng`, `animate`, `review-animations`, `animation-performance`, `find-animation-opportunities` e `improve-animations`, sob a licença **MIT**. Repositório de origem: [github.com/emilkowalski/skills](https://github.com/emilkowalski/skills). As regras de frequência, de assimetria entre entrada e saída, de origem do gatilho e do orçamento de tempo que o motion deste projeto segue vêm do trabalho dele.
- **Impeccable**: a skill `impeccable` (modo Operar: `audit`, `polish`, `harden`), sob a licença **Apache 2.0**. Repositório de origem: [github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable).
