/*
 * As dez regras que vão além das sete genéricas de `auditar.ts`: as do vocabulário e da
 * convenção de pastas do Rendra. Rodam em `rendra auditar --all` e no `check:rules`
 * (scripts/check-design-rules.mjs, que chama `auditarTudo`), sempre pelo mesmo código, para as
 * duas verificações nunca divergirem.
 *
 * Funções puras: recebem o texto (ou o caminho) de UM arquivo e devolvem violações no formato
 * `AuditViolation` (`line`, `rule`, `message`, `source`). Quem decide em que arquivo cada regra
 * roda (pastas de marca, pastas de telas) é `auditar-tudo.ts`; nenhuma pasta é fixada aqui.
 *
 * Imports relativos com extensão `.ts`: o `check:rules` carrega esta cadeia direto no Node
 * (type stripping), que não resolve import sem extensão.
 */
import type { AuditViolation } from './auditar.ts'
import { checkGuidance } from './help-length.ts'
import { checkVarPrefix } from './var-prefix.ts'

/** Identificadores das regras extras, na ordem em que a documentação as lista. */
export const IDS_REGRAS_EXTRAS = [
  'var-inline',
  'svg-marca',
  'classe-dinamica',
  'texto-estreito',
  'primaria-como-texto',
  'componente-duplicado',
  'css-fora-do-lugar',
  'botao-solto',
  'texto-orientativo',
  'variavel-sem-prefixo-rendra',
] as const

export type IdRegraExtra = (typeof IDS_REGRAS_EXTRAS)[number]

interface RegraPorLinha {
  id: IdRegraExtra
  test: RegExp
  message: string
  skipLine?: (line: string) => boolean
}

/** As cinco regras de uma linha só, na ordem em que eram verificadas. */
const REGRAS_POR_LINHA: RegraPorLinha[] = [
  {
    id: 'var-inline',
    test: /var\(--(?:color|radius|shadow|font|spacing)-/g,
    message:
      'Variáveis --color-*, --radius-* etc. do Tailwind são inline e não existem no CSS. Em JS use as do tema: var(--rendra-primary), var(--rendra-chart-1), var(--rendra-shape-control).',
  },
  {
    id: 'svg-marca',
    test: /from\s+['"][^'"]*brand\/assets[^'"]*['"]/g,
    message:
      'SVG de marca importado fora de src/brand. Leia o logotipo e o símbolo via useBrand().',
  },
  {
    id: 'classe-dinamica',
    // O Tailwind só gera classes escritas por inteiro no código: `p-${n}` não existe no CSS.
    test: /(?<![\w-])(?:[a-z]+:)*-?(?:p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|w|h|size|min-[wh]|max-[wh]|inset|top|left|right|bottom|z|text|bg|border(?:-[xytrbl])?|rounded(?:-[a-z]+)?|grid-cols|grid-rows|col-span|row-span|space-[xy]|translate-[xy]|opacity|font|leading|tracking|shadow|ring|fill|stroke|line-clamp|basis|order)-\$\{/g,
    message:
      'Classe montada por template string não é gerada pelo Tailwind. Escreva a classe inteira (mapa de valores) ou use variável CSS.',
    skipLine: (line) => /^\s*(\/\/|\*|\/\*)/.test(line),
  },
  {
    id: 'texto-estreito',
    test: /<p\s[^>]*className=["'{][^>]*max-w-/g,
    message:
      'Texto ocupa 100% da largura disponível. Limite de largura (max-w-*) em parágrafo só quando o layout pedir outra medida.',
  },
  {
    id: 'primaria-como-texto',
    test: /(?<![\w-])(?:[\w-]+:)*text-primary(?![\w-])/g,
    message:
      'Primária como texto usa text-primary-text (tom que passa AA no claro e no escuro). text-primary é só para o preenchimento.',
  },
]

/**
 * Varre o texto linha a linha contra as cinco regras de uma linha (`var-inline`, `svg-marca`,
 * `classe-dinamica`, `texto-estreito`, `primaria-como-texto`). Por linha, as regras saem na
 * ordem da lista acima.
 */
export function regrasPorLinha(text: string): AuditViolation[] {
  const found: AuditViolation[] = []
  text.split('\n').forEach((line, i) => {
    for (const regra of REGRAS_POR_LINHA) {
      if (regra.skipLine?.(line)) continue
      regra.test.lastIndex = 0
      if (regra.test.test(line)) {
        found.push({ line: i + 1, rule: regra.id, message: regra.message, source: line.trim() })
      }
    }
  })
  return found
}

const NOME_PROIBIDO = /(Mobile|Simples|Simple|ComBusca|Grande|Pequeno|Small|Large)\.(t|j)sx?$/i
const NOME_PROIBIDO_KEBAB = /-(mobile|simples|simple|com-busca|grande|pequeno)\.(t|j)sx?$/i

/** `componente-duplicado`: pelo NOME do arquivo (variante mobile ou paralela). Linha 0. */
export function componenteDuplicado(caminho: string): AuditViolation | undefined {
  if (!NOME_PROIBIDO.test(caminho) && !NOME_PROIBIDO_KEBAB.test(caminho)) return undefined
  return {
    line: 0,
    rule: 'componente-duplicado',
    message: 'Arquivo de variante paralela ou mobile. Resolva com props no componente único.',
    source: '',
  }
}

/** `css-fora-do-lugar`: quem chama já decidiu que o `.css` está fora das pastas de marca. */
export function cssForaDoLugar(): AuditViolation {
  return {
    line: 0,
    rule: 'css-fora-do-lugar',
    message:
      'CSS fora de src/styles e src/brand. Estilo de componente é classe do Tailwind; token vai em globals.css; marca, em theme.css.',
    source: '',
  }
}

const BOTAO_SOLTO =
  /<CardContent\b[^>]*>\s*(?:<Stack\b[^>]*>\s*)?<Button\b|<Button\b[^>]*\bself-(?:start|end|center)\b/g

/** `botao-solto`: olha o arquivo inteiro (JSX em várias linhas); só nas telas do sistema. */
export function botaoSolto(text: string): AuditViolation[] {
  return [...text.matchAll(BOTAO_SOLTO)].map((m) => ({
    line: text.slice(0, m.index).split('\n').length,
    rule: 'botao-solto',
    message:
      'Botão solto no conteúdo. Ação de card vai em CardHeader actions; da tela, no PageHeader actions ou na ActionBar.',
    source: m[0].split('\n')[0]!.trim(),
  }))
}

/** `texto-orientativo` (regra C7, em help-length.ts), no formato de `AuditViolation`. */
export function textoOrientativo(text: string): AuditViolation[] {
  return checkGuidance(text).map((p) => ({
    line: p.line,
    rule: p.id,
    message: p.message,
    source: p.src,
  }))
}

/** `variavel-sem-prefixo-rendra` (em var-prefix.ts), no formato de `AuditViolation`. */
export function variavelSemPrefixo(text: string): AuditViolation[] {
  return checkVarPrefix(text).map((p) => ({
    line: p.line,
    rule: 'variavel-sem-prefixo-rendra',
    message: p.message,
    source: p.src,
  }))
}
