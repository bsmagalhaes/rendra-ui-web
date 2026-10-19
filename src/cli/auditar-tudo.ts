/*
 * A varredura completa, com as 17 regras (as sete genéricas de `auditar.ts` mais as dez de
 * `regras-extras.ts`). É o que `rendra auditar --all` e o `check:rules` do repositório
 * (scripts/check-design-rules.mjs) chamam: a mesma lógica, em dois modos.
 *
 *   - `cli`: o modo do projeto de destino. Raiz como em `auditar` (`src` se existir, senão a
 *     pasta), sem `node_modules`/`dist`/`build`, sem teste nem story, `ignorar` e `pastas` do
 *     projeto, pastas de marca e de telas parametrizáveis. Saída ordenada por arquivo e linha.
 *   - `repositorio`: o modo do `check:rules`. Varre só `src`, sem pular nada (teste e story
 *     entram), com as pastas deste repositório, e NÃO ordena: a saída segue a ordem da varredura
 *     e, por arquivo, a ordem das regras abaixo, a mesma de sempre.
 *
 * Ordem das regras por arquivo (ela decide a ordem impressa no modo `repositorio`):
 *   1. `componente-duplicado` (pelo nome); 2. `variavel-sem-prefixo-rendra`; 3. arquivo de
 *   marca: para aqui; 4. `.css`: `css-fora-do-lugar` e para; 5. nas telas: `texto-orientativo` e
 *   `botao-solto`; 6. as sete genéricas; 7. as cinco regras de uma linha.
 *
 * Imports relativos com extensão `.ts`: o `check:rules` carrega esta cadeia direto no Node
 * (type stripping), que não resolve import sem extensão. Só `import type` para tipos, e nada
 * que o Node não apague (sem enum, namespace ou parameter property).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  IDS_REGRAS_GENERICAS,
  auditLines,
  casaPrefixo,
  coletarArquivos,
  EXTENSAO_VARRIDA,
  percorrer,
  relativoA,
} from './auditar.ts'
import type { FileAuditViolation, OpcoesAuditar } from './auditar.ts'
import {
  IDS_REGRAS_EXTRAS,
  botaoSolto,
  componenteDuplicado,
  cssForaDoLugar,
  regrasPorLinha,
  textoOrientativo,
  variavelSemPrefixo,
} from './regras-extras.ts'

/** Os 17 identificadores de regra, na ordem da documentação (genéricas e depois extras). */
export const IDS_TODAS_AS_REGRAS: string[] = [...IDS_REGRAS_GENERICAS, ...IDS_REGRAS_EXTRAS]

export interface OpcoesAuditarTudo extends OpcoesAuditar {
  modo?: 'cli' | 'repositorio'
  /** Pastas de marca (relativas a `cwd`): só passam pelo prefixo `--rendra-`. */
  pastasMarca?: string[]
  /** Pastas de telas do sistema (relativas a `cwd`): `texto-orientativo` e `botao-solto`. */
  pastasTelas?: string[]
}

export interface ResultadoAuditarTudo {
  violacoes: FileAuditViolation[]
  /** Quantos arquivos foram varridos (o `check:rules` imprime esse número). */
  arquivos: number
}

/** Padrões do boilerplate Rendra, usados quando o projeto não diz outra coisa. */
export const PASTAS_MARCA_PADRAO = ['src/brand', 'src/styles']
export const PASTAS_TELAS_PADRAO = ['src/pages/app']
// src/cli entra na exceção só no repositório do próprio Rendra: lá moram as regras, com o nome
// e o texto de cada uma escritos por extenso, e o verificador acusaria a si mesmo.
const PASTAS_MARCA_REPOSITORIO = [...PASTAS_MARCA_PADRAO, 'src/cli']

/** Arquivos do modo `repositorio`: tudo sob `src`, sem pular nada, na ordem do sistema. */
function arquivosDoRepositorio(cwd: string): string[] {
  const src = join(cwd, 'src')
  if (!existsSync(src)) return []
  return percorrer(src, () => false).filter((f) => EXTENSAO_VARRIDA.test(f))
}

/**
 * Varre `cwd` com as 17 regras. Não lê `rendra.config.json` (quem lê é `executarAuditar`),
 * não imprime e não lança.
 */
export function auditarTudo(cwd: string, opcoes: OpcoesAuditarTudo = {}): ResultadoAuditarTudo {
  const repositorio = opcoes.modo === 'repositorio'
  const marca = opcoes.pastasMarca ?? (repositorio ? PASTAS_MARCA_REPOSITORIO : PASTAS_MARCA_PADRAO)
  const telas = opcoes.pastasTelas ?? PASTAS_TELAS_PADRAO
  const ligada = (id: string) => opcoes.regras?.[id] !== false

  // No repositório vale a semântica de sempre (`startsWith` no caminho absoluto, sem `/` final);
  // no projeto de destino, pasta de verdade (`src/brand` não casa `src/brand-novo`).
  const dentro = (arquivo: string, rel: string, pastas: string[]) =>
    repositorio ? pastas.some((p) => arquivo.startsWith(join(cwd, p))) : casaPrefixo(rel, pastas)

  const arquivos = repositorio ? arquivosDoRepositorio(cwd) : coletarArquivos(cwd, opcoes)
  const problemas: FileAuditViolation[] = []
  const emitir = (file: string, achados: Omit<FileAuditViolation, 'file'>[]) => {
    for (const a of achados) if (ligada(a.rule)) problemas.push({ file, ...a })
  }

  for (const arquivo of arquivos) {
    const rel = relativoA(cwd, arquivo)
    const duplicado = componenteDuplicado(repositorio ? arquivo : rel)
    if (duplicado) emitir(rel, [duplicado])
    const texto = readFileSync(arquivo, 'utf8')
    emitir(rel, variavelSemPrefixo(texto))

    if (dentro(arquivo, rel, marca)) continue
    if (arquivo.endsWith('.css')) {
      emitir(rel, [cssForaDoLugar()])
      continue
    }
    if (dentro(arquivo, rel, telas)) {
      emitir(rel, textoOrientativo(texto))
      emitir(rel, botaoSolto(texto))
    }
    emitir(rel, auditLines(texto))
    emitir(rel, regrasPorLinha(texto))
  }

  if (!repositorio) {
    problemas.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  }
  return { violacoes: problemas, arquivos: arquivos.length }
}
