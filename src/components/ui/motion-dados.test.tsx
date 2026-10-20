// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { MotionProvider } from '@/lib/motion'
import { realAnimations, reduceMotion } from '@/test/motion'
import { renderApp } from '@/test/render'
import { EmptyState } from './empty-state'
import { Progress } from './progress'
import { Skeleton } from './skeleton'
import { Table, type TableColumn } from './table'
import { Tabs } from './tabs'
import { Wizard } from './wizard'

/*
 * Blocos B, C (parte do wizard) e E da linguagem única: o que entra e sai de tela de uso diário
 * (tabela, abas), o passo do wizard, o estado vazio em cascata, o brilho do skeleton e o
 * progresso. Cada teste afirma o efeito no DOM (estilo gravado pelo Motion, classe do CSS).
 * Os testes que ligam as animações de verdade usam realAnimations.
 */

const emOn = (ui: ReactNode) => renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)
let stop: (() => void) | undefined
afterEach(() => {
  stop?.()
  stop = undefined
  setViewportWidth(1280)
})

interface Row {
  id: string
  nome: string
  cidade: string
}
const rows: Row[] = [
  { id: '1', nome: 'Carla', cidade: 'Recife' },
  { id: '2', nome: 'Ana', cidade: 'São Paulo' },
  { id: '3', nome: 'Bruno', cidade: 'Curitiba' },
]
const columns: TableColumn<Row>[] = [
  { id: 'nome', header: 'Nome', accessor: (r) => r.nome, sortable: true, mobile: 'primary' },
  { id: 'cidade', header: 'Cidade', accessor: (r) => r.cidade, mobile: 'secondary' },
]
const tabela = (extra: Partial<Parameters<typeof Table<Row>>[0]> = {}) => (
  <Table<Row>
    aria-label="Clientes"
    data={rows}
    columns={columns}
    getRowId={(r) => r.id}
    {...extra}
  />
)

describe('Table: tela de dezenas de vezes por dia não anima a entrada das linhas (W3)', () => {
  it('em on, logo após montar as linhas já estão inteiras (sem opacidade 0 nem cascata)', () => {
    stop = realAnimations()
    emOn(tabela())
    const linhas = screen.getAllByRole('row').slice(1)
    expect(linhas).toHaveLength(3)
    for (const l of linhas) {
      expect(l.style.opacity).toBe('')
      expect(l.style.transform).toBe('')
    }
  })

  it('em on, ordenar ou paginar (a lista troca) não faz nenhuma linha piscar', async () => {
    stop = realAnimations()
    emOn(tabela())
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    for (const l of screen.getAllByRole('row').slice(1)) expect(l.style.opacity).toBe('')
  })

  it('em on no celular, os cards também aparecem direto', () => {
    stop = realAnimations()
    setViewportWidth(360)
    emOn(tabela())
    const itens = screen.getAllByRole('listitem')
    expect(itens.length).toBeGreaterThanOrEqual(3)
    for (const i of itens) expect(i.style.opacity).toBe('')
  })

  it('a expansão da linha continua animando a altura (é o que o Emil tolera)', async () => {
    stop = realAnimations()
    emOn(tabela({ expandable: (r) => <p>Detalhes de {r.nome}</p> }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Expandir linha' })[0]!)
    const bloco = (await screen.findByText('Detalhes de Carla')).parentElement!.parentElement!
    expect(bloco.style.height).not.toBe('')
  })
})

const itens = [
  { value: 'dados', label: 'Dados', content: <p>Conteúdo dos dados</p> },
  { value: 'contratos', label: 'Contratos', count: 3, content: <p>Lista de contratos</p> },
]

describe('Tabs: painel sem entrada (W4) e cor da aba ativa por clip-path (diretriz do dono)', () => {
  it('em on, o painel novo não ganha transform nem opacidade: a troca por seta do teclado é instantânea', async () => {
    stop = realAnimations()
    emOn(<Tabs aria-label="Cliente" items={itens} />)
    await userEvent.click(screen.getByRole('tab', { name: /Dados/ }))
    await userEvent.keyboard('{ArrowRight}')
    const painel = screen.getByRole('tabpanel')
    expect(painel).toHaveTextContent('Lista de contratos')
    const filho = painel.firstElementChild as HTMLElement
    expect(filho.style.opacity).toBe('')
    expect(filho.style.transform).toBe('')
    expect(painel.style.transform).toBe('')
  })

  it('em on, a aba ativa não troca de cor por CSS: o texto de destaque vem de uma cópia recortada (clip-path)', async () => {
    emOn(<Tabs aria-label="Cliente" items={itens} />)
    await waitFor(() => expect(document.querySelector('[data-indicator="tabs"]')).not.toBeNull())
    const aba = screen.getByRole('tab', { name: /Dados/ })
    expect(aba.className).not.toContain('data-[state=active]:text-foreground')
    const copia = document.querySelector<HTMLElement>('[data-tabs-copy]')!
    expect(copia).not.toBeNull()
    expect(copia).toHaveAttribute('aria-hidden', 'true')
    expect(copia.className).toContain('tabs-clip')
    expect(copia.className).toContain('text-foreground')
    // a cópia repete os rótulos, mas não é focável nem anunciada
    expect(within(copia).getByText('Contratos')).toBeInTheDocument()
    expect(copia.querySelector('button, a, [role="tab"]')).toBeNull()
    // o recorte é dirigido por variáveis CSS na própria cópia (sem transition de color)
    expect(copia.style.getPropertyValue('--tabs-l')).toMatch(/px$/)
    expect(copia.style.getPropertyValue('--tabs-r')).toMatch(/px$/)
  })

  it('em on, trocar de aba move o recorte e mantém o aria-selected certo', async () => {
    emOn(<Tabs aria-label="Cliente" items={itens} />)
    await waitFor(() => expect(document.querySelector('[data-tabs-copy]')).not.toBeNull())
    await userEvent.click(screen.getByRole('tab', { name: /Contratos/ }))
    expect(screen.getByRole('tab', { name: /Contratos/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Dados/ })).toHaveAttribute('aria-selected', 'false')
    expect(document.querySelectorAll('[data-tabs-copy]')).toHaveLength(1)
  })

  it('em off não existe a cópia, e a borda ativa continua em CSS', () => {
    renderApp(<Tabs aria-label="Cliente" items={itens} />)
    expect(document.querySelector('[data-tabs-copy]')).toBeNull()
    expect(screen.getByRole('tab', { name: /Dados/ }).className).toContain(
      'data-[state=active]:border-primary',
    )
  })

  it('o painel não anima nem com movimento reduzido', async () => {
    const restore = reduceMotion()
    try {
      emOn(<Tabs aria-label="Cliente" items={itens} />)
      const filho = screen.getByRole('tabpanel').firstElementChild as HTMLElement
      expect(filho.style.opacity).toBe('')
    } finally {
      restore()
    }
  })
})

describe('Wizard: o passo troca sem esperar a saída, com blur que mascara o crossfade (O7)', () => {
  const passos = [
    { id: 'a', title: 'Dados' },
    { id: 'b', title: 'Revisão' },
  ]
  const wizard = (
    <Wizard steps={passos}>
      <p>Conteúdo da etapa 1</p>
      <p>Conteúdo da etapa 2</p>
    </Wizard>
  )

  it('em on, logo após avançar o passo novo já está no DOM junto com o que sai (sem mode="wait")', async () => {
    stop = realAnimations()
    emOn(wizard)
    await userEvent.click(screen.getByRole('button', { name: /Avançar/ }))
    expect(screen.getByText('Conteúdo da etapa 2')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo da etapa 1')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Conteúdo da etapa 1')).not.toBeInTheDocument(), {
      timeout: 1000,
    })
  })

  it('em on, o passo que sai passa por filter: blur de até 2px (e nunca mais que isso)', async () => {
    stop = realAnimations()
    emOn(wizard)
    const saindo = screen.getByText('Conteúdo da etapa 1').parentElement!
    const vistos = new Set<string>()
    const obs = new MutationObserver(() => vistos.add(saindo.style.filter))
    obs.observe(saindo, { attributes: true, attributeFilter: ['style'] })
    await userEvent.click(screen.getByRole('button', { name: /Avançar/ }))
    await waitFor(() => expect(screen.queryByText('Conteúdo da etapa 1')).not.toBeInTheDocument(), {
      timeout: 1000,
    })
    obs.disconnect()
    const blurs = [...vistos].filter((f) => /blur\(/.test(f))
    expect(blurs.length).toBeGreaterThan(0)
    for (const f of blurs)
      expect(parseFloat(/blur\(([\d.]+)px\)/.exec(f)![1]!)).toBeLessThanOrEqual(2)
  })

  it('em on, o corpo guarda o espaço da etapa (relative) para a que sai poder ser retirada do fluxo', () => {
    emOn(wizard)
    const corpo = screen.getByText('Conteúdo da etapa 1').parentElement!.parentElement!
    expect(corpo.className).toContain('relative')
  })

  it('em on com movimento reduzido, só opacidade (sem blur nem deslocamento)', async () => {
    stop = realAnimations()
    const restore = reduceMotion()
    try {
      emOn(wizard)
      const passo = screen.getByText('Conteúdo da etapa 1').parentElement!
      await userEvent.click(screen.getByRole('button', { name: /Avançar/ }))
      expect(passo.style.filter ?? '').not.toMatch(/blur\(([1-9])/)
      expect(passo.style.transform).not.toMatch(/translate/)
    } finally {
      restore()
    }
  })
})

describe('EmptyState: cascata de 60 ms entre ícone, título, descrição e ações (O4)', () => {
  const vazio = (
    <EmptyState title="Nada aqui" description="Sem dados." actions={<button>Criar</button>} />
  )
  const raiz = () => document.querySelector<HTMLElement>('[data-rendra="VAZ-001"]')!
  const partes = () =>
    [...raiz().querySelectorAll<HTMLElement>('[style*="opacity"]')].filter(
      (e) => e.closest('[data-rendra="VAZ-001"]') === raiz(),
    )

  it('em on, são quatro partes animadas e a raiz em si não anima', () => {
    stop = realAnimations()
    emOn(vazio)
    expect(raiz().style.opacity).toBe('')
    expect(partes()).toHaveLength(4)
  })

  it('em on, todas nascem transparentes e terminam inteiras (opacidade 1, sem transform)', async () => {
    stop = realAnimations()
    emOn(vazio)
    for (const p of partes()) expect(Number(p.style.opacity)).toBeLessThan(1)
    await waitFor(() => expect(partes().every((p) => p.style.opacity === '1')).toBe(true), {
      timeout: 2000,
    })
    for (const p of partes()) expect(p.style.transform).toBe('none')
  })

  it('em on, a cascata é escalonada: quando a primeira parte já subiu, a última ainda não', async () => {
    stop = realAnimations()
    emOn(vazio)
    await waitFor(() => expect(Number(partes()[0]!.style.opacity)).toBeGreaterThanOrEqual(0.6), {
      timeout: 2000,
    })
    const ops = partes().map((p) => Number(p.style.opacity))
    expect(ops[3]!).toBeLessThan(ops[0]!)
  })

  it('em on, texto, ação e código do catálogo continuam; em off o HTML é o de sempre (sem estilo)', () => {
    emOn(vazio)
    expect(screen.getByText('Nada aqui')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
    cleanup()
    renderApp(vazio)
    expect(raiz().innerHTML).not.toContain('style=')
  })

  it('em on com movimento reduzido, só opacidade (nenhuma parte desloca)', async () => {
    const restore = reduceMotion()
    try {
      emOn(vazio)
      await waitFor(() => expect(partes().every((p) => p.style.opacity === '1')).toBe(true))
      for (const p of partes()) expect(p.style.transform).toBe('')
    } finally {
      restore()
    }
  })
})

describe('Skeleton e Progress: brilho suave e tempos pelos tokens (W14)', () => {
  it('em on, o skeleton tem o brilho (skeleton-shimmer) e perde o animate-pulse', () => {
    emOn(<Skeleton className="h-4 w-24" />)
    const el = document.querySelector('[data-rendra="SKEL-001"]')!
    expect(el).toHaveClass('skeleton-shimmer', 'h-4', 'w-24')
    expect(el).not.toHaveClass('animate-pulse')
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  it('em off, o skeleton continua com o animate-pulse de sempre', () => {
    renderApp(<Skeleton className="h-4 w-24" />)
    const el = document.querySelector('[data-rendra="SKEL-001"]')!
    expect(el).toHaveClass('animate-pulse')
    expect(el).not.toHaveClass('skeleton-shimmer')
  })

  it('o progress lê a duração do token e anda em linha reta (progresso é movimento constante)', () => {
    renderApp(<Progress value={40} label="Envio" />)
    const barra = document.querySelector('[role="progressbar"] > *')!
    expect(barra.className).toContain('duration-(--rendra-duration-base)')
    expect(barra.className).toContain('ease-linear')
    expect(barra.className).not.toMatch(/duration-300/)
  })
})
