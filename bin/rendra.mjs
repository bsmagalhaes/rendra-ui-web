#!/usr/bin/env node
/*
 * Entrypoint da CLI publicada (`rendra`). Importa só de dist/cli (nunca de src/cli/*.ts): no
 * pacote publicado não existe `src/`, e mesmo dentro deste repositório o comando roda depois
 * de `npm run build:lib`, para a CLI usar sempre o mesmo código compilado que vai para o
 * pacote, nunca um caminho de teste que o consumidor final não teria.
 *
 * Três subcomandos, mais `--help`/sem argumento (ver printHelp, `src/cli/help.ts`):
 *   rendra codigos                    lista o catálogo de códigos de componente
 *   rendra auditar [pasta...] [--all] [--ignore a,b]
 *                                     regras de DESIGN_RULES.md (padrão: cwd atual e as sete
 *                                     genéricas; --all liga as 17; rendra.config.json opcional)
 *   rendra trocar <DE> <PARA> [--dry-run]   troca a variante DE pela PARA no projeto
 */
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DIST_CLI = new URL('../dist/cli/', import.meta.url)

async function importDist(name) {
  const url = new URL(`${name}.js`, DIST_CLI)
  if (!existsSync(fileURLToPath(url))) {
    console.error(
      `Não encontrei dist/cli/${name}.js. Rode "npm run build:lib" antes de usar a CLI.`,
    )
    process.exit(1)
  }
  return import(pathToFileURL(fileURLToPath(url)).href)
}

function printAudit(violations) {
  if (violations.length === 0) {
    console.log('Nenhuma violação encontrada.')
    return
  }
  for (const v of violations) {
    console.error(`\n${v.file}:${v.line}  [${v.rule}] ${v.message}`)
    if (v.source) console.error(`    ${v.source.slice(0, 160)}`)
  }
  console.error(`\n${violations.length} violação(ões) das regras de design.`)
}

function printTrocar(resultado, dryRun) {
  const { reescritos, paraRevisao } = resultado
  if (reescritos.length === 0) {
    console.log('Nenhum arquivo reescrito.')
  } else {
    console.log(
      `${dryRun ? '[simulação] ' : ''}${reescritos.length} arquivo(s)/trecho(s) reescrito(s):`,
    )
    for (const r of reescritos) console.log(`  ${r.file}:${r.line}`)
  }
  if (paraRevisao.length > 0) {
    console.log(`\n${paraRevisao.length} local(is) para revisão manual (não alterados):`)
    for (const r of paraRevisao) console.log(`  ${r.file}:${r.line}  [${r.motivo}] ${r.source}`)
  }
  if (dryRun) console.log('\nSimulação (--dry-run): nada foi gravado em disco.')
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)

  if (!command || command === '--help' || command === '-h') {
    const { formatHelp } = await importDist('help')
    console.log(formatHelp())
    return
  }

  if (command === 'codigos') {
    const { formatCodigos } = await importDist('codigos')
    console.log(formatCodigos())
    return
  }

  if (command === 'auditar') {
    // Toda a decisão (argumentos, base, config, precedência) mora em src/cli/executar-auditar.ts,
    // com teste: aqui só se chama, imprime e define o código de saída.
    const { executarAuditar } = await importDist('executar-auditar')
    const resultado = executarAuditar(rest, process.cwd())
    if ('erro' in resultado) {
      console.error(resultado.erro)
      process.exitCode = 1
      return
    }
    if ('ajuda' in resultado) {
      console.log(resultado.ajuda)
      return
    }
    printAudit(resultado.violacoes)
    process.exitCode = resultado.violacoes.length > 0 ? 1 : 0
    return
  }

  if (command === 'trocar') {
    const positional = rest.filter((a) => !a.startsWith('--'))
    const [de, para] = positional
    const dryRun = rest.includes('--dry-run')
    if (!de || !para) {
      console.error('Uso: rendra trocar <DE> <PARA> [--dry-run]')
      process.exitCode = 1
      return
    }
    const cwd = process.cwd()
    const { loadTypeScript, TYPESCRIPT_NOT_FOUND_MESSAGE } = await importDist('typescript-loader')
    const ts = await loadTypeScript(cwd)
    if (!ts) {
      console.error(TYPESCRIPT_NOT_FOUND_MESSAGE)
      process.exitCode = 1
      return
    }
    const { trocar } = await importDist('trocar')
    try {
      const resultado = trocar({ ts, cwd, de, para, dryRun })
      printTrocar(resultado, dryRun)
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
    return
  }

  console.error('Uso: rendra <codigos|auditar|trocar> ...')
  process.exitCode = 1
}

await main()
