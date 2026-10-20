# Como aplicar o boilerplate

Guia para levar o design system Rendra a um sistema novo ou a um sistema que já existe. Leia antes o [DESIGN_RULES.md](../DESIGN_RULES.md).

## Pré-requisitos

- Node.js 22 ou mais recente e npm 10 ou mais recente.
- Para os testes de layout: `npx playwright install chromium`.

O resto depende do caminho:

- **Pelo pacote npm** (caminho 1b, ou a alternativa do caminho 2): **React 19.3 ou mais recente**, `react-dom` na mesma versão e `radix-ui` 1.6.7 ou mais recente; `typescript` é opcional, só para o comando `npx @rendra-ui/web trocar`. Não exige Tailwind CSS no projeto de destino: o CSS já sai compilado.
- **Clonando o repositório** (caminho 1a) ou **copiando os arquivos** (caminho 2): projeto em **React 18 ou 19 com TypeScript**. Com Vite, a adoção é direta. Em outros bundlers (Next.js, por exemplo), é preciso adaptar a importação de SVG como componente (hoje via `vite-plugin-svgr`) e o alias `@/`. Tailwind CSS **v4**; em projeto com Tailwind v3, a migração para a v4 vem antes (veja "Projeto existente").

## Caminho 1: projeto novo

Dois jeitos de trazer o boilerplate: **clonar o repositório** (código-fonte inteiro, para mexer em qualquer coisa) ou **instalar o pacote npm** (`import` dos componentes já compilados, sem o boilerplate em volta). Use o pacote quando quiser só os componentes numa aplicação que já existe; use o clone para começar um sistema do zero com o AppShell, as telas base e o Storybook.

### 1a. Clonando o repositório (no prompt de migração, `docs/PROMPT_MIGRACAO.md`, é o Caminho C, "clonando o repositório e refazendo")

1. Copie este repositório para a pasta do novo projeto (clone ou "Use this template"). Apague a pasta `.git` se quiser um histórico novo.
2. `npm install`.
3. Troque a marca (seção "Troca de marca").
4. Apague o que é só demonstração:
   - `src/mocks` e as telas de exemplo em `src/pages/app` que não servirem (mantenha as que forem ponto de partida).
   - Os templates alternativos, se não forem usados: a pasta `src/brand/examples`, os `@import` correspondentes em `src/styles/themes.css` e as importações em `src/brand/index.ts`.
   - Se o layout do projeto for fixo: `userConfigurable={false}` na prop do `<AppShell>`, em `src/app/app-layout.tsx`. Ele só faz o AppShell ignorar o layout que o usuário guardou no navegador; para tirar do menu do avatar o Tema, o Template ou o Layout, use `userMenu={{ theme: false, template: false, layout: false }}` (cada chave é opcional).
5. Ajuste o menu em `src/config/navigation.ts` e as rotas em `src/routes.tsx` e `src/config/routes-list.ts`.
6. Rode `npm run typecheck`, `npm run lint`, `npm run check:rules`, `npm test`, `npm run test:layout` e `npm run test:a11y`.

### 1b. Pelo pacote npm (serve também para o Caminho 2, projeto existente, sem copiar arquivos-fonte; no prompt de migração, é o Caminho A)

1. Instale o pacote (`@rendra-ui/web`, escopado na organização npm `rendra-ui`) e os peers: `react`, `react-dom` e `radix-ui`.
2. Importe o CSS uma vez, na entrada do app: `import '@rendra-ui/web/tokens.css'`, `import '@rendra-ui/web/base.css'` e `import '@rendra-ui/web/components.css'`.
3. Importe os componentes da entrada principal (`import { Button, AppShell } from '@rendra-ui/web'`) e, se usar react-router, a ponte do subcaminho próprio: `import { RendraRouterBridge } from '@rendra-ui/web/router-bridge'`. Os componentes pesados (`document-viewer`, `rich-text-editor`, `chart`, `widget-grid`) têm subcaminho próprio, para não pesar o pacote de quem não usa.
4. A CLI, sempre como `npx @rendra-ui/web codigos`, `npx @rendra-ui/web auditar` e `npx @rendra-ui/web trocar` (o nome `rendra` no npm pertence a outro pacote), e o detalhe completo de cada entrada do pacote estão no `README.md`.

## Caminho 2: projeto existente (no prompt de migração, é o Caminho B, "copiando os arquivos-fonte")

A ideia é trazer a base e depois migrar tela por tela, sem parar o projeto.

1. **Dependências.** Instale as do `package.json` deste repositório: Tailwind v4, Radix, class-variance-authority, tailwind-merge, clsx, lucide-react, React Hook Form, Zod, IMask, React Day Picker, date-fns, TanStack Table v8, Recharts, Sonner, cmdk e Playwright. Se o projeto usa Tailwind v3, rode antes o guia oficial de migração para a v4 (`npx @tailwindcss/upgrade`). Alternativa sem copiar o código-fonte: instalar o pacote npm (seção "Caminho 1: projeto novo", 1b).
2. **Base visual.** Copie `src/styles`, `src/brand`, `src/lib`, `src/hooks`, `src/components` e `src/catalog` (componente de `src/components/ui` importa `resolveCatalogCode` de lá; copiar sem essa pasta quebra o build). Importe `src/styles/globals.css` na entrada do app, envolva o app com `BrandProvider` e coloque o `<Toaster />` na raiz (veja `src/app.tsx`). A montagem também precisa do roteador: com react-router, envolva as rotas com `<RendraRouterBridge>` (`src/components/rendra-router-bridge.tsx`); com outro roteador, escreva um `RendraProvider` próprio (mesma peça, outra ponte).
3. **Regras e testes.** Copie `scripts/check-design-rules.mjs` com a pasta `scripts/lib` inteira (`help-length.ts` e `var-prefix.ts`, que só reexportam as regras de `src/cli`) e a pasta `src/cli` (o script é um chamador fino de `src/cli/auditar-tudo.ts`, onde moram as 17 regras; sem ela, `npm run check:rules` quebra). Os imports de `src/cli` levam a extensão `.ts` porque o Node roda o script direto: se o `tsconfig` do projeto checa `src/cli`, ative `allowImportingTsExtensions`, `playwright.config.ts`, `tests/`, `eslint.config.js`, `.prettierrc.json` e `DESIGN_RULES.md`, e os scripts do `package.json`. Não copie o `CLAUDE.md` deste repositório: ele traz a matriz de modelos e depende do `AGENTS.md` ao lado, que quebra sozinho num projeto que só recebeu os arquivos-fonte. Se este projeto também for seguir a matriz de modelos, adapte um arquivo de agente enxuto (o resumo do `.github/copilot-instructions.md` deste repositório é um bom ponto de partida) em vez de copiar o `CLAUDE.md` inteiro.
4. **Convivência.** A escala do Tailwind foi zerada de propósito. Se o CSS antigo usa classes como `p-5` ou `bg-blue-500`, elas deixam de funcionar. Migre tela por tela e, se precisar, mantenha o CSS antigo isolado no arquivo de cada tela enquanto a migração acontece.
5. **Migração** (seção "Ordem de migração").

## O CSS do pacote e as classes das suas telas

Vale para quem instalou o pacote (`1b`) e tem telas próprias. O CSS do pacote sai compilado (`tokens.css`, `base.css`, `components.css`) e **não é o Tailwind inteiro**: o `components.css` traz só as classes que os componentes do pacote usam por dentro (o build escaneia apenas os arquivos publicados, nunca as telas do boilerplate nem as suas) e as classes `@utility` do Rendra listadas abaixo, que entram sempre. Classes de composição que você escreve nas suas telas, como `p-12`, `max-w-sm`, `flex-col` ou `mb-0`, só existem se algum componente do pacote as usa por dentro: não conte com elas.

**Host com Tailwind v4.** Deixe o Tailwind do host escanear as suas telas, que ele gera as classes de composição. Para as telas terem o mesmo ritmo dos componentes, reproduza a escala do Rendra no `@theme` do host (os valores estão em `src/styles/globals.css`; o Rendra zera a escala padrão do Tailwind):

- espaço: `0`, `px` (1px), `1` (0,25rem), `2` (0,5rem), `3` (0,75rem), `4` (1rem), `6` (1,5rem), `8` (2rem), `12` (3rem), `16` (4rem) e `24` (6rem). Um `p-5` ou `gap-7` do Tailwind padrão não existe na escala do Rendra: confira a escala do host contra esta antes de migrar uma tela;
- raios por papel, ligados ao formato do modelo ativo: `--radius-control`, `--radius-surface`, `--radius-item`, `--radius-block` e `--radius-avatar` valem `var(--rendra-shape-control)`, `var(--rendra-shape-surface)` e assim por diante;
- cores e fonte, apontando para as variáveis do `tokens.css`: `--color-primary: var(--rendra-primary)`, `--color-card: var(--rendra-card)`, `--font-sans: var(--rendra-brand-font)` e as demais da mesma forma;
- tipografia: sete tamanhos (`xs` 0,75rem, `sm` 0,875rem, `base` 1rem, `lg` 1,0625rem, `xl` 1,125rem, `2xl` 1,3125rem, `3xl` 1,5rem, os três últimos ampliam a partir de `md`) e três pesos, 400, 500 e 600.

**Host sem Tailwind.** Escreva o CSS de composição das suas telas à mão. O `tokens.css` só expõe variáveis `--rendra-*` (cores, raios por papel `--rendra-shape-*`, elevação, fonte da marca); a escala de espaço e de tipografia **não** vira variável (os valores já estão dentro das classes compiladas; só as dez que mudam de valor a partir de `md`, como as alturas de controle, o cabeçalho e os títulos `xl` a `3xl`, seguem como variável, renomeada para `--rendra-*`), então copie da lista acima o que precisar e use as variáveis `--rendra-*` para cor, raio e fonte.

`@utility` do Rendra (sempre presentes): `label-case`, `bg-gradient-brand`, `bg-gradient-soft`, `bg-gradient-accent`, `bg-sidebar-brand`, `pb-safe`, `pt-safe`, `mask-status-cutout`, `anim-delay-1`, `anim-delay-2`, `focus-ring`, `w-popover`, `w-popover-sm`, `w-sidebar-drawer`, `max-w-popover`, `pb-safe-inset`, `max-h-command`, `w-trigger`, `max-h-sheet`, `grid-actions-2`, `grid-actions-3`, `w-progress`, `progress-slide`, `bg-swatch`, `swatch-check-light`, `swatch-check-dark`, `grid-cols-otp`, `calendar-event`, `calendar-now`, `grid-cols-week`, `grid-cols-week-time`, `w-ratio`, `bg-fill`, `gauge-needle`, `clip-trapezoid`, `h-board`, `scrollbar-subtle`, `field-sizing-content`, `h-autosize`, `w-sheet-30`, `w-sheet-40`, `w-sheet-50`, `w-sheet-75`, `grid-chat-2`, `grid-chat-3`, `w-kanban-col`, `wave-bar`, `h-var`, `aspect-crop`, `cropper-image`, `size-var`.

Uma `@utility` nova em `src/styles/globals.css` entra nesta lista no mesmo commit: o teste `src/lib/utilities-doc.test.ts` falha se a lista e o arquivo divergirem.

## Limpeza do clone

Só se aplica a quem clonou o repositório inteiro (caminho 1a, ou o caminho "clone e refazer" de uma migração, `docs/PROMPT_MIGRACAO.md`). O clone nasce publicável como o pacote `@rendra-ui/web`: antes de considerar o projeto pronto, troque ou remova o que só faz sentido no repositório do Rendra.

- **Identidade de pacote**, no `package.json` do projeto: `name`, `main`, `types`, `bin`, `exports`, `files`, `sideEffects`, `publishConfig` e `peerDependencies`.
- **Publicação**: apague `.github/workflows/publish.yml`, `registry.json`, `src/catalog/registry.test.ts` (o teste que lê o `registry.json`), a pasta `bin/`, `scripts/build-registry.mjs`, `scripts/build-lib.mjs`, `scripts/fix-dts-aliases.mjs` e `scripts/verify-pack.mjs`, e remova do `package.json` os scripts `verify:pack` e `build:lib` e os arquivos `vite.lib.config.ts` e `tsconfig.build.json`.
- **CI**: em `.github/workflows/ci.yml`, tire os passos `npm run build:lib`, `npm run verify:pack` e o par `npm run registry:build` seguido de `git diff --exit-code registry.json` (job "qualidade"). Sem isso, o primeiro push chega vermelho: esses passos chamam scripts que acabaram de ser apagados. `npm run test:css-layers` (job "navegador") não depende do pacote publicado, testa a camada CSS do app rodando (`npm run dev`): mantenha.
- **Skill de migração parcial**: apague a pasta `skills/`, que só serve para migrar sistemas de terceiros para o Rendra.
- **README e histórico**: troque o `README.md` pelo do projeto do usuário, mantendo a seção de crédito do Rendra; recomece o `CHANGELOG.md`.
- **SEO**: adapte os textos de `src/config/seo.ts` e o `index.html` (título, descrição, Open Graph) para o produto do usuário.
- **Página de apresentação do Rendra**: o clone herda a página do Rendra e a montagem do site que a publica na raiz do GitHub Pages. Apague `docs/index.html`, `docs/videos/`, `docs/icon.svg`, `docs/og-image.png`, `docs/google9146e14a87f8288f.html`, `scripts/pages-build.mjs`, `scripts/pages-stage.mjs`, `scripts/og-image.mjs`, `scripts/lib/pages-stage.ts`, `scripts/lib/pages-env.ts`, `scripts/lib/redirect-stubs.ts`, `scripts/lib/og-html.ts` e os testes `scripts/lib/{pages-stage,pages-env,redirect-stubs,og-html,site-config,site-tokens,site-images,readme-links,icon-svg,clone-cleanup}.test.ts`, mais `tests/site.spec.ts` e `playwright.site.config.ts`. Mantenha `scripts/lib/sitemap.ts`, `scripts/lib/html.ts` e os testes deles: o `scripts/seo-build.mjs`, que gera as páginas, o sitemap e o robots da demo do próprio clone, importa os dois. Tire do `package.json` os scripts `pages:build`, `pages:stage`, `docs:og-image` e `test:site` (e a dependência `serve`), o passo `test:site` do `.github/workflows/ci.yml` e as referências a esses arquivos no `vite.config.ts` (pisos de cobertura, mantendo `sitemap` e `html` no piso) e no `tsconfig.node.json`. Troque `public/og-image.png` pela imagem social do seu produto: a atual leva o selo e o nome do Rendra.
- **GitHub Pages**: o `pages.yml` do Rendra publica a página do Rendra na raiz do site e a demo em `/demo/`. No clone, remova a página (item acima) ou o workflow, e ajuste `pages.yml` se quiser publicar o próprio demo.
- **Regras só do Rendra**: apague `src/lib/utilities-doc.test.ts`, que exige que toda `@utility` do `globals.css` esteja na lista do guia do Rendra (no seu produto, `@utility` nova é sua e não entra nessa lista), e `scripts/lib/texto-publico.test.ts`, que barra "grátis", "gratuito", "para sempre" e "sem assinatura" no `src/config/seo.ts` e no `index.html`: é regra de texto do dono do Rendra, não do seu produto, e deixaria o `npm test` vermelho se o seu texto usar essas palavras.
- **Mantenha**: o `LICENSE`, o aviso de copyright e a autoria do Rendra (a licença MIT exige os dois; o crédito visível na interface é opcional, veja a seção "Crédito 'Feito com Rendra' e licença" do `AGENTS.md`).

## Troca de marca, passo a passo

A cor tem três camadas (detalhe em "Cor: três camadas", no `DESIGN_RULES.md`): o **modelo** (formato e fonte: Safira, Equilíbrio ou Aurora), a **paleta** (4 cores e o degradê da marca) e o **sistema** (neutros e cores de erro, sucesso, alerta e informação, que não mudam). Trocar a marca é trocar a paleta, e às vezes o modelo; o sistema fica.

| Passo | Arquivo                     | O que fazer                                                                                                                                                                                                                                          |
| ----- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `src/brand/palettes.ts`     | Cores da marca: `primary`, `primaryHover`, `secondary`, `secondaryHover` e `gradient` (3 cores, da luz ao fundo). Opcional: `onPrimary` e `onSecondary` (`'light'` força texto branco). Deixe a paleta do projeto em primeiro lugar: ela é a padrão. |
| 2     | Terminal                    | `npm run palettes:build`: gera `src/styles/palettes.css` com o claro, o escuro e todo o resto, com AA conferido. Os ajustes de contraste aparecem no terminal e no comentário do arquivo.                                                            |
| 3     | `src/styles/theme.css`      | Só se o modelo mudar: `--rendra-radius` e a fonte (os `@font-face` apontam para `src/brand/assets/fonts`; máximo de 3 pesos). Neutros e cores de sistema ficam como estão.                                                                           |
| 4     | `src/brand/brand.config.ts` | Nome do produto, empresa, frase do login, `shape` (`square`, `rounded`, `pill`), `sidebarLogo` e `labelStyle` (`'discreto'` ou `'normal'`, o estilo do rótulo dos campos; escreve `data-label` no `<html>`).                                         |
| 5     | `src/brand/assets`          | `logo-light.svg` (fundo claro), `logo-dark.svg` (fundo escuro), `symbol.svg` (em `fill="currentColor"`) e `favicon.svg`. Para ícones de feedback próprios, preencha `feedbackIcons` no `brand.config.ts`.                                            |
| 6     | Navegador                   | Abra `/tokens` nos modos claro e escuro: nenhum selo de contraste pode marcar "falha". Abra `/componentes` e confira.                                                                                                                                |

Para adotar um dos outros modelos como marca ativa, copie `src/brand/examples/<modelo>/theme.css` (fonte e raio) sobre a parte de modelo de `src/styles/theme.css`, troque o seletor `:root[data-brand='<id>']` por `:root` e copie `brand.config.ts` e `assets` sobre `src/brand`.

### White label: marca de cada cliente em tempo de execução

Quando cada cliente (tenant) cadastra a própria marca, não há build por cliente. Leia as 4 cores e o degradê da configuração do tenant e aplique na entrada do app:

```ts
import { applyPalette } from '@/brand'

const tenant = await carregarTenant() // { id, nome, cores } da sua API
applyPalette({
  id: tenant.id,
  name: tenant.nome,
  primary: tenant.cores.primaria,
  primaryHover: tenant.cores.primariaHover,
  secondary: tenant.cores.secundaria,
  secondaryHover: tenant.cores.secundariaHover,
  gradient: tenant.cores.degrade, // [luz, meio, fundo]
})
document.documentElement.dataset.palette = tenant.id
```

`applyPalette` gera exatamente o que o build geraria (claro, escuro e AA conferido) e devolve os ajustes feitos, para o painel de cadastro mostrar ao parceiro quando uma cor precisou ser escurecida.

#### `createTheme`/`applyTheme`: os três modos (C5)

`applyPalette` continua existindo e funcionando como acima; `createTheme` é a mesma ideia, só que como uma função pura (sem tocar o DOM, compatível com SSR) e com mais controle sobre o resultado. Três modos de entrada:

- **gerado**: as mesmas 4 cores e o degradê de sempre; passa por `createPalette` por baixo, com o contraste AA corrigido automaticamente. É o modo equivalente ao `applyPalette` do exemplo acima.
- **explícito**: você já tem os tokens prontos (por exemplo, migrando de outro design system) e informa cada um deles, pelo nome semântico, sem o prefixo `--rendra-` (`primary`, `primaryForeground`, `sidebar`...). Nada é recalculado; o contraste só é relatado. Use `enforceContrast: true` para o `createTheme` ajustar sozinho os pares que falham.
- **misto**: sementes (como no gerado) mais sobrescritas pontuais; a sobrescrita sempre vence.

O exemplo abaixo é do clone (caminho 1a), que reexporta a API de marca por `@/brand`. Pelo pacote npm (caminho 1b), o resto do código é igual, trocando só o import: `import { applyTheme, createTheme } from '@rendra-ui/web'`.

```ts
import { applyTheme, createTheme } from '@/brand'

const tenant = await carregarTenant()
const theme = createTheme({
  id: tenant.id,
  name: tenant.nome,
  mode: 'gerado',
  seed: {
    primary: tenant.cores.primaria, // aceita hex, rgb(), hsl() ou "H S% L%"
    primaryHover: tenant.cores.primariaHover,
    secondary: tenant.cores.secundaria,
    secondaryHover: tenant.cores.secundariaHover,
    gradient: tenant.cores.degrade,
  },
})

applyTheme(theme) // reproduz applyPalette: <style> em document.head, :root[data-palette]
document.documentElement.dataset.palette = theme.id

// theme.report: um item por par de contraste conferido (token, background, foreground,
// ratio, passesAA, mode). theme.adjustments: os ajustes de fato aplicados, claro e escuro.
```

Passar `theme` direto para o `<BrandProvider theme={theme}>` faz a mesma coisa (aplica e mantém atualizado quando o tema mudar), sem exigir que `tenant.id` esteja cadastrado em `src/brand/palettes.ts`. Para aplicar o tema num contêiner específico em vez do documento inteiro (mais de uma marca na mesma página), use `applyTheme(theme, { target: elemento })`, que escopa por `[data-rendra-root]` em vez de `:root` (mesma peça que o CSS em camadas usa, seção seguinte).

O `BrandProvider` também aceita `mode`/`onModeChange`, `brandId`/`onBrandIdChange` e `paletteId`/`onPaletteIdChange` para controlar o estado por fora (o mesmo padrão de um componente controlado do React), e `storage` para trocar onde a preferência é guardada (`{ get(key), set(key, valor) }`, ou `false` para desligar a persistência). Sem nenhuma dessas props, o comportamento é o de sempre: estado próprio, com `localStorage`.

#### Variáveis `--rendra-*` semânticas: contrato público

Toda variável abaixo é o nome final, versionado: renomear qualquer uma delas é mudança major (`CHANGELOG.md`). São as mesmas chaves que `createPalette`, `createTheme` e `palettes.css` emitem; o modo explícito de `createTheme` aceita o mesmo nome, sem o prefixo `--rendra-` e em camelCase (`primaryForeground` em vez de `--rendra-primary-foreground`).

| Variável                                  | Papel                                                              |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `--rendra-primary`                        | Preenchimento da cor primária                                      |
| `--rendra-primary-foreground`             | Texto sobre a primária                                             |
| `--rendra-primary-hover`                  | Primária no hover                                                  |
| `--rendra-primary-hover-foreground`       | Texto sobre a primária no hover                                    |
| `--rendra-secondary`                      | Preenchimento da cor secundária                                    |
| `--rendra-secondary-foreground`           | Texto sobre a secundária                                           |
| `--rendra-secondary-hover`                | Secundária no hover                                                |
| `--rendra-secondary-hover-foreground`     | Texto sobre a secundária no hover                                  |
| `--rendra-primary-soft`                   | Fundo suave da primária (alert, badge, linha selecionada)          |
| `--rendra-primary-soft-foreground`        | Texto sobre o fundo suave                                          |
| `--rendra-primary-text`                   | Primária usada como cor de texto (link, destaque)                  |
| `--rendra-ring`                           | Anel de foco                                                       |
| `--rendra-accent` / `-foreground`         | Destaque neutro e o texto sobre ele                                |
| `--rendra-sidebar`                        | Fundo sólido da sidebar                                            |
| `--rendra-sidebar-image`                  | Degradê da sidebar                                                 |
| `--rendra-sidebar-foreground`             | Texto sobre a sidebar                                              |
| `--rendra-sidebar-muted-foreground`       | Texto secundário sobre a sidebar                                   |
| `--rendra-sidebar-border`                 | Borda sobre a sidebar                                              |
| `--rendra-sidebar-accent`                 | Fundo do hover de um item da sidebar                               |
| `--rendra-sidebar-active` / `-foreground` | Fundo e texto do item ativo da sidebar                             |
| `--rendra-sidebar-indicator`              | Indicador do item ativo                                            |
| `--rendra-gradient-brand` / `-foreground` | Degradê forte (sidebar, painel do login, erro) e o texto sobre ele |
| `--rendra-gradient-soft`                  | Degradê suave (destaque de superfície)                             |
| `--rendra-gradient-accent`                | Degradê fino (barra de progresso, linha de gráfico)                |
| `--rendra-chart-1` a `--rendra-chart-5`   | Paleta de gráficos                                                 |
| `--rendra-shadow-color`                   | Cor da sombra, sempre tripleta RGB (`R G B`), nunca cor completa   |
| `--rendra-background` / `-image`          | Fundo da tela (o `-image` só existe no escuro)                     |
| `--rendra-foreground`                     | Texto principal                                                    |
| `--rendra-card` / `-foreground`           | Card e o texto sobre ele                                           |
| `--rendra-popover` / `-foreground`        | Painel flutuante e o texto sobre ele                               |
| `--rendra-muted` / `-foreground`          | Fundo neutro discreto e o texto sobre ele                          |
| `--rendra-border`                         | Borda padrão                                                       |
| `--rendra-input`                          | Borda de campo                                                     |
| `--rendra-field`                          | Fundo de campo                                                     |
| `--rendra-overlay`                        | Fundo escurecido atrás de modal/drawer                             |

As cores de sistema (`--rendra-destructive`, `--rendra-success`, `--rendra-warning`, `--rendra-info`, cada uma com `-hover`, `-foreground`, `-soft` e `-soft-foreground`) e os tokens de forma/rótulo (`--rendra-shape-*`, `--rendra-label-*`, `--rendra-help-*`, `--rendra-elevation-*`, `--rendra-meter-*`) são fixos do sistema (`src/styles/theme.css` e `src/styles/globals.css`), iguais em todas as paletas: não fazem parte do contrato de `createTheme`.

## Ordem de migração

Migre de fora para dentro, com uma verificação ao fim de cada passo:

1. **Tokens e tema.** O projeto passa a ter `theme.css`, `palettes.css` (gerado das 4 cores e do degradê da marca) e `globals.css`. Confira `/tokens`.
2. **AppShell.** Troque o layout antigo por um `AppLayout` (como `src/app/app-layout.tsx`) que monta o `<AppShell>` com o menu de `navigation.ts` e o resto das props (layout, usuário, menu do avatar, ações rápidas, notificações), dentro do `<RendraRouterBridge>` na raiz das rotas. O header fixo e a rolagem única do `<main>` já resolvem boa parte dos problemas de layout.
3. **Formulários e ações.** Troque inputs, selects e botões pelos componentes únicos. Use `Form`, `FormField` e `ActionBar`. Nenhum botão fica solto: cada ação vai para o rodapé fixo, a barra da tabela, o `PageHeader actions`, o `CardHeader actions` ou o menu da linha. Textos de instrução soltos na tela e botões de "informações" viram `help` ao lado do título (ícone que abre um modal).
4. **Listagens.** Troque as tabelas pela `Table`, com `toolbar`, colunas com `mobile` e estados.
5. **Feedback.** Troque alertas, toasts e modais antigos por `Alert`, `toast`, `Modal` e `Drawer`, e use o ícone de feedback da marca.
6. **Telas.** Refaça cada tela com as primitivas (`Container`, `Stack`, `Grid`, `Section`, `PageHeader`), começando pelas mais usadas.
7. **Limpeza.** Remova o CSS e os componentes antigos, depois rode `check:rules`, `lint`, `test`, `test:layout` e `test:a11y`.

Cada tela migrada entra em `src/routes.tsx` e em `src/config/routes-list.ts` e passa a ser verificada pelos testes.

## Códigos do catálogo e a CLI

Cada componente do design system, e cada variante visual relevante, tem um código de catálogo (`src/catalog/components.ts`, formato `ABA-001`), escrito no atributo `data-rendra` do elemento raiz. É o mesmo código usado no `docs/BRIEFING_MODELO.md` e mostrado na vitrine `/componentes`. A lista completa está sempre em `src/catalog/components.ts`, na vitrine ou em `rendra codigos` (nunca copie a lista para outro documento: ela muda a cada componente novo).

O pacote npm também traz a CLI `rendra`, com três comandos (uso, sem detalhe interno; completo no `README.md`). Sem instalar o pacote, use `npx @rendra-ui/web <comando>`; `npx rendra <comando>` só funciona com o pacote instalado neste projeto, porque o nome `rendra` no npm pertence a outro pacote:

- `npx @rendra-ui/web codigos`: lista o catálogo de códigos.
- `npx @rendra-ui/web auditar`: roda no projeto de destino as sete regras genéricas de design (cor fixa, valor arbitrário, estilo inline, fonte fixa, `100vh`, degrau fora da escala, raio fixo). Com `--all`, roda as mesmas 17 regras do `check:rules`; `--ignore src/brand,src/styles` pula pastas, e um `rendra.config.json` na pasta do projeto guarda pastas, ignorar, regras desligadas, pastas de marca e de telas (detalhe no `README.md`).
- `npx @rendra-ui/web trocar <DE> <PARA>`: troca a variante de um componente pelo código do catálogo em todas as telas do projeto (ex.: `npx @rendra-ui/web trocar ABA-001 ABA-002` reescreve `variant="line"` para `variant="pill"` em todo `<Tabs>`), com `--dry-run` para simular; prop dinâmica ou troca entre componentes diferentes só entram numa lista para revisão manual, nunca são reescritas sozinhas. Não troca modelo, paleta nem tema: isso é o código de modelo (`T1-C4-M5`, `?codigo=` e `applyModelCode`, seção 3.0 do `docs/BRIEFING_MODELO.md`).

## Testes de layout

```bash
npm run test:layout                         # todas as rotas, 5 larguras, 3 templates, claro e escuro
npm run test:a11y                           # acessibilidade (axe-core) em todas as rotas
TEMPLATES=safira npm run test:layout        # só um template (mais rápido)
npx playwright test -g "safira @ 360px"     # só uma largura
npm run test:layout:report                  # relatório com as falhas
```

O teste falha se a página tiver rolagem horizontal, se algum elemento passar da largura da tela, se algum clicável tiver menos de 44x44px no mobile, ou se houver erro de JavaScript. As capturas ficam em `screenshots/<template>/<rota>-<largura>.png`. O teste sobe o servidor sozinho se ele não estiver rodando.

## Problemas comuns

| Sintoma                                                    | Causa e solução                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uma classe como `p-5`, `w-64` ou `gap-7` "não funciona"    | O degrau não existe na escala. Use um degrau permitido ou crie um token nomeado em `globals.css`. O `check:rules` aponta o arquivo e a linha.                 |
| Cor preta ou cinza num gráfico ou num estilo em JavaScript | Foi usado `var(--color-*)`, que é inline no Tailwind e não existe no CSS. Use `var(--rendra-primary)`, `var(--rendra-chart-1)` etc.                           |
| Rolagem horizontal no celular                              | Algum elemento com largura fixa ou texto sem quebra. Use `min-w-0` no flex, `truncate` ou `line-clamp`, e confira no relatório do teste qual elemento passou. |
| Alvo de toque menor que 44px                               | Link de texto ou ícone pequeno. Use `min-h-touch` e `min-w-touch` no mobile, ou amplie com pseudo-elemento e marque `data-touch="expanded"`.                  |
| Zoom automático ao focar um campo no iPhone                | Fonte menor que 16px no campo. Use os componentes de campo, que já têm `text-base md:text-sm`.                                                                |
| Selo "falha" na página `/tokens`                           | Contraste abaixo de AA. Escureça o fundo ou troque a cor do texto no `theme.css`.                                                                             |
| SVG da marca não muda de cor no ícone de feedback          | O símbolo precisa de `fill="currentColor"`, sem cor fixa.                                                                                                     |
| Cores de um template aparecendo em outro                   | O template alternativo não definiu a variável nos dois modos. Toda variável de `:root[data-palette]` precisa existir também no bloco `.dark`.                 |
| O `npm install` falha com `ERESOLVE` no typescript-eslint  | O projeto usa TypeScript 5.9. O TypeScript 7 ainda não é suportado pelo typescript-eslint.                                                                    |

## Checklist de aceite

- [ ] `npm run typecheck`, `npm run lint` e `npm run check:rules` sem erro.
- [ ] `npm run test:layout` e `npm run test:a11y` com 100% dos testes passando.
- [ ] `/tokens` sem nenhum selo "falha" nos modos claro e escuro.
- [ ] Marca trocada só em `theme.css`, `palettes.ts`, `brand.config.ts` e `src/brand/assets`.
- [ ] Nenhum componente duplicado nem versão mobile separada.
- [ ] Todas as telas no AppShell, com o título no header e o conteúdo nas primitivas.
- [ ] Formulários longos em página ou wizard; drawer até cerca de 12 campos; modal até 3.
- [ ] Toda listagem com a `Table`, a barra de ferramentas no mesmo card e os estados vazio, carregando e erro.
- [ ] Revisão visual das capturas em 360px e 1280px.
- [ ] Storybook abrindo sem erro (`npm run build-storybook`).
