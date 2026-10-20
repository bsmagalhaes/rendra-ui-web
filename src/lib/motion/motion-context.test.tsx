// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { m, motion } from 'motion/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { realAnimations, reduceMotion } from '@/test/motion'
import { MotionModeScope, MotionProvider, useLayoutReady, useMotionMode } from './motion-context'

function Probe() {
  return <p>modo: {useMotionMode()}</p>
}

describe('MotionProvider', () => {
  it('sem provider, o modo é off', () => {
    render(<Probe />)
    expect(screen.getByText('modo: off')).toBeInTheDocument()
  })

  it('mode="on" entrega on', () => {
    render(
      <MotionProvider mode="on">
        <Probe />
      </MotionProvider>,
    )
    expect(screen.getByText('modo: on')).toBeInTheDocument()
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
        <MotionProvider mode="on">
          <Probe />
        </MotionProvider>
      </MotionProvider>,
    )
    expect(screen.getByText('modo: on')).toBeInTheDocument()
    render(
      <MotionProvider mode="on">
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
      <MotionProvider mode="on">
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
      <MotionProvider mode="on">
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
      <MotionProvider mode="on">
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

describe('motor: LazyMotion estrito e MotionConfig pela fonte única do reduzido (Passo 3)', () => {
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

  it('o provider é estrito: um motion.div (não `m`) dentro dele é erro, não um carregamento silencioso', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() =>
        render(
          <MotionProvider mode="on">
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
        <MotionProvider mode="on">
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
        <MotionProvider mode="on">
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
})
