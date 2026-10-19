# Briefing do projeto

Roteiro usado pela IA (e por pessoas) antes de começar. As respostas vão para `docs/BRIEFING.md`, no formato abaixo. Nada é construído antes de o briefing ser confirmado.

**Como conduzir**

- Os blocos 1, 2 e 6 a 11 são abertos: pergunte agrupado, o bloco inteiro de uma vez.
- Os blocos 3 (navegação), 4 (tema) e 5 (cores) são um **fluxo guiado**, nesta ordem: uma decisão por mensagem, com as opções numeradas, uma frase de quando usar cada uma e o padrão marcado. A resposta decide a próxima pergunta, e o que não se aplica é pulado (quem escolhe menu superior nunca ouve perguntas de sidebar).
- Se o usuário responder várias decisões de uma vez, aceite e pule para a próxima em aberto.
- Aceite "não sei, sugira": recomende com base nos blocos 1 e 2, explique em uma frase e peça confirmação.
- O usuário pode ver cada opção na galeria do demo (https://bsmagalhaes.github.io/rendra-ui-web/demo/galeria/): cada captura mostra seu **código de modelo**, e o bloco "Monte seu código" gera o código e abre o demo já aplicado.
- **Antes do fluxo guiado, pergunte pelo código (3.0).** Com o código, as perguntas que ele responde são puladas; confirme em uma frase o que o código significa.

---

## 0. Tipo de trabalho

- [ ] **Projeto novo** com este boilerplate
- [ ] **Migração de layout** de um sistema existente para este design system
- [ ] **Contribuição** neste próprio repositório (componente, correção, documentação)

## 1. Negócio e produto

- Nome do produto:
- O que ele faz, em uma frase:
- Quem paga e quem usa (cliente final, equipe interna, parceiros):
- Principal resultado esperado (o que precisa dar certo para o projeto valer a pena):

## 2. Usuários e uso

- Perfis de usuário e o que cada um faz:
- Onde usam mais: celular, desktop ou os dois (e em que situação, por exemplo em campo ou no escritório):
- Acessibilidade ou restrição especial (baixa visão, uso com luvas, conexão ruim):

## 3. Navegação (fluxo guiado)

**3.0 Código de modelo** (primeira pergunta do fluxo guiado)

> Você já escolheu um modelo na galeria? Se tiver o código (por exemplo `T1-C4-M5`), me passe e eu já sei o tema, as cores e o menu. Pode ser só uma parte, como `T2` ou `C4-M6`. Se não tiver, seguimos pelas perguntas.

| Parte | Código | O que define                                                | Perguntas que pula |
| ----- | ------ | ----------------------------------------------------------- | ------------------ |
| Tema  | T1     | Safira: quadrado                                            | 4.1                |
| Tema  | T2     | Equilíbrio: levemente arredondado                           | 4.1                |
| Tema  | T3     | Aurora: 100% arredondado                                    | 4.1                |
| Cores | C1     | Paleta Safira (azul e verde)                                | 5.1 e 5.3          |
| Cores | C2     | Paleta Equilíbrio (violeta e ciano)                         | 5.1 e 5.3          |
| Cores | C3     | Paleta Aurora (verde-petróleo e laranja)                    | 5.1 e 5.3          |
| Cores | C4     | Paleta Ardósia (grafite e laranja)                          | 5.1 e 5.3          |
| Menu  | M1     | Lateral recolhida, abre no hover, submenu em segunda barra  | 3.1 a 3.5          |
| Menu  | M2     | Lateral recolhida, abre no hover, submenu dentro da sidebar | 3.1 a 3.5          |
| Menu  | M3     | Lateral expandida, submenu em segunda barra                 | 3.1 a 3.5          |
| Menu  | M4     | Lateral expandida, submenu dentro da sidebar                | 3.1 a 3.5          |
| Menu  | M5     | Menu superior com lista suspensa                            | 3.1 a 3.5          |
| Menu  | M6     | Menu superior com mega menu                                 | 3.1 a 3.5          |

A fonte da verdade dos códigos é `src/config/presets.ts` (também aplica o código no app: `?codigo=T1-C4-M5`). Registre o código no briefing. Tema sem cores (`T2`) usa as cores do próprio tema; cores da identidade do cliente não têm código e seguem pelo 5.2.

- Código informado:

Cada resposta vira um valor da prop `layout` do `<AppShell>`, montada em `src/app/app-layout.tsx` (o padrão interno fica em `src/components/app-shell/layout.ts`; `src/config/layout.ts` reexporta para o boilerplate). No celular, qualquer escolha vira gaveta mais barra inferior.

**3.1 Posição do menu** (`navigation`)

1. **Lateral** (sidebar): padrão. Melhor com mais de 6 itens ou com submenus. Vá para 3.2.
2. **Superior** (no header): melhor com até 6 itens e conteúdo que precisa da largura toda. Vá para 3.5.

_Se lateral:_

**3.2 Estado inicial da sidebar** (`sidebar`)

1. **Recolhida**, só ícones: padrão. Mais espaço para o conteúdo. Vá para 3.3.
2. **Expandida**, ícones e rótulos sempre visíveis: melhor para quem usa pouco ou está aprendendo o sistema. Vá para 3.4.

**3.3 Abrir por cima do conteúdo ao passar o mouse** (`expandOnHover`)

1. **Sim**: padrão. Também abre pelo foco do teclado.
2. **Não**: abre só pelo botão de expandir.

**3.4 Como abrem os submenus** (`submenu`)

1. **Segunda barra lateral** com os subitens: padrão. Bom para muitos subitens.
2. **Dentro da sidebar**, expandindo abaixo do item: bom para poucos subitens.

Siga para 3.6.

_Se superior:_

**3.5 Tipo de submenu** (`topbarSubmenu`)

1. **Lista suspensa** navegável: padrão.
2. **Mega menu**, com seções e uma descrição por item: bom para muitos módulos.

_Para os dois:_

**3.6 Barra inferior no celular** (`bottomNav`)

1. **Sim**, com até 4 atalhos: padrão.
2. **Não**, só a gaveta.

**3.7 O usuário final pode mudar o layout** pelo menu do avatar

1. **Sim**: padrão.
2. **Não**: o layout do projeto é fixo. O submenu Layout some do menu do avatar com `userMenu={{ layout: false }}`; `userConfigurable={false}` só faz o `AppShell` ignorar o layout que a pessoa guardou no navegador, sem esconder o submenu.

**3.8 Conteúdo do menu** (aberta, grava em `src/config/navigation.ts`)

- Itens em grupos (título do grupo; ícone de cada item; no mega menu, uma descrição curta):
- Até 4 atalhos da barra inferior (se 3.6 = sim):
- No header, manter busca global (Ctrl+K), notificações e troca de tema? Tirar algum?
- Itens do menu do avatar, além de Sair (ex.: Meu perfil, Configurações; vira `userMenuItems` do `AppShell`):
- Ações rápidas da busca global, se houver (ex.: "Novo cliente"; vira `quickActions`):
- Notificações: o sino aparece? De onde vêm os itens, id, tipo, título, hora e lida (vira `notifications`)?
- Seletor de espaço (empresa, unidade) no topo do menu do avatar? Quais espaços (id e nome) e o que acontece ao trocar (vira `workspaces`)?
- Logo da marca no header do celular, no lugar do título e da trilha? (vira `headerLogo`; com seta de voltar, prefira o símbolo)
- Tirar Tema, Template ou Layout do menu do avatar? (vira `userMenu`)

## 4. Tema (fluxo guiado)

O tema define forma e fonte (`src/brand/brand.config.ts` e `src/styles/theme.css`). Mostre as capturas do README ou o demo.

**4.1 Modelo**

1. **Safira**: tudo quadrado, preciso, fonte Poppins. Combina com financeiro, jurídico, dados, indústria.
2. **Equilíbrio**: cantos levemente arredondados, fonte DM Sans. O mais neutro, serve para quase tudo.
3. **Aurora**: 100% arredondado, amigável, fonte Inter. Combina com saúde, educação, varejo, consumidor final.

**4.2 Fonte**

1. **A do modelo**: padrão.
2. **Outra**: qual (Google Fonts ou arquivo próprio)?

**4.3 Rótulo dos campos**: rótulo discreto (maiúsculo, cinza) ou normal?

1. **Discreto**: 11px, maiúsculo, espaçado, cinza delicado. Formulário mais leve, com o foco no que se digita. Padrão.
2. **Normal**: 14px, na cor do texto. Bom para público que lê com dificuldade ou para formulários curtos.

Vai em `labelStyle` no `src/brand/brand.config.ts` (`'discreto'` ou `'normal'`). A orientação abaixo do campo é sempre 12px, nos dois estilos.

## 5. Cores (fluxo guiado)

**5.1 De onde vêm as cores**

1. **As do próprio tema** escolhido em 4.1: padrão. Vá para 5.4.
2. **Uma paleta pronta de outro tema** (Safira azul e verde, Equilíbrio violeta, Aurora verde-azulado e coral, Ardósia grafite e laranja), mantendo a forma do tema escolhido. Vá para 5.3.
3. **A identidade visual do cliente**. Vá para 5.2.

**5.2 Cores da identidade** (se 5.1 = 3)

Uma paleta é só **4 cores e o degradê da marca**. Pergunte apenas isto:

- Cor primária (botão principal, links, destaque):
- Cor da primária no hover (padrão: a primária um pouco mais escura, ou a secundária):
- Cor secundária (segundo destaque, indicador do menu):
- Cor da secundária no hover:
- Degradê da marca, usado na sidebar e no painel do login (3 cores, da luz ao fundo; padrão: tons da primária, do médio ao bem escuro):
- Texto sobre a primária e a secundária: automático (padrão, o que passar AA), sempre branco ou sempre escuro:

Não sabe alguma cor em hex? Diga "não sei, sugira": a IA recomenda com base no tema escolhido em 4.1 (por exemplo, a paleta pronta mais parecida) e pede só a confirmação.

**Não pergunte** erro, sucesso, alerta, informação, fundo, card, borda nem as cores do modo escuro: são do sistema ou geradas. As sementes vão em `src/brand/palettes.ts` e `npm run palettes:build` gera o resto com AA conferido; se uma cor precisar de ajuste para passar, o gerador mostra o tom usado, e a IA confirma com o usuário antes de seguir.

**5.3 Qual paleta pronta** (se 5.1 = 2)

1. Safira. 2. Equilíbrio. 3. Aurora. 4. Ardósia.

**5.4 Logotipo**

1. **Montado pelo tema**, com o símbolo e as cores da paleta (`logoMode: 'themed'`): padrão, acompanha claro e escuro.
2. **Arte oficial do cliente**, usada como está (`logoMode: 'image'`): envie SVG claro, SVG escuro e o símbolo.

**5.5 Modo de cor**

1. **Segue o aparelho**, com claro e escuro: padrão.
2. **Começa claro**, com opção de escuro.
3. **Começa escuro**, com opção de claro.
4. **Só claro.**

**5.6 O usuário final pode trocar modelo e paleta** pelo menu do avatar

1. **Não**, só a marca do projeto: padrão para produto de cliente.
2. **Sim**: útil para demonstração ou sistema com várias marcas.

**5.7 White label: cada cliente (tenant) com a sua marca**

1. **Não**: uma marca só, definida no build. Padrão.
2. **Sim, marcas conhecidas no build**: cada uma vira uma entrada em `src/brand/palettes.ts`.
3. **Sim, marcas cadastradas em tempo de execução** (o parceiro escolhe as cores num painel): as 4 cores e o degradê vêm da API ou da configuração do tenant, e o app chama `applyPalette(sementes)` na entrada. Pergunte de onde vêm as cores e quem as cadastra. Para o modo explícito (tokens já prontos, sem recalcular) ou misto, para escopar mais de uma marca na mesma página, ou para deixar o estado (`brandId`, `paletteId`, `mode`) controlado por fora, troque `applyPalette` por `createTheme`/`applyTheme(theme, { target })` e as props de controle do `BrandProvider` (detalhe em `docs/COMO_APLICAR.md`, "createTheme/applyTheme: os três modos").

- Referências visuais que o cliente admira (aberta, opcional):

## 6. Telas

Para cada tela: nome, objetivo, contêiner (página, drawer ou modal) e prioridade.

| Tela | Objetivo | Contêiner | Prioridade |
| ---- | -------- | --------- | ---------- |
|      |          |           |            |

## 7. Componentes e variantes

Cada componente do design system, e cada variante visual dele (não tamanho, não tom, formato), tem um **código de catálogo**: três ou quatro letras, hífen, três dígitos (`BTN-001`, `ABA-002`). É diferente do código de modelo do bloco 3.0 (`T1-C4-M5`): aquele escolhe tema, cores e menu; este escolhe **qual variante de cada componente** a tela usa.

Veja todos com `npm run dev`, abra `/componentes` e olhe o selo ao lado de cada exemplo (ou rode `npx @rendra-ui/web codigos`): todo código do catálogo tem selo na vitrine, e a lista completa e sempre atualizada é `src/catalog/components.ts`, nunca este documento. Diga, para cada situação abaixo, qual código quer (ou "não sei, sugira": o padrão já é uma sugestão fundamentada). O que não estiver na tabela é porque o componente **só tem um código** (é a variante única dele, sem escolha a fazer); ainda assim vale conferir o exemplo na vitrine.

| Situação                                                                    | Código padrão                                                                   | Outras opções do mesmo componente                                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Ação principal de uma tela ou formulário                                    | `BTN-001` (primário)                                                            | `BTN-002` secundário, `BTN-003` contornado, `BTN-004` fantasma, `BTN-005` destrutivo, `BTN-006` link                   |
| Dividir o conteúdo de uma tela em seções                                    | `ABA-001` (linha, com sublinhado)                                               | `ABA-002` pílula (mais destaque visual)                                                                                |
| Dois ou três botões largos juntos, fora da `ActionBar` (ações de um cartão) | `BTNG-001` (lado a lado)                                                        | `BTNG-002` empilhados; `BTNG-003` empilhados no celular e lado a lado a partir do tablet                               |
| Confirmar uma ação (principal e cancelar)                                   | `MOD-001` (confirmação; `type="destructive"` usa o mesmo código, só muda a cor) | `MOD-003` informativo (um botão só, de largura total, quando não há decisão)                                           |
| Só informar algo, sem decisão a tomar                                       | `MOD-003` (informativo, um botão de largura total)                              | `MOD-001` confirmação, quando houver o que decidir                                                                     |
| Cadastro rápido de até 3 campos, sem sair da tela                           | `MOD-002` (formulário)                                                          | nenhuma (código único)                                                                                                 |
| Escolher uma entre poucas opções simples                                    | `RDO-001` (lista, com bolinha)                                                  | `RDO-002` cartões (com ícone e descrição, mais destaque)                                                               |
| Trilha de navegação dentro do corpo da página                               | `BRD-001` (responsiva: trilha no desktop, botão voltar no celular)              | `BRD-002` sempre em texto (usada no header do AppShell, não é escolha de tela)                                         |
| Gráfico de um indicador                                                     | `CHT-001` linha                                                                 | `CHT-002` barras, `CHT-003` área, `CHT-004` pizza, `CHT-005` combinado, `CHT-006` velocímetro de meta, `CHT-007` funil |
| Mostrar uma pessoa, ou várias sobrepostas                                   | `AVT-001` (avatar)                                                              | `AVT-002` em grupo (com contador do excedente)                                                                         |
| Uma escolha independente, ligada ou desligada                               | `CHK-001` (caixa de seleção)                                                    | `CHK-002` grupo de caixas (com "selecionar todos")                                                                     |
| Linhas simples, com título, descrição e ação                                | `LIST-001` (lista)                                                              | `LIST-002` reordenável (arraste e teclado, com `onReorder`)                                                            |
| Nota rápida de satisfação                                                   | `RTG-001` (estrelas)                                                            | `RTG-002` em escala (0 a 10, tipo NPS)                                                                                 |
| Arrastar e soltar ou escolher arquivos                                      | `UPL-001` (lista)                                                               | `UPL-002` em galeria (miniaturas, para fotos e vídeos)                                                                 |
| Quadro kanban                                                               | `KANB-001` (padrão)                                                             | `KANB-002` com destinos de arraste, além das colunas (`dropTargets`)                                                   |

Componentes com um código só (exemplos comuns, veja o resto na vitrine): `CAMP-001` campo de texto, `SEL-001` select, `DTP-001` seletor de data, `TAB-001` tabela, `GAV-001` gaveta (drawer), `CAL-001` calendário, `WIZ-001` wizard (`WIZ-002` para o indicador de etapas sozinho), `FLD-001` campo com rótulo e ajuda (`FLD-002` para um rótulo avulso), `FORM-001` formulário (`FORM-002` para uma seção de formulário), `CHAT-001` lista de conversas, `CHAT-002` linha do tempo da conversa e `CHAT-003` campo de mensagem, `COR-001` seletor de cor, `CROP-001` recorte de imagem, `DOC-001` visualizador de documentos, `QRC-001` código QR, `CKLT-001` lista de verificação, `REP-001` campo repetível e `SPIN-001` indicador de carregamento.

- Código escolhido por situação (preencha as linhas que fizerem sentido para este projeto):

## 8. Dados

- Entidades principais (por exemplo cliente, contrato, pedido) e seus campos mais importantes:
- Listagens: quais colunas, filtros e ações em massa:
- Formulários longos (viram página em seções ou wizard):

## 9. Acesso e integrações

- Login: e-mail e senha, verificação em duas etapas, login social, SSO:
- Perfis e permissões:
- Integrações (API, pagamentos, e-mail, mapas):

## 10. Somente para migração

- Onde está o projeto atual (caminho local ou URL do repositório):
- Stack atual (React? versão? Tailwind? bundler?):
- Telas prioritárias para migrar, em ordem:
- O que não pode mudar (fluxos, URLs, textos, integrações):

## 11. Prazo e entrega

- Etapas e o que precisa estar pronto primeiro:
- Quem aprova cada etapa:

---

**Status do briefing:** rascunho | confirmado em DD/MM/AAAA
