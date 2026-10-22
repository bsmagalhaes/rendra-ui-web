/*
 * Bundle inicial e o Motion.
 *
 * O Motion só pode custar bytes a quem liga o `on`. Este script mede e confere duas coisas:
 *
 *  1. VITRINE (app construído, `--app <pasta>`): o fecho ESTÁTICO de imports da entrada
 *     (`index.html`: o script da entrada e os `modulepreload`) não contém o motor do Motion
 *     (animações, gestos, `animate`, `m`). Sobram só o `LazyMotion`, o `MotionConfig` e o
 *     `PresenceContext` (cerca de 13 kB gzip, com a base do elemento visual que o `LazyMotion` arrasta), que ficam montados desde o primeiro quadro para
 *     a chegada do chunk não remontar a árvore. As rotas lazy da demonstração (`/componentes-motion`
 *     e `/dashboard-motion`) continuam a ter o motor, fora do fecho inicial.
 *  2. PACOTE (`--lib <pasta>`, o `dist/` do `build:lib` ou o instalado do tarball): nenhuma entrada,
 *     exceto `motion`, tem no fecho estático um import de `motion` além dos três nomes acima; a
 *     entrada `motion` (`@rendra-ui/web/motion`) importa o conjunto completo do `on`.
 *
 * Uso (de dentro da pasta do pacote):
 *   node scripts/bundle-inicial.mjs --medir     [--app dist] [--lib dist]
 *   node scripts/bundle-inicial.mjs --verificar [--app dist] [--lib dist]
 *
 * `build` grava o app em `dist/` e `build:lib` o apaga: confira a vitrine logo depois do `build` e
 * o pacote logo depois do `build:lib`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

/** O que o código de produção pode importar de `motion` fora da entrada `motion`. */
export const NOMES_ESTATICOS_PERMITIDOS = ['LazyMotion', 'MotionConfig', 'PresenceContext']
/** O que a entrada `motion` precisa entregar (o `on` completo). */
export const NOMES_DA_ENTRADA_MOTION = ['AnimatePresence', 'animate', 'domAnimation', 'm']

/**
 * Assinatura do motor de animação do Motion (`animate`, resolvedor de keyframes, animação de
 * elementos visuais): nomes internos que só existem no código do `domAnimation`/`animate` e nunca
 * no `LazyMotion`/`MotionConfig` nem no código dos componentes. Conferida na linha de base
 * (97e8ec6): só o chunk comum do Motion (`features-animation-*.js`) as tem todas. O chunk que o
 * `LazyMotion` arrasta (a base do elemento visual e do valor animado, que o empacotador não separa
 * do resto do módulo) NÃO leva estes nomes: é o resíduo estático que o relatório mede à parte.
 */
export const ASSINATURA_DO_MOTOR = [
  'animateVisualElement',
  'keyframeResolver',
  'calculatedDuration',
]

function lerImports(codigo) {
  const estaticos = []
  const dinamicos = []
  for (const m of codigo.matchAll(/\bfrom\s*(["'])([^"']+)\1/g)) estaticos.push(m[2])
  for (const m of codigo.matchAll(/\bimport\s*(["'])([^"']+)\1/g)) estaticos.push(m[2])
  for (const m of codigo.matchAll(/\bimport\(\s*(["'])([^"']+)\1\s*\)/g)) dinamicos.push(m[2])
  return { estaticos, dinamicos }
}

/** Nomes importados de `motion`/`motion/...` num arquivo (instruções `import { a, b as c } from`). */
function nomesDeMotion(codigo) {
  const nomes = []
  for (const m of codigo.matchAll(
    /\b(?:import|export)\s*(?!type\b)\{([^}]*)\}\s*from\s*(["'])(motion(?:\/[^"']*)?)\2/g,
  )) {
    for (const n of m[1].split(',')) {
      const nome = n.trim().split(/\s+as\s+/)[0]
      if (nome) nomes.push(nome)
    }
  }
  return nomes
}

const ehMotion = (spec) => spec === 'motion' || spec.startsWith('motion/')

/**
 * Fecho estático (e o que sai por import dinâmico) a partir de arquivos de entrada.
 * `pasta` é a raiz que contém os arquivos; entradas e resolvidos são caminhos absolutos.
 */
export function fecho(entradas) {
  const vistos = new Map() // caminho -> { codigo, estaticos, dinamicos }
  const externos = new Set()
  const fila = [...entradas]
  while (fila.length) {
    const arq = fila.pop()
    if (vistos.has(arq)) continue
    if (!existsSync(arq)) {
      vistos.set(arq, { codigo: '', ausente: true })
      continue
    }
    const codigo = readFileSync(arq, 'utf8')
    const { estaticos, dinamicos } = lerImports(codigo)
    vistos.set(arq, { codigo })
    for (const spec of estaticos) {
      if (spec.startsWith('.')) fila.push(resolve(dirname(arq), spec))
      else externos.add(spec)
    }
  }
  return { arquivos: vistos, externos }
}

function tamanhos(arquivos) {
  let cru = 0
  let gz = 0
  for (const { codigo } of arquivos.values()) {
    cru += Buffer.byteLength(codigo)
    gz += gzipSync(codigo, { level: 9 }).length
  }
  return { cru, gz }
}

const fmt = (n) => n.toLocaleString('pt-BR')
const temMotor = (codigo) => ASSINATURA_DO_MOTOR.every((s) => codigo.includes(s))

/** Entradas do `index.html`: o script de entrada e os `modulepreload`. */
function entradasDoHtml(pasta) {
  const html = readFileSync(join(pasta, 'index.html'), 'utf8')
  const hrefs = []
  for (const m of html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)) hrefs.push(m[1])
  for (const m of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g))
    hrefs.push(m[1])
  for (const m of html.matchAll(/<link[^>]*href="([^"]+)"[^>]*rel="modulepreload"/g))
    hrefs.push(m[1])
  return [...new Set(hrefs)].map((h) => join(pasta, h.replace(/^\/+/, '')))
}

/** Mede e confere a vitrine. Devolve { linhas, problemas, medidas }. */
export function analisarApp(pasta) {
  const raiz = resolve(pasta)
  const entradas = entradasDoHtml(raiz)
  const ini = fecho(entradas)
  const { cru, gz } = tamanhos(ini.arquivos)
  const comMotor = [...ini.arquivos].filter(([, v]) => temMotor(v.codigo)).map(([k]) => k)
  const todos = readdirSync(join(raiz, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => join(raiz, 'assets', f))
  const chunkMotor = todos.filter((f) => temMotor(readFileSync(f, 'utf8')))
  const rota = (nome) => todos.find((f) => new RegExp(`/${nome}-[^/]+\\.js$`).test(f))
  const rotas = ['components-motion-page', 'dashboard-motion-page'].map((n) => {
    const f = rota(n)
    if (!f) return { nome: n, achou: false, motor: false }
    const { arquivos } = fecho([f])
    return { nome: n, achou: true, motor: [...arquivos.values()].some((v) => temMotor(v.codigo)) }
  })
  const nomesNoInicial = [...ini.arquivos.values()].flatMap((v) => nomesDeMotion(v.codigo))
  const problemas = []
  if (comMotor.length)
    problemas.push(
      `o fecho inicial da vitrine contém o motor do Motion: ${comMotor.map((f) => f.replace(raiz + '/', '')).join(', ')}`,
    )
  if (!chunkMotor.length)
    problemas.push(
      'nenhum chunk da vitrine tem a assinatura do motor (o marcador perdeu o sentido)',
    )
  for (const r of rotas) {
    if (!r.achou) problemas.push(`a rota lazy ${r.nome} não existe no build`)
    else if (!r.motor) problemas.push(`a rota lazy ${r.nome} não leva o motor do Motion`)
  }
  const linhas = [
    `VITRINE (${pasta}): fecho estático da entrada`,
    `  arquivos: ${ini.arquivos.size}, ${fmt(cru)} B crus, ${fmt(gz)} B gzip -9`,
    ...[...ini.arquivos]
      .map(([k, v]) => [
        k.split('/').pop(),
        Buffer.byteLength(v.codigo),
        gzipSync(v.codigo, { level: 9 }).length,
      ])
      .sort((a, b) => b[1] - a[1])
      .map(([n, c, g]) => `    ${n}: ${fmt(c)} B, ${fmt(g)} B gzip`),
    `  motor do Motion no fecho inicial: ${comMotor.length ? 'SIM (' + comMotor.map((f) => f.split('/').pop()).join(', ') + ')' : 'não'}`,
    `  chunks com o motor (em qualquer lugar): ${chunkMotor.map((f) => f.split('/').pop() + ' ' + fmt(Buffer.byteLength(readFileSync(f))) + ' B').join('; ') || 'nenhum'}`,
    `  rotas lazy com o motor: ${rotas.map((r) => `${r.nome}=${r.motor ? 'sim' : 'não'}`).join(', ')}`,
    `  nomes importados de motion no fecho inicial: ${[...new Set(nomesNoInicial)].sort().join(', ') || '(nenhum)'}`,
  ]
  return { linhas, problemas, medidas: { arquivos: ini.arquivos.size, cru, gz } }
}

/** Entradas do pacote: `exports` do package.json (import) ou, sem ele, os .js da pasta. */
function entradasDoPacote(pasta) {
  const raiz = resolve(pasta)
  const nomes = readdirSync(raiz).filter((f) => f.endsWith('.js'))
  const entradas = {}
  for (const f of nomes) {
    const nome = f.replace(/\.js$/, '')
    // entradas finas: as que o package.json publica (as demais são chunks compartilhados)
    if (
      [
        'index',
        'router-bridge',
        'document-viewer',
        'rich-text-editor',
        'chart',
        'widget-grid',
        'motion',
      ].includes(nome)
    )
      entradas[nome] = join(raiz, f)
  }
  return entradas
}

/** Mede e confere o pacote construído. */
export function analisarLib(pasta) {
  const entradas = entradasDoPacote(pasta)
  const problemas = []
  const linhas = [`PACOTE (${pasta}): fecho estático por entrada`]
  for (const [nome, arq] of Object.entries(entradas)) {
    const { arquivos, externos } = fecho([arq])
    const nomes = [...arquivos.values()].flatMap((v) => nomesDeMotion(v.codigo))
    const comMotion = [...externos].filter(ehMotion)
    const { cru, gz } = tamanhos(arquivos)
    linhas.push(
      `  ${nome.padEnd(17)} ${String(arquivos.size).padStart(3)} arq, ${fmt(cru).padStart(9)} B, ${fmt(gz).padStart(8)} B gzip; motion: ${[...new Set(nomes)].sort().join(', ') || '(nenhum)'}`,
    )
    if (nome === 'motion') {
      for (const n of NOMES_DA_ENTRADA_MOTION)
        if (!nomes.includes(n))
          problemas.push(`a entrada motion não importa \`${n}\` de motion/react`)
      continue
    }
    if (comMotion.length === 0 && nomes.length === 0) continue
    const sobra = [...new Set(nomes)].filter((n) => !NOMES_ESTATICOS_PERMITIDOS.includes(n))
    if (sobra.length)
      problemas.push(`a entrada ${nome} importa de motion no fecho estático: ${sobra.join(', ')}`)
  }
  if (!entradas.index) problemas.push('o pacote não tem index.js')
  if (!entradas.motion)
    problemas.push('o pacote não tem a entrada motion.js (@rendra-ui/web/motion)')
  return { linhas, problemas }
}

function main() {
  const args = process.argv.slice(2)
  const valor = (flag) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : undefined
  }
  const verificar = args.includes('--verificar')
  if (!verificar && !args.includes('--medir')) {
    console.error('Use --medir ou --verificar, com --app <pasta> e/ou --lib <pasta>.')
    process.exit(2)
  }
  const app = valor('--app')
  const lib = valor('--lib')
  if (!app && !lib) {
    console.error('Informe --app <pasta> (vitrine) e/ou --lib <pasta> (pacote).')
    process.exit(2)
  }
  const problemas = []
  for (const r of [app && analisarApp(app), lib && analisarLib(lib)].filter(Boolean)) {
    console.log(r.linhas.join('\n'))
    problemas.push(...r.problemas)
  }
  if (problemas.length) {
    console.log('\n' + (verificar ? 'FALHOU' : 'ATENÇÃO') + ':\n- ' + problemas.join('\n- '))
    if (verificar) process.exit(1)
  } else if (verificar) console.log('\nOK: o Motion só custa bytes a quem liga o `on`.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
