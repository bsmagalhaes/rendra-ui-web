/*
 * Tudo o que `rendra auditar` decide, como função: argumentos, base, config, precedência e a
 * escolha entre `auditar` (sete regras genéricas) e `auditarTudo` (as 17). O `bin` só importa
 * esta função, imprime o resultado e define o código de saída; erro volta como valor, nunca
 * como exceção.
 *
 * Base e caminhos:
 *   - exatamente uma pasta posicional: ela é a base (`file` sai relativo a ela e o
 *     `rendra.config.json` é lido dela); o `pastas` do config dela continua valendo;
 *   - zero ou duas ou mais posicionais: a base é o cwd do processo; duas ou mais substituem
 *     `pastas` (do config ou o atalho para `src`);
 *   - `ignorar`, `pastas`, `pastasMarca`, `pastasTelas` e `file` são relativos à base;
 *   - pasta (posicional ou do config) que resolve fora da base é erro, sem varrer nada.
 * Precedência: a flag substitui a chave do config (`--ignore` substitui `ignorar`), não soma.
 */
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { auditar } from './auditar.ts'
import type { FileAuditViolation, OpcoesAuditar } from './auditar.ts'
import { auditarTudo } from './auditar-tudo.ts'
import { lerArgumentosAuditar } from './argumentos.ts'
import { carregarConfig } from './config.ts'
import { formatHelp } from './help.ts'

export type ResultadoExecucao =
  { violacoes: FileAuditViolation[] } | { erro: string } | { ajuda: string }

/**
 * Pasta relativa à base, com `/`, ou `undefined` quando resolve fora dela. Pasta absoluta
 * dentro da base vale; a própria base vira `.`.
 */
function pastaNaBase(base: string, pasta: string): string | undefined {
  const rel = relative(base, resolve(base, pasta))
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) return undefined
  return rel === '' ? '.' : rel.split(sep).join('/')
}

/** Roda `rendra auditar` com os argumentos de `rest` (o que vem depois de `auditar`). */
export function executarAuditar(rest: string[], cwdProcesso: string): ResultadoExecucao {
  const args = lerArgumentosAuditar(rest)
  if ('erro' in args) return { erro: args.erro }
  if (args.ajuda) return { ajuda: formatHelp() }

  const base = args.pastas.length === 1 ? resolve(cwdProcesso, args.pastas[0]!) : cwdProcesso
  const lida = carregarConfig(base)
  if ('erro' in lida) return { erro: lida.erro }
  const config = lida.config

  const pedidas = args.pastas.length >= 2 ? args.pastas : (config.pastas ?? [])
  const pastas: string[] = []
  for (const pasta of pedidas) {
    const dentro = pastaNaBase(base, pasta)
    if (dentro === undefined) {
      return { erro: `A pasta "${pasta}" fica fora de ${base}. Use só pastas dentro do projeto.` }
    }
    pastas.push(dentro)
  }

  const opcoes: OpcoesAuditar = {
    ...(pastas.length > 0 ? { pastas } : {}),
    ignorar: args.ignorar.length > 0 ? args.ignorar : (config.ignorar ?? []),
    ...(config.regras ? { regras: config.regras } : {}),
  }
  if (args.todas) {
    const { violacoes } = auditarTudo(base, {
      ...opcoes,
      ...(config.pastasMarca ? { pastasMarca: config.pastasMarca } : {}),
      ...(config.pastasTelas ? { pastasTelas: config.pastasTelas } : {}),
    })
    return { violacoes }
  }
  return { violacoes: auditar(base, opcoes) }
}
