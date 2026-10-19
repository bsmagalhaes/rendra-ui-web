/*
 * `rendra.config.json`: a configuração opcional do `rendra auditar`, lida da pasta base do
 * projeto de destino (nunca deste repositório). Arquivo ausente = config vazia, e o padrão da
 * CLI não muda. Erro (JSON inválido, chave desconhecida, tipo errado, regra desconhecida) volta
 * como valor `{ erro }`, em português, nunca como exceção: quem chama (`executarAuditar`) o
 * repassa ao `bin`, que imprime e sai com 1.
 *
 * Chaves (todas opcionais):
 *   pastas       pastas a varrer, relativas à base (substitui o atalho para `src`)
 *   ignorar      pastas a pular, por prefixo de pasta (sem glob)
 *   regras       { "<id>": false } desliga a regra de identificador `<id>`
 *   pastasMarca  pastas de marca: só passam pelo prefixo --rendra- (com `--all`)
 *   pastasTelas  pastas de telas do sistema: texto-orientativo e botao-solto (com `--all`)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { IDS_TODAS_AS_REGRAS } from './auditar-tudo.ts'

export const NOME_ARQUIVO_CONFIG = 'rendra.config.json'
export const CHAVES_CONFIG = ['pastas', 'ignorar', 'regras', 'pastasMarca', 'pastasTelas'] as const
const CHAVES_LISTA = ['pastas', 'ignorar', 'pastasMarca', 'pastasTelas'] as const

export interface ConfigAuditar {
  pastas?: string[]
  ignorar?: string[]
  regras?: Record<string, boolean>
  pastasMarca?: string[]
  pastasTelas?: string[]
}

export type ResultadoConfig = { config: ConfigAuditar } | { erro: string }

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const erro = (mensagem: string): { erro: string } => ({
  erro: `${NOME_ARQUIVO_CONFIG}: ${mensagem}`,
})

/** Lê e valida `rendra.config.json` em `base`. Ausente devolve `{ config: {} }`. */
export function carregarConfig(base: string): ResultadoConfig {
  const caminho = join(base, NOME_ARQUIVO_CONFIG)
  let texto: string
  try {
    texto = readFileSync(caminho, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { config: {} }
    return erro(`não consegui ler o arquivo (${(e as Error).message}).`)
  }
  let dados: unknown
  try {
    dados = JSON.parse(texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto)
  } catch (e) {
    return erro(`JSON inválido (${(e as Error).message}).`)
  }
  if (!ehObjeto(dados)) return erro('o conteúdo precisa ser um objeto JSON ({ ... }).')

  for (const chave of Object.keys(dados)) {
    if (!(CHAVES_CONFIG as readonly string[]).includes(chave)) {
      return erro(`chave desconhecida "${chave}". Chaves aceitas: ${CHAVES_CONFIG.join(', ')}.`)
    }
  }
  const config: ConfigAuditar = {}
  for (const chave of CHAVES_LISTA) {
    const valor = dados[chave]
    if (valor === undefined) continue
    if (!Array.isArray(valor) || !valor.every((x) => typeof x === 'string')) {
      return erro(`"${chave}" precisa ser uma lista de textos.`)
    }
    config[chave] = valor as string[]
  }
  if (dados.regras !== undefined) {
    if (!ehObjeto(dados.regras)) return erro('"regras" precisa ser um objeto ({ "<id>": false }).')
    const regras: Record<string, boolean> = {}
    for (const [id, ligada] of Object.entries(dados.regras)) {
      if (!IDS_TODAS_AS_REGRAS.includes(id)) {
        return erro(
          `regra desconhecida "${id}". Regras válidas: ${IDS_TODAS_AS_REGRAS.join(', ')}.`,
        )
      }
      if (typeof ligada !== 'boolean') return erro(`"regras.${id}" precisa ser true ou false.`)
      regras[id] = ligada
    }
    config.regras = regras
  }
  return { config }
}
