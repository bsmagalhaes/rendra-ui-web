// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { m, motion } from 'motion/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { motionOn, realAnimations, reduceMotion } from '@/test/motion'
import {
  MotionModeScope,
  MotionProvider,
  useLayoutReady,
  useMotionLib,
  useMotionMode,
  useMotionOn,
} from './motion-context'

function Probe() {
  return <p>modo: {useMotionMode()}</p>
}

describe('MotionProvider', () => {
  it('sem provider, o modo é off', () => {
    render(<Probe />)
    expect(screen.getByText('modo: off')).toBeInTheDocument()
  })

  it('mode={objeto} entrega on, síncrono, com o objeto no contexto', () => {
    render(
      <MotionProvider mode={motionOn}>
        <Probe />
      </MotionProvider>,
    )
    expect(screen.getByText('modo: on')).toBeInTheDocument()
  })

  it('useMotionLib é null em off e o objeto em on; useMotionOn fora do on é erro de uso', () => {
    function Lib() {
      return <p>lib: {useMotionLib() ? 'sim' : 'não'}</p>
    }
    function Estrito() {
      useMotionOn()
      return <p>ok</p>
    }
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<Estrito />)).toThrow(/useMotionOn/)
    } finally {
      quiet.mockRestore()
    }
    cleanup()
    render(
      <MotionProvider mode={motionOn}>
        <Lib />
        <MotionModeScope mode="off">
          <Lib />
        </MotionModeScope>
        <Estrito />
      </MotionProvider>,
    )
    expect(screen.getAllByText(/lib:/).map((e) => e.textContent)).toEqual(['lib: sim', 'lib: não'])
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('mode="off" entrega off e não acrescenta nenhum nó ao DOM', () => {
    const nu = render(<p>filho</p>).container.innerHTML
    const { container } = render(
      <MotionProvider mode="off">
        <p>filho</p>
      </MotionProvider>,
    )
    expect(container.innerHTML).toBe(nu)
  })

  it('on dentro de off e off dentro de on: vale o mais interno', () => {
    render(
      <MotionProvider mode="off">
        <MotionProvider mode={motionOn}>
          <Probe />
        </MotionProvider>
      </MotionProvider>,
    )
    expect(screen.getByText('modo: on')).toBeInTheDocument()
    render(
      <MotionProvider mode={motionOn}>
        <MotionModeScope mode="off">
          <p>
            <Probe />
          </p>
        </MotionModeScope>
      </MotionProvider>,
    )
    expect(screen.getByText('modo: off')).toBeInTheDocument()
  })

  it('em on, um m.div com layout carrega o domMax sob demanda e renderiza sem erro', async () => {
    render(
      <MotionProvider mode={motionOn}>
        <m.div layout data-testid="alvo">
          conteúdo
        </m.div>
      </MotionProvider>,
    )
    expect(screen.getByTestId('alvo')).toHaveTextContent('conteúdo')
    // o carregador assíncrono termina e o elemento segue montado
    await waitFor(() => expect(screen.getByTestId('alvo')).toBeInTheDocument())
  })

  it('em on, quem lê o modo renderiza de novo quando o chunk do domMax chega (m.* ganha o nó de projeção do layout); em off não', async () => {
    let renders = 0
    function Contador() {
      renders++
      return <p>modo: {useMotionMode()}</p>
    }
    const { unmount } = render(
      <MotionProvider mode={motionOn}>
        <Contador />
      </MotionProvider>,
    )
    const aoMontar = renders
    await waitFor(() => expect(renders).toBeGreaterThan(aoMontar))
    unmount()
    renders = 0
    render(
      <MotionProvider mode="off">
        <Contador />
      </MotionProvider>,
    )
    await new Promise((r) => setTimeout(r, 100))
    expect(renders).toBe(1)
  })

  it('useLayoutReady: false até o domMax chegar e true depois, só em on', async () => {
    function Pronto() {
      return <p>pronto: {String(useLayoutReady())}</p>
    }
    render(
      <MotionProvider mode={motionOn}>
        <Pronto />
      </MotionProvider>,
    )
    expect(screen.getByText('pronto: false')).toBeInTheDocument()
    expect(await screen.findByText('pronto: true')).toBeInTheDocument()
    cleanup()
    render(
      <MotionProvider mode="off">
        <Pronto />
      </MotionProvider>,
    )
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.getByText('pronto: false')).toBeInTheDocument()
  })
})

describe(
  'motor: LazyMotion estrito e MotionConfig pela fonte única do reduzido (Passo 3)',
  { timeout: 30_000 },
  () => {
    const readAll = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = join(dir, e.name)
        if (e.isDirectory()) return e.name === '__snapshots__' ? [] : readAll(full)
        return /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) ? [full] : []
      })

    it('nenhum arquivo do src importa `motion` de motion/react: só `m` (com LazyMotion strict, motion.* quebraria)', () => {
      for (const file of readAll('src')) {
        const src = readFileSync(file, 'utf8')
        const imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'motion\/react'/g)]
        for (const imp of imports) {
          const names = imp[1]!.split(',').map((n) => n.trim().split(/\s+as\s+/)[0])
          expect(names, file).not.toContain('motion')
        }
      }
    })

    it('o Motion fora do bundle inicial: só o motion-on, as páginas lazy e src/test importam valores de motion/react; o motion-context só o LazyMotion, o MotionConfig e o PresenceContext', () => {
      const permitidos = new Set([
        'src/lib/motion/motion-on.tsx',
        'src/lib/motion/features-max.ts',
        'src/pages/dashboard-motion-page.tsx',
      ])
      for (const file of readAll('src')) {
        const arq = file.replaceAll('\\', '/')
        if (arq.startsWith('src/test/') || permitidos.has(arq)) continue
        const src = readFileSync(file, 'utf8')
        const valores = [
          ...src.matchAll(/(?:import|export)\s*(?!type\b)\{([^}]*)\}\s*from\s*'motion\//g),
        ]
        if (arq === 'src/lib/motion/motion-context.tsx') {
          const nomes = valores.flatMap((v) =>
            v[1]!
              .split(',')
              .map((n) => n.trim())
              .filter(Boolean),
          )
          expect(nomes.sort(), arq).toEqual(['LazyMotion', 'MotionConfig', 'PresenceContext'])
          continue
        }
        expect(valores.length, `${arq} importa valor de motion/react (use useMotionLib)`).toBe(0)
      }
    })

    it('o provider é estrito: um motion.div (não `m`) dentro dele é erro, não um carregamento silencioso', () => {
      const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        expect(() =>
          render(
            <MotionProvider mode={motionOn}>
              <motion.div>fora do padrão</motion.div>
            </MotionProvider>,
          ),
        ).toThrow(/LazyMotion/)
      } finally {
        quiet.mockRestore()
      }
    })

    it('o domMax (layout e arraste) só chega pelo features-max.ts, e é o único import de domMax do src', () => {
      const donos = readAll('src').filter((f) =>
        [
          ...readFileSync(f, 'utf8').matchAll(
            /(?:import|export)\s*\{([^}]*)\}\s*from\s*'motion\/react'/g,
          ),
        ].some((i) => /\bdomMax\b/.test(i[1]!)),
      )
      expect(donos.map((f) => f.replaceAll('\\', '/'))).toEqual(['src/lib/motion/features-max.ts'])
    })

    it('em on o reduzido liga o MotionConfig: a animação de x vira instantânea (sem quadro intermediário)', async () => {
      const stop = realAnimations()
      const restore = reduceMotion()
      try {
        render(
          <MotionProvider mode={motionOn}>
            <m.div
              data-testid="alvo"
              initial={{ x: 0 }}
              animate={{ x: 100 }}
              transition={{ duration: 5 }}
            />
          </MotionProvider>,
        )
        await new Promise((r) => setTimeout(r, 80))
        expect(screen.getByTestId('alvo').style.transform).toBe('translateX(100px)')
      } finally {
        restore()
        stop()
      }
    })

    it('sem preferência de reduzir, a mesma animação anda de verdade (quadro intermediário)', async () => {
      const stop = realAnimations()
      try {
        render(
          <MotionProvider mode={motionOn}>
            <m.div
              data-testid="alvo"
              initial={{ x: 0 }}
              animate={{ x: 100 }}
              transition={{ duration: 5 }}
            />
          </MotionProvider>,
        )
        await new Promise((r) => setTimeout(r, 80))
        const t = screen.getByTestId('alvo').style.transform
        expect(t).not.toBe('translateX(100px)')
      } finally {
        stop()
      }
    })
  },
)
