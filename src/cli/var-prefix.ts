/*
 * Prefixo --rendra-: toda variável CSS que é vocabulário do tema do Rendra (cor, fonte, raio,
 * sombra, degradê, gráfico, sidebar) precisa vir como --rendra-<nome>, para nunca colidir com
 * o namespace de um host que também use Tailwind. Módulo único: o verificador
 * (scripts/check-design-rules.mjs) e os testes (src/brand/palette.test.ts,
 * src/styles/tokens-prefix.test.ts) importam daqui, para nunca divergir.
 *
 * Ordem da decisão importa: primeiro perguntamos se o nome é variável própria do Rendra (a
 * lista abaixo é a fonte da verdade), e só se não for é que a exceção de namespace do
 * Tailwind (ou de terceiros) entra em jogo. Isso evita o bug em que "radius" (sem sufixo) ou
 * "shadow-color" batiam na regex de namespace do Tailwind antes de serem reconhecidos como
 * variáveis próprias do Rendra.
 *
 * Não entram nesta lista: o namespace do próprio Tailwind (--color-*, --spacing-*, --text-*,
 * --font-*, --radius-*, --shadow-*, --container-*, --breakpoint-*, --animate-*, --ease-*,
 * --tw-*, --tracking-*), variáveis de terceiros (--radix-*, do Radix UI) e as variáveis de
 * instância por elemento que os componentes escrevem via estilo inline (--progress, --otp,
 * --kanban-cols, --board-h, --delay, --from, --span, --top, --bottom, --fill, --angle,
 * --ratio, --days, --autosize-h, --h...): essas não são tokens de tema, são valor calculado
 * por instância, e ficam fora do contrato --rendra-*.
 */

export const RENDRA_VAR_EXACT = new Set([
  'primary',
  'primary-foreground',
  'primary-hover',
  'primary-hover-foreground',
  'secondary',
  'secondary-foreground',
  'secondary-hover',
  'secondary-hover-foreground',
  'primary-soft',
  'primary-soft-foreground',
  'primary-text',
  'ring',
  'accent',
  'accent-foreground',
  'background',
  'background-image',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'muted',
  'muted-foreground',
  'border',
  'input',
  'field',
  'overlay',
  'destructive',
  'destructive-hover',
  'destructive-foreground',
  'destructive-soft',
  'destructive-soft-foreground',
  'success',
  'success-foreground',
  'success-soft',
  'success-soft-foreground',
  'warning',
  'warning-foreground',
  'warning-soft',
  'warning-soft-foreground',
  'info',
  'info-foreground',
  'info-soft',
  'info-soft-foreground',
  'shadow-color',
  'brand-font',
  'radius',
  'sidebar',
])

export const RENDRA_VAR_PREFIXES = [
  'sidebar-',
  'gradient-',
  'chart-',
  'elevation-',
  'shape-',
  'meter-',
  'label-',
  'help-',
]

// "tracking" (--tracking-tight etc.) é a escala de letter-spacing do próprio Tailwind v4,
// declarada em @theme junto de --spacing e --text; entra na mesma exceção de namespace. O "$"
// cobre o caso de degrau zerado sem sufixo (--spacing: initial;), que também é do Tailwind.
export const TAILWIND_NAMESPACE =
  /^(color|spacing|text|font|radius|shadow|container|breakpoint|animate|ease|tw|tracking)(-|$)/

/** Fonte da verdade: `name` (sem os `--`) é vocabulário próprio do tema do Rendra? */
export function isRendraOwnVar(name: string): boolean {
  if (RENDRA_VAR_EXACT.has(name)) return true
  return RENDRA_VAR_PREFIXES.some((p) => name.startsWith(p))
}

export interface VarPrefixViolation {
  line: number
  name: string
  message: string
  src: string
}

/**
 * Varre `var(--x)` do arquivo inteiro, pulando o bloco @theme / @theme inline (a ponte
 * documentada entre o nome do Tailwind e o nome do Rendra, ex.:
 * --color-primary: var(--rendra-primary)) e comentários.
 */
export function checkVarPrefix(text: string): VarPrefixViolation[] {
  const found: VarPrefixViolation[] = []
  const lines = text.split('\n')
  let themeDepth = 0
  lines.forEach((line, i) => {
    if (themeDepth === 0 && /^\s*@theme\b/.test(line)) {
      themeDepth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0)
      return
    }
    if (themeDepth > 0) {
      themeDepth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0)
      if (themeDepth < 0) themeDepth = 0
      return
    }
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
    for (const m of line.matchAll(/var\(--([a-zA-Z][\w-]*)\)/g)) {
      const name = m[1]!
      if (name.startsWith('rendra-')) continue
      // Fonte da verdade primeiro: isRendraOwnVar decide sozinho se é vocabulário do tema. Só
      // quando a resposta é "não" o nome escapa (namespace do Tailwind, terceiro como
      // --radix-*, ou variável de instância por elemento) — e nem precisamos checar isso à
      // parte, porque "não ser variável própria" já é a própria exceção.
      if (!isRendraOwnVar(name)) continue
      found.push({
        line: i + 1,
        name,
        message: `Variável própria do Rendra sem o prefixo --rendra-. Use var(--rendra-${name}).`,
        src: line.trim(),
      })
    }
  })
  return found
}

/**
 * Varre declarações (`--nome: valor;`) num arquivo de tema (theme.css, globals.css,
 * palettes.css, o theme.css de cada modelo em src/brand/examples — usada por
 * src/styles/tokens-prefix.test.ts). Diferente
 * de `checkVarPrefix`, não precisa pular o bloco @theme: a exceção de namespace vale pelo
 * nome, não pelo bloco (globals.css redeclara --spacing-control-sm fora de @theme, em @layer
 * base, só para sobrescrever o valor em telas maiores, e isso também não é variável própria do
 * Rendra).
 *
 * Acusa quando `isRendraOwnVar(name) || !TAILWIND_NAMESPACE.test(name)`: um arquivo de tema só
 * declara variável própria do Rendra ou variável do namespace do Tailwind (dentro de @theme);
 * qualquer outro nome é um token novo inventado direto no arquivo, sem passar pelo catálogo de
 * `RENDRA_VAR_EXACT`/`RENDRA_VAR_PREFIXES` — também precisa do prefixo --rendra-, mesmo sem
 * constar nas listas acima (é por isso que a condição não usa só `isRendraOwnVar`, como em
 * `checkVarPrefix`: lá, fora de um arquivo de tema, um nome desconhecido pode ser variável de
 * instância por elemento; aqui, dentro de um arquivo de tema, não pode).
 */
export function findUnprefixedDeclarations(text: string): VarPrefixViolation[] {
  const found: VarPrefixViolation[] = []
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const m = /^\s*--([a-zA-Z][\w-]*)\s*:/.exec(line)
    if (!m) return
    const name = m[1]!
    if (name.startsWith('rendra-')) return
    if (!isRendraOwnVar(name) && TAILWIND_NAMESPACE.test(name)) return
    found.push({
      line: i + 1,
      name,
      message: `Variável própria do Rendra sem o prefixo --rendra-. Use --rendra-${name}.`,
      src: line.trim(),
    })
  })
  return found
}
