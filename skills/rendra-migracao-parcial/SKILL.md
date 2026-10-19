---
name: rendra-migracao-parcial
description: Migra parte de um sistema existente para o Rendra Design System em três níveis (tokens, padrões e componentes), escolhidos pelo usuário do sistema de destino. Use quando pedirem para aplicar o Rendra só em parte de um projeto, ou para tirar ou mover o crédito "Feito com Rendra".
---

# Rendra: migração parcial

Esta skill leva o Rendra Design System para um sistema que já existe, sem exigir a migração inteira de uma vez. São três níveis, e quem escolhe o nível é o usuário do sistema de destino, não o agente:

1. **Tokens**: escala de espaço, tipografia, raio e sombra.
2. **Padrões**: rótulo, orientação, espaçamento de formulário e respiro de página.
3. **Componentes**: troca por código de catálogo (`BTN-001`, `ABA-002`...), tela a tela.

Antes de tudo, confirme com o usuário **qual dos três níveis** ele quer (pode ser mais de um, nesta ordem: tokens, depois padrões, depois componentes; nunca ao contrário, porque padrões e componentes partem da escala de tokens já certa) e **em qual pasta** do projeto de destino (`cwd`). Nunca decida sozinho o nível nem o escopo.

Os comandos `rendra auditar` e `rendra trocar` vêm da CLI publicada junto com o pacote. Sem instalar o pacote no projeto de destino, use `npx @rendra-ui/web <comando>`; `npx rendra <comando>` só funciona com o pacote instalado (ou instalado global, como `rendra <comando>` direto), porque o nome `rendra` no npm pertence a outro pacote. Só `rendra trocar` precisa do `typescript` do projeto de destino instalado, para ler e reescrever o JSX (`rendra auditar` não usa o parser, só regex por linha); sem o `typescript`, `rendra trocar` sai com mensagem clara e código de saída diferente de zero, e a saída pede para instalar (`npm install --save-dev typescript`) antes de continuar.

## Nível 1: tokens

Escala de espaço, tipografia, raio e sombra (`DESIGN_RULES.md`, "Tokens estruturais"): o objetivo é o projeto de destino parar de usar valor solto (`padding: 13px`, `border-radius: 6px`, cor hexadecimal direto no componente) e passar a usar a escala e as variáveis de tema do Rendra.

1. Rode `rendra auditar <cwd>` (o caminho do projeto de destino) e leia a lista: cada linha é `arquivo:linha [regra] mensagem`, com sete regras genéricas (`cor-fixa`, `valor-arbitrario`, `estilo-inline`, `fonte-fixa`, `100vh`, `fora-da-escala`, `raio-fixo`) mais o texto do trecho encontrado.
2. Corrija uma regra de cada vez, começando pela mais frequente. `cor-fixa` e `fonte-fixa` viram token semântico ou variável de tema; `valor-arbitrario` e `fora-da-escala` viram um degrau da escala (0, 1, 2, 3, 4, 6, 8, 12, 16, 24) ou um token nomeado; `100vh` vira `100dvh`; `raio-fixo` vira um token de raio por papel.
3. Rode `rendra auditar <cwd>` de novo depois de cada lote de correções, até a lista sair vazia. Para não auditar a marca e os estilos do próprio design system, use `--ignore src/brand,src/styles`; a lista continua sendo as sete regras genéricas, e `--all` (as 17 regras do `check:rules`) só vale para projeto que segue o vocabulário e as pastas do Rendra. Relate ao usuário quantas violações havia, quantas foram corrigidas e o que ficou pendente (ex.: um valor que depende de decisão de design, marcado para revisão humana).

## Nível 2: padrões

Rótulo do campo, texto orientativo, espaçamento de formulário e respiro de página (`DESIGN_RULES.md`, "Composição de tela" e "Formulário"): mudanças estruturais que `rendra auditar` não cobre sozinho, porque dependem de olhar a tela inteira, não só uma linha de código.

Confira, tela por tela, contra o checklist do `DESIGN_RULES.md`:

- Rótulo do campo no estilo do projeto de destino (discreto ou normal), nunca dois estilos misturados na mesma tela.
- Texto orientativo nunca solto no corpo: vai em `help` (ícone de informação que abre um modal) ou na orientação curta abaixo do campo, dentro do limite de caracteres pela largura do campo.
- Formulário com 3 campos por linha (nunca 2 por padrão), 16px entre campos, CEP e CNPJ primeiro com 25% de largura.
- Respiro de página de 24px, igual nos quatro lados; fundo cinza bem claro com cards brancos.

`rendra auditar` ainda pega o que se sobrepõe ao nível 1 (valor arbitrário de espaçamento, por exemplo); o resto é revisão visual, tela a tela, relatada ao usuário com o antes e o depois de cada uma.

## Nível 3: componentes

Troca o componente antigo pelo equivalente do Rendra, por código de catálogo (`rendra codigos` lista todos), tela a tela:

1. Para cada tela, identifique o código atual (se o projeto já usa Rendra numa variante) ou o componente que vai virar Rendra, e o código de destino.
2. Rode `rendra trocar <DE> <PARA> --dry-run` primeiro, sempre: ele mostra quantos trechos seriam reescritos e lista, em "para revisão", todo local que não pode ser trocado sozinho: prop dinâmica (`variant={x}`, nunca reescrita: o valor pode ser qualquer coisa em tempo de execução) ou troca entre componentes diferentes (nunca edita, só aponta onde o componente antigo aparece, porque virar outro componente não é troca de prop, é reescrita de estrutura, manual). Cobre 100% das telas: um elemento sem a prop, quando DE é a variante padrão do componente (a que ele usa sem nenhuma prop escrita), também conta como usando DE, e trocar para uma variante padrão remove a prop em vez de escrever o valor por extenso.
3. Confirme o resultado da simulação com o usuário antes de rodar sem `--dry-run`. Depois de rodar de verdade, releia os arquivos reescritos e resolva um a um os itens de "para revisão".
4. Relate por tela: quantos trechos foram reescritos automaticamente, quantos ficaram para revisão manual e o motivo de cada um.

## Crédito "Feito com Rendra" e licença

Se o usuário pedir para tirar o crédito "Feito com Rendra" (componente `RendraCredit`, código `CRED-001`, no rodapé da tela de login), tire: `credit={false}` no `AuthLayout` (ou no próprio `RendraCredit`). Ao tirar, avise sempre as duas coisas juntas, nunca só uma:

1. **A licença MIT exige manter o aviso de copyright e o arquivo `LICENSE`** no código e em qualquer cópia. Isso não é opcional e não depende de o crédito visível ter sido removido ou não.
2. **O crédito na interface é opcional.** A preferência é mantê-lo no rodapé do login ou movê-lo para outro lugar visível, como uma tela "Sobre", em vez de simplesmente apagar sem colocar em lugar nenhum.

Nunca afirme que a licença MIT obriga crédito visível na interface: ela não obriga. Aviso de copyright no código (obrigatório) e crédito na tela (opcional) são coisas diferentes; misturar as duas é o erro que esta orientação existe para evitar.

## Autor

Rendra Design System, por Bruno Magalhaes: [brunomagalhaes.me](https://www.brunomagalhaes.me) · [instagram.com/brunomagalhaes.me](https://www.instagram.com/brunomagalhaes.me/).
