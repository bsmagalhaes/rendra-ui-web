/*
 * Regra texto-orientativo (DESIGN_RULES.md, "Texto orientativo"): os limites de tamanho vivem
 * num módulo único para o verificador (scripts/check-design-rules.mjs) e o teste
 * (help-length.test.ts) nunca divergirem sobre o que é "curto demais para instruir".
 *
 * O que mede, só em texto literal escrito no JSX (texto dinâmico, como help={mensagem}, não é
 * medido):
 *  - help="..." em <Field> e <FormField>, contra o limite do span literal do campo (sem span,
 *    vale md). Span dinâmico (span={x}) também não é medido;
 *  - por FormSection: no máximo metade dos Field e FormField com help literal;
 *  - description="..." no <PageHeader>: até 150 caracteres;
 *  - subtítulo que começa com verbo de instrução (description de qualquer componente e
 *    <CardDescription>): descreve o que é, nunca o que fazer.
 */

/** Limite de caracteres da orientação abaixo do campo, pela largura (span) do Field. */
export const HELP_LIMITS = {
  full: 150,
  xl: 100,
  lg: 70,
  md: 40,
  half: 40,
  sm: 30,
  xs: 20,
} as const

export type HelpSpan = keyof typeof HELP_LIMITS

/** Limite do description do PageHeader (descreve o que é a tela, em uma frase curta). */
export const PAGE_DESCRIPTION_LIMIT = 150

/** Verbos no imperativo que denunciam instrução num subtítulo. */
export const INSTRUCTION_VERBS = [
  'Comece',
  'Clique',
  'Toque',
  'Arraste',
  'Preencha',
  'Use',
  'Escolha',
  'Selecione',
  'Digite',
  'Informe',
  'Veja',
  'Confira',
]

/** Limite do span; sem span (ou span desconhecido), vale o padrão md. */
export function helpLimit(span?: string): number {
  return span && span in HELP_LIMITS ? HELP_LIMITS[span as HelpSpan] : HELP_LIMITS.md
}

/** Quantidade de caracteres (por ponto de código, para acento e emoji contarem 1). */
export function textLength(text: string): number {
  return [...text.trim()].length
}

export interface GuidanceViolation {
  line: number
  id: 'texto-orientativo'
  message: string
  src: string
}

/** Valor de um atributo: literal (texto) ou dinâmico (expressão), ou ausente (undefined). */
type AttrValue = { literal: string } | { dynamic: true }

interface JsxTag {
  start: number
  end: number
  text: string
}

const QUOTES = new Set(['"', "'", '`'])

/** Pula uma string que começa em `i` (aspas); devolve o índice logo após o fechamento. */
function skipString(text: string, i: number): number {
  const quote = text[i]
  let j = i + 1
  while (j < text.length && text[j] !== quote) j += text[j] === '\\' ? 2 : 1
  return j + 1
}

/**
 * Lê a tag de abertura JSX que começa em `start` (no "<") até o ">" que a fecha, ignorando o
 * que está dentro de chaves (render={(f) => <Input />}) e de strings.
 */
export function readTag(text: string, start: number): JsxTag {
  let i = start + 1
  while (i < text.length && /[\w.]/.test(text[i]!)) i++
  // Genérico do TypeScript: <FormField<Values> ...>
  if (text[i] === '<') {
    let angle = 0
    for (; i < text.length; i++) {
      if (text[i] === '<') angle++
      else if (text[i] === '>' && --angle === 0) {
        i++
        break
      }
    }
  }
  let depth = 0
  while (i < text.length) {
    const c = text[i]!
    if (QUOTES.has(c)) {
      i = skipString(text, i)
      continue
    }
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) {
      i++
      break
    }
    i++
  }
  return { start, end: i, text: text.slice(start, i) }
}

/** Atributo `name` no nível de topo da tag (fora de chaves), literal ou dinâmico. */
export function readAttr(tag: string, name: string): AttrValue | undefined {
  let depth = 0
  let i = 0
  while (i < tag.length) {
    const c = tag[i]!
    if (depth > 0 && QUOTES.has(c)) {
      i = skipString(tag, i)
      continue
    }
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (depth === 0 && QUOTES.has(c)) {
      i = skipString(tag, i)
      continue
    } else if (depth === 0 && /\s/.test(tag[i - 1] ?? '') && tag.startsWith(`${name}=`, i)) {
      return parseValue(tag, i + name.length + 1)
    }
    i++
  }
  return undefined
}

function parseValue(tag: string, i: number): AttrValue {
  const c = tag[i]
  if (c === '"' || c === "'") return { literal: tag.slice(i + 1, skipString(tag, i) - 1) }
  if (c !== '{') return { dynamic: true }
  let depth = 0
  let j = i
  for (; j < tag.length; j++) {
    if (depth > 0 && QUOTES.has(tag[j]!)) {
      j = skipString(tag, j) - 1
      continue
    }
    if (tag[j] === '{') depth++
    else if (tag[j] === '}' && --depth === 0) break
  }
  const inner = tag.slice(i + 1, j).trim()
  const quoted = /^(["'`])([\s\S]*)\1$/.exec(inner)
  if (quoted && !(quoted[1] === '`' && quoted[2]!.includes('${'))) return { literal: quoted[2]! }
  return { dynamic: true }
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length
}

function firstLine(text: string): string {
  return text.split('\n')[0]!.trim()
}

/** Tags de abertura de um componente (nome exato, sem pegar <FieldGroup> por <Field>). */
function tagsOf(text: string, names: string[], from = 0, to = text.length): JsxTag[] {
  const re = new RegExp(`<(?:${names.join('|')})(?=[\\s<>/])`, 'g')
  re.lastIndex = from
  const tags: JsxTag[] = []
  for (let m = re.exec(text); m && m.index < to; m = re.exec(text)) {
    const tag = readTag(text, m.index)
    tags.push(tag)
    re.lastIndex = tag.end
  }
  return tags
}

/** help literal (não vazio) de uma tag de Field ou FormField, ou undefined. */
function literalHelp(tag: string): string | undefined {
  const help = readAttr(tag, 'help')
  return help && 'literal' in help && help.literal.trim() ? help.literal : undefined
}

/** Orientação abaixo do campo acima do limite do span. */
export function checkFieldHelp(text: string): GuidanceViolation[] {
  const found: GuidanceViolation[] = []
  for (const tag of tagsOf(text, ['Field', 'FormField'])) {
    const help = literalHelp(tag.text)
    if (!help) continue
    const span = readAttr(tag.text, 'span')
    if (span && !('literal' in span)) continue
    const spanName = span && 'literal' in span ? span.literal : 'md'
    const limit = helpLimit(spanName)
    const size = textLength(help)
    if (size <= limit) continue
    found.push({
      line: lineOf(text, tag.start),
      id: 'texto-orientativo',
      message: `Orientação do campo com ${size} caracteres; o limite para span="${spanName}" é ${limit}. Encurte, ou mova para help da seção (modal) ou um bloco recolhido.`,
      src: firstLine(tag.text),
    })
  }
  return found
}

/** Por FormSection: no máximo metade dos campos com orientação literal. */
export function checkSectionHelp(text: string): GuidanceViolation[] {
  const found: GuidanceViolation[] = []
  for (const section of tagsOf(text, ['FormSection'])) {
    const close = text.indexOf('</FormSection>', section.end)
    const end = close === -1 ? text.length : close
    const fields = tagsOf(text, ['Field', 'FormField'], section.end, end)
    const withHelp = fields.filter((f) => literalHelp(f.text)).length
    if (withHelp * 2 <= fields.length) continue
    found.push({
      line: lineOf(text, section.start),
      id: 'texto-orientativo',
      message: `Seção com orientação em ${withHelp} de ${fields.length} campos. No máximo metade dos campos de uma seção tem orientação.`,
      src: firstLine(section.text),
    })
  }
  return found
}

/** description literal do PageHeader acima de 150 caracteres. */
export function checkPageDescription(text: string): GuidanceViolation[] {
  const found: GuidanceViolation[] = []
  for (const tag of tagsOf(text, ['PageHeader'])) {
    const description = readAttr(tag.text, 'description')
    if (!description || !('literal' in description)) continue
    const size = textLength(description.literal)
    if (size <= PAGE_DESCRIPTION_LIMIT) continue
    found.push({
      line: lineOf(text, tag.start),
      id: 'texto-orientativo',
      message: `Descrição da tela com ${size} caracteres; o limite é ${PAGE_DESCRIPTION_LIMIT}. Ela diz o que a tela é; orientação vai em PageHeader help.`,
      src: firstLine(tag.text),
    })
  }
  return found
}

const INSTRUCTION = new RegExp(
  `(?:description=\\{?\\s*["'\`]|<CardDescription>\\s*)(?:${INSTRUCTION_VERBS.join('|')})\\b`,
  'g',
)

/** Subtítulo que começa com verbo de instrução (description e CardDescription). */
export function checkInstruction(text: string): GuidanceViolation[] {
  return [...text.matchAll(INSTRUCTION)].map((m) => ({
    line: lineOf(text, m.index),
    id: 'texto-orientativo' as const,
    message:
      'Instrução no subtítulo. Use help (PageHeader, CardTitle ou FormSection): ícone de informação que abre um modal.',
    src: firstLine(m[0]),
  }))
}

/** Todas as verificações de texto orientativo de uma tela, em ordem de linha. */
export function checkGuidance(text: string): GuidanceViolation[] {
  return [
    ...checkFieldHelp(text),
    ...checkSectionHelp(text),
    ...checkPageDescription(text),
    ...checkInstruction(text),
  ].sort((a, b) => a.line - b.line)
}
