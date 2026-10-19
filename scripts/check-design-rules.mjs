#!/usr/bin/env node
/*
 * Verificador das regras do DESIGN_RULES.md que o Tailwind não consegue barrar sozinho.
 * Roda no CI (.github/workflows/ci.yml) em todo Pull Request e localmente com
 * `npm run check:rules`.
 *
 * É um chamador fino: a varredura e as 17 regras moram em src/cli/auditar-tudo.ts (modo
 * `repositorio`), as mesmas que `rendra auditar --all` aplica num projeto de destino, para a
 * lógica nunca duplicar. As regras genéricas estão em src/cli/auditar.ts, as dez extras em
 * src/cli/regras-extras.ts, o texto orientativo em src/cli/help-length.ts e o prefixo
 * --rendra- em src/cli/var-prefix.ts (scripts/lib só reexporta os dois últimos).
 *
 * Proíbe, fora de src/brand, src/styles e src/cli:
 *  - cor fixa, valor arbitrário do Tailwind, estilo inline, fonte fixa, 100vh, raio fixo e
 *    degrau fora da escala: as sete regras genéricas de DESIGN_RULES.md
 *  - importação de SVG de marca fora de src/brand
 *  - arquivo de variante mobile ou paralela de componente (TableMobile, SelectSimples...)
 *  - classe montada por template string (p-${n}): o Tailwind não gera a classe
 *  - arquivo .css fora de src/styles e src/brand
 * Em todo arquivo .ts/.tsx/.css, incluindo src/brand e src/styles (DESIGN_RULES.md, "Nome das
 * variáveis CSS"):
 *  - variável própria do Rendra sem o prefixo --rendra- (var(--primary), var(--radius)...)
 * Nas telas do sistema (src/pages/app), também:
 *  - texto orientativo (regra C7): help literal de Field e FormField acima do limite do span,
 *    mais da metade dos campos de uma FormSection com orientação, description do PageHeader
 *    acima de 150 caracteres e subtítulo que começa com verbo de instrução
 *  - botão solto no conteúdo de um card: ação de card vai em CardHeader actions
 */
import { auditarTudo } from '../src/cli/auditar-tudo.ts'

const { violacoes, arquivos } = auditarTudo(process.cwd(), { modo: 'repositorio' })

if (violacoes.length) {
  for (const v of violacoes) {
    console.error(`\n${v.file}:${v.line}  [${v.rule}] ${v.message}`)
    if (v.source) console.error(`    ${v.source.slice(0, 160)}`)
  }
  console.error(`\n${violacoes.length} violação(ões) das regras de design.`)
  process.exit(1)
}
console.log(`Regras de design: ${arquivos} arquivos verificados, nenhuma violação.`)
