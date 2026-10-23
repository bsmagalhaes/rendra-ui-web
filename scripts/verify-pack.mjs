/*
 * Verifica o pacote publicável (@rendra-ui/web), depois de `npm run build:lib`: prova que o
 * `package.json` tem `exports`, `main` e o barrel de `src/index.ts` compilados de verdade,
 * empacotando e instalando (ou inspecionando) o tarball de `npm pack`, nunca lendo `src/`
 * direto.
 *
 * Empacota o `package.json` REAL do repositório com `npm pack` (o mesmo comando do `npm
 * publish`), nunca um `package.json` sintético: `react-router` e `@hookform/resolvers` são
 * `devDependencies` (usados só pelo boilerplate e pela ponte de rotas opcional), então o
 * pacote publicado nunca lista `react-router` de verdade em `dependencies` nem em
 * `peerDependencies`: a afirmação abaixo confere o `package.json` que realmente foi
 * publicado, não um que este script montasse e apagasse por conta própria, o que seria
 * tautológico.
 *
 * Confere, no tarball de verdade:
 *   1. O componente renderiza HTML sem lançar erro (renderToStaticMarkup), inclusive um
 *      componente com hook (Checkbox, `useId`): prova que o hook funciona com o React do
 *      próprio projeto consumidor, não com o React deste repositório.
 *   2. O package.json do pacote publicado não lista `react-router` em `dependencies` nem
 *      em `peerDependencies`.
 *   3. tokens.css e o arquivo de entrada do JS (dist/index.js) contêm o banner de
 *      scripts/lib/pkg-banner.ts, com a versão exata de package.json; tokens.css também
 *      define `--rendra-primary` e `--rendra-background` (tema e paleta padrão) e NÃO
 *      declara `--color-*` nem `--radius-*`: essas variáveis são a ponte `@theme inline`,
 *      que colidiria com o `@theme` de um host que também use Tailwind v4; nenhuma utility
 *      do pacote precisa delas, só de --rendra-*.
 *   4. dist/types não tem brand.config.d.ts nem nada de examples/: os componentes do
 *      pacote importam `@/brand/use-brand` e `@/brand/types`, nunca o barrel `@/brand`,
 *      que arrastaria a marca de demonstração deste repositório para os tipos publicados.
 *   5. tokens.css, base.css e components.css não declaram nenhuma custom property fora de
 *      --rendra- e --tw- (as --tw- do @layer properties são internas do Tailwind e ficam):
 *      cobre de uma vez o namespace inteiro do Tailwind que vazava para o host antes desta
 *      correção (--spacing-*, --text-*, --font-weight-*, --tracking-*, --container-*,
 *      --ease-*, --animate-*, --default-*), corrigido em scripts/build-lib.mjs.
 *   6. O Motion só custa bytes a quem liga o `on`: nenhuma entrada do pacote, exceto
 *      `@rendra-ui/web/motion`, tem no fecho estático um import de `motion` além de
 *      LazyMotion, MotionConfig e PresenceContext (scripts/bundle-inicial.mjs); a entrada
 *      `motion` exporta `rendraMotion`, e componentes renderizam no servidor com
 *      `motion={rendraMotion}` (on) e com `motion="on"` (texto: o HTML do off, que a
 *      hidratação reaproveita).
 *
 * Dois caminhos: primeiro tenta instalar o tarball com `npm install --prefer-offline` num
 * projeto novo fora do repositório (prova a resolução de dependências de verdade, com o
 * React desse projeto, nunca o deste repositório); se o ambiente bloquear a rede, cai para
 * a verificação estrutural (descompacta o tarball com `tar` e confere os arquivos direto,
 * renderizando com o React deste repositório, a única opção sem instalar nada). O relatório
 * final diz qual dos dois caminhos rodou.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { analisarLib } from './bundle-inicial.mjs'
import { packageBanner } from './lib/pkg-banner.ts'
import { binFieldError, privateFieldError } from './lib/verify-pack-checks.ts'

const ROOT = process.cwd()
const DIST = join(ROOT, 'dist')
const WORK = join(DIST, '.verify-pack')
const PACK_OUT_DIR = join(WORK, 'pack-out')
const EXTRACT_DIR = join(WORK, 'extracted')
const RM_RETRY = { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }

function fail(message) {
  console.error(`✗ ${message}`)
  process.exitCode = 1
  throw new Error(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
  console.log(`✓ ${message}`)
}

if (!existsSync(join(DIST, 'index.js'))) {
  fail('dist/index.js não existe. Rode "npm run build:lib" antes de "npm run verify:pack".')
}

const realPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const BANNER = packageBanner(realPkg.version)

// O npm pack, usado abaixo, empacota um pacote "private" normalmente e não acusa nada:
// falha explícito antes de empacotar.
const privateError = privateFieldError(realPkg)
if (privateError) fail(privateError)

// package.json real tem que ter "bin.rendra" válido (sem "./", dentro de "files"): o npm
// publish aceita "./bin/rendra.mjs" mas normaliza o campo em silêncio, avisando "was invalid
// and removed" (ver scripts/lib/verify-pack-checks.ts).
const binError = binFieldError(realPkg)
if (binError) fail(binError)

// Roda dentro do projeto instalado (ou do tarball descompactado): renderiza Button (sem
// hook) e Checkbox (usa useId), pelo react/react-dom desse mesmo lugar. Um marcador único
// na saída evita que um aviso do React em stdout atrapalhe o parse do resultado.
const RENDER_MARKER = 'VERIFY_PACK_RESULT:'
function renderRunnerScript(pkgSpecifier, motionSpecifier) {
  return `import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button, Checkbox, RendraProvider } from ${JSON.stringify(pkgSpecifier)}
import { rendraMotion } from ${JSON.stringify(motionSpecifier)}

try {
  const button = renderToStaticMarkup(createElement(Button, {}, 'Verificar pacote'))
  const checkbox = renderToStaticMarkup(createElement(Checkbox, { label: 'Verificar', defaultChecked: true }))
  const comMotion = (motion, filho) =>
    renderToStaticMarkup(createElement(RendraProvider, { motion }, filho))
  const buttonOn = comMotion(rendraMotion, createElement(Button, {}, 'Verificar pacote'))
  const checkboxOn = comMotion(rendraMotion, createElement(Checkbox, { label: 'Verificar', defaultChecked: true }))
  const buttonTexto = comMotion('on', createElement(Button, {}, 'Verificar pacote'))
  const motor = Object.keys(rendraMotion).sort()
  console.log('${RENDER_MARKER}' + JSON.stringify({ ok: true, button, checkbox, buttonOn, checkboxOn, buttonTexto, motor }))
} catch (error) {
  console.log('${RENDER_MARKER}' + JSON.stringify({ ok: false, message: String(error?.stack ?? error) }))
}
`
}

function assertRenderResult(stdout) {
  const line = stdout.split('\n').find((l) => l.startsWith(RENDER_MARKER))
  assert(!!line, 'O runner de render imprimiu o marcador de resultado.')
  const result = JSON.parse(line.slice(RENDER_MARKER.length))
  assert(result.ok, `Render não lançou erro: ${result.ok ? '' : result.message}`)
  assert(
    result.button.includes('<button') && result.button.includes('Verificar pacote'),
    'Button (sem hook) renderiza HTML.',
  )
  assert(
    result.checkbox.includes('Verificar') && /role="checkbox"/.test(result.checkbox),
    'Checkbox (usa useId) renderiza HTML.',
  )
  // O `on` por objeto (síncrono, também no servidor) e por texto (o HTML do off).
  assert(
    [
      'AnimatePresence',
      'animate',
      'domAnimation',
      'm',
      'useDragControls',
      'useMotionValue',
      'useTransform',
    ].every((k) => result.motor.includes(k)),
    'rendraMotion (@rendra-ui/web/motion) entrega m, AnimatePresence, animate, domAnimation e os hooks.',
  )
  assert(
    result.buttonOn.includes('<button') && result.buttonOn.includes('Verificar pacote'),
    'Button renderiza no servidor com motion={rendraMotion} (m.button no LazyMotion estrito).',
  )
  assert(
    /role="checkbox"/.test(result.checkboxOn),
    'Checkbox renderiza no servidor com motion={rendraMotion}.',
  )
  assert(
    result.buttonTexto === result.button,
    'motion="on" (texto) renderiza no servidor o HTML do off (a hidratação bate).',
  )
}

rmSync(WORK, RM_RETRY)
mkdirSync(PACK_OUT_DIR, { recursive: true })

// 1) Empacota o package.json REAL (nunca um sintético): npm pack é o mesmo comando do
//    npm publish, e lê o package.json e o "files" do próprio repositório. Usa spawnSync (em
//    vez de execFileSync) para capturar stdout E stderr: o npm avisa em stderr, nunca em
//    stdout, quando normaliza um campo do package.json em silêncio (ex.: "bin" com "./"), e
//    esse aviso só apareceria escondido no terminal se não for conferido aqui.
const packRun = spawnSync('npm', ['pack', ROOT, '--pack-destination', PACK_OUT_DIR, '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
})
if (packRun.status !== 0) {
  fail(`npm pack falhou (código ${packRun.status}): ${packRun.stderr}`)
}
assert(
  !packRun.stderr.includes('was invalid and removed'),
  'npm pack não avisou campo inválido normalizado em silêncio (ex.: "bin" com "./").',
)
const [packResult] = JSON.parse(packRun.stdout)
const tarballPath = join(PACK_OUT_DIR, packResult.filename)
assert(existsSync(tarballPath), `npm pack gerou o tarball (${packResult.filename}).`)

// 2) Caminho 1: instala o tarball num projeto novo, fora do repositório (fora de qualquer
//    node_modules existente), com --prefer-offline.
let path = 'estrutural'
let packageJsonForAssertions = null
let tokensCssPath = join(EXTRACT_DIR, 'package', 'dist', 'tokens.css')
let baseCssPath = join(EXTRACT_DIR, 'package', 'dist', 'base.css')
let componentsCssPath = join(EXTRACT_DIR, 'package', 'dist', 'components.css')
let entryJsPath = join(EXTRACT_DIR, 'package', 'dist', 'index.js')
let typesDirForAssertions = join(EXTRACT_DIR, 'package', 'dist', 'types')

const consumerDir = mkdtempSync(join(tmpdir(), 'rendra-verify-pack-'))
try {
  writeFileSync(
    join(consumerDir, 'package.json'),
    JSON.stringify(
      { name: 'rendra-verify-pack-consumer', private: true, version: '0.0.0' },
      null,
      2,
    ),
  )
  execFileSync('npm', ['install', tarballPath, '--prefer-offline', '--no-audit', '--no-fund'], {
    cwd: consumerDir,
    stdio: 'pipe',
    // Instalação de verdade (~200 pacotes na primeira vez): mais lenta que um timeout
    // apertado. Um timeout curto demais mata o npm no meio da escrita e deixa arquivo
    // travado no Windows (EPERM na limpeza a seguir), não prova que a rede falhou.
    timeout: 180_000,
    shell: process.platform === 'win32',
  })
  const installedPkgPath = join(consumerDir, 'node_modules', realPkg.name, 'package.json')
  if (existsSync(installedPkgPath)) {
    path = 'instalação'
    packageJsonForAssertions = JSON.parse(readFileSync(installedPkgPath, 'utf8'))
    const installedDir = join(consumerDir, 'node_modules', realPkg.name, 'dist')
    entryJsPath = join(installedDir, 'index.js')
    tokensCssPath = join(installedDir, 'tokens.css')
    baseCssPath = join(installedDir, 'base.css')
    componentsCssPath = join(installedDir, 'components.css')
    typesDirForAssertions = join(installedDir, 'types')
  }
} catch {
  // Sem rede (ou sem cache): segue para a verificação estrutural, sem instalar nada.
  rmSync(consumerDir, RM_RETRY)
}
// consumerDir só é removido no fim do arquivo (limpeza final): o runner de render lê o
// React instalado ali quando o caminho usado é "instalação".

// 3) Caminho 2 (estrutural): descompacta o tarball direto, sem instalar.
if (path === 'estrutural') {
  mkdirSync(EXTRACT_DIR, { recursive: true })
  // --force-local: sem isso, o GNU tar lê "C:\..." como host:caminho remoto (dois pontos
  // depois da letra da unidade) e recusa a extração local no Windows. Barra normal (nunca
  // contrabarra) e shell:true no Windows: o tar do Git for Windows (MSYS) mistura escape de
  // argv com a contrabarra crua do child_process, dobrando-a; passando pelo cmd.exe (como
  // já fazem os comandos npm acima) o caminho chega intacto.
  const toTarPath = (p) => p.split('\\').join('/')
  execFileSync(
    'tar',
    ['--force-local', '-xzf', toTarPath(tarballPath), '-C', toTarPath(EXTRACT_DIR)],
    { shell: process.platform === 'win32' },
  )
  const extractedPkgPath = join(EXTRACT_DIR, 'package', 'package.json')
  assert(existsSync(extractedPkgPath), 'O tarball descompactado tem package.json.')
  packageJsonForAssertions = JSON.parse(readFileSync(extractedPkgPath, 'utf8'))
}

console.log(`\nCaminho usado: ${path}.\n`)

// bin.rendra continua presente no package.json de dentro do tarball (instalado ou
// descompactado): o npm normaliza "./bin/rendra.mjs" para "bin/rendra.mjs" no publish em vez
// de apagar o campo, mas confere aqui contra o package.json real, não contra suposição.
assert(
  typeof packageJsonForAssertions.bin === 'object' &&
    packageJsonForAssertions.bin !== null &&
    typeof packageJsonForAssertions.bin.rendra === 'string' &&
    packageJsonForAssertions.bin.rendra !== '',
  'package.json do pacote publicado ainda tem bin.rendra (comando `rendra` preservado).',
)

// Nome do pacote publicado: @rendra-ui/web, escopado na organização npm rendra-ui, e
// publishConfig.access "public" (senão o npm recusaria a publicação de um escopo privado
// por padrão).
assert(
  packageJsonForAssertions.name === '@rendra-ui/web',
  'package.json publicado tem o nome @rendra-ui/web.',
)
assert(
  packageJsonForAssertions.publishConfig?.access === 'public',
  'package.json publicado declara publishConfig.access "public".',
)

// Asserção 2: react-router nunca em dependencies nem em peerDependencies do pacote publicado.
assert(
  !('react-router' in (packageJsonForAssertions.dependencies ?? {})),
  'package.json publicado não lista react-router em dependencies.',
)
assert(
  !('react-router' in (packageJsonForAssertions.peerDependencies ?? {})),
  'package.json publicado não lista react-router em peerDependencies.',
)

// Asserção 3: banner, tema e paleta padrão em tokens.css; ausência da ponte @theme inline.
assert(existsSync(tokensCssPath), 'tokens.css está no pacote publicado.')
const tokensCss = readFileSync(tokensCssPath, 'utf8')
assert(tokensCss.includes(BANNER), `tokens.css contém o banner "${BANNER}".`)
assert(
  /--rendra-primary:\s*#[0-9a-fA-F]{3,8}/.test(tokensCss),
  'tokens.css define --rendra-primary (paleta padrão).',
)
assert(
  /--rendra-background:\s*#[0-9a-fA-F]{3,8}/.test(tokensCss),
  'tokens.css define --rendra-background (tema padrão do sistema).',
)
assert(
  !/--color-[a-z-]+:/.test(tokensCss),
  'tokens.css não declara --color-* (colidiria com o @theme de um host Tailwind v4).',
)
assert(
  !/--radius-[a-z-]+:/.test(tokensCss),
  'tokens.css não declara --radius-* (colidiria com o @theme de um host Tailwind v4).',
)
assert(
  !/--font-sans:/.test(tokensCss),
  'tokens.css não declara --font-sans (colidiria com o @theme de um host Tailwind v4).',
)

// base.css referenciava var(--font-sans) direto (html { font-family: var(--font-sans) }):
// como --font-sans saiu do tokens.css, a referência precisa ter virado --rendra-brand-font
// (a variável que --font-sans só espelhava), senão a fonte da marca quebraria no host.
assert(existsSync(baseCssPath), 'base.css está no pacote publicado.')
const baseCss = readFileSync(baseCssPath, 'utf8')
assert(
  baseCss.includes('var(--rendra-brand-font)'),
  'base.css usa var(--rendra-brand-font) na fonte do html.',
)
assert(!baseCss.includes('var(--font-sans)'), 'base.css não referencia mais var(--font-sans).')

// Nenhum dos três arquivos do pacote declara custom property fora de --rendra- e --tw-
// (--tw- do @layer properties é interno do Tailwind e fica). Cobre de uma vez o namespace
// inteiro que vazava (--spacing-*, --text-*, --font-weight-*, --tracking-*, --container-*,
// --ease-*, --animate-*, --default-*), sem depender de listar cada prefixo à mão.
assert(existsSync(componentsCssPath), 'components.css está no pacote publicado.')
const componentsCss = readFileSync(componentsCssPath, 'utf8')
const NON_RENDRA_CUSTOM_PROPERTY = /(?<![\w-])--(?!rendra-|tw-)[a-zA-Z0-9-]+\s*:/
for (const [label, css] of [
  ['tokens.css', tokensCss],
  ['base.css', baseCss],
  ['components.css', componentsCss],
]) {
  assert(
    !NON_RENDRA_CUSTOM_PROPERTY.test(css),
    `${label} não declara nenhuma custom property fora de --rendra- e --tw-.`,
  )
}

assert(existsSync(entryJsPath), 'dist/index.js está no pacote publicado.')
const entryJs = readFileSync(entryJsPath, 'utf8')
assert(entryJs.includes(BANNER), `dist/index.js contém o banner "${BANNER}".`)

// Subcaminho de fluxo (@rendra-ui/web/flow): a lib de terceiros (@xyflow/react) só entra por ele.
const distDir = dirname(entryJsPath)
const flowJsPath = join(distDir, 'flow.js')
assert(existsSync(flowJsPath), 'dist/flow.js está no pacote publicado (subcaminho flow).')
assert(
  existsSync(join(typesDirForAssertions, 'flow.d.ts')),
  'dist/types/flow.d.ts está no pacote publicado.',
)
assert(
  !entryJs.includes('@xyflow'),
  'dist/index.js não importa @xyflow (o React Flow só entra pelo subcaminho flow).',
)
const flowJs = readFileSync(flowJsPath, 'utf8')
assert(
  /\bFlowEditor\b/.test(flowJs) && /\bFlowViewer\b/.test(flowJs),
  'dist/flow.js exporta FlowEditor e FlowViewer.',
)
assert(
  /from\s+["']@xyflow\/react["']/.test(flowJs) &&
    /import\s+["']@xyflow\/react\/dist\/base\.css["']/.test(flowJs),
  'dist/flow.js mantém @xyflow/react e o CSS dele como imports externos (o host resolve do node_modules).',
)

// Asserção 6: o fecho estático de cada entrada do pacote publicado (instalado ou descompactado).
const bundle = analisarLib(dirname(entryJsPath))
for (const linha of bundle.linhas) console.log(`  ${linha}`)
assert(
  bundle.problemas.length === 0,
  `O Motion só entra no bundle de quem liga o on${bundle.problemas.length ? `: ${bundle.problemas.join('; ')}` : ' (nenhuma entrada, exceto motion, importa mais que LazyMotion, MotionConfig e PresenceContext).'}`,
)

// Asserção 4: dist/types não arrasta a marca de demonstração (brand.config, examples/).
assert(
  !existsSync(join(typesDirForAssertions, 'brand', 'brand.config.d.ts')),
  'dist/types não tem brand/brand.config.d.ts (marca de demonstração fora dos tipos publicados).',
)
assert(
  !existsSync(join(typesDirForAssertions, 'brand', 'examples')),
  'dist/types não tem brand/examples (marca de demonstração fora dos tipos publicados).',
)

// Asserção 1: o componente renderiza HTML sem lançar erro, inclusive um com hook, com o
// react/react-dom de quem consome o pacote (nunca o deste repositório).
if (path === 'instalação') {
  const runnerPath = join(consumerDir, 'render-test.mjs')
  writeFileSync(runnerPath, renderRunnerScript(realPkg.name, `${realPkg.name}/motion`))
  const stdout = execFileSync('node', [runnerPath], { cwd: consumerDir, encoding: 'utf8' })
  assertRenderResult(stdout)
} else {
  const runnerPath = join(EXTRACT_DIR, 'render-test.mjs')
  const pkgEntry = join(EXTRACT_DIR, 'package', 'dist', 'index.js').split('\\').join('/')
  const motionEntry = join(EXTRACT_DIR, 'package', 'dist', 'motion.js').split('\\').join('/')
  writeFileSync(runnerPath, renderRunnerScript(`file://${pkgEntry}`, `file://${motionEntry}`))
  const stdout = execFileSync('node', [runnerPath], { cwd: ROOT, encoding: 'utf8' })
  assertRenderResult(stdout)
}

rmSync(WORK, RM_RETRY)
rmSync(consumerDir, RM_RETRY)

console.log('\nverify-pack: tudo passou.')
