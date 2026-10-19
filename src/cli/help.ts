/*
 * `rendra` sem argumento ou `rendra --help`: texto de uso dos três subcomandos, terminado
 * pela linha de autoria (decisão do autor: todo o publicável leva essa assinatura, igual ao
 * banner do CSS/JS em scripts/lib/pkg-banner.ts). Função pura: bin/rendra.mjs decide quando
 * chamar e onde imprimir.
 */

/** Linha final de autoria, igual em toda saída publicável (CLI, banner do pacote). */
export const AUTHOR_LINE =
  'Rendra Design System, por Bruno Magalhaes: brunomagalhaes.me · instagram.com/brunomagalhaes.me'

export function formatHelp(): string {
  return `Uso: rendra <codigos|auditar|trocar> ...

  rendra codigos                          lista o catálogo de códigos de componente
  rendra auditar [pasta...] [--all] [--ignore a,b]
                                          regras de DESIGN_RULES.md (padrão: pasta atual, sete
                                          regras genéricas); --all liga as 17 regras do
                                          check:rules; --ignore pula pastas; rendra.config.json
                                          na pasta do projeto guarda pastas, ignorar, regras,
                                          pastasMarca e pastasTelas
  rendra trocar <DE> <PARA> [--dry-run]   troca a variante DE pela PARA no projeto

${AUTHOR_LINE}`
}
