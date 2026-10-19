/*
 * Regras genéricas de design (DESIGN_RULES.md) que não são específicas deste repositório:
 * qualquer projeto que use o Rendra pode ter cor fixa, valor arbitrário do Tailwind, estilo
 * inline, fonte fixa, 100vh ou raio fixo. Módulo único: `scripts/check-design-rules.mjs` (as
 * regras deste repositório, mais as específicas: var-inline, svg-marca, classe-dinamica,
 * texto-estreito, primaria-como-texto, componente-duplicado, css-fora-do-lugar, botao-solto)
 * e `rendra auditar` (a CLI publicada, para qualquer projeto de destino) importam daqui, para
 * nunca divergir.
 *
 * Duas camadas:
 *   - `auditLines(text)`: pura, sem acesso a arquivo. Recebe o texto de UM arquivo e devolve
 *     as violações das sete regras (linha, regra, mensagem, trecho). `check-design-rules.mjs`
 *     chama isso por arquivo, porque ele já tem sua própria varredura de diretório com a
 *     exceção `src/brand`/`src/styles` (regras próprias do tema deste repositório, que não
 *     fazem sentido num projeto de destino qualquer).
 *   - `auditar(cwd, opcoes?)`: varre `cwd` (ou `cwd/src`, quando existir) sozinha e devolve a
 *     lista completa. Por padrão, sem exceção de diretório; `opcoes` (`pastas`, `ignorar`,
 *     `regras`) são opt-in e, sem elas, o resultado é o de sempre. É o que `rendra auditar`
 *     chama. As regras do vocabulário do Rendra (as dez extras) ficam em `auditar-tudo.ts`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export interface AuditViolation {
  line: number
  rule: string
  message: string
  source: string
}

export interface FileAuditViolation extends AuditViolation {
  file: string
}

interface LineRule {
  id: string
  test: RegExp
  message: string
  skipLine?: (line: string) => boolean
}

const isCommentLine = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line)

/** As seis regras genéricas mais simples: um regex por linha. */
export const LINE_RULES: LineRule[] = [
  {
    id: 'cor-fixa',
    test: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/g,
    message: 'Cor fixa em componente. Use um token semântico (bg-primary, text-muted-foreground).',
    skipLine: (line) => isCommentLine(line) || /&#\d+;/.test(line),
  },
  {
    id: 'valor-arbitrario',
    // Valor arbitrário (p-[13px]). Variantes de estado (data-[state=open]:) terminam em ':' e são
    // permitidas; transition-[...] só lista propriedades, também permitido.
    test: /(?<![\w-])(?:[a-z]+:)*-?(?!transition-)[a-z][a-z-]*-\[[^\]\s]+\](?!(?:\/[\w-]+)?:)/g,
    message: 'Valor arbitrário do Tailwind. Use a escala de tokens ou crie um token nomeado.',
    skipLine: isCommentLine,
  },
  {
    id: 'estilo-inline',
    // Qualquer style= que não seja só variável CSS (--x) é estilo inline.
    test: /style=\{(?![^}]*['"]--)(?!\s*$)/g,
    message: 'Estilo inline. Use classes; para valor dinâmico use variável CSS (--x).',
  },
  {
    id: 'fonte-fixa',
    // Só em contexto de fonte (declaração ou nome entre aspas numa pilha de fontes): a
    // palavra "Inter" num texto da interface não é violação.
    test: /font-family|fontFamily|['"](?:Poppins|Inter|Roboto|Arial|Helvetica)(?:['",]| sans| serif)/g,
    message:
      'Nome de fonte fixo. A fonte vem da variável de tema da marca (ex.: --rendra-brand-font).',
  },
  {
    id: '100vh',
    test: /100vh|\bh-screen\b|\bmin-h-screen\b/g,
    message: 'Use 100dvh (h-dvh / min-h-dvh), nunca 100vh.',
  },
  {
    id: 'raio-fixo',
    // border-radius fixo em CSS ou em estilo inline (borderRadius): nunca em px/rem/% direto,
    // sempre por um token de raio por papel (rounded-control, rounded-surface, rounded-item...)
    // ou uma variável de tema (--rendra-shape-*, --rendra-radius).
    test: /border-radius\s*:\s*(?!var\()\d|borderRadius\s*:\s*(?!['"`]?var\()['"`]?\d/g,
    message:
      'Raio fixo. Use um token de raio por papel (rounded-control, rounded-surface, rounded-item...) ou uma variável de tema.',
    skipLine: isCommentLine,
  },
]

// Degraus fora da escala não geram CSS (o Tailwind ignora em silêncio e o layout quebra).
const ALLOWED_STEPS = new Set(['0', '1', '2', '3', '4', '6', '8', '12', '16', '24'])
const STEP_CLASS =
  /(?<![\w-])-?(?:p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|w|h|size|min-[wh]|max-[wh]|inset(?:-[xy])?|top|left|right|bottom|space-[xy]|translate-[xy]|scroll-[mp][xytrbl]?)-(\d+(?:\.\d+)?)(?![\d/.\w-])/g

/** Sétima regra ("fora-da-escala"): olha todos os degraus da linha, não só o primeiro. */
function checkForaDaEscala(line: string): boolean {
  for (const m of line.matchAll(STEP_CLASS)) if (!ALLOWED_STEPS.has(m[1]!)) return true
  return false
}

/**
 * Varre o texto de um arquivo (linha a linha) contra as sete regras genéricas de
 * DESIGN_RULES.md. Pura: não lê arquivo, não decide o que é escopo do projeto (isso é de quem
 * chama, como `auditar` abaixo ou o `walk`/`ALLOWED_DIRS` de check-design-rules.mjs).
 */
export function auditLines(text: string): AuditViolation[] {
  const found: AuditViolation[] = []
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    for (const rule of LINE_RULES) {
      if (rule.skipLine?.(line)) continue
      rule.test.lastIndex = 0
      if (rule.test.test(line)) {
        found.push({ line: i + 1, rule: rule.id, message: rule.message, source: line.trim() })
      }
    }
    if (!isCommentLine(line) && checkForaDaEscala(line)) {
      found.push({
        line: i + 1,
        rule: 'fora-da-escala',
        message:
          'Degrau fora da escala (permitidos: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24). Use a escala ou um token nomeado.',
        source: line.trim(),
      })
    }
  })
  return found
}

export const NOMES_PULADOS = new Set(['node_modules', 'dist', 'build', '.git', '.storybook-static'])

/** Opções de `auditar`. Todas opcionais: sem elas, o comportamento é o de sempre. */
export interface OpcoesAuditar {
  /** Pastas a varrer, relativas a `cwd`. Valem como estão (sem o atalho para `src`). */
  pastas?: string[]
  /** Pastas a pular, relativas a `cwd`: prefixo de pasta, nunca glob nem prefixo de texto. */
  ignorar?: string[]
  /** `{ "<id>": false }` desliga a regra de identificador `<id>`. */
  regras?: Record<string, boolean>
}

/** `./src/brand/` e `src\\brand` viram `src/brand`; o que sobrar vazio (`.`, `./`) é descartado. */
function normalizarPrefixo(prefixo: string): string {
  let p = prefixo.replace(/\\/g, '/')
  while (p.startsWith('./')) p = p.slice(2)
  p = p.replace(/\/+$/, '')
  return p === '.' ? '' : p
}

/**
 * `file` (relativo a `cwd`, com `/`) está numa das pastas de `prefixos`? Prefixo de pasta:
 * `src/brand` casa `src/brand` e `src/brand/x.ts`, nunca `src/brand-novo/x.ts` nem, com
 * `src/br`, `src/brand`.
 */
export function casaPrefixo(file: string, prefixos: string[]): boolean {
  return prefixos.some((bruto) => {
    const p = normalizarPrefixo(bruto)
    return p !== '' && (file === p || file.startsWith(p + '/'))
  })
}

/**
 * Lista os arquivos sob `dir`. `pular(nome, caminho)` decide por pasta ou arquivo se a entrada
 * fica de fora (a pasta pulada não é aberta). Ordem: a do sistema de arquivos, como sempre.
 */
export function percorrer(
  dir: string,
  pular: (nome: string, caminho: string) => boolean,
): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (pular(name, full)) return []
    return statSync(full).isDirectory() ? percorrer(full, pular) : [full]
  })
}

export const EXTENSAO_VARRIDA = /\.(tsx?|jsx?|css)$/

/**
 * Varre `cwd` (ou `cwd/src`, quando existir: a convenção deste boilerplate e da maioria dos
 * projetos React) por arquivos `.ts`/`.tsx`/`.js`/`.jsx`/`.css`, ignorando teste e story, e
 * devolve toda violação das sete regras genéricas. É o que `rendra auditar [cwd]` chama; não
 * imprime nada e não lança (a CLI decide o formato de saída e o código de saída).
 *
 * Com `opcoes.pastas`, varre exatamente essas pastas (relativas a `cwd`, sem o atalho para
 * `src`); com `opcoes.ignorar`, pula as pastas dadas; `opcoes.regras` desliga regras por id.
 * `file` sai sempre relativo a `cwd`, com `/`, ordenado por arquivo e linha.
 */
export function auditar(cwd: string, opcoes: OpcoesAuditar = {}): FileAuditViolation[] {
  const ignorar = opcoes.ignorar ?? []
  const relativo = (caminho: string) => relative(cwd, caminho).split(sep).join('/')
  const raizes =
    opcoes.pastas && opcoes.pastas.length > 0
      ? opcoes.pastas.map((p) => join(cwd, p))
      : [existsSync(join(cwd, 'src')) ? join(cwd, 'src') : cwd]
  const arquivos = new Set<string>()
  for (const raiz of raizes) {
    if (!existsSync(raiz)) continue
    const pular = (nome: string, caminho: string) =>
      NOMES_PULADOS.has(nome) || casaPrefixo(relativo(caminho), ignorar)
    for (const f of percorrer(raiz, pular)) arquivos.add(f)
  }
  const problems: FileAuditViolation[] = []
  for (const file of arquivos) {
    if (!EXTENSAO_VARRIDA.test(file) || file.includes('.test.') || file.includes('.stories.'))
      continue
    const rel = relativo(file)
    const text = readFileSync(file, 'utf8')
    for (const violation of auditLines(text)) {
      if (opcoes.regras?.[violation.rule] === false) continue
      problems.push({ file: rel, ...violation })
    }
  }
  return problems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}
