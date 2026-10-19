# AGENTS.md

Instruções para qualquer agente de IA de desenvolvimento (Codex, Claude Code, Cursor, GitHub Copilot, Gemini, Windsurf, Jules e outros) que abrir este repositório ou for apontado para ele.

Este é o **Rendra Design System**: um design system completo e boilerplate React (tokens, três modelos, quatro paletas, componentes, AppShell, telas base, Storybook e testes de layout). Ele serve para **criar sistemas novos** e para **migrar o layout de sistemas existentes**.

## Em um minuto

- **O que é:** design system e boilerplate React (Vite, TypeScript, Tailwind v4, Radix e shadcn/ui copiados para `src/components/ui`). Serve para quatro coisas: **começar um sistema novo** a partir deste repositório, **migrar o layout** de um sistema existente, **trazer componentes** para outro projeto pelo registry (`npx shadcn@latest add`) ou pelo **pacote npm** (import direto dos componentes e do CSS, mais a CLI, sempre como `npx @rendra-ui/web <comando>` (o nome `rendra` no npm pertence a outro pacote), para o catálogo de códigos, a auditoria das regras (`auditar [pasta...] [--all] [--ignore a,b]`, com `rendra.config.json` opcional) e a troca de variante por código; detalhe completo no `README.md`).
- **Cor em três camadas** (a parte que mais confunde; leia a seção "Cor: três camadas" do `DESIGN_RULES.md`):
  1. **Modelo**: formato e fonte. São só três: Safira (quadrado), Equilíbrio (intermediário) e Aurora (arredondado).
  2. **Paleta**: a cor da marca, que é só **4 cores** (primária, hover da primária, secundária, hover da secundária) e o **degradê da marca**. Todo o resto é gerado com AA por `createPalette`; nunca edite `palettes.css` à mão.
  3. **Sistema**: neutros e cores de erro, sucesso, alerta e informação. Fixos, iguais em todas as paletas.
- **Onde mexer:** marca em `src/brand/palettes.ts` (cores), `src/styles/theme.css` (modelo) e `src/brand/brand.config.ts` (nome, logotipo, `labelStyle` do rótulo) e `src/brand/assets`; menu em `src/config/navigation.ts`; layout, usuário, menu do avatar, ações rápidas e notificações do AppShell, todos por prop, em `src/app/app-layout.tsx` (o padrão de `layout` fica em `src/components/app-shell/layout.ts`, reexportado por `src/config/layout.ts`); rotas em `src/routes.tsx` e `src/config/routes-list.ts`.
- **O que não se faz:** componente paralelo (`SelectSimples`), valor fora da escala, cor fixa, estilo inline, botão solto, texto de instrução no corpo da tela, variável CSS do Rendra sem o prefixo `--rendra-`. O `npm run check:rules` barra tudo isso (e `auditar --all` faz o mesmo num projeto de destino); a lista completa das verificações está no `DESIGN_RULES.md`.
- **Catálogo de códigos:** cada componente e cada variante visual relevante têm um código (`ABA-001`, `BTN-006`...), no atributo `data-rendra` do elemento raiz. Lista sempre atualizada em `src/catalog/components.ts`, na vitrine `/componentes` ou em `npx @rendra-ui/web codigos`, nunca copiada para outro documento.
- **Como saber que terminou:** `npm run typecheck`, `npm run lint`, `npm run check:rules`, `npm test` (unitários e de componente, com cobertura mínima por arquivo), `npm run test:layout` e `npm run test:a11y` passando.

## Leitura obrigatória

1. Este arquivo, inteiro.
2. [`DESIGN_RULES.md`](DESIGN_RULES.md): as regras de interface. Elas valem mais do que qualquer hábito seu. Uma alteração que não as segue está errada, mesmo que funcione.
3. [`README.md`](README.md) e, quando for aplicar em outro projeto, [`docs/COMO_APLICAR.md`](docs/COMO_APLICAR.md).
4. Se o trabalho seguir a matriz de modelos (levantamento, plano, validação e execução por papéis diferentes), leia também o [`CLAUDE.md`](CLAUDE.md): a matriz de modelos.

## Fluxo de início (siga antes de qualquer alteração)

### Passo 1: descobrir o estado

Descubra primeiro em qual dos quatro ramos você está.

Primeiro: se você não consegue rodar comandos nem gravar arquivos (chat sem terminal), vá direto ao ramo (d); nunca passe comandos para a pessoa rodar.

**(a) Você já está numa pasta de projeto** (um clone do Rendra que virou o projeto do usuário, ou este próprio repositório), sem que ninguém tenha apontado você para outro sistema.

- Confira se **`docs/BRIEFING.md` existe na máquina** (é um arquivo fora do controle de versão, veja `.gitignore`: não aparece no `git status` nem no histórico, então a checagem é sempre no disco, nunca por comando de git).
- Existindo e com status "confirmado": leia o briefing e siga a partir do passo 5, na etapa em que o trabalho parou.
- Existindo e "rascunho": retome o briefing de onde parou.
- Não existindo: siga o passo 2. Se a pessoa colar um briefing pronto na conversa, grave em `docs/BRIEFING.md` com o status que ele traz e siga o parágrafo "Briefing colado" abaixo, sem refazer as perguntas.

**(b) Você foi apontado para começar um projeto novo a partir do link do repositório**, e o usuário ainda não tem uma pasta de projeto. Antes de perguntar qualquer coisa do briefing, faça a parte técnica por ele, nesta ordem:

1. Clone https://github.com/bsmagalhaes/rendra-ui-web (ou o link que o usuário passou) para uma pasta com o nome do projeto dele.
2. Desligue o vínculo com o repositório do Rendra: apague a pasta `.git` e rode `git init`. Pergunte se o usuário quer ligar a pasta a um repositório dele no GitHub.
3. Confira Node 22 ou mais recente (`node -v`).
4. `npm install`.
5. `npx playwright install chromium` (uma vez, para os testes de layout).
6. `npm run dev` e informe ao usuário o endereço http://localhost:5173.

Depois disso, siga os passos 3 a 5 deste arquivo; se a pessoa avisou que já tem o briefing pronto (ramo d), peça para colar, grave em `docs/BRIEFING.md` e siga do Passo 5, sem refazer as perguntas.

**(c) Você foi apontado a partir de outro sistema** ("use este design system no meu sistema", "migre meu sistema para o Rendra"), e está trabalhando na pasta desse sistema, onde este `AGENTS.md` não existe. Leia o repositório de referência pelos links, nesta ordem: [`AGENTS.md`](https://github.com/bsmagalhaes/rendra-ui-web/blob/main/AGENTS.md), [`DESIGN_RULES.md`](https://github.com/bsmagalhaes/rendra-ui-web/blob/main/DESIGN_RULES.md), [`docs/PROMPT_MIGRACAO.md`](https://github.com/bsmagalhaes/rendra-ui-web/blob/main/docs/PROMPT_MIGRACAO.md) e [`docs/COMO_APLICAR.md`](https://github.com/bsmagalhaes/rendra-ui-web/blob/main/docs/COMO_APLICAR.md). O `docs/PROMPT_MIGRACAO.md` decide: você analisa o projeto primeiro (versão do React, estrutura, se o código atual vale a pena aproveitar) e recomenda, numa frase simples, qual dos três caminhos seguir, pedindo só a confirmação do usuário, nunca perguntando o critério direto (ele não sabe responder isso sozinho): React 19.3 ou mais recente e o projeto quer se manter atualizado pelo pacote, o **caminho pacote npm**; React 18, ou uma estrutura que não recebe o pacote, mas vale aproveitar o projeto atual, o **caminho de cópia de arquivos-fonte**; sistema antigo que não vale a pena manter, o **caminho clone e refazer** (recomeça o histórico com `git init` limpo, sem vínculo com o repositório do Rendra, trazendo as regras de negócio do sistema atual: não é um projeto novo sem histórico de negócio). Cada caminho remete, ao final, a `docs/COMO_APLICAR.md` para o detalhe técnico e aos passos 3 e 4 deste arquivo para o briefing completo (o Passo 2 não se aplica aqui: você já sabe que é migração, não precisa perguntar o tipo de trabalho), com o bloco 10 do roteiro ("Somente para migração") preenchido e registrado em `docs/BRIEFING.md` com o status. Se a pessoa avisou que já tem o briefing pronto (ramo d), peça para colar, grave em `docs/BRIEFING.md` com o bloco 10 e siga do Passo 5, sem refazer as perguntas.

**(d) Chat sem terminal.** Se você não consegue rodar `git clone` nem gravar arquivos, diga em uma linha ("Vou conduzir o briefing aqui; a instalação fica para uma IA com terminal, no fim eu explico"), leia `AGENTS.md` e `docs/BRIEFING_MODELO.md` pelas URLs `https://raw.githubusercontent.com/bsmagalhaes/rendra-ui-web/main/AGENTS.md` e `https://raw.githubusercontent.com/bsmagalhaes/rendra-ui-web/main/docs/BRIEFING_MODELO.md`, faça o "Passo 2" e o briefing completo em texto puro e, ao confirmar, entregue o `docs/BRIEFING.md` inteiro num bloco de texto, com o status, mais as linhas de continuação para a pessoa, conforme o tipo de trabalho do briefing.

Projeto novo:

1. Instale uma IA de código com terminal (Claude Code, Codex, Cursor, Gemini CLI ou Copilot).
2. Cole nela: `Clone https://github.com/bsmagalhaes/rendra-ui-web e use como base do meu novo sistema. Siga o AGENTS.md do repositório. Meu briefing já está pronto, vou colar.`
3. Cole o briefing na mensagem seguinte; a IA salva em `docs/BRIEFING.md` e segue do Passo 5.

Migração de um sistema que já existe:

1. Instale uma IA de código com terminal (Claude Code, Codex, Cursor, Gemini CLI ou Copilot).
2. Abra essa IA dentro da pasta do seu sistema e cole: `Aplique neste sistema o design system https://github.com/bsmagalhaes/rendra-ui-web. Siga o AGENTS.md do repositório. Meu briefing já está pronto, vou colar.`
3. Cole o briefing na mensagem seguinte; a IA salva em `docs/BRIEFING.md` e segue o ramo (c), do Passo 5.

Na migração pelo chat, peça em uma mensagem as versões de `react` e `react-dom` do `package.json`, recomende o caminho e entregue o briefing com o bloco 10.

**Briefing colado.** Briefing vindo de um chat sem terminal conta a partir do dia em que é colado: mostre o resumo curto, pergunte se algo mudou e marque de novo "confirmado em" com a data do dia, sem refazer as perguntas.

Em qualquer ramo: comandos, instalação, testes e capturas de tela são sempre feitos pela IA; à pessoa cabe só decidir e aprovar. Quando alguma etapa exigir uma ação dela (login, confirmação no navegador, código de verificação), a IA explica exatamente o que fazer em uma linha.

### Passo 2: perguntar o tipo de trabalho

Antes de qualquer outra coisa, pergunte ao usuário, em português do Brasil:

> Vamos começar. Este trabalho é:
>
> 1. **Projeto novo** usando este boilerplate como base;
> 2. **Migração de layout** de um sistema que já existe para este design system;
> 3. **Contribuição** neste próprio repositório (componente, correção, documentação; só faz sentido para quem vai mexer no código do Rendra em si, não no seu sistema)?

Para **contribuição**, pule o briefing: leia o [`CONTRIBUTING.md`](CONTRIBUTING.md) e vá direto ao trabalho pedido.

### Passo 3: conduzir o briefing

Use o roteiro de [`docs/BRIEFING_MODELO.md`](docs/BRIEFING_MODELO.md).

- Siga o **"Como conduzir"** do modelo. Blocos abertos (negócio, usuários, telas, dados, acesso, prazo) vão agrupados, o bloco inteiro de uma vez.
- **Navegação, tema e cores são um fluxo guiado, nesta ordem**: primeiro pergunte se o usuário tem um **código de modelo** da galeria (`T1-C4-M5`: tema, cores e menu; tabela no item 3.0 do modelo e em `src/config/presets.ts`) e pule o que o código já responde; depois, posição do menu; depois só as opções do caminho escolhido (sidebar: estado, abrir no hover, submenu; menu superior: lista suspensa ou mega menu); barra inferior; tema (modelo e fonte); cores (as do tema, outra paleta pronta ou a identidade do cliente); logotipo; modo de cor. Uma decisão por mensagem, opções numeradas com o padrão marcado, pulando o que não se aplica.
- Nunca decida sozinho o modelo, a paleta, a posição do menu, o tipo de sidebar ou de submenu. Se o usuário pedir sugestão, recomende, explique em uma frase e peça confirmação.
- Aceite "não sei" e ofereça uma sugestão fundamentada. Por exemplo: "sugiro o modelo Equilíbrio e menu lateral recolhido, porque...".
- Não invente dados do negócio, números ou metas. O que o usuário não souber fica marcado como pendente.
- Na **migração**, antes de perguntar, analise o projeto de destino (stack, versões, telas, componentes, marca atual) e só pergunte o que não conseguir descobrir sozinho.

### Passo 4: registrar e confirmar

- Grave as respostas em `docs/BRIEFING.md`, no formato do modelo, com status "rascunho".
- Mostre um **resumo curto** e peça confirmação. Ajuste até o usuário confirmar.
- Marque o status como "confirmado em DD/MM/AAAA".

### Passo 5: planejar e executar em etapas

Proponha um plano em etapas e espere a aprovação. A ordem de referência:

**Projeto novo**

1. Marca: `src/styles/theme.css`, `src/styles/themes.css`, `src/brand/palettes.ts`, `src/brand/brand.config.ts` e `src/brand/assets`, conforme o briefing (modelo, paleta, modo de cor). Suba o app você mesmo (`npm run dev`) antes de pedir ao usuário para abrir `/tokens` ou de tirar as capturas de tela, e informe o endereço http://localhost:5173. Confira `/tokens`: nenhum selo de contraste pode marcar "falha".
2. Menu (`src/config/navigation.ts`) e layout do AppShell, nas props de `src/app/app-layout.tsx` (com cada valor escolhido no bloco 4 do briefing), montado dentro do `<RendraRouterBridge>` de `src/routes.tsx`; rotas em `src/routes.tsx` e `src/config/routes-list.ts`.
3. Telas, em ordem de prioridade, partindo das telas base de `src/pages`.
4. Limpeza do que é só demonstração (`src/mocks`, telas de exemplo sem uso, templates alternativos não usados). Se o projeto nasceu de um clone completo (ramo b do passo 1, ou o caminho "clone e refazer" da migração), inclua também a limpeza da identidade de pacote publicável: veja "Limpeza do clone" em `docs/COMO_APLICAR.md`.

**Migração de layout**: siga a "Ordem de migração" de [`docs/COMO_APLICAR.md`](docs/COMO_APLICAR.md): tokens e tema, depois o `AppShell` (via `RendraRouterBridge` e o `AppLayout` do projeto), formulários e ações, listagens, feedback, telas e limpeza.

Ao fim de **cada etapa**:

- rode `npm run typecheck`, `npm run lint`, `npm run check:rules`, `npm test`, `npm run test:layout` e `npm run test:a11y`, e só diga que terminou com tudo passando;
- mostre o resultado em 360px e 1280px (capturas em `screenshots/`);
- espere a aprovação antes de seguir.

## Regras que não podem ser quebradas (resumo do DESIGN_RULES)

- **Um componente por finalidade.** Procure em `src/components/ui` e acrescente uma prop em vez de criar um arquivo parecido. Nunca crie `SelectSimples`, `TableMobile`, `ModalGrande` e similares.
- **Mobile-first real.** Escreva primeiro para 360px. Sem rolagem horizontal no celular, sem ação que dependa de hover, toque mínimo de 44x44px.
- **Marca isolada** em `src/brand/palettes.ts` (4 cores e o degradê), `theme.css` (modelo), `brand.config.ts` e `src/brand/assets`. Nada de cor, fonte ou logotipo fixo em componente. O logotipo é o `<BrandLogo />`. Paleta nova: sementes em `palettes.ts` e `npm run palettes:build`; cliente em tempo de execução: `applyPalette()`.
- **Só a escala de espaço** (0, 1, 2, 3, 4, 6, 8, 12, 16, 24) e tokens nomeados. Proibido valor arbitrário (`p-[13px]`), estilo inline, `100vh` e degrau fora da escala.
- **Contêiner certo:** modal até 3 campos, drawer até cerca de 12, página em seções ou wizard acima disso. Nunca modal dentro de modal.
- **Botões pela `ActionBar`:** 1 botão com 100%, 2 botões com 30% e 70%, a partir de 3 as extras vão para o menu.
- **Nunca botão solto:** cada ação tem lugar previsto (rodapé fixo, barra da tabela, `PageHeader actions`, `CardHeader actions`, menu da linha).
- **Texto orientativo nunca solto no corpo da tela:** vai em `help` (ícone de informação ao lado do título, no `PageHeader`, `CardTitle` ou `FormSection`), que abre um modal. A exceção é a orientação curta abaixo do campo (`Field help`), com limite pela largura (full 150, xl 100, lg 70, md 40, sm 30, xs 20 caracteres) e em no máximo metade dos campos da seção. Subtítulo descreve, não instrui.
- **Header sempre fixo**, título da página no header com a trilha abaixo, uma única área de rolagem (o `<main>`).
- **Sidebar sempre colorida**, fundo da tela e dos campos cinza bem claro #f5f6f7 com cards brancos, respiro de página de 24px igual em todos os lados, contraste AA.
- **Formulário:** 3 campos por linha (nunca 2 por padrão), CEP e CNPJ primeiro com 25% e o que eles preenchem abaixo, 16px entre campos, salvar no rodapé fixo (no wizard, junto do card).
- **Listagem:** Novo na barra da tabela com Filtros à esquerda, nada solto acima da tabela, 15 por página com busca em todos os registros, título da linha abre o cadastro.
- **Texto em 100% da largura**; limite de largura só quando pedido.
- **Interface em português do Brasil**, datas em DD/MM/AAAA e valores em R$ 1.250,00.

## Comandos

```bash
npm install                     # dependências
npx playwright install chromium # uma vez, para os testes de layout
npm run dev                     # app em http://localhost:5173
npm run storybook               # Storybook em http://localhost:6006
npm run typecheck               # TypeScript
npm run lint                    # ESLint (TS, hooks, acessibilidade)
npm run check:rules             # regras de design
npm test                        # unitários (Vitest)
npm run test:coverage           # idem, com o piso de cobertura por arquivo (o CI usa este)
npm run test:layout             # Playwright: rotas x larguras x modelos, claro e escuro
npm run test:a11y               # acessibilidade (axe-core, WCAG 2.1 AA)
npm run test:visual             # regressão visual (referências do Linux, geradas no CI)
npm run palettes:build          # gera src/styles/palettes.css das sementes de src/brand/palettes.ts
npm run registry:build          # gera o registry.json (novo componente ou variante)
npm run pages:build             # constrói a demo em /demo/, o registry, o SEO e monta o site em .pages/<repo> (com --storybook, inclui o Storybook)
npm run pages:stage             # só a composição de .pages/<repo> (precisa de dist/ pronto)
npm run docs:og-image           # regenera a imagem social (og-image.png) do site
npm run test:site               # Playwright: página de apresentação e composição do site
npm run build:lib               # build do pacote npm (dist/, com os subcaminhos e o CSS)
npm run verify:pack             # confere o pacote publicável (npm pack e instalação num projeto à parte)
```

## Crédito "Feito com Rendra" e licença

Se o usuário pedir para tirar o crédito "Feito com Rendra" (componente `RendraCredit`, código `CRED-001`, no rodapé da tela de login), tire: `credit={false}` no `AuthLayout` (ou no próprio `RendraCredit`). Ao tirar, avise sempre as duas coisas juntas, nunca só uma:

1. **A licença MIT exige manter o aviso de copyright e o arquivo `LICENSE`** no código e em qualquer cópia. Isso não é opcional e não depende de o crédito visível ter sido removido ou não.
2. **O crédito na interface é opcional.** A preferência é mantê-lo no rodapé do login ou movê-lo para outro lugar visível, como uma tela "Sobre", em vez de simplesmente apagar sem colocar em lugar nenhum.

Nunca afirme que a licença MIT obriga crédito visível na interface: ela não obriga. Aviso de copyright no código (obrigatório) e crédito na tela (opcional) são coisas diferentes; misturar as duas é o erro que esta orientação existe para evitar.

## Conduta

- Pergunte antes de apagar arquivos, trocar dependências principais ou publicar qualquer coisa.
- Nunca desative uma regra, um teste ou uma verificação para fazer passar. Corrija a causa.
- Toda tela nova entra em `src/routes.tsx` e em `src/config/routes-list.ts`, e ganha story em `src/stories/pages.stories.tsx`.
- Componente novo ou alterado ganha teste de comportamento ao lado dele (`nome.test.tsx`, com `renderApp` de `src/test/render.tsx`) e um piso de cobertura em `vite.config.ts`.
- Relate o resultado com fidelidade. Se algo falhou, mostre a saída.

## Autor

Rendra Design System, por Bruno Magalhaes: [brunomagalhaes.me](https://www.brunomagalhaes.me) · [instagram.com/brunomagalhaes.me](https://www.instagram.com/brunomagalhaes.me/).
