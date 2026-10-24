// @vitest-environment jsdom
import type { ReactFlowProps } from '@xyflow/react'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serializeFlow, type Flow } from '@/lib/flow'
import { MotionProvider } from '@/lib/motion'
import { MOCK_NODE, mockFlowLayout, restoreFlowLayout } from '@/test/flow-layout'
import { motionOn } from '@/test/motion'
import { renderApp } from '@/test/render'
import { FlowEditor, type FlowEditorProps } from './flow-editor'

/*
 * Para pegar os callbacks da biblioteca (ligar, soltar, apagar, mover pelo teclado), que o jsdom
 * não dispara com gestos de verdade, o ReactFlow é embrulhado e as últimas props ficam guardadas.
 * O gesto de verdade (arrastar, ligar, apagar) é provado no navegador, em tests/flow.spec.ts.
 */
let rf: ReactFlowProps
vi.mock('@xyflow/react', async (original) => {
  const mod = await original<typeof import('@xyflow/react')>()
  return {
    ...mod,
    ReactFlow: (props: ReactFlowProps) => {
      rf = props
      return <mod.ReactFlow {...props} />
    },
  }
})

const setViewportWidth = (w: number) =>
  (globalThis as unknown as { setViewportWidth: (w: number) => void }).setViewportWidth(w)

beforeEach(mockFlowLayout)
afterEach(() => {
  restoreFlowLayout()
  setViewportWidth(1280)
})

function congelar<T>(valor: T): T {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

/** Webhook mapeado, WhatsApp, condição de duas regras, webhook de saída e tarefa: um fluxo válido. */
const base = (): Flow => ({
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
          path: '/hooks/x',
          responseCode: 200,
          received: true,
          mapping: [
            { from: 'cliente.nome', to: 'cliente.nome' },
            { from: 'cliente.plano', to: 'cliente.plano' },
            { from: 'pedido.valor', to: 'negocio.valor' },
          ],
        },
      },
    },
    {
      id: 'm',
      type: 'whatsapp',
      position: { x: 420, y: 0 },
      data: { label: 'Enviar WhatsApp', config: { to: '+55 11 90000-0000', message: 'Olá' } },
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
      id: 's',
      type: 'webhook-saida',
      position: { x: 1260, y: 0 },
      data: {
        label: 'Enviar webhook',
        config: {
          method: 'POST',
          url: 'https://crm.exemplo/api',
          headers: [],
          body: [{ key: 'nome', value: '{{cliente.nome}}' }],
        },
      },
    },
    {
      id: 't',
      type: 'tarefa',
      position: { x: 1260, y: 400 },
      data: { label: 'Criar tarefa', config: { title: 'Ligar', assignee: 'Ana', dueDays: 1 } },
    },
  ],
  edges: [
    { id: 'w->m', source: 'w', target: 'm' },
    { id: 'm->c', source: 'm', target: 'c' },
    { id: 'c:r1->s', source: 'c', target: 's', branch: 'r1' },
    { id: 'c:r2->t', source: 'c', target: 't', branch: 'r2' },
  ],
})

/** O host: guarda o fluxo e entrega ao editor, como a tela de verdade faz. */
function Host({
  initial,
  onFlow,
  ...props
}: { initial: Flow; onFlow?: (f: Flow) => void } & Partial<FlowEditorProps>) {
  const [flow, setFlow] = useState(initial)
  return (
    <>
      <FlowEditor
        {...props}
        value={flow}
        onChange={(f) => {
          onFlow?.(f)
          setFlow(f)
        }}
      />
      <output data-testid="json">{serializeFlow(flow)}</output>
    </>
  )
}

const current = (): Flow => JSON.parse(screen.getByTestId('json').textContent ?? '{}') as Flow
const blocos = (c: HTMLElement) => c.querySelectorAll('.react-flow__node').length
const bloco = (rotulo: string) =>
  screen
    .getByText(rotulo, { selector: '[data-flow-title]' })
    .closest('[data-flow-node]') as HTMLElement
const settle = () => waitFor(() => expect(document.querySelector('.react-flow__node')).toBeTruthy())
const painel = () => screen.getByRole('complementary', { name: 'Painel do fluxo' })
const aviso = () => document.querySelector<HTMLElement>('[data-flow-notice]')!
/** A biblioteca chama onBeforeDelete ao apertar Delete; o estado que ele muda precisa de act. */
const tentarApagar = async (nodes: { id: string }[], edges: { id: string }[] = []) => {
  let r: boolean | object | undefined
  await act(async () => {
    r = await rf.onBeforeDelete?.({ nodes, edges } as never)
  })
  return r
}
const conectar = (source: string, target: string, handle: string | null = null) =>
  act(() =>
    rf.onConnectEnd?.(new MouseEvent('mouseup'), {
      isValid: false,
      fromNode: { id: source },
      fromHandle: { type: 'source', id: handle },
      toNode: { id: target },
    } as never),
  )

async function editar(rotulo: string) {
  await userEvent.click(
    within(bloco(rotulo)).getByRole('button', { name: new RegExp(`Editar bloco ${rotulo}`) }),
  )
}

async function escolher(nome: string | RegExp, opcao: string | RegExp, dentro?: HTMLElement) {
  const raiz = dentro ?? painel()
  await userEvent.click(within(raiz).getByRole('combobox', { name: nome }))
  await userEvent.click(await screen.findByRole('option', { name: opcao }))
}

describe('FlowEditor: estrutura', () => {
  it('mostra o value, o código do catálogo, a barra de blocos e as ações visíveis sem hover', async () => {
    const frozen = congelar(base())
    const { container, rerender } = renderApp(<FlowEditor value={frozen} onChange={() => {}} />)
    expect(container.querySelector('[data-rendra="FLX-001"]')).toBeInTheDocument()
    expect(blocos(container)).toBe(5)
    expect(painel()).toBeInTheDocument()
    expect(within(painel()).getByText('Adicionar bloco')).toBeInTheDocument()
    await settle()
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Executar bloco/ })).toHaveLength(5),
    )
    for (const nome of ['Executar bloco', 'Editar bloco', 'Excluir bloco'])
      expect(await screen.findAllByRole('button', { name: new RegExp(nome) })).toHaveLength(5)
    // acompanha o value sem guardar cópia
    const menor: Flow = congelar({
      version: 2,
      nodes: [base().nodes[0]!, base().nodes[1]!],
      edges: [base().edges[0]!],
    })
    rerender(<FlowEditor value={menor} onChange={() => {}} />)
    await waitFor(() => expect(blocos(container)).toBe(2))
  })

  it('"Validar" e "Testar fluxo" estão no quadro; toolbar={false} tira os dois', () => {
    const { unmount } = renderApp(<FlowEditor value={base()} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Validar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Testar fluxo' })).toBeInTheDocument()
    unmount()
    renderApp(<FlowEditor value={base()} onChange={() => {}} toolbar={false} />)
    expect(screen.queryByRole('button', { name: 'Validar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Testar fluxo' })).toBeNull()
  })

  it('testOpen controlado abre o painel de teste e avisa o fechamento', async () => {
    const onTestOpenChange = vi.fn()
    renderApp(
      <FlowEditor
        value={base()}
        onChange={() => {}}
        testOpen
        onTestOpenChange={onTestOpenChange}
      />,
    )
    const regiao = await screen.findByRole('region', { name: 'Teste do fluxo' })
    await waitFor(() =>
      expect(within(regiao).getByText('Nenhum passo executado ainda.')).toBeTruthy(),
    )
    await userEvent.click(within(regiao).getByRole('button', { name: 'Avançar' }))
    expect(within(regiao).getByText('Receber webhook')).toBeInTheDocument()
    await userEvent.click(within(regiao).getByRole('button', { name: 'Fechar teste' }))
    expect(onTestOpenChange).toHaveBeenCalledWith(false)
  })

  it('o JSON da 2.7.0 entra e o primeiro onChange já sai em v2', async () => {
    const onFlow = vi.fn()
    const velho = {
      nodes: [
        { id: 'g', type: 'gatilho', position: { x: 0, y: 0 }, data: { label: 'Novo' } },
        { id: 'a', type: 'acao', position: { x: 0, y: 120 }, data: { label: 'Fazer' } },
        { id: 'f', type: 'fim', position: { x: 0, y: 240 }, data: { label: 'Fim' } },
      ],
      edges: [
        { id: 'g->a', source: 'g', target: 'a' },
        { id: 'a->f', source: 'a', target: 'f' },
      ],
    } as Flow
    const { container } = renderApp(<Host initial={velho} onFlow={onFlow} />)
    await settle()
    expect(blocos(container)).toBe(2)
    await userEvent.click(within(painel()).getByRole('button', { name: 'Enviar e-mail' }))
    expect(onFlow.mock.calls[0]![0].version).toBe(2)
    expect(onFlow.mock.calls[0]![0].nodes.some((n: { type: string }) => n.type === 'fim')).toBe(
      false,
    )
  })
})

describe('FlowEditor: barra de blocos', () => {
  it('mostra os 5 grupos com os 9 blocos; a busca filtra sem diferenciar acentos nem caixa', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const p = painel()
    for (const g of ['Gatilhos', 'Mensagens', 'Condicionais', 'Integrações', 'Ações internas'])
      expect(within(p).getByRole('group', { name: g })).toBeInTheDocument()
    expect(p.querySelectorAll('[data-flow-block]')).toHaveLength(9)
    await userEvent.type(within(p).getByRole('textbox', { name: 'Buscar bloco' }), 'WHATS')
    expect(p.querySelectorAll('[data-flow-block]')).toHaveLength(1)
    expect(within(p).getByRole('button', { name: 'Enviar WhatsApp' })).toBeInTheDocument()
    expect(within(p).queryByRole('group', { name: 'Gatilhos' })).toBeNull()
    await userEvent.clear(within(p).getByRole('textbox', { name: 'Buscar bloco' }))
    await userEvent.type(
      within(p).getByRole('textbox', { name: 'Buscar bloco' }),
      'integracoes xyz',
    )
    expect(within(p).getByText('Nenhum bloco encontrado')).toBeInTheDocument()
    await userEvent.clear(within(p).getByRole('textbox', { name: 'Buscar bloco' }))
    await userEvent.type(within(p).getByRole('textbox', { name: 'Buscar bloco' }), 'condic')
    expect(within(p).getByRole('button', { name: 'Condição' })).toBeInTheDocument()
  })

  it('clicar adiciona o bloco com a configuração padrão e abre a configuração dele', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(within(painel()).getByRole('button', { name: 'Esperar' }))
    const novo = current().nodes.find((n) => n.id === 'espera-1')!
    expect(novo.data).toEqual({ label: 'Esperar', config: { duration: 5, unit: 'minutos' } })
    expect(within(painel()).getByRole('textbox', { name: 'Nome do bloco' })).toHaveValue('Esperar')
    expect(within(painel()).getByRole('textbox', { name: 'Duração' })).toHaveValue('5')
  })

  it('o segundo gatilho é recusado com aviso', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(within(painel()).getByRole('button', { name: 'Agendamento' }))
    expect(aviso()).toHaveTextContent('Já existe um gatilho neste fluxo.')
    expect(current().nodes).toHaveLength(5)
  })

  it('seis blocos adicionados do mesmo ponto nunca se cruzam', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    for (let i = 0; i < 6; i++) {
      await userEvent.click(within(painel()).getByRole('button', { name: 'Criar tarefa' }))
      await userEvent.click(screen.getByRole('button', { name: 'Fechar configuração' }))
    }
    const ns = current().nodes
    expect(ns).toHaveLength(11)
    for (let i = 0; i < ns.length; i++)
      for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i]!.position
        const b = ns[j]!.position
        const cruza =
          a.x < b.x + MOCK_NODE.w &&
          b.x < a.x + MOCK_NODE.w &&
          a.y < b.y + MOCK_NODE.h &&
          b.y < a.y + MOCK_NODE.h
        expect(cruza, `${ns[i]!.id} x ${ns[j]!.id}`).toBe(false)
      }
  })
})

describe('FlowEditor: ligar', () => {
  it('soltar no corpo do bloco de destino liga, e o motivo de cada recusa aparece', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    await conectar('t', 's')
    expect(current().edges.some((e) => e.id === 't->s')).toBe(true)
    await conectar('t', 't')
    expect(aviso()).toHaveTextContent('Um bloco não pode ligar a ele mesmo.')
    await conectar('t', 'w')
    expect(aviso()).toHaveTextContent('O gatilho começa o fluxo e não recebe ligação.')
    expect(blocos(container)).toBe(5)
  })

  it('soltar fora de qualquer bloco não faz nada e não avisa', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const antes = serializeFlow(current())
    act(() =>
      rf.onConnectEnd?.(new MouseEvent('mouseup'), {
        isValid: false,
        fromNode: { id: 't' },
        fromHandle: { type: 'source', id: null },
        toNode: null,
      } as never),
    )
    expect(serializeFlow(current())).toBe(antes)
    expect(aviso()).toBeEmptyDOMElement()
  })

  it('sem o destino da biblioteca, o bloco sob o ponteiro vale (mouse e toque)', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    const alvo = container.querySelector('.react-flow__node[data-id="s"]') as HTMLElement
    const lugar = vi.fn(() => alvo.firstElementChild)
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: lugar })
    try {
      const estado = {
        isValid: false,
        fromNode: { id: 't' },
        fromHandle: { type: 'source', id: null },
        toNode: null,
      } as never
      act(() => rf.onConnectEnd?.(new MouseEvent('mouseup', { clientX: 5, clientY: 6 }), estado))
      expect(lugar).toHaveBeenLastCalledWith(5, 6)
      expect(current().edges.some((e) => e.id === 't->s')).toBe(true)
      // toque: o evento não tem clientX; vem de changedTouches
      const toque = new Event('touchend') as unknown as TouchEvent
      Object.defineProperty(toque, 'changedTouches', { value: [{ clientX: 7, clientY: 8 }] })
      act(() =>
        rf.onConnectEnd?.(toque, {
          isValid: false,
          fromNode: { id: 's' },
          fromHandle: { type: 'source', id: null },
          toNode: null,
        } as never),
      )
      expect(lugar).toHaveBeenLastCalledWith(7, 8)
      expect(current().edges.some((e) => e.id === 's->s')).toBe(false)
      expect(aviso()).toHaveTextContent('Um bloco não pode ligar a ele mesmo.')
    } finally {
      delete (document as unknown as Record<string, unknown>).elementFromPoint
    }
  })

  it('ligar uma saída que já tinha ligação troca e avisa com os nomes dos blocos', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await conectar('m', 't')
    expect(aviso()).toHaveTextContent(
      'A ligação anterior de "Enviar WhatsApp" para "Condição" foi trocada.',
    )
    const saidas = current().edges.filter((e) => e.source === 'm')
    expect(saidas.map((e) => e.target)).toEqual(['t'])
    await userEvent.click(within(aviso()).getByRole('button', { name: /Fechar|Dispensar/i }))
    expect(aviso()).toBeEmptyDOMElement()
  })

  it('ligar na regra 2 da condição grava o id da regra; a saída Senão também existe', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await conectar('c', 's', 'r2')
    expect(current().edges.find((e) => e.id === 'c:r2->s')?.branch).toBe('r2')
    expect(aviso()).toHaveTextContent(
      'A ligação anterior de "Condição" para "Criar tarefa" foi trocada.',
    )
    await conectar('c', 'm', 'senao')
    expect(current().edges.find((e) => e.id === 'c:senao->m')?.branch).toBe('senao')
  })

  it('onConnect numa alça liga igual; soltar numa alça válida não liga duas vezes', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    act(() => rf.onConnect?.({ source: 't', target: 's', sourceHandle: null, targetHandle: null }))
    expect(current().edges.filter((e) => e.id === 't->s')).toHaveLength(1)
    const antes = serializeFlow(current())
    act(() =>
      rf.onConnectEnd?.(new MouseEvent('mouseup'), {
        isValid: true,
        fromNode: { id: 't' },
        fromHandle: { type: 'source', id: null },
        toNode: { id: 's' },
      } as never),
    )
    expect(serializeFlow(current())).toBe(antes)
    // saindo de uma alça de entrada não liga
    act(() =>
      rf.onConnectEnd?.(new MouseEvent('mouseup'), {
        isValid: false,
        fromNode: { id: 's' },
        fromHandle: { type: 'target', id: null },
        toNode: { id: 't' },
      } as never),
    )
    expect(serializeFlow(current())).toBe(antes)
  })

  it('o raio de atração é menor que o padrão da biblioteca (20)', async () => {
    renderApp(<FlowEditor value={base()} onChange={() => {}} />)
    expect(rf.connectionRadius).toBeLessThan(20)
  })
})

describe('FlowEditor: apagar ligação', () => {
  async function ligacao(container: HTMLElement, id: string) {
    await waitFor(() => expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(4))
    fireEvent.click(container.querySelector(`.react-flow__edge[data-id="${id}"]`)!)
  }

  it('clicar na ligação mostra a lixeira; "Não" mantém e "Sim" apaga', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    await ligacao(container, 'm->c')
    const lixeira = await screen.findByRole('button', {
      name: 'Excluir ligação de Enviar WhatsApp para Condição',
    })
    await userEvent.click(lixeira)
    expect(screen.getByText('Excluir ligação?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Não' }))
    expect(screen.queryByText('Excluir ligação?')).toBeNull()
    expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(4)
    expect(current().edges).toHaveLength(4)
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir ligação de Enviar WhatsApp para Condição' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }))
    await waitFor(() => expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(3))
    expect(current().edges.some((e) => e.id === 'm->c')).toBe(false)
  })

  it('Esc fecha a confirmação sem apagar', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    await ligacao(container, 'w->m')
    await userEvent.click(await screen.findByRole('button', { name: /Excluir ligação de/ }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('Excluir ligação?')).toBeNull()
    expect(current().edges).toHaveLength(4)
  })

  it('só com montagem liberada: no modo só leitura não há lixeira', async () => {
    const { container } = renderApp(<Host initial={base()} readOnly />)
    await settle()
    await waitFor(() => expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(4))
    expect(screen.queryByRole('button', { name: /Excluir ligação de/ })).toBeNull()
  })

  it('Delete com a ligação selecionada apaga direto; com bloco, nunca direto', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    const ligacoes = [{ id: 'w->m' }] as never
    expect(await rf.onBeforeDelete?.({ nodes: [], edges: ligacoes })).toBe(true)
    act(() => rf.onDelete?.({ nodes: [], edges: ligacoes }))
    expect(current().edges.some((e) => e.id === 'w->m')).toBe(false)
  })
})

describe('FlowEditor: excluir bloco', () => {
  it('Delete num bloco abre o modal (não apaga); vários blocos pedem um de cada vez', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    expect(await tentarApagar([{ id: 'm' }, { id: 't' }])).toBe(false)
    expect(aviso()).toHaveTextContent('Exclua um bloco por vez.')
    expect(await tentarApagar([{ id: 'm' }], [{ id: 'w->m' }])).toBe(false)
    expect(await screen.findByRole('dialog')).toHaveTextContent('Excluir este bloco?')
    expect(current().nodes).toHaveLength(5)
  })

  it('o modal lista anterior e posterior; sem a caixa CONFIRMO nada é excluído', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(
      within(bloco('Enviar WhatsApp')).getByRole('button', { name: /Excluir bloco/ }),
    )
    const modal = await screen.findByRole('dialog')
    expect(modal).toHaveTextContent('Ligado depois de')
    expect(within(modal).getByText('Receber webhook')).toBeInTheDocument()
    expect(within(modal).getByText('Condição')).toBeInTheDocument()
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))
    expect(within(modal).getByRole('alert')).toHaveTextContent('Marque a caixa CONFIRMO')
    expect(current().nodes).toHaveLength(5)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('"só este" com CONFIRMO marcado remove o bloco e religa anterior e posterior', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(
      within(bloco('Enviar WhatsApp')).getByRole('button', { name: /Excluir bloco/ }),
    )
    const modal = await screen.findByRole('dialog')
    await userEvent.click(within(modal).getByRole('checkbox', { name: 'CONFIRMO' }))
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(current().nodes.some((n) => n.id === 'm')).toBe(false))
    expect(current().edges.some((e) => e.id === 'w->c')).toBe(true)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('"tudo depois" mostra o número de blocos e pede CONFIRMO digitado (sem diferenciar caixa)', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(within(bloco('Condição')).getByRole('button', { name: /Excluir bloco/ }))
    const modal = await screen.findByRole('dialog')
    await userEvent.click(
      within(modal).getByRole('radio', { name: /tudo o que vem depois dele \(3 blocos\)/ }),
    )
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))
    expect(within(modal).getByRole('alert')).toHaveTextContent('Digite CONFIRMO')
    expect(current().nodes).toHaveLength(5)
    await userEvent.type(within(modal).getByRole('textbox'), ' confirmo ')
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(current().nodes.map((n) => n.id)).toEqual(['w', 'm']))
  })

  it('excluir uma condição não religa; cancelar fecha sem apagar', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(within(bloco('Condição')).getByRole('button', { name: /Excluir bloco/ }))
    let modal = await screen.findByRole('dialog')
    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(current().nodes).toHaveLength(5)
    await userEvent.click(within(bloco('Condição')).getByRole('button', { name: /Excluir bloco/ }))
    modal = await screen.findByRole('dialog')
    await userEvent.click(within(modal).getByRole('checkbox', { name: 'CONFIRMO' }))
    await userEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(current().nodes.some((n) => n.id === 'c')).toBe(false))
    expect(current().edges.map((e) => e.id)).toEqual(['w->m'])
  })
})

describe('FlowEditor: configuração do bloco', () => {
  it('Editar abre a configuração; digitar muda o card na hora, e "Inserir variável" acrescenta o chip', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Enviar WhatsApp')
    const msg = within(painel()).getByRole('textbox', { name: 'Mensagem' })
    await userEvent.clear(msg)
    await userEvent.type(msg, 'Oi')
    expect(within(bloco('Enviar WhatsApp')).getByText('Oi')).toBeInTheDocument()
    await escolher('Inserir variável em Mensagem', /Cliente › Nome/)
    expect(msg).toHaveValue('Oi{{cliente.nome}}')
    const chips = Array.from(bloco('Enviar WhatsApp').querySelectorAll('[data-flow-chip]'))
    expect(chips.map((c) => c.textContent)).toEqual(['{{cliente.nome}}'])
    expect(
      (current().nodes.find((n) => n.id === 'm')!.data.config as { message: string }).message,
    ).toBe('Oi{{cliente.nome}}')
  })

  it('esvaziar um campo obrigatório faz a validação acusar o problema', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Enviar WhatsApp')
    await userEvent.clear(within(painel()).getByRole('textbox', { name: 'Para' }))
    await userEvent.click(screen.getByRole('button', { name: 'Validar' }))
    expect(within(painel()).getByText('1 problema encontrado')).toBeInTheDocument()
    expect(
      within(painel()).getByText('O bloco "Enviar WhatsApp" precisa do campo "Para".'),
    ).toBeInTheDocument()
    expect(bloco('Enviar WhatsApp').getAttribute('data-invalid')).toBe('true')
    await userEvent.click(
      within(painel()).getByRole('button', { name: 'Ver bloco Enviar WhatsApp' }),
    )
    await userEvent.click(within(painel()).getByRole('button', { name: 'Fechar validação' }))
    expect(within(painel()).getByText('Adicionar bloco')).toBeInTheDocument()
    expect(bloco('Enviar WhatsApp').getAttribute('data-invalid')).toBeNull()
  })

  it('validar um fluxo sem problema mostra "Fluxo válido"', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Validar' }))
    expect(within(painel()).getByText('Fluxo válido')).toBeInTheDocument()
  })

  it('clicar no corpo do bloco abre a configuração; clicar no quadro vazio volta à lista; Esc também', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    fireEvent.click(bloco('Criar tarefa'))
    expect(await within(painel()).findByRole('textbox', { name: 'Responsável' })).toHaveValue('Ana')
    act(() => rf.onPaneClick?.(new MouseEvent('click') as never))
    expect(within(painel()).getByText('Adicionar bloco')).toBeInTheDocument()
    fireEvent.click(bloco('Criar tarefa'))
    await within(painel()).findByRole('textbox', { name: 'Responsável' })
    fireEvent.keyDown(within(painel()).getByRole('textbox', { name: 'Nome do bloco' }), {
      key: 'Escape',
    })
    expect(within(painel()).getByText('Adicionar bloco')).toBeInTheDocument()
  })

  it('"Próximo bloco" liga, troca com aviso e desliga sem arrastar; não oferece o próprio nem o gatilho', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Enviar WhatsApp')
    const campo = within(painel()).getByRole('combobox', { name: 'Próximo bloco' })
    expect(campo).toHaveTextContent('Condição')
    await userEvent.click(campo)
    const opcoes = (await screen.findAllByRole('option')).map((o) => o.textContent ?? '')
    expect(opcoes.some((t) => t.includes('Enviar WhatsApp'))).toBe(false)
    expect(opcoes.some((t) => t.includes('Receber webhook'))).toBe(false)
    await userEvent.click(screen.getByRole('option', { name: /Criar tarefa/ }))
    expect(current().edges.find((e) => e.source === 'm')?.target).toBe('t')
    expect(aviso()).toHaveTextContent(
      'A ligação anterior de "Enviar WhatsApp" para "Condição" foi trocada.',
    )
    await escolher('Próximo bloco', /Nenhum/)
    expect(current().edges.some((e) => e.source === 'm')).toBe(false)
  })

  it('na condição aparecem "Regra 1", "Regra 2" e "Senão", cada um com o seu destino', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Condição')
    expect(
      within(painel()).getByRole('combobox', { name: 'Próximo bloco: Regra 1' }),
    ).toHaveTextContent('Enviar webhook')
    expect(
      within(painel()).getByRole('combobox', { name: 'Próximo bloco: Regra 2' }),
    ).toHaveTextContent('Criar tarefa')
    expect(
      within(painel()).getByRole('combobox', { name: 'Próximo bloco: Senão' }),
    ).toHaveTextContent('Nenhum')
    await escolher('Próximo bloco: Senão', /Enviar WhatsApp/)
    expect(current().edges.find((e) => e.branch === 'senao')?.target).toBe('m')
  })

  it('adicionar regra dá "Regra 3" e uma alça de saída a mais; "está vazio" some o valor; excluir tira a ligação', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    await editar('Condição')
    const alcas = () => bloco('Condição').querySelectorAll('.react-flow__handle.source').length
    expect(alcas()).toBe(3)
    await userEvent.click(within(painel()).getByRole('button', { name: 'Adicionar regra' }))
    expect(within(bloco('Condição')).getByText('Regra 3')).toBeInTheDocument()
    await waitFor(() => expect(alcas()).toBe(4))
    // "está vazio" não tem valor
    expect(within(painel()).getByRole('textbox', { name: 'Valor da regra 1' })).toBeInTheDocument()
    await escolher('Operador da regra 1', 'está vazio')
    expect(within(painel()).queryByRole('textbox', { name: 'Valor da regra 1' })).toBeNull()
    expect(within(bloco('Condição')).getByText('pedido.valor está vazio')).toBeInTheDocument()
    // excluir a regra 1 leva a ligação dela
    await waitFor(() => expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(4))
    await userEvent.click(within(painel()).getByRole('button', { name: 'Excluir Regra 1' }))
    expect(current().edges.some((e) => e.branch === 'r1')).toBe(false)
    await waitFor(() => expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(3))
    // o "Senão" é fixo: não há botão de excluir
    expect(within(painel()).queryByRole('button', { name: 'Excluir Senão' })).toBeNull()
  })

  it('a regra edita campo e valor, e o id da regra nova é o menor livre', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Condição')
    await userEvent.click(within(painel()).getByRole('button', { name: 'Excluir Regra 1' }))
    await userEvent.click(within(painel()).getByRole('button', { name: 'Adicionar regra' }))
    const rules = (
      current().nodes.find((n) => n.id === 'c')!.data.config as { rules: { id: string }[] }
    ).rules
    expect(rules.map((r) => r.id)).toEqual(['r2', 'r1'])
    await escolher('Campo da regra 2', /Negócio › Valor/)
    const valor = within(painel()).getByRole('textbox', { name: 'Valor da regra 2' })
    await userEvent.type(valor, '10')
    expect(within(bloco('Condição')).getByText('pedido.valor é igual a 10')).toBeInTheDocument()
  })

  it('espera, agendamento, registro criado, e-mail e tarefa editam os campos próprios', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(within(painel()).getByRole('button', { name: 'Esperar' }))
    const dur = within(painel()).getByRole('textbox', { name: 'Duração' })
    await userEvent.clear(dur)
    await userEvent.type(dur, '2')
    await escolher('Unidade', 'horas')
    expect(within(bloco('Esperar')).getByText('2 horas')).toBeInTheDocument()
    await userEvent.clear(dur)
    expect(within(painel()).getByText('Informe um número maior que zero.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar configuração' }))
    await userEvent.click(within(painel()).getByRole('button', { name: 'Enviar e-mail' }))
    await userEvent.type(within(painel()).getByRole('textbox', { name: 'Assunto' }), 'Oi')
    expect(within(bloco('Enviar e-mail')).getByText('Oi')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar configuração' }))
    await editar('Criar tarefa')
    const prazo = within(painel()).getByRole('textbox', { name: 'Prazo em dias' })
    await userEvent.clear(prazo)
    await userEvent.type(prazo, '3')
    expect(within(bloco('Criar tarefa')).getByText('3 dias')).toBeInTheDocument()
    await userEvent.type(within(painel()).getByRole('textbox', { name: 'Nome do bloco' }), ' hoje')
    expect(
      screen.getByText('Criar tarefa hoje', { selector: '[data-flow-title]' }),
    ).toBeInTheDocument()
  }, 20000)

  it('agendamento e registro criado mudam o resumo do card', async () => {
    const f: Flow = {
      version: 2,
      nodes: [
        {
          id: 'g',
          type: 'agendamento',
          position: { x: 0, y: 0 },
          data: { label: 'Agendamento', config: { frequency: 'diario', time: '09:00' } },
        },
      ],
      edges: [],
    }
    const { unmount } = renderApp(<Host initial={f} />)
    await settle()
    await editar('Agendamento')
    await escolher('Frequência', 'Semanal')
    expect(within(bloco('Agendamento')).getByText('Semanal')).toBeInTheDocument()
    fireEvent.change(within(painel()).getByLabelText(/Horário/), { target: { value: '10:30' } })
    expect(within(bloco('Agendamento')).getByText('10:30')).toBeInTheDocument()
    unmount()
    const r: Flow = {
      version: 2,
      nodes: [
        {
          id: 'r',
          type: 'registro-criado',
          position: { x: 0, y: 0 },
          data: { label: 'Registro criado', config: { record: 'cliente' } },
        },
      ],
      edges: [],
    }
    renderApp(<Host initial={r} />)
    await settle()
    await editar('Registro criado')
    await userEvent.click(within(painel()).getByRole('radio', { name: 'Pedido' }))
    expect(within(bloco('Registro criado')).getByText('Pedido')).toBeInTheDocument()
  })
})

describe('FlowEditor: webhooks (simulados)', () => {
  it('Receber webhook: sem "Simular chegada" não há campos; depois aparecem, e mapear põe o chip no card', async () => {
    const f = base()
    const w = f.nodes[0]!
    w.data.config = { ...w.data.config, received: false, mapping: [] }
    renderApp(<Host initial={f} />)
    await settle()
    await editar('Receber webhook')
    expect(within(painel()).getByText('Nenhum dado recebido')).toBeInTheDocument()
    expect(within(painel()).queryByRole('list', { name: 'Campos recebidos' })).toBeNull()
    expect(screen.queryByText('Dados de exemplo recebidos')).toBeNull()
    await userEvent.click(within(painel()).getByRole('button', { name: 'Simular chegada' }))
    expect(within(painel()).getByRole('list', { name: 'Campos recebidos' })).toBeInTheDocument()
    expect(screen.getByText('Dados de exemplo recebidos')).toBeInTheDocument()
    expect(within(painel()).getAllByText('Ana Souza').length).toBeGreaterThan(0)
    await escolher('Campo do sistema para cliente.nome', /Cliente › Nome/)
    expect(
      Array.from(bloco('Receber webhook').querySelectorAll('[data-flow-chip]')).map(
        (c) => c.textContent,
      ),
    ).toEqual(['{{cliente.nome}}'])
    // a variável mapeada vira opção nos blocos seguintes
    await userEvent.click(screen.getByRole('button', { name: 'Fechar configuração' }))
    await editar('Enviar WhatsApp')
    await userEvent.click(
      within(painel()).getByRole('combobox', { name: 'Inserir variável em Para' }),
    )
    expect(await screen.findByRole('option', { name: /Cliente › Nome/ })).toBeInTheDocument()
    // desfazer o mapeamento tira a variável
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Fechar configuração' }))
    await editar('Receber webhook')
    await userEvent.click(
      within(painel()).getByRole('combobox', { name: 'Campo do sistema para cliente.nome' }),
    )
    await userEvent.click(await screen.findByRole('option', { name: /Cliente › E-mail/ }))
    await userEvent.click(
      within(painel()).getByRole('combobox', { name: 'Campo do sistema para cliente.nome' }),
    )
    await userEvent.click(within(painel()).getByRole('button', { name: /Limpar/ }))
    expect(bloco('Receber webhook').querySelectorAll('[data-flow-chip]')).toHaveLength(0)
  })

  it('Receber webhook, aba Configurações: método, endereço, código e copiar endereço', async () => {
    const write = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    })
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Receber webhook')
    await userEvent.click(within(painel()).getByRole('tab', { name: 'Configurações' }))
    await userEvent.clear(within(painel()).getByRole('textbox', { name: /Endereço/ }))
    await userEvent.type(within(painel()).getByRole('textbox', { name: /Endereço/ }), '/hooks/novo')
    expect(within(bloco('Receber webhook')).getByText('POST /hooks/novo')).toBeInTheDocument()
    await escolher('Método', 'PUT')
    expect(within(bloco('Receber webhook')).getByText('PUT /hooks/novo')).toBeInTheDocument()
    await escolher('Código de resposta', '202 Accepted')
    expect((current().nodes[0]!.data.config as { responseCode: number }).responseCode).toBe(202)
    await userEvent.click(within(painel()).getByRole('button', { name: 'Copiar endereço' }))
    expect(write).toHaveBeenCalledWith('https://app.exemplo.com/hooks/novo')
  })

  it('copiar o endereço sem permissão não quebra', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('negado')) },
    })
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Receber webhook')
    await userEvent.click(within(painel()).getByRole('tab', { name: 'Configurações' }))
    await userEvent.click(within(painel()).getByRole('button', { name: 'Copiar endereço' }))
    expect(painel()).toBeInTheDocument()
  })

  it('Enviar webhook: corpo, "Simular envio" com a requisição e o 200 OK, e os cabeçalhos', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await editar('Enviar webhook')
    expect(within(painel()).queryByRole('region', { name: 'Simulação do envio' })).toBeNull()
    await userEvent.click(within(painel()).getByRole('button', { name: 'Simular envio' }))
    const sim = within(painel()).getByRole('region', { name: 'Simulação do envio' })
    expect(sim).toHaveTextContent('POST https://crm.exemplo/api')
    expect(sim).toHaveTextContent('"nome": "Ana Souza"')
    expect(sim).not.toHaveTextContent('{{cliente.nome}}')
    expect(sim).toHaveTextContent('200 OK')
    // campo novo com variável
    await userEvent.click(within(painel()).getByRole('button', { name: 'Adicionar campo' }))
    await userEvent.type(
      within(painel()).getByRole('textbox', { name: 'Nome do campo 2' }),
      'plano',
    )
    await escolher('Variável do campo 2', /Cliente › Plano/)
    expect(
      within(bloco('Enviar webhook')).getAllByText('{{cliente.plano}}').length,
    ).toBeGreaterThan(0)
    await userEvent.click(within(painel()).getByRole('button', { name: 'Excluir campo 1' }))
    expect((current().nodes[3]!.data.config as { body: unknown[] }).body).toHaveLength(1)
    // configurações
    await userEvent.click(within(painel()).getByRole('tab', { name: 'Configurações' }))
    await escolher('Método', 'PATCH')
    await userEvent.clear(within(painel()).getByRole('textbox', { name: /Endereço/ }))
    await userEvent.type(within(painel()).getByRole('textbox', { name: /Endereço/ }), 'https://x.y')
    expect(within(bloco('Enviar webhook')).getByText('PATCH https://x.y')).toBeInTheDocument()
    await userEvent.click(within(painel()).getByRole('button', { name: 'Adicionar cabeçalho' }))
    await userEvent.type(
      within(painel()).getByRole('textbox', { name: 'Nome do cabeçalho 1' }),
      'X-Chave',
    )
    await userEvent.type(
      within(painel()).getByRole('textbox', { name: 'Valor do cabeçalho 1' }),
      'abc',
    )
    expect(
      (current().nodes[3]!.data.config as { headers: { name: string; value: string }[] }).headers,
    ).toEqual([{ name: 'X-Chave', value: 'abc' }])
    await userEvent.click(within(painel()).getByRole('button', { name: 'Excluir cabeçalho 1' }))
    expect((current().nodes[3]!.data.config as { headers: unknown[] }).headers).toHaveLength(0)
  })
})

describe('FlowEditor: teste do fluxo', () => {
  it('avança passo a passo, a condição escolhe sozinha e diz qual regra bateu, e termina', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const regiao = await screen.findByRole('region', { name: 'Teste do fluxo' })
    const passos = () => within(regiao).queryAllByText(/^Passo \d$/).length
    expect(passos()).toBe(0)
    await waitFor(() => expect(container.querySelector('[data-active="true"]')).toBeTruthy())
    expect(container.querySelector('[data-active="true"]')?.getAttribute('data-block-id')).toBe('w')
    for (let n = 1; n <= 4; n++) {
      await userEvent.click(within(regiao).getByRole('button', { name: 'Avançar' }))
      expect(passos()).toBe(n)
    }
    expect(
      within(regiao).getByText(/Regra 1 bateu: pedido\.valor é maior que 500/),
    ).toBeInTheDocument()
    expect(within(regiao).getByText('Fluxo concluído')).toBeInTheDocument()
    expect(within(regiao).getByText(/Caminho encerrado/)).toBeInTheDocument()
    expect(within(regiao).getByRole('button', { name: 'Avançar' })).toBeDisabled()
    // sem botões de escolha
    expect(within(regiao).queryByRole('button', { name: 'Sim' })).toBeNull()
    await userEvent.click(within(regiao).getByRole('button', { name: 'Reiniciar' }))
    expect(passos()).toBe(0)
    await userEvent.click(within(regiao).getByRole('button', { name: 'Fechar teste' }))
    expect(screen.queryByRole('region', { name: 'Teste do fluxo' })).toBeNull()
    expect(container.querySelector('[data-active="true"]')).toBeNull()
  })

  it('fluxo sem gatilho mostra o problema e não inicia', async () => {
    const f = base()
    f.nodes = f.nodes.slice(1)
    f.edges = f.edges.slice(1)
    renderApp(<Host initial={f} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const regiao = await screen.findByRole('region', { name: 'Teste do fluxo' })
    expect(
      within(regiao).getByText('O fluxo precisa de ajustes antes do teste'),
    ).toBeInTheDocument()
    expect(
      within(regiao).getByText('O fluxo precisa de um gatilho para começar.'),
    ).toBeInTheDocument()
    expect(within(regiao).getByRole('button', { name: 'Avançar' })).toBeDisabled()
  })

  it('o play do card roda só aquele bloco e mostra o texto simulado num único evento', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(
      within(bloco('Enviar WhatsApp')).getByRole('button', {
        name: 'Executar bloco Enviar WhatsApp',
      }),
    )
    const regiao = await screen.findByRole('region', { name: 'Teste do fluxo' })
    expect(within(regiao).getAllByText(/Enviaria WhatsApp/)).toHaveLength(1)
    expect(
      within(regiao).getByText(/Enviaria WhatsApp para \+55 11 90000-0000: "Olá"/),
    ).toBeInTheDocument()
    expect(within(regiao).getByText('Só este bloco')).toBeInTheDocument()
    // Reiniciar vira o teste completo
    await userEvent.click(within(regiao).getByRole('button', { name: 'Reiniciar' }))
    expect(within(regiao).queryByText('Só este bloco')).toBeNull()
    expect(within(regiao).getByText('Nenhum passo executado ainda.')).toBeInTheDocument()
  })

  it('"Ver bloco" no teste com problema seleciona o bloco no quadro', async () => {
    const f = base()
    f.nodes[1]!.data.config = { to: '', message: 'x' }
    const { container } = renderApp(<Host initial={f} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const regiao = await screen.findByRole('region', { name: 'Teste do fluxo' })
    await userEvent.click(within(regiao).getByRole('button', { name: 'Ver bloco Enviar WhatsApp' }))
    await waitFor(() =>
      expect(
        container.querySelector('.react-flow__node[data-id="m"]')?.classList.contains('selected'),
      ).toBe(true),
    )
  })

  it('só leitura: não edita, mas testa; sem lista de blocos', async () => {
    renderApp(<Host initial={base()} readOnly />)
    await settle()
    expect(screen.queryByRole('complementary', { name: 'Painel do fluxo' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Editar bloco/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Excluir bloco/ })).toBeNull()
    expect(rf.nodesDraggable).toBe(false)
    expect(rf.nodesConnectable).toBe(false)
    expect(rf.deleteKeyCode).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    expect(await screen.findByRole('region', { name: 'Teste do fluxo' })).toBeInTheDocument()
  })
})

describe('FlowEditor: teclado e movimento', () => {
  it('Enter no bloco focado abre a configuração', async () => {
    const { container } = renderApp(<Host initial={base()} />)
    await settle()
    const no = container.querySelector('.react-flow__node[data-id="t"]') as HTMLElement
    no.focus()
    await userEvent.keyboard('{Enter}')
    expect(
      await within(painel()).findByRole('textbox', { name: 'Responsável' }),
    ).toBeInTheDocument()
  })

  it('a barra tem a classe "nokey": Delete dentro dela nunca apaga o bloco do quadro', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    expect(painel().querySelector('.nokey')).toBeInTheDocument()
  })

  it('mover pelo teclado confirma a posição uma vez ao soltar', async () => {
    const onFlow = vi.fn()
    renderApp(<Host initial={base()} onFlow={onFlow} />)
    await settle()
    act(() =>
      rf.onNodesChange?.([
        { id: 't', type: 'position', position: { x: 1300, y: 420 }, dragging: true },
        { id: 't', type: 'position', position: { x: 1300, y: 420 }, dragging: false },
      ]),
    )
    expect(current().nodes.find((n) => n.id === 't')!.position).toEqual({ x: 1300, y: 420 })
    expect(onFlow).toHaveBeenCalledTimes(1)
  })

  it('em off o bloco ativo tem destaque estático; em on ganha o anel que pulsa', async () => {
    const { container, unmount } = renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    await waitFor(() => expect(container.querySelector('[data-active="true"]')).toBeTruthy())
    expect(container.querySelector('[data-flow-pulse]')).toBeNull()
    unmount()
    const on = renderApp(
      <MotionProvider mode={motionOn}>
        <Host initial={base()} />
      </MotionProvider>,
    )
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    await waitFor(() => expect(on.container.querySelector('[data-flow-pulse]')).toBeTruthy())
  })
})

describe('FlowEditor: celular (360 px)', () => {
  beforeEach(() => setViewportWidth(360))

  it('só ver e navegar: sem alça de ligar, sem barra solta, blocos não arrastam, zoom presente', async () => {
    const { container } = renderApp(<FlowEditor value={base()} onChange={() => {}} />)
    await settle()
    expect(screen.queryByRole('complementary', { name: 'Painel do fluxo' })).toBeNull()
    expect(rf.nodesDraggable).toBe(false)
    expect(rf.nodesConnectable).toBe(false)
    expect(container.querySelectorAll('.react-flow__handle.connectable')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Aproximar' })).toBeInTheDocument()
  })

  it('"Blocos" abre a barra num Drawer e clicar no bloco o adiciona (sem arrastar)', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Blocos' }))
    const gaveta = await screen.findByRole('dialog')
    expect(gaveta.querySelector('[data-flow-block]')).toBeTruthy()
    expect(gaveta.querySelector('.cursor-grab')).toBeNull()
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Enviar e-mail' }))
    expect(current().nodes.some((n) => n.type === 'email')).toBe(true)
    expect(
      within(await screen.findByRole('dialog')).getByRole('textbox', { name: 'Assunto' }),
    ).toBeInTheDocument()
  })

  it('tocar no bloco abre a configuração no Drawer, onde se liga ao próximo e se exclui', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    // toque: só o click (o mousedown do user-event não traz `view`, que o d3-zoom lê no jsdom)
    fireEvent.click(bloco('Enviar WhatsApp'))
    const gaveta = await screen.findByRole('dialog')
    await escolher('Próximo bloco', /Criar tarefa/, gaveta)
    expect(current().edges.find((e) => e.source === 'm')?.target).toBe('t')
    await userEvent.click(
      within(bloco('Enviar WhatsApp')).getByRole('button', { name: /Excluir bloco/, hidden: true }),
    )
    const modal = (await screen.findAllByRole('dialog')).at(-1)!
    expect(modal).toHaveTextContent('Excluir este bloco?')
  })

  it('com o Drawer aberto, Delete não apaga nada', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    fireEvent.click(bloco('Enviar WhatsApp'))
    await screen.findByRole('dialog')
    expect(await tentarApagar([{ id: 'm' }])).toBe(false)
    expect(current().nodes).toHaveLength(5)
  })

  it('Testar fluxo e Validar abrem no Drawer', async () => {
    renderApp(<Host initial={base()} />)
    await settle()
    await userEvent.click(screen.getByRole('button', { name: 'Testar fluxo' }))
    const gaveta = await screen.findByRole('dialog')
    expect(within(gaveta).getByRole('region', { name: 'Teste do fluxo' })).toBeInTheDocument()
    await userEvent.click(within(gaveta).getByRole('button', { name: 'Fechar teste' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await userEvent.click(screen.getByRole('button', { name: 'Validar' }))
    expect(within(await screen.findByRole('dialog')).getByText('Fluxo válido')).toBeInTheDocument()
  })
})
