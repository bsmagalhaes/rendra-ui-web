// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionGlobalConfig } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * `motion="on"` (texto): o motor do Motion vem de um chunk à parte (`motion-on`), carregado por
 * `import()` depois do primeiro quadro. Até ele chegar a árvore fica em `off` (nunca vazia); ao
 * chegar vira `on` SEM remontar o app (o LazyMotion e o MotionConfig estão montados desde o
 * primeiro quadro) e sem repetir a entrada de quem já estava na tela (D1 e B1 do parecer).
 * O teste controla a chegada do chunk: o mock de `./motion-on` espera o `gate`.
 */
const ctl = { gate: Promise.resolve() as Promise<unknown> }

type Contexto = typeof import('./motion-context')
let ctx: Contexto

const LONGO = { timeout: 20_000 }

function abrirPortao() {
  let abrir!: () => void
  ctl.gate = new Promise<void>((r) => (abrir = r))
  return abrir
}

beforeEach(async () => {
  vi.resetModules()
  ctl.gate = Promise.resolve()
  // doMock (e não vi.mock): o registro de mocks guarda o resultado da fábrica entre os testes, e
  // cada teste precisa de um `import()` novo, segurado pelo seu próprio portão.
  vi.doMock('./motion-on', async (importOriginal) => {
    await ctl.gate
    return importOriginal()
  })
  ctx = await import('./motion-context')
})

afterEach(() => {
  MotionGlobalConfig.skipAnimations = true
  vi.restoreAllMocks()
})

function Sonda() {
  const modo = ctx.useMotionMode()
  const lib = ctx.useMotionLib()
  return (
    <p>
      modo: {modo} lib: {lib ? 'sim' : 'não'}
    </p>
  )
}

describe('motion="on" (texto): chunk sob demanda', { timeout: 30_000 }, () => {
  it('até o chunk chegar a árvore é a do off (não vazia); depois vira on com o objeto no contexto', async () => {
    const abrir = abrirPortao()
    const { MotionProvider } = ctx
    const off = render(
      <MotionProvider mode="off">
        <p>filho</p>
        <Sonda />
      </MotionProvider>,
    )
    const htmlOff = off.container.innerHTML
    off.unmount()
    const { container } = render(
      <MotionProvider mode="on">
        <p>filho</p>
        <Sonda />
      </MotionProvider>,
    )
    expect(container.innerHTML).toBe(htmlOff)
    expect(screen.getByText('modo: off lib: não')).toBeInTheDocument()
    await act(async () => abrir())
    expect(await screen.findByText('modo: on lib: sim', {}, LONGO)).toBeInTheDocument()
  })

  it('a chegada do chunk NÃO remonta a árvore: o nó, o estado e o efeito de quem está abaixo seguem os mesmos', async () => {
    const abrir = abrirPortao()
    const { MotionProvider } = ctx
    const montagens = vi.fn()
    function Filho() {
      const [n, setN] = useState(0)
      useEffect(() => {
        montagens()
      }, [])
      return (
        <div>
          <button data-testid="alvo" onClick={() => setN((x) => x + 1)}>
            cliques: {n}
          </button>
          <Sonda />
        </div>
      )
    }
    render(
      <MotionProvider mode="on">
        <Filho />
      </MotionProvider>,
    )
    const alvo = screen.getByTestId('alvo')
    await userEvent.click(alvo)
    await userEvent.click(alvo)
    expect(alvo).toHaveTextContent('cliques: 2')
    // o chunk ainda está retido: a árvore segue em off
    expect(screen.getByText('modo: off lib: não')).toBeInTheDocument()
    await act(async () => abrir())
    expect(await screen.findByText('modo: on lib: sim', {}, LONGO)).toBeInTheDocument()
    expect(screen.getByTestId('alvo')).toBe(alvo)
    expect(alvo).toHaveTextContent('cliques: 2')
    expect(montagens).toHaveBeenCalledTimes(1)
  })

  it('o LazyMotion estrito vale desde o primeiro quadro: um motion.div esquecido quebra mesmo antes do chunk', async () => {
    const abrir = abrirPortao()
    const { motion } = await import('motion/react')
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() =>
        render(
          <ctx.MotionProvider mode="on">
            <motion.div>fora do padrão</motion.div>
          </ctx.MotionProvider>,
        ),
      ).toThrow(/LazyMotion/)
    } finally {
      quiet.mockRestore()
      abrir()
    }
  })

  it('o objeto (motion={rendraMotion}) é on síncrono, no primeiro render, com o objeto no contexto', async () => {
    const { rendraMotion } = await vi.importActual<typeof import('./motion-on')>('./motion-on')
    render(
      <ctx.MotionProvider mode={rendraMotion}>
        <Sonda />
      </ctx.MotionProvider>,
    )
    expect(screen.getByText('modo: on lib: sim')).toBeInTheDocument()
  })
})

/** Registra todo valor que um atributo/texto assume enquanto o teste roda. */
function observar(raiz: HTMLElement, ler: () => string | null) {
  const vistos: (string | null)[] = [ler()]
  const mo = new MutationObserver(() => vistos.push(ler()))
  mo.observe(raiz, { attributes: true, childList: true, subtree: true, characterData: true })
  return { vistos, parar: () => mo.disconnect() }
}

describe(
  'troca tardia: o que já estava na tela não repete a entrada (B2)',
  { timeout: 60_000 },
  () => {
    async function trocaTardia(ui: ReactNode) {
      const { renderApp } = await import('@/test/render')
      const abrir = abrirPortao()
      const r = renderApp(<ctx.MotionProvider mode="on">{ui}</ctx.MotionProvider>)
      return { ...r, abrir }
    }

    it('EmptyState: nenhum quadro com opacidade menor que 1 depois da troca; uma montagem nova depois dela anima a entrada', async () => {
      MotionGlobalConfig.skipAnimations = false
      const { EmptyState } = await import('@/components/ui/empty-state')
      const { container, abrir, rerender } = await trocaTardia(<EmptyState title="Nada aqui" />)
      const titulo = () => container.querySelector('p')
      const obs = observar(container, () => titulo()?.style.opacity ?? null)
      await act(async () => abrir())
      await waitFor(() => expect(titulo()?.style.opacity).toBe('1'))
      await new Promise((r) => setTimeout(r, 400))
      obs.parar()
      expect(obs.vistos.filter((o) => o !== null && o !== '' && o !== '1')).toEqual([])
      // montagem nova depois da troca: a entrada é a de sempre (começa em 0)
      const outro = observar(
        container,
        () => container.querySelectorAll('p')[1]?.style.opacity ?? null,
      )
      rerender(
        <ctx.MotionProvider mode="on">
          <EmptyState title="Nada aqui" />
          <EmptyState title="Segundo" />
        </ctx.MotionProvider>,
      )
      await new Promise((r) => setTimeout(r, 50))
      outro.parar()
      expect(outro.vistos).toContain('0')
    })

    it('StatCard: o número já visível não volta a 0 nem conta de novo (mostra o valor final direto)', async () => {
      MotionGlobalConfig.skipAnimations = false
      const { StatCard } = await import('@/components/ui/stat-card')
      const { container, abrir } = await trocaTardia(<StatCard label="Receita" value="1.250" />)
      const obs = observar(container, () => container.textContent)
      await act(async () => abrir())
      await new Promise((r) => setTimeout(r, 300))
      obs.parar()
      const textos = obs.vistos.filter((t) => t !== null)
      expect(textos.length).toBeGreaterThan(0)
      for (const t of textos) expect(t).toContain('1.250')
      expect(container.textContent).toContain('1.250')
    })

    it('Chart gauge: a agulha não volta ao 0% para subir de novo', async () => {
      MotionGlobalConfig.skipAnimations = false
      const { Chart } = await import('@/components/ui/chart')
      const { container, abrir } = await trocaTardia(
        <Chart type="gauge" aria-label="Meta" value={80} min={0} max={100} />,
      )
      const x2 = () => container.querySelector('svg line')?.getAttribute('x2') ?? null
      const final = x2()
      expect(final).not.toBeNull()
      const obs = observar(container, x2)
      await act(async () => abrir())
      await new Promise((r) => setTimeout(r, 400))
      obs.parar()
      for (const v of obs.vistos) expect(v).toBe(final)
    })

    it('um AnimatePresence montado na troca tardia segue estável depois dela (o contexto de presença nunca volta a nulo)', async () => {
      const { Accordion } = await import('@/components/ui/accordion')
      const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { abrir } = await trocaTardia(
        <Accordion items={[{ value: 'a', title: 'Primeiro', content: 'Conteúdo A' }]} />,
      )
      await act(async () => abrir())
      await waitFor(() => expect(document.querySelector('[data-rendra="ACRN-001"]')).not.toBeNull())
      await new Promise((r) => setTimeout(r, 150))
      await userEvent.click(screen.getByRole('button', { name: /Primeiro/ }))
      expect(await screen.findByText('Conteúdo A')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /Primeiro/ }))
      await waitFor(() => expect(screen.queryByText('Conteúdo A')).not.toBeInTheDocument())
      const quebras = erro.mock.calls.filter((c) => String(c[0]).includes('Should have a queue'))
      expect(quebras).toEqual([])
      erro.mockRestore()
    })
  },
)
