/*
 * Leitura dos argumentos de `rendra auditar`: função pura, para o `bin` ficar fino e a regra
 * ter teste. Aceita, em qualquer ordem:
 *   pasta [pasta...]            uma ou mais pastas posicionais
 *   --all                       liga a varredura completa (as 17 regras)
 *   --ignore a,b                pastas a pular; vale também `--ignore a --ignore b` e
 *                               `--ignore=a,b`. O valor nunca vira pasta posicional.
 *   --help, -h                  a ajuda geral
 * Qualquer outro argumento que comece com `-` é flag desconhecida: erro, nada é varrido.
 */

/** As flags que `rendra auditar` entende. */
export const FLAGS_AUDITAR = ['--all', '--ignore', '--help'] as const

export interface ArgumentosAuditar {
  pastas: string[]
  ignorar: string[]
  todas: boolean
  ajuda: boolean
}

const MENSAGEM_SEM_VALOR =
  'Falta o valor de --ignore. Use --ignore a,b, --ignore a --ignore b ou --ignore=a,b.'

const itens = (valor: string) =>
  valor
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')

/** Lê os argumentos que vêm depois de `auditar`. Erro volta como `{ erro }`, nunca lança. */
export function lerArgumentosAuditar(rest: string[]): ArgumentosAuditar | { erro: string } {
  const lido: ArgumentosAuditar = { pastas: [], ignorar: [], todas: false, ajuda: false }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!
    if (arg === '--all') {
      lido.todas = true
    } else if (arg === '--help' || arg === '-h') {
      lido.ajuda = true
    } else if (arg === '--ignore' || arg.startsWith('--ignore=')) {
      let bruto: string | undefined
      if (arg === '--ignore') {
        const proximo = rest[i + 1]
        if (proximo !== undefined && !proximo.startsWith('-')) {
          bruto = proximo
          i++
        }
      } else {
        bruto = arg.slice('--ignore='.length)
      }
      const valores = bruto === undefined ? [] : itens(bruto)
      if (valores.length === 0) return { erro: MENSAGEM_SEM_VALOR }
      lido.ignorar.push(...valores)
    } else if (arg.startsWith('-')) {
      return { erro: `Flag desconhecida: ${arg}. Flags aceitas: ${FLAGS_AUDITAR.join(', ')}.` }
    } else {
      lido.pastas.push(arg)
    }
  }
  return lido
}
