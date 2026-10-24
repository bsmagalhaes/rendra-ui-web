// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Flow } from '@/lib/flow'
import { mockFlowLayout, restoreFlowLayout } from '@/test/flow-layout'
import { renderApp } from '@/test/render'
import { FlowViewer } from './flow-viewer'

beforeEach(mockFlowLayout)
afterEach(restoreFlowLayout)

/** Webhook, WhatsApp com variáveis, condição de duas regras (a regra 2 e o Senão ficam soltos). */
const flow: Flow = {
  version: 2,
  nodes: [
    {
      id: 'w',
      type: 'webhook-entrada',
      position: { x: 0, y: 0 },
      data: {
        label: 'Receber webhook',
        config: {
          method: 'POST',
          path: '/hooks/novo-cliente',
          responseCode: 200,
          received: true,
          mapping: [{ from: 'cliente.nome', to: 'cliente.nome' }],
        },
      },
    },
    {
      id: 'm',
      type: 'whatsapp',
      position: { x: 420, y: 0 },
      data: {
        label: 'Enviar WhatsApp',
        config: { to: '{{cliente.telefone}}', message: 'Olá, {{cliente.nome}}!' },
      },
    },
    {
      id: 'c',
      type: 'condicao',
      position: { x: 840, y: 0 },
      data: {
        label: 'Condição',
        config: {
          rules: [
            { id: 'r1', field: 'pedido.valor', operator: 'maior', value: '500' },
            { id: 'r2', field: 'cliente.plano', operator: 'igual', value: 'pro' },
          ],
        },
      },
    },
    {
      id: 't',
      type: 'tarefa',
      position: { x: 1260, y: 0 },
      data: { label: 'Criar tarefa', config: { title: 'Ligar', assignee: 'Ana', dueDays: 1 } },
    },
  ],
  edges: [
    { id: 'w->m', source: 'w', target: 'm' },
    { id: 'm->c', source: 'm', target: 'c' },
    { id: 'c:r1->t', source: 'c', target: 't', branch: 'r1' },
  ],
}

const edges = (c: HTMLElement) => c.querySelectorAll('.react-flow__edge')
const card = (label: string) =>
  screen
    .getByText(label, { selector: '[data-flow-title]' })
    .closest('[data-flow-node]') as HTMLElement

describe('FlowViewer', () => {
  it('mostra o card: título, descrição, divisor, resumo com variáveis em chips e o selo', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    expect(container.querySelector('[data-rendra="FLX-002"]')).toBeInTheDocument()
    expect(container.querySelectorAll('.react-flow__node')).toHaveLength(4)
    const zap = card('Enviar WhatsApp')
    expect(within(zap).getByText('Envia uma mensagem de WhatsApp.')).toBeInTheDocument()
    expect(within(zap).getByText('Para')).toBeInTheDocument()
    const chips = Array.from(zap.querySelectorAll('[data-flow-chip]')).map((c) => c.textContent)
    expect(chips).toEqual(['{{cliente.telefone}}', '{{cliente.nome}}'])
    expect(zap.querySelector('dl.border-t')).toBeInTheDocument()
    // o tipo também aparece em texto, não só pela cor
    expect(
      within(zap).getByText('Enviar WhatsApp', { selector: 'span.text-xs' }),
    ).toBeInTheDocument()
    // o selo só existe no webhook de entrada, e o mapeado vira chip
    expect(screen.getAllByText('Dados de exemplo recebidos')).toHaveLength(1)
    expect(within(card('Receber webhook')).getByText('{{cliente.nome}}')).toBeInTheDocument()
    await vi.waitFor(() => expect(edges(container)).toHaveLength(3))
  })

  it('a condição mostra uma linha por regra, "Senão" e uma alça de saída para cada', () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    const cond = card('Condição')
    for (const t of ['Regra 1', 'Regra 2', 'Senão'])
      expect(within(cond).getByText(t)).toBeInTheDocument()
    expect(within(cond).getByText('pedido.valor é maior que 500')).toBeInTheDocument()
    expect(cond.querySelectorAll('.react-flow__handle.source')).toHaveLength(3)
    expect(cond.querySelector('.react-flow__handle.target')).toBeInTheDocument()
    // cada saída da condição tem altura mínima de 44 px (os alvos não se sobrepõem)
    for (const row of cond.querySelectorAll('[data-flow-output]'))
      expect(row.className).toContain('min-h-touch')
    // o gatilho não tem entrada; os demais, uma
    const nodes = Array.from(container.querySelectorAll<HTMLElement>('.react-flow__node'))
    expect(nodes.map((n) => n.querySelectorAll('.react-flow__handle.target').length)).toEqual([
      0, 1, 1, 1,
    ])
  })

  it('o alvo da alça tem 44 px e o ponto visível 12 px, sem estilo inline', () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    const handle = container.querySelector('.react-flow__handle') as HTMLElement
    expect(handle.className).toContain('size-touch')
    expect(handle.getAttribute('style')).toBeNull()
    const dot = handle.querySelector('[data-flow-dot]') as HTMLElement
    expect(dot.className).toContain('size-3')
    expect(dot.className).toContain('pointer-events-none')
  })

  it('no viewer não há botões de ação nos cards', () => {
    renderApp(<FlowViewer value={flow} />)
    expect(screen.queryByRole('button', { name: /Executar bloco/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Editar bloco/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Excluir bloco/ })).toBeNull()
  })

  it('toda ligação é animada e descrita em português, com o rótulo da regra', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    await vi.waitFor(() => expect(edges(container)).toHaveLength(3))
    for (const e of edges(container)) expect(e.classList.contains('animated')).toBe(true)
    const regra = container.querySelector('.react-flow__edge[data-id="c:r1->t"]')!
    expect(regra.getAttribute('aria-roledescription')).toBe('ligação')
    expect(regra.getAttribute('aria-label')).toBe('De "Condição" para "Criar tarefa", se > 500')
    expect(
      container.querySelector('.react-flow__edge[data-id="w->m"]')!.getAttribute('aria-label'),
    ).toBe('De "Receber webhook" para "Enviar WhatsApp"')
    await vi.waitFor(() =>
      expect(container.querySelector('[data-flow-edge-label]')?.textContent).toBe('> 500'),
    )
    const node = container.querySelector('.react-flow__node[data-id="w"]')!
    expect(node.getAttribute('aria-roledescription')).toBe('bloco')
    expect(node.getAttribute('aria-label')).toBe('Receber webhook')
    expect(document.body.textContent ?? '').not.toMatch(/Press enter|Press delete|Control Panel/)
  })

  it('o JSON da 2.7.0 abre convertido, sem o bloco Fim', async () => {
    const velho = {
      nodes: [
        { id: 'g', type: 'gatilho', position: { x: 0, y: 0 }, data: { label: 'Novo pedido' } },
        { id: 'c', type: 'condicao', position: { x: 0, y: 120 }, data: { label: 'Pago?' } },
        { id: 'f', type: 'fim', position: { x: 0, y: 240 }, data: { label: 'Concluído' } },
      ],
      edges: [
        { id: 'g->c', source: 'g', target: 'c' },
        { id: 'c:sim->f', source: 'c', target: 'f', branch: 'sim' },
      ],
    } as Flow
    const { container } = renderApp(<FlowViewer value={velho} />)
    expect(container.querySelectorAll('.react-flow__node')).toHaveLength(2)
    expect(screen.queryByText('Concluído')).toBeNull()
    const cond = card('Pago?')
    expect(within(cond).getByText('Sim')).toBeInTheDocument()
    expect(within(cond).getByText('Senão')).toBeInTheDocument()
    await vi.waitFor(() => expect(edges(container)).toHaveLength(1))
  })

  it('é só leitura: sem alça conectável, bloco não arrasta, nem seleciona', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    expect(container.querySelectorAll('.react-flow__handle.connectable')).toHaveLength(0)
    const node = container.querySelector('.react-flow__node[data-id="m"]') as HTMLElement
    expect(node.classList.contains('draggable')).toBe(false)
    expect(node.classList.contains('selectable')).toBe(false)
    node.focus()
    await userEvent.keyboard('{Delete}')
    expect(container.querySelectorAll('.react-flow__node')).toHaveLength(4)
    expect(container.querySelector('.react-flow__node.selected')).toBeNull()
  })

  it('activeId destaca só o bloco indicado, e o destaque muda de lugar', () => {
    const { container, rerender } = renderApp(<FlowViewer value={flow} activeId="m" />)
    const ativos = () =>
      Array.from(container.querySelectorAll('[data-flow-node][data-active="true"]')).map((el) =>
        el.closest('.react-flow__node')?.getAttribute('data-id'),
      )
    expect(ativos()).toEqual(['m'])
    expect(
      within(container.querySelector('[data-active="true"]') as HTMLElement).getByText('Ativo'),
    ).toBeInTheDocument()
    rerender(<FlowViewer value={flow} activeId="c" />)
    expect(ativos()).toEqual(['c'])
    rerender(<FlowViewer value={flow} />)
    expect(ativos()).toEqual([])
  })

  it('bloco com problema mostra marca e texto, ligado por aria-describedby', () => {
    const { container } = renderApp(
      <FlowViewer
        value={flow}
        issues={[
          {
            code: 'config-obrigatoria-vazia',
            message: 'O bloco "Enviar WhatsApp" precisa do campo "Para".',
            nodeId: 'm',
          },
        ]}
      />,
    )
    const bloco = card('Enviar WhatsApp')
    expect(bloco.getAttribute('data-invalid')).toBe('true')
    const texto = within(bloco).getByText(/precisa do campo "Para"/)
    expect(bloco.getAttribute('aria-describedby')).toContain(texto.id)
    expect(within(bloco).getByText('Problema')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-invalid="true"]')).toHaveLength(1)
  })

  it('tem zoom e enquadrar próprios, com 44 px de toque, e não usa os controles da biblioteca', async () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    expect(container.querySelector('.react-flow__controls')).toBeNull()
    for (const nome of ['Aproximar', 'Afastar', 'Enquadrar']) {
      const botao = screen.getByRole('button', { name: nome })
      expect(botao.className).toContain('min-h-touch')
      expect(botao.className).toContain('min-w-touch')
    }
    const viewport = container.querySelector('.react-flow__viewport') as HTMLElement
    const zoom = () => Number(/scale\(([\d.]+)\)/.exec(viewport.style.transform)?.[1])
    const antes = zoom()
    await act(async () => {
      screen.getByRole('button', { name: 'Aproximar' }).click()
    })
    await vi.waitFor(() => expect(zoom()).toBeGreaterThan(antes))
    const depois = zoom()
    await act(async () => {
      screen.getByRole('button', { name: 'Afastar' }).click()
    })
    await vi.waitFor(() => expect(zoom()).toBeLessThan(depois))
  })

  it('mantém o link de atribuição do React Flow, que fica visível e com área de toque', () => {
    const { container } = renderApp(<FlowViewer value={flow} />)
    const link = container.querySelector('.react-flow__attribution a') as HTMLAnchorElement
    expect(link).toBeInTheDocument()
    expect(link.textContent).toBe('React Flow')
    expect(link.href).toMatch(/reactflow\.dev/)
  })
})

describe('tema do fluxo (bloco em @layer rendra.components)', () => {
  const css = readFileSync('src/styles/globals.css', 'utf8')
  const fonte = readFileSync('src/components/ui/flow-viewer.tsx', 'utf8')

  it('existe, usa só tokens e nunca declara --xy-* no CSS publicado', () => {
    expect(css).toMatch(/\.flow-surface\s/)
    expect(css).not.toMatch(/--xy-[\w-]+\s*:/)
    const bloco = css.slice(css.indexOf('.flow-surface'))
    expect(bloco).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(bloco).toContain('var(--rendra-')
  })

  it('o alvo da alça é transparente (!important vence o CSS sem camada) e o ponto usa o token', () => {
    expect(css).toMatch(
      /\.flow-surface \.react-flow__handle\s*\{[^}]*background-color:\s*transparent !important/,
    )
    expect(fonte).toMatch(/data-flow-dot[\s\S]*bg-primary-text/)
  })

  it('a ponte --xy-* vai no style do contêiner, apontando para os tokens do Rendra', () => {
    for (const nome of [
      '--xy-edge-stroke',
      '--xy-edge-stroke-selected',
      '--xy-handle-background-color',
      '--xy-attribution-background-color',
    ])
      expect(fonte).toMatch(new RegExp(`'${nome}': 'var\\(--rendra-`))
  })
})
