# DESIGN_RULES

Regras obrigatórias de interface deste repositório. Foram escritas para serem seguidas por pessoas e por IAs. Leia o documento inteiro antes de criar ou alterar qualquer tela ou componente. Se uma regra impedir o que você precisa fazer, pare e pergunte: não contorne.

Três verificações automáticas garantem boa parte destas regras. Rode as três antes de entregar:

```bash
npm run check:rules   # cor fixa, valor arbitrário, fora da escala, estilo inline, fonte fixa, raio fixo,
                       # 100vh, var(--color-*) inline, SVG de marca fora de lugar, classe dinâmica, texto
                       # largo demais, primária como texto, botão solto, componente duplicado, variável
                       # sem --rendra-, CSS fora do lugar e texto orientativo (as 17 regras, em
                       # src/cli/auditar.ts e src/cli/regras-extras.ts); `npx @rendra-ui/web auditar --all`
                       # aplica as mesmas 17 num projeto de destino
npm run lint          # TypeScript, React Hooks e acessibilidade (jsx-a11y)
npm run test:layout   # todas as rotas, 5 larguras, 3 templates: rolagem, largura e toque de 44px
```

---

## 1. Regra mestra 1: um componente por finalidade

Existe **um** Select, **uma** Table, **um** Modal, **um** Drawer, **um** Input, **um** Button. Toda diferença de comportamento ou de aparência é resolvida por **props**, nunca por um arquivo novo.

| Proibido                                  | Correto                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `SelectSimples` e `SelectComBusca`        | `<Select searchable />`                                                       |
| `TabelaComCheckbox` e `TabelaSimples`     | `<Table selectable />`                                                        |
| `ModalGrande` e `ModalPequeno`            | `<Modal size="lg" />`                                                         |
| `InputCPF`, `InputTelefone`, `InputSenha` | `<Input mask="cpf" />`, `<Input mask="phone" />`, `<Input type="password" />` |
| `BotaoPrimario`, `BotaoIcone`             | `<Button variant="primary" />`, `<Button iconOnly />`                         |

Antes de criar um componente, procure em `src/components/ui` um que resolva o caso com uma prop a mais. Se existir, **acrescente a prop**. Componente duplicado é erro de revisão. O `check:rules` barra nomes de arquivo como `*-mobile`, `*Simples`, `*Grande`, `*ComBusca`.

Cada componente de `src/components/ui`, e cada variante visual relevante, tem um código de catálogo (`ABA-001`, `BTN-006`...), escrito no atributo `data-rendra` do elemento raiz via `resolveCatalogCode()`. **A lista de referência é o catálogo, não este documento**: `src/catalog/components.ts`, a vitrine `/componentes` ou (quando o pacote com a CLI estiver instalado) `rendra codigos`; copiar a lista para cá fica desatualizado a cada componente novo. Internos, sem uso direto em tela e fora do catálogo: `overlay-shell`, `picker-panel`, `sortable-handle`.

Componente de `src/components/ui` **nunca importa um roteador direto** (`react-router` ou outro): usa `useRendraLink()`, `useCurrentPath()` e `useRendraNavigate()`, de `@/components/rendra-provider`. A ligação com o roteador real é só a ponte, `RendraRouterBridge` (`src/components/rendra-router-bridge.tsx`, subcaminho `@rendra-ui/web/router-bridge` no pacote), o único lugar do app que sabe qual roteador está em uso.

## 2. Regra mestra 2: mobile-first real, sem exceção

O sistema precisa **funcionar** 100% no celular, e não só "não quebrar".

- Todo estilo é escrito primeiro para **360px** e depois ampliado com `sm:`, `md:`, `lg:`.
- **Proibida rolagem horizontal no mobile**, em qualquer tela ou componente, inclusive tabelas.
- Componente que não cabe no mobile **se reconstrói em outro formato dentro do próprio componente**, com a **mesma API de props**. Proibido criar `TableMobile`, `SelectMobile` ou similares.
- **Toda interação funciona por toque.** Proibida ação que dependa de hover para aparecer. O hover só pode antecipar ou enfeitar algo que também é acessível por toque ou teclado.
- Área de toque mínima de **44x44px** em qualquer elemento clicável no mobile. Se o desenho for menor (checkbox, switch), amplie a área com pseudo-elemento e marque `data-touch="expanded"`.
- Inputs com fonte mínima de **16px** no mobile, para o iOS não dar zoom. Isso já está na moldura dos campos.
- Detecção de tela: **um único hook**, `useBreakpoint()` (`src/hooks/use-breakpoint.ts`). Para reagir ao espaço de um bloco, e não da tela, use container queries: `<Grid responsive="container" />` ou `@container`.
- Alturas de tela com **100dvh** (`h-dvh`, `min-h-dvh`), nunca 100vh.

## 3. A marca fica isolada

Tudo o que é da marca mora em três arquivos e numa pasta:

1. `src/styles/theme.css`: formato e fonte do modelo, mais os neutros e as cores fixas do sistema (erro, sucesso, alerta, informação), como variáveis CSS.
2. `src/brand/palettes.ts`: as sementes da paleta da marca (4 cores e o degradê); `npm run palettes:build` gera o resto em `src/styles/palettes.css`, com AA conferido.
3. `src/brand/brand.config.ts`: nome do produto, logotipos (claro e escuro), símbolo, favicon, formato (`shape`), estilo do rótulo dos campos (`labelStyle`) e ícones de feedback.
4. `src/brand/assets/`: os SVGs e as fontes da marca.

**Nenhum componente pode conter** cor hexadecimal, `rgb()`, nome de fonte, logotipo ou ícone de marca fixo. Componentes leem a marca por `useBrand()` e as cores pelos nomes semânticos (`bg-primary`, `text-muted-foreground`). Em JavaScript, como nos gráficos, use as variáveis do tema, por exemplo `var(--rendra-chart-1)` e `var(--rendra-primary)`. As `--color-*` do Tailwind são inline e não existem no CSS.

**Nome das variáveis CSS.** Toda variável CSS própria do Rendra (cor, fonte, raio, sombra, degradê, gráfico, sidebar) começa com `--rendra-`, sempre por extenso, nunca abreviado: `--rendra-primary`, `--rendra-radius`, `--rendra-sidebar`, `--rendra-brand-font`, `--rendra-shape-control`, `--rendra-elevation-md`, `--rendra-meter-low`, `--rendra-gradient-brand`. As classes do JSX **não mudam**: `bg-primary`, `rounded-control` continuam existindo, porque o `@theme inline` de `globals.css` mapeia `--color-primary: var(--rendra-primary)`, e assim por diante para cada variável. A exceção é o namespace do próprio Tailwind (`--color-*`, `--spacing-*`, `--text-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--container-*`, `--breakpoint-*`, `--animate-*`, `--ease-*`, `--tw-*`): renomeá-lo mudaria toda classe JSX, então ele fica sem o prefixo. O `check:rules` barra `var(--x)` sem o prefixo fora dessa exceção.

### Cor: três camadas

A cor de um projeto tem **três camadas**, e só uma delas é da marca:

| Camada      | O que é                                                                                                                                     | Onde fica                                                                                | Muda por projeto?                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| **Modelo**  | Formato e fonte: Safira (quadrado), Equilíbrio (intermediário) ou Aurora (arredondado). São só três.                                        | `src/styles/theme.css` e `src/brand/examples` (`--rendra-radius`, `--rendra-brand-font`) | Escolhe-se um dos três              |
| **Paleta**  | A cor da marca: **4 cores** (primária, hover da primária, secundária, hover da secundária) e o **degradê da marca** (3 paradas). Nada mais. | Sementes em `src/brand/palettes.ts`; o resto é gerado em `src/styles/palettes.css`       | Sim: é a identidade do cliente      |
| **Sistema** | Neutros do modo claro (fundo #f5f6f7, card branco, borda, texto) e cores de sistema: erro, sucesso, alerta e informação.                    | `src/styles/theme.css`                                                                   | **Não**: iguais em todas as paletas |

Das 4 cores e do degradê, o gerador (`createPalette`, em `src/brand/palette.ts`) calcula todo o resto: texto sobre cada cor, fundo suave, primária como texto, foco, sidebar, degradês, gráficos, sombra e as superfícies do modo escuro. Cada par é conferido para **WCAG AA** na geração; se uma cor não passa com o texto pedido, ele a escurece (ou clareia) até passar e registra o ajuste. Nunca escreva à mão as variáveis de paleta nem peça ao cliente mais que as 4 cores e o degradê.

- **Paleta pronta ou do cliente, no build:** acrescente as sementes em `src/brand/palettes.ts` e rode `npm run palettes:build`. O CI confere se o `palettes.css` está em dia.
- **White label (várias marcas, sem build):** `applyPalette(sementes)` gera e injeta a paleta de um cliente em tempo de execução, com o mesmo resultado; depois é só `data-palette` com o id dela.

### Templates

São três modelos, cada um com formato, fonte e símbolo fixos:

| Modelo                | Formato                  | Paleta padrão                                   |
| --------------------- | ------------------------ | ----------------------------------------------- |
| Rendra Safira (ativo) | `square`, quadrado       | azul #0B6FE0, verde #98D10A, destrutivo #B72C05 |
| Rendra Equilíbrio     | `rounded`, meio-termo    | violeta + ciano                                 |
| Rendra Aurora         | `pill`, 100% arredondado | verde-petróleo + laranja                        |

- **O modelo não muda de formato.** O formato vem do `brand.config.ts` (`shape`). Os componentes não têm prop `shape`: usam `rounded-control`, `rounded-surface`, `rounded-item` e `rounded-avatar`.
- **A sidebar é sempre colorida**, também no modo claro: cada paleta define um degradê na cor da marca (`--rendra-sidebar` e `--rendra-sidebar-image`), com texto claro e contraste AA. Nunca sidebar branca ou cinza.
- **O logotipo acompanha o tema.** Use sempre `<BrandLogo on="sidebar" | "surface" | "brand" />`: ele monta o selo com o símbolo do modelo e as cores da paleta ativa. Só use os SVGs de logo como estão (`logoMode: 'image'` no `brand.config.ts`) quando a arte oficial não puder ser recolorida.
- **A paleta pode ser trocada.** Qualquer modelo pode usar a paleta de outro: no `<html>`, `data-brand` define o modelo e `data-palette` define as cores.
- Todo template define `primary`, `primary-hover`, `secondary`, `secondary-hover`, os `*-foreground` correspondentes e os `*-hover-foreground`. A cor de hover pode ser outra cor da marca: o texto sobre ela usa o `*-hover-foreground`.
- **Primária como preenchimento e como texto são tokens diferentes.** `bg-primary` é o preenchimento (botão, selo). Para link, ícone ou destaque em texto sobre o fundo, use `text-primary-text`, nunca `text-primary`: no modo escuro a primária costuma ficar escura demais para texto, e o `--rendra-primary-text` é o tom que passa AA. Todo tema define `--rendra-primary-text` no claro e no escuro, e a página `/tokens` mostra o contraste dele.

### CSS em camadas

`src/styles/globals.css` declara `@layer theme, base, rendra.base, components, rendra.components, utilities`: `rendra.base` é o reset do Rendra, depois de `base` e mais fraco que qualquer componente do host ou do próprio Rendra; `rendra.components` é o estilo de componente do Rendra, depois de `components` e antes de `utilities`, para uma classe utilitária do host sempre conseguir sobrescrever. Para aplicar um tema (`createTheme`/`applyTheme`) num contêiner específico em vez do documento inteiro (mais de uma marca na mesma página), o escopo é o seletor `[data-rendra-root]` em vez de `:root`, via `applyTheme(theme, { target: elemento })`.

## 4. Tokens

### Espaçamento

Base de 4px. **Só estes degraus existem:** `0, 1, 2, 3, 4, 6, 8, 12, 16, 24` (0 a 96px). A escala padrão do Tailwind foi zerada: `p-5`, `gap-7` e `w-64` **não geram CSS** e quebram o layout em silêncio. O `check:rules` barra esses degraus.

- Espaço interno de componentes: de 2 a 6.
- Espaço entre seções: de 8 a 16. Use `<Stack gap="section">`, que é menor no mobile.
- **Respiro de página igual em todos os lados:** 16px no celular e 24px a partir do tablet, em cima, embaixo e nas laterais. O conteúdo ocupa toda a largura restante (sem largura máxima).
- Tamanhos de peça têm token nomeado: `h-control-sm|md|lg`, `size-touch`, `size-icon-sm|md|lg`, `h-header`, `h-chart-sm|md`, `w-sidebar`. Se precisar de um tamanho novo, **crie o token** em `src/styles/globals.css`. Nunca use valor arbitrário.

### Tipografia

Sete tamanhos (`text-xs` a `text-3xl`), com line-height e letter-spacing definidos. Os títulos são menores no mobile e têm tracking levemente negativo. Três pesos, e só três: `font-normal` (400), `font-medium` (500) e `font-semibold` (600). A fonte vem de `--rendra-brand-font`.

**Rótulo e orientação do campo** têm tokens próprios (`--rendra-label-*` e `--rendra-help-*`, com as classes `text-label`, `text-label-foreground`, `label-case`, `text-help` e `text-help-foreground`). O estilo do rótulo vem de `data-label` no `<html>`, escrito pelo `BrandProvider` a partir de `labelStyle` no `brand.config.ts`: `discreto` (padrão; 11px, peso 500, maiúsculo, espaçado, cinza com AA sobre o card e o fundo) ou `normal` (14px, peso 500, cor do texto). A orientação abaixo do campo é sempre 12px, na cor de texto secundário. Todo token novo do Rendra nasce com o prefixo `--rendra-`, com valor claro e escuro.

### Cores

Tokens semânticos: `background`, `foreground`, `card`, `popover`, `muted`, `muted-foreground`, `border`, `input`, `field`, `ring`, `primary`, `secondary`, `accent`, `destructive`, `success`, `warning`, `info`. Cada semântica tem fundo forte, texto sobre o forte, fundo suave (`*-soft`) e texto sobre o suave (`*-soft-foreground`). **Contraste mínimo WCAG AA:** 4,5:1 para texto e 3:1 para bordas de campo e foco. A página `/tokens` mede os pares ao vivo. No modo claro, o fundo da página e dos campos é o cinza bem claro **#f5f6f7** em todos os templates, e os cards são brancos: o campo se destaca do card sem precisar de cor. Nada de fundo tingido.

### Raio, sombra e densidade

- Raio: `--rendra-radius`, com os derivados por papel, controlados pelo formato do modelo. Escolha pelo papel do elemento, nunca pelo visual que quer:

  | Papel      | Classe            | Onde                                                                                      | No Aurora (arredondado)         |
  | ---------- | ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
  | Controle   | `rounded-control` | botão, campo, select                                                                      | 100% redondo até 56px de altura |
  | Item       | `rounded-item`    | chip, item de menu, aba, badge                                                            | 100% redondo até 56px de altura |
  | Superfície | `rounded-surface` | card, drawer, painel, coluna do kanban                                                    | raio generoso, não 100%         |
  | Bloco      | `rounded-block`   | cartão do kanban, bloco de valores dentro de um card, citação, evento da agenda, skeleton | canto pequeno                   |
  | Avatar     | `rounded-avatar`  | foto e iniciais                                                                           | círculo                         |

  **O arredondado a 100% do Aurora é só para controles de uma linha.** Cartão e bloco de informação nunca viram pílula nem círculo: usam `rounded-surface` ou `rounded-block`. Elemento com mais de uma linha dentro de um card é `rounded-block`.

- Sombra: três níveis (`shadow-sm`, `shadow-md`, `shadow-lg`), sutis. Superfície de página usa **borda de 1px**, e a sombra fica para o que flutua.
- Densidade: input, botão e select têm a **mesma altura** em cada tamanho (`sm`, `md`, `lg`). No mobile, 44, 48 e 52px. A partir de 768px, 32, 40 e 48px.

### Degradês

Três por template, cada um com lugar certo:

- `bg-gradient-brand` (forte): só sidebar, painel lateral do login e telas de erro. **No máximo um por tela.** O texto usa `text-gradient-brand-foreground`, e o ponto de luz nunca fica atrás do texto.
- `bg-gradient-soft` (suave): destaque de superfície, em no máximo um StatCard por tela.
- `bg-gradient-accent` (detalhe): barra de progresso, borda de destaque, linha de gráfico. Nunca com texto por cima.
- **Proibido:** degradê em botão, input, badge, fundo de texto corrido ou de tabela.

## 5. Composição de tela

### Estrutura

- Toda tela é composta pelas primitivas de `@/components/layout`: `Container`, `Stack`, `Inline`, `Grid`, `Section` e `PageHeader`. Não use classes de layout soltas para a estrutura da página.
- Primeiro bloco de toda tela: `<Container padded><Stack gap="section"><PageHeader ... />`.
- **O título da página fica no header do AppShell**, com a trilha (breadcrumb) logo abaixo. O `PageHeader` mostra só a descrição e as ações, e mantém o `h1` para leitores de tela. Use `showTitle` apenas quando o título do corpo for outro, como o nome do cliente no detalhe.
- **O header é sempre fixo**, em todas as páginas. A única área de rolagem da tela é o `<main>` do AppShell.
- **Telas de segundo nível têm seta de voltar** à esquerda do título e da trilha (automática: aparece quando a trilha tem tela-pai, como Clientes em Novo cliente). Ela leva à tela-pai, não ao histórico. No celular, a seta ocupa o lugar do botão de menu. Título e trilha ficam em uma linha cada e, se não couberem, encurtam com reticências; nunca quebram linha.
- **Texto ocupa 100% da largura disponível.** Descrição de página, de seção e texto de orientação nunca ganham largura máxima por padrão (nada de meia largura "para ficar elegante"). Outra medida só quando o layout pedir; o `check:rules` barra `max-w-*` em parágrafo.
- **No celular, o menu fica no botão redondo central da barra inferior**, meio acima da linha, ao alcance do polegar. O header não tem botão de menu quando há barra inferior, e o espaço fica para a seta de voltar e o título.
- **Tamanho médio (`md`) é o padrão** de campos e botões em formulários, barras de tabela e do calendário. O pequeno (`sm`) fica para ações dentro de linhas, cards e menus.

### Qual contêiner usar

| Conteúdo                                                      | Contêiner                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Confirmação, mensagem, formulário de até 3 campos simples     | `Modal`                                                           |
| Formulário ou detalhe de volume médio, até cerca de 12 campos | `Drawer`                                                          |
| Formulário longo, cadastro complexo                           | Página inteira, em seções (`FormSection`) ou em etapas (`Wizard`) |

Se o conteúdo rola muito ou tem muitos campos, não cabe em modal. **Nunca modal dentro de modal.** A confirmação de descarte do Drawer é a única exceção: um modal de confirmação por cima do drawer.

### Drawer

Único, desliza da direita. **Header fixo** (ícone, título, descrição, fechar), **body** como única área rolável e **footer fixo** com borda superior e as ações. Props: `size` e `dirty`. **Largura padrão: 30% da tela**; também 40%, 50% e 75% (`size="30" | "40" | "50" | "75"`), nunca menos que 28rem; no celular, sempre tela inteira. Fecha por Esc e por clique fora, e com `dirty` pede confirmação antes. No mobile ocupa a tela inteira (100dvh), e o footer respeita `env(safe-area-inset-bottom)`.

### Botões de ação: use sempre `<ActionBar>`

- **Um botão:** 100% da largura.
- **Dois botões:** cancelar com 30% à esquerda (outline) e ação principal com 70% à direita (primária).
- **Três ou mais:** as secundárias vão para o menu de três pontinhos.
- Vale para drawer, modal e formulário em página, em qualquer largura. Só as barras de ferramentas acima de tabelas usam botões de largura automática.
- O envio mostra carregamento e fica desabilitado enquanto processa (`loading`).
- **Salvar, cadastrar e criar ficam sempre no rodapé fixo**, desenhado pelo AppShell abaixo da área rolável: sempre colado embaixo, na largura inteira, e **nunca sobe**, mesmo com formulário curto. Como o botão fica fora do `<form>`, use `primary.form` com o id do formulário. No **wizard**, os botões seguem junto do card (sem rodapé fixo).
- Nunca ficam soltos no body nem dentro de um card: em formulário de página e em configurações, `ActionBar sticky` no fim da página; em drawer e modal, o `footer` (que já é fixo). Uma tela nunca tem o botão de salvar num lugar e outra em outro.

### Nunca botão solto; texto orientativo em modal

Toda ação tem um lugar previsto. Botão fora desses lugares é erro de revisão, mesmo que funcione.

| Ação                                                        | Lugar                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Salvar, cadastrar, criar, cancelar                          | `ActionBar` no rodapé fixo (página) ou no footer (drawer, modal)         |
| Novo, Filtros, Colunas de uma listagem                      | barra da tabela (`toolbar` da `Table`)                                   |
| Ação da tela (Editar, Exportar, Ajustar dashboard)          | `PageHeader actions` (no máximo duas; o resto no menu de três pontinhos) |
| Ação de um card (Ligar, Restaurar padrão, Encerrar sessões) | `CardHeader actions`, no canto do cabeçalho do card                      |
| Ação de uma linha ou de um cartão                           | menu de ações da linha (`rowActions`) ou do cartão                       |
| Ação de um campo (trocar foto, gerar senha)                 | junto do próprio campo, dentro do `Field`                                |

**Texto orientativo** (como usar a tela, de onde vem um número, o que uma seção faz) **nunca fica solto no corpo da tela**: nem como parágrafo, nem como `Alert` informativo, nem num botão avulso "Saiba mais" ou "Como funciona". Ele vira um **ícone de informação discreto ao lado do título** a que se refere, que abre um `Modal` informativo:

- da tela: `PageHeader help` (o ícone aparece ao lado do título, no header fixo);
- de uma seção: `CardTitle help` ou `FormSection help`;
- em outro ponto, só quando nenhum título servir: `<InfoHint title>`.

**Orientação curta abaixo do campo é permitida**, na prop `help` do `Field` (e do `FormField`), com limite de caracteres pela largura do campo (`span`):

| `span`        | Largura | Limite        |
| ------------- | ------- | ------------- |
| `full`        | 100%    | 150           |
| `xl`          | 67%     | 100           |
| `lg`          | 50%     | 70            |
| `md` e `half` | 33%     | 40 (o padrão) |
| `sm`          | 25%     | 30            |
| `xs`          | 17%     | 20            |

Acima do limite, o texto vai para o `help` em modal (`PageHeader`, `CardTitle` ou `FormSection help`) ou para um bloco recolhido na seção ("Por que essas perguntas"). E mais:

- **Por seção, no máximo metade dos campos com orientação.** Orientação em todo campo vira ruído.
- **Uma linha só**, sempre abaixo do controle; **nunca entre o rótulo e o controle**.
- **Nunca repete o que o campo já diz** (rótulo, placeholder, máscara). "Informe o CPF" abaixo de "CPF" é erro.
- **Limite, formato e contador ficam dentro do componente** (o contador do `Textarea`, a dica de tipo e tamanho do `Upload`), nunca soltos no corpo.
- **Um subtítulo por seção** e **no máximo um bloco recolhido por seção**.

O `description` do `PageHeader` pode descrever **o que é** a tela, curto (até 150 caracteres); os subtítulos de card também descrevem (status, segmento, "Plano, valor e início"). Nenhum dos dois **instrui**. O `npm run check:rules` barra, nas telas do sistema: `help` literal de `Field` e `FormField` acima do limite do `span` (sem `span`, vale o de `md`); mais da metade dos campos de uma `FormSection` com `help` literal; `description` literal do `PageHeader` acima de 150 caracteres; subtítulo que começa com verbo de instrução ("Comece", "Clique", "Arraste", "Preencha"...); e botão solto no conteúdo de um card. Texto dinâmico (`help={mensagem}`) não é medido pelo verificador, mas segue a mesma regra.

### Cabeçalho de listagem

O título fica só no header. **Nada solto acima da tabela:** sem descrição, sem contagem de registros (o total já aparece na paginação, no rodapé do card) e sem botão Novo fora do card. De cima para baixo: **barra de ferramentas dentro do mesmo card da tabela**, com a busca à esquerda e, à direita, ações secundárias, Colunas, **Filtros e, por último, a ação principal** (Novo), na prop `toolbar.primaryAction`; no mobile, Filtros (30%) e Novo (70%) ficam lado a lado abaixo da busca. Depois, os **chips** dos filtros aplicados, com limpar, e a tabela. Filtros com muitas opções abrem em popover (desktop) ou drawer de tela cheia (mobile), nunca empurrando o conteúdo. Na `Table` isso tudo é a prop `toolbar`.

### Card

Conteúdo de página agrupado em `Card`, com borda de 1px e sem sombra pesada. **Não aninhe card dentro de card:** para hierarquia interna, use `Separator` ou título de seção. **Nunca rolagem dentro de card.**

### Formulário

Rótulo **sempre acima** do campo; obrigatório marcado no rótulo (`required`); erro **abaixo** do campo, no lugar da ajuda (sem linha vazia reservada; em grid de 2 colunas com validação ao digitar, use `reserveMessage` para o erro não empurrar a linha); grade de 12 colunas no desktop (3 campos por linha, veja abaixo) e sempre 1 no mobile; campos agrupados em `FormSection` com título; ações no rodapé (`ActionBar`). Validação com React Hook Form + Zod (`Form`, `FormField`, validadores em `src/lib/validators.ts`: CPF, CNPJ, telefone, CEP, data).

**Campos por linha:** a grade de formulário (`FormSection` ou `<Grid form>`) tem 12 colunas no largo, e o padrão é **3 campos por linha** (`span="md"`). Um quarto campo entra na linha só se for pequeno (20% ou menos: `span="xs"`, como UF e número). **Nunca 2 campos por linha por padrão**; meia linha (`span="lg"`) só quando o conteúdo pedir. Larguras: `xs` 17%, `sm` 25%, `md` 33%, `lg` 50%, `xl` 67%, `full`. A grade reage à largura do próprio bloco: em drawer e tablet fica com 2 por linha, e no celular, 1.

**CEP e CNPJ sempre primeiro:** o campo que faz busca vem antes dos campos que ele preenche, com 25% da linha (`span="sm"`), sozinho na linha, e o que ele preenche começa abaixo (`newRow`). CEP preenche logradouro, bairro, cidade e UF (`lookupCep`, ViaCEP); CNPJ preenche razão social, contato e endereço (`lookupCnpj`, BrasilAPI). Assim a pessoa sabe da busca antes de digitar o resto. A ajuda do campo diz o que a busca preenche e o resultado.

**Espaço entre campos:** sempre `gap="fields"` no `Grid` ou no `Stack` que contém os `Field` (o `FormSection` já usa): 16px do fim de um campo ao rótulo do próximo, e 8px do rótulo ao controle. Nunca empilhe campos com outro gap.

### Tabela: sempre `<Table>`

- Texto com no máximo 3 linhas (`lines`), com reticências acima disso.
- Até 2 ações visíveis por linha como ícone; acima disso, uma visível e o resto no menu de três pontinhos (`rowActions`).
- Ações na última coluna, à direita, com largura fixa. Seleção na primeira coluna (`selectable`). **Colunas de situação (`kind: 'badge'`) ficam por padrão logo antes das ações** (`statusLast`).
- Números e moeda alinhados à direita (`kind: 'number' | 'currency'`); datas em formato curto (`kind: 'date'`).
- Sempre com estado vazio (`empty`), carregando (`loading`, com skeleton da mesma estrutura) e erro (`error`, `onRetry`).
- **Mais de uma informação por coluna** quando elas andam juntas: `details` põe linhas menores abaixo do valor. Cliente: nome e CPF, ou nome fantasia, razão social e CNPJ. Contato: telefone e e-mail.
- **O título abre o cadastro:** `href` na coluna principal vira link, com hover de clicável (cor e sublinhado).
- **15 registros por página** em todas as tabelas (`TABLE_PAGE_SIZE`), paginação no rodapé do card, à direita.
- **Dados do servidor, página por página:** a tabela de uma listagem usa a prop `source`, que pede só a página visível (`page`, `pageSize`, `search`, `sort`) e recebe `{ rows, total }`. A **busca e os filtros valem para todos os registros**, feitos no servidor, nunca só na página carregada. Filtros da tela entram na função e mudam o `queryKey`, que volta à página 1. `data` com tudo em memória só para listas pequenas e fixas.
- Ao marcar linhas, aparecem as ações em massa (`bulkActions`) e o menu com mais ações (`bulkMenu`).
- Colunas pouco importantes começam ocultas (`hidden`) e ficam disponíveis no menu Colunas.

### Kanban, painel e atendimento

- **Kanban:** o quadro ocupa a altura que sobra na tela e nunca passa dela; cada etapa rola por dentro e mostra mais cards ao chegar no fim (rolagem infinita, `pageSize` e `onLoadMore`). O **(+) de adicionar fica no título da etapa**. Com `valueFields`, o card mostra os valores (ex.: P&S e MRR) e a etapa mostra o total de cada um; no card, a data fica à esquerda e o avatar do responsável à direita, abaixo de uma divisória. Muitas etapas rolam na horizontal dentro do quadro. Com `dropTargets`, o arraste também mostra uma barra de destinos além das colunas (ex.: "Marcar como ganho"), disponível também no menu "Mover para" do card (`KANB-002`).
- **List:** cada `ListItem` pode ter `tone` (`success`, `error`, `warning`, `neutral`), um selo textual de status, nunca só cor. Com `onReorder`, a lista reordena por arraste (mouse e toque) e por teclado (setas na alça), que só aparece quando `onReorder` existe (`LIST-002`).
- **Upload:** `layout="gallery"` troca a linha de lista por miniaturas, para fotos e vídeos (`UPL-002`); `crop` (com `aspects`) abre o `ImageCropper` antes de confirmar o envio, numa proporção fixa.
- **Input:** `units` mostra um seletor de unidade dentro do campo (ex.: kg/lb); `variant="secret"` esconde o valor com opção de revelar, sem alternar para `type="password"` simples.
- **Timeline:** cada evento tem `tone` (semântico) e pode ter `status` (`succeeded`, `failed`, `skipped`) para o passo de um fluxo (ex.: etapas de uma importação).
- **Painel em widgets (`WidgetGrid`):** "Ajustar dashboard" libera arrastar e redimensionar; os outros widgets se encaixam sozinhos e a arrumação fica salva no navegador. No celular, os widgets empilham e não se editam.
- **Gráficos:** velocímetro de meta em meio círculo com degradê vermelho, amarelo e verde (`--rendra-meter-*`), percentual grande e meta e realizado em texto. Funil com etapas que afunilam, o valor e o nome dentro de cada faixa e a conversão entre elas, com a maior queda destacada.
- **Atendimento (chat):** lista, conversa e dados do contato lado a lado na altura da tela; no celular, a lista e a conversa em tela cheia. O campo de mensagem tem 2 linhas, cresce com o texto, e aceita anexos por botão, arrastar e soltar ou colar (Ctrl+V de arquivo, print ou imagem).
- **ColorPicker:** amostras da marca (`swatches`, recebidas por prop, nunca escritas no componente) antes da cor livre por hexadecimal.
- **ImageCropper:** recorta numa proporção fixa (`aspects`) antes de enviar (foto de perfil, capa); só confirma (`onConfirm`) com o recorte válido.
- **DocumentViewer:** abre um PDF (contrato, nota fiscal, comprovante) sem sair da tela, com os estados vazio (`url: null`), carregando e erro previstos por prop.
- **QrCode:** gera o código (link, código de acesso) no próprio cliente, sem depender de serviço externo.
- **Rating:** `variant="stars"` para uma nota rápida de satisfação; `variant="scale"` para 0 a 10 (NPS), com rótulo nas pontas (`lowLabel`, `highLabel`).
- **RepeatableField:** lista de campos do mesmo tipo (telefones, e-mails, endereços), com `createItem`, `renderField` e, quando fizer sentido, `showPrimary` para marcar um item como principal.
- **Checklist:** itens que a pessoa cria, renomeia, marca e remove, tudo por teclado, sem depender de arraste.
- **Spinner:** carregamento breve dentro de um botão, campo ou lista; `label` só quando o carregamento precisar de anúncio para leitor de tela (padrão é decorativo).
- **Barras de rolagem internas** usam `scrollbar-subtle`: finas, sem trilho, na cor da borda.

### Rolagem

Uma única área de rolagem por tela: o `<main>` do AppShell. Drawer e modal têm a própria, no body. **Nunca rolagem dentro de card.** No desktop, tabela muito larga pode rolar na horizontal só dentro do próprio contêiner (`data-allow-overflow`). No mobile, nunca.

## 6. Comportamento no mobile (abaixo de 768px)

Cada componente se reconstrói sozinho, com a mesma API:

| Componente           | No mobile                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Table                | Lista de cards. Colunas `mobile: 'primary'` no topo (até 3, a primeira como título); `secondary` recolhidas em "Ver detalhes", com animação; `hidden` não aparecem. Ações no rodapé do card. Com `selectable`, checkbox no card e ações em massa numa barra fixa no rodapé da tela. Paginação com anterior e próxima, ou "Carregar mais" (`mobilePagination`). |
| Barra de ferramentas | Busca na largura total; filtros, ordenação e colunas viram um único botão "Filtros" com contador, que abre um drawer de tela cheia.                                                                                                                                                                                                                            |
| Drawer e Modal       | Tela inteira, com header e footer fixos, footer acima da área segura e do teclado (`interactive-widget=resizes-content`), 100dvh.                                                                                                                                                                                                                              |
| Select e DatePicker  | Painel inferior (bottom sheet), com busca no topo e confirmação no rodapé.                                                                                                                                                                                                                                                                                     |
| Tabs                 | Se as abas não couberem na largura do bloco, viram um Select. Nunca rolagem lateral.                                                                                                                                                                                                                                                                           |
| Wizard               | "Etapa 2 de 5", com barra de progresso e nome da etapa; Voltar e Avançar no rodapé fixo.                                                                                                                                                                                                                                                                       |
| Sidebar              | Gaveta aberta pelo botão de menu, com barra inferior de até 4 itens (`bottomNav` em `navigation.ts`).                                                                                                                                                                                                                                                          |
| Header               | Compacto: seta de voltar (nas telas de segundo nível), título com trilha em texto e ícones. O menu fica no botão central da barra inferior (sem barra inferior, volta para o header). A busca global vira ícone que abre em tela cheia.                                                                                                                        |
| Breadcrumb           | Dentro das páginas, vira botão voltar com o nome da tela atual. No header, trilha só em texto.                                                                                                                                                                                                                                                                 |
| Tooltip              | Não existe hover: informação essencial vai em texto de ajuda visível ou em Popover por toque.                                                                                                                                                                                                                                                                  |
| Chart                | Legenda abaixo, eixos simplificados e "Ver como lista" quando há muitos pontos.                                                                                                                                                                                                                                                                                |
| StatCards e grids    | 1 coluna, ou 2 para cards pequenos.                                                                                                                                                                                                                                                                                                                            |
| Inputs com máscara   | `inputMode` certo automaticamente (numeric, tel, decimal).                                                                                                                                                                                                                                                                                                     |
| Formulário em página | Rodapé com os botões fixo no fim da tela (`ActionBar sticky`).                                                                                                                                                                                                                                                                                                 |

## 7. AppShell e layout

O `<AppShell>` nunca importa `@/config`: tudo entra por prop, montada por quem monta a aplicação (o `AppLayout` do boilerplate, `src/app/app-layout.tsx`, elemento das rotas dentro do `<RendraRouterBridge>` de `src/routes.tsx`). Este documento é a fonte única do contrato:

- `navigation`: os grupos e itens do menu (`NavGroup[]`, de `src/config/navigation.ts`).
- `layout`: posição e comportamento do menu (`Partial<ShellLayout>`, com o padrão em `src/components/app-shell/layout.ts` e a escolha do projeto em `src/config/layout.ts`):
  - `navigation`: `sidebar` (lateral) ou `topbar` (superior).
  - `sidebar`: `collapsed` (padrão, só ícones) ou `expanded`.
  - `expandOnHover`: com a sidebar recolhida, abre por cima do conteúdo ao passar o mouse ou focar pelo teclado.
  - `submenu`: `panel` (segunda barra lateral) ou `inline` (dentro da sidebar).
  - `topbarSubmenu`: `dropdown` (navegável) ou `mega` (mega menu com seções e descrições).
  - `bottomNav`: barra inferior no celular.
- `user`: nome, e-mail e foto no rodapé da sidebar e no menu do avatar (`ShellUser`).
- `userMenuItems`: itens do menu do avatar (perfil, configurações...).
- `onLogout`: ação do item de sair do menu do avatar.
- `homeLabel`: rótulo do item raiz da trilha (padrão "Início").
- `quickActions`: ações rápidas oferecidas na busca global (Ctrl+K).
- `notifications`: itens do sino de notificações (`items`, `onMarkAllRead`, `onItemClick`).
- `userConfigurable`: permite que o usuário troque o layout (menu do avatar e Configurações); `false` trava o layout do projeto.

A sidebar tem z-index maior que o header. O item ativo do menu é sempre o destino mais específico que combina com o endereço atual.

## 8. Feedback com a marca

`BrandFeedbackIcon` (success, error, warning, info) renderiza o símbolo da marca tingido pela cor semântica, com selo de status, para o significado não depender só da cor. Com `animated`, o check se desenha, o X se risca e o erro treme, respeitando "reduzir movimento". É **obrigatório** em toast, alert, modal de confirmação, estado vazio e tela de erro. Os componentes `Toast`, `Alert`, `Modal`, `EmptyState` e `ErrorPage` já o usam. Cada tipo pode ser trocado por um SVG próprio em `brand.config.ts` (`feedbackIcons`).

## 9. Acessibilidade

Teclado em tudo; foco visível (`:focus-visible` global com `--rendra-ring`); contraste AA; rótulo em todo campo; `aria-label` em botão só com ícone (`iconOnly`); botão que mostra texto visível (como as iniciais do avatar) tem o rótulo começando por esse texto (WCAG 2.5.3), como "AS, menu de Ana Souza"; um `h1` por página; textos da interface em **português do Brasil**; datas em DD/MM/AAAA; valores em R$ 1.250,00.

## 10. O que é proibido

1. Valor arbitrário do Tailwind (`p-[13px]`, `w-[37rem]`, `text-[#fff]`).
2. Cor fixa em componente (hexadecimal, `rgb()`, `hsl()`) fora de `src/styles` e `src/brand`.
3. Espaçamento fora da escala (`p-5`, `gap-7`, `h-48`, `w-64`).
4. Estilo inline (`style={{ ... }}`), exceto para passar variável CSS dinâmica (`--x`).
5. Nome de fonte fixo em componente.
6. Logotipo, símbolo ou ícone de marca importado fora de `src/brand` (use `<BrandLogo />` e `useBrand()`).
7. Sidebar branca ou cinza: ela é sempre colorida na cor da paleta.
8. Componente duplicado ou paralelo (`SelectSimples`, `ModalGrande`).
9. Versão mobile separada de componente (`TableMobile`).
10. Modal com muitos campos (mais de 3) ou modal dentro de modal.
11. Rolagem horizontal no mobile.
12. Ação que só aparece com hover.
13. Rolagem dentro de card; card dentro de card.
14. `100vh` (use `100dvh`).
15. Degradê em botão, input, badge ou atrás de texto corrido; mais de um degradê forte por tela.
16. Fundo tingido no modo claro (a página e os campos usam #f5f6f7; os cards, branco).
17. Título da página repetido no corpo quando já está no header.
18. Botão solto: toda ação fica no rodapé fixo, na barra da tabela, no `PageHeader`, no cabeçalho do card ou no menu da linha.
19. Texto orientativo solto no corpo da tela (parágrafo, `Alert` informativo, botão "Saiba mais"): use `help` ao lado do título, que abre um modal.
20. Orientação do campo acima do limite do `span` (full 150, xl 100, lg 70, md 40, sm 30, xs 20), em mais da metade dos campos da seção, em mais de uma linha, entre o rótulo e o controle ou repetindo o que o campo já diz.
21. `description` do `PageHeader` com mais de 150 caracteres ou dando instrução.

## 11. Checklist de revisão

Antes de entregar qualquer mudança de interface:

- [ ] Reaproveitei um componente existente, com prop nova se preciso, em vez de criar outro.
- [ ] A tela usa `Container`, `Stack`, `Grid`, `Section` e `PageHeader`, e não classes de layout soltas.
- [ ] Escrevi primeiro para 360px e testei em 360, 390, 768, 1280 e 1920.
- [ ] Nada depende de hover; todo clicável tem 44px no mobile.
- [ ] O componente se reconstrói no mobile sem arquivo separado.
- [ ] Contêiner certo para o volume: modal até 3 campos, drawer até cerca de 12, página acima disso.
- [ ] Botões pela `ActionBar` (100%, 30/70, menu), com carregamento no envio.
- [ ] Nenhum botão solto: cada ação está no rodapé, na barra da tabela, no `PageHeader`, no `CardHeader actions` ou no menu da linha.
- [ ] Texto orientativo só em `help` (ícone de informação ao lado do título, que abre modal); subtítulos descrevem, não instruem.
- [ ] Orientação abaixo do campo dentro do limite do `span`, em uma linha, em no máximo metade dos campos da seção, sem repetir o rótulo; limite, formato e contador dentro do componente.
- [ ] Formulário: rótulo acima, obrigatório marcado, erro abaixo do campo, `gap="fields"` entre campos, 3 campos por linha (CEP e CNPJ primeiro).
- [ ] Tabela: seleção primeiro, situação antes das ações, ações por último, números à direita, vazio, carregando e erro.
- [ ] Cores só por token semântico; contraste AA conferido em `/tokens`, nos modos claro e escuro.
- [ ] Ícone de feedback da marca em toast, alert, confirmação, vazio e erro.
- [ ] `npm run check:rules`, `npm run lint`, `npm run typecheck` e `npm run test:layout` passando.
- [ ] Story no Storybook para o componente e para cada prop relevante.
