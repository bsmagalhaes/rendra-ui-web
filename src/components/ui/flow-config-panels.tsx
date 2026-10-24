import { Copy, Plus, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { FlowPanelShell } from '@/components/ui/flow-sidebar'
import { InfoHint } from '@/components/ui/info-hint'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select, type SelectOption } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import type { Flow, FlowNode, FlowRule, FlowRuleOperator } from '@/lib/flow'
import {
  clearOutput,
  connectNodes,
  nextCandidates,
  removeEdge,
  replacedMessage,
  updateNodeData,
} from '@/lib/flow-edit'
import {
  FLOW_BLOCKS,
  FLOW_RULE_OPERATORS,
  FLOW_SAMPLE_PAYLOAD,
  FLOW_SAMPLE_RESPONSE,
  FLOW_SYSTEM_FIELDS,
  FLOW_TYPE_NAME,
  FLOW_WAIT_UNITS,
  branchName,
  buildWebhookRequest,
  flattenPayload,
  flowSampleData,
  flowVariables,
  nextRuleId,
  operatorHasValue,
  outputIds,
  rulesOf,
  type FlowVariable,
} from '@/lib/flow-blocks'
import { nodeName } from '@/lib/flow'

/*
 * Peça interna do FlowEditor: o painel de configuração do bloco selecionado, na barra lateral.
 * Cada alteração se aplica na hora (o card muda junto). Webhooks são simulados: nada é enviado
 * nem recebido de verdade.
 */

type Rec = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const list = (v: unknown): Rec[] =>
  Array.isArray(v) ? v.filter((x): x is Rec => !!x && typeof x === 'object') : []
const NONE = '__nenhum'

export interface BlockConfigPanelProps {
  flow: Flow
  nodeId: string
  /** Recebe o fluxo novo e, quando uma ligação foi trocada, o aviso para mostrar. */
  onApply: (flow: Flow, notice?: string) => void
  onClose: () => void
}

interface PanelCtx {
  flow: Flow
  node: FlowNode
  cfg: Rec
  variables: FlowVariable[]
  set: (patch: Rec) => void
}

function VariableInsert({
  variables,
  label,
  onInsert,
}: {
  variables: FlowVariable[]
  label: string
  onInsert: (token: string) => void
}) {
  return (
    <Select
      label={`Inserir variável em ${label}`}
      placeholder="Inserir variável"
      disabled={variables.length === 0}
      value={null}
      options={variables.map((v) => ({ value: v.id, label: v.label, description: `{{${v.id}}}` }))}
      onChange={(v) => v && onInsert(`{{${v}}}`)}
    />
  )
}

/** Campo de texto que aceita variáveis `{{x}}`: o texto e o seletor que acrescenta uma no fim. */
function TemplateField({
  label,
  value,
  onChange,
  variables,
  multiline,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  variables: FlowVariable[]
  multiline?: boolean
  help?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} span="full" help={help}>
        {multiline ? (
          <Textarea rows={3} value={value} onChange={onChange} />
        ) : (
          <Input value={value} onChange={onChange} />
        )}
      </Field>
      <VariableInsert
        variables={variables}
        label={label}
        onInsert={(token) => onChange(value + token)}
      />
    </div>
  )
}

/** Escolha de uma variável do fluxo para o corpo do webhook: guarda `{{id}}`. */
function VariableSelect({
  label,
  value,
  variables,
  onChange,
}: {
  label: string
  value: string
  variables: FlowVariable[]
  onChange: (token: string) => void
}) {
  const current = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(value)?.[1] ?? null
  const options: SelectOption[] = variables.map((v) => ({ value: v.id, label: v.label }))
  if (current && !variables.some((v) => v.id === current))
    options.push({ value: current, label: current })
  return (
    <Select
      label={label}
      placeholder="Variável"
      value={current}
      options={options}
      clearable
      onChange={(v) => onChange(v ? `{{${v}}}` : '')}
    />
  )
}

/* ------------------------------------------------------------------------ condição */

function ConditionFields({
  flow,
  node,
  variables,
  onApply,
}: PanelCtx & Pick<BlockConfigPanelProps, 'onApply'>) {
  const rules = rulesOf(node)
  const fieldOptions = (rule: FlowRule): SelectOption[] => {
    const opts = variables.map((v) => ({ value: v.id, label: v.label, description: v.id }))
    if (rule.field && !opts.some((o) => o.value === rule.field))
      opts.push({ value: rule.field, label: rule.field, description: '' })
    return opts
  }
  const save = (next: FlowRule[], base: Flow = flow) =>
    onApply(updateNodeData(base, node.id, { config: { ...node.data.config, rules: next } }))
  const patch = (i: number, p: Partial<FlowRule>) =>
    save(rules.map((r, k) => (k === i ? { ...r, ...p } : r)))
  const add = () =>
    save([...rules, { id: nextRuleId(rules), field: '', operator: 'igual', value: '' }])
  const remove = (i: number) => {
    const rule = rules[i]!
    let next = flow
    for (const e of flow.edges)
      if (e.source === node.id && e.branch === rule.id) next = removeEdge(next, e.id)
    save(
      rules.filter((_, k) => k !== i),
      next,
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {rules.map((rule, i) => (
        <div
          key={rule.id}
          role="group"
          aria-label={branchName(node, rule.id)}
          className="flex flex-col gap-2 rounded-block border p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{branchName(node, rule.id)}</span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Excluir ${branchName(node, rule.id)}`}
              className="min-h-touch min-w-touch"
              icon={<Trash2 />}
              onClick={() => remove(i)}
            />
          </div>
          <Select
            label={`Campo da regra ${i + 1}`}
            placeholder="Campo"
            options={fieldOptions(rule)}
            value={rule.field || null}
            onChange={(v) => patch(i, { field: v ?? '' })}
          />
          <Select
            label={`Operador da regra ${i + 1}`}
            options={FLOW_RULE_OPERATORS.map((o) => ({ value: o.value, label: o.label }))}
            value={rule.operator}
            onChange={(v) => {
              const operator = (v ?? 'igual') as FlowRuleOperator
              patch(i, { operator, ...(operatorHasValue(operator) ? {} : { value: '' }) })
            }}
          />
          {operatorHasValue(rule.operator) && (
            <Input
              aria-label={`Valor da regra ${i + 1}`}
              placeholder="Valor"
              value={rule.value}
              onChange={(v) => patch(i, { value: v })}
            />
          )}
        </div>
      ))}
      {rules.length === 0 && (
        <EmptyState
          size="compact"
          title="Nenhuma regra"
          description="A condição ainda não tem regras."
        />
      )}
      <Button variant="outline" size="sm" icon={<Plus />} onClick={add}>
        Adicionar regra
      </Button>
      <p className="rounded-block bg-muted p-3 text-sm">
        <span className="font-medium">Senão</span>
        <span className="text-muted-foreground"> segue quando nenhuma regra bater.</span>
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- webhooks */

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="rounded-block bg-muted p-3 text-xs break-words whitespace-pre-wrap text-foreground">
      {children}
    </pre>
  )
}

const ENDPOINT_ORIGIN = 'https://app.exemplo.com'

function WebhookInFields({ cfg, set }: PanelCtx) {
  const received = cfg.received === true
  const mapping = list(cfg.mapping)
  const sample = flattenPayload(FLOW_SAMPLE_PAYLOAD)
  const mapOf = (path: string) => mapping.find((m) => str(m.from) === path)
  const setMap = (path: string, to: string | null) =>
    set({
      mapping: [
        ...mapping.filter((m) => str(m.from) !== path),
        ...(to ? [{ from: path, to }] : []),
      ],
    })
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${ENDPOINT_ORIGIN}${str(cfg.path)}`)
      toast.success('Endereço copiado')
    } catch {
      toast.error('Não foi possível copiar o endereço')
    }
  }
  return (
    <Tabs
      variant="pill"
      aria-label="Webhook de entrada"
      items={[
        {
          value: 'mapeamento',
          label: 'Mapeamento',
          content: (
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => set({ received: true })}>
                  Simular chegada
                </Button>
                <InfoHint title="Mapeamento de campos">
                  Simule a chegada de dados de exemplo e ligue cada campo recebido a um campo do
                  sistema. Os campos mapeados viram variáveis para os blocos seguintes.
                </InfoHint>
              </div>
              {!received && (
                <EmptyState
                  size="compact"
                  title="Nenhum dado recebido"
                  description="Os campos aparecem depois da chegada simulada."
                />
              )}
              {received && (
                <>
                  <CodeBlock>{JSON.stringify(FLOW_SAMPLE_PAYLOAD, null, 2)}</CodeBlock>
                  <ul aria-label="Campos recebidos" className="flex flex-col gap-3">
                    {sample.map((f) => (
                      <li key={f.path} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <code className="font-medium">{f.path}</code>
                          <span className="truncate text-muted-foreground">{f.value}</span>
                        </div>
                        <Select
                          label={`Campo do sistema para ${f.path}`}
                          placeholder="Não mapear"
                          searchable
                          clearable
                          options={FLOW_SYSTEM_FIELDS.map((o) => ({
                            value: o.value,
                            label: o.label,
                          }))}
                          value={str(mapOf(f.path)?.to) || null}
                          onChange={(v) => setMap(f.path, v)}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ),
        },
        {
          value: 'configuracoes',
          label: 'Configurações',
          content: (
            <div className="flex flex-col gap-4 pt-4">
              <Field label="Método" span="full">
                <Select
                  label="Método"
                  options={['POST', 'PUT'].map((m) => ({ value: m, label: m }))}
                  value={str(cfg.method) || 'POST'}
                  onChange={(v) => set({ method: v ?? 'POST' })}
                />
              </Field>
              <Field label="Endereço" span="full" required>
                <Input value={str(cfg.path)} onChange={(v) => set({ path: v })} />
              </Field>
              <Button variant="outline" size="sm" icon={<Copy />} onClick={() => void copy()}>
                Copiar endereço
              </Button>
              <Field label="Código de resposta" span="full">
                <Select
                  label="Código de resposta"
                  options={[
                    { value: '200', label: '200 OK' },
                    { value: '202', label: '202 Accepted' },
                    { value: '204', label: '204 No Content' },
                  ]}
                  value={String(cfg.responseCode ?? 200)}
                  onChange={(v) => set({ responseCode: Number(v ?? 200) })}
                />
              </Field>
            </div>
          ),
        },
      ]}
    />
  )
}

function WebhookOutFields({ flow, cfg, variables, set }: PanelCtx) {
  const [simulated, setSimulated] = useState(false)
  const body = list(cfg.body)
  const headers = list(cfg.headers)
  const patchBody = (i: number, p: Rec) =>
    set({ body: body.map((b, k) => (k === i ? { ...b, ...p } : b)) })
  const patchHeader = (i: number, p: Rec) =>
    set({ headers: headers.map((h, k) => (k === i ? { ...h, ...p } : h)) })
  const request = buildWebhookRequest(cfg, flowSampleData(flow))
  return (
    <Tabs
      variant="pill"
      aria-label="Webhook de saída"
      items={[
        {
          value: 'corpo',
          label: 'Corpo',
          content: (
            <div className="flex flex-col gap-4 pt-4">
              {body.map((b, i) => (
                <div
                  key={i}
                  role="group"
                  aria-label={`Campo enviado ${i + 1}`}
                  className="flex flex-col gap-2 rounded-block border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Nome do campo ${i + 1}`}
                      placeholder="Nome do campo"
                      value={str(b.key)}
                      onChange={(v) => patchBody(i, { key: v })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Excluir campo ${i + 1}`}
                      className="min-h-touch min-w-touch shrink-0"
                      icon={<Trash2 />}
                      onClick={() => set({ body: body.filter((_, k) => k !== i) })}
                    />
                  </div>
                  <VariableSelect
                    label={`Variável do campo ${i + 1}`}
                    value={str(b.value)}
                    variables={variables}
                    onChange={(token) => patchBody(i, { value: token })}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                icon={<Plus />}
                onClick={() => set({ body: [...body, { key: '', value: '' }] })}
              >
                Adicionar campo
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSimulated(true)}>
                  Simular envio
                </Button>
                <InfoHint title="Simulação do envio">
                  Nada é enviado de verdade: a requisição é montada com os dados de exemplo e a
                  resposta é uma amostra.
                </InfoHint>
              </div>
              {simulated && (
                <div role="region" aria-label="Simulação do envio" className="flex flex-col gap-2">
                  <CodeBlock>
                    {`${request.method} ${request.url}\n${JSON.stringify(request.body, null, 2)}`}
                  </CodeBlock>
                  <CodeBlock>{FLOW_SAMPLE_RESPONSE}</CodeBlock>
                </div>
              )}
            </div>
          ),
        },
        {
          value: 'configuracoes',
          label: 'Configurações',
          content: (
            <div className="flex flex-col gap-4 pt-4">
              <Field label="Método" span="full">
                <Select
                  label="Método"
                  options={['POST', 'PUT', 'PATCH'].map((m) => ({ value: m, label: m }))}
                  value={str(cfg.method) || 'POST'}
                  onChange={(v) => set({ method: v ?? 'POST' })}
                />
              </Field>
              <Field label="Endereço" span="full" required>
                <Input value={str(cfg.url)} onChange={(v) => set({ url: v })} />
              </Field>
              {headers.map((h, i) => (
                <div
                  key={i}
                  role="group"
                  aria-label={`Cabeçalho ${i + 1}`}
                  className="flex flex-col gap-2 rounded-block border p-3"
                >
                  <Input
                    aria-label={`Nome do cabeçalho ${i + 1}`}
                    placeholder="Nome"
                    value={str(h.name)}
                    onChange={(v) => patchHeader(i, { name: v })}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Valor do cabeçalho ${i + 1}`}
                      placeholder="Valor"
                      value={str(h.value)}
                      onChange={(v) => patchHeader(i, { value: v })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Excluir cabeçalho ${i + 1}`}
                      className="min-h-touch min-w-touch shrink-0"
                      icon={<Trash2 />}
                      onClick={() => set({ headers: headers.filter((_, k) => k !== i) })}
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                icon={<Plus />}
                onClick={() => set({ headers: [...headers, { name: '', value: '' }] })}
              >
                Adicionar cabeçalho
              </Button>
            </div>
          ),
        },
      ]}
    />
  )
}

/* --------------------------------------------------------------------------- ligações */

function LinkFields({
  flow,
  node,
  onApply,
}: {
  flow: Flow
  node: FlowNode
  onApply: BlockConfigPanelProps['onApply']
}) {
  const options: SelectOption[] = [
    { value: NONE, label: 'Nenhum' },
    ...nextCandidates(flow, node.id).map((n) => ({
      value: n.id,
      label: `${FLOW_TYPE_NAME[n.type]}: ${nodeName(n)}`,
    })),
  ]
  return (
    <div className="flex flex-col gap-3">
      {outputIds(node).map((out) => {
        const label = out ? `Próximo bloco: ${branchName(node, out)}` : 'Próximo bloco'
        const current = flow.edges.find(
          (e) => e.source === node.id && (e.branch ?? undefined) === out,
        )
        return (
          <Field key={out ?? 'unica'} label={label} span="full">
            <Select
              label={label}
              options={options}
              value={current?.target ?? NONE}
              onChange={(v) => {
                if (!v || v === NONE) return onApply(clearOutput(flow, node.id, out))
                const r = connectNodes(flow, node.id, v, out)
                if (!r.ok) return onApply(flow, r.reason)
                onApply(r.flow, r.replaced ? replacedMessage(flow, r.replaced) : undefined)
              }}
            />
          </Field>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------------------- painel */

export function BlockConfigPanel({ flow, nodeId, onApply, onClose }: BlockConfigPanelProps) {
  const uid = useId()
  const node = flow.nodes.find((n) => n.id === nodeId)
  if (!node) return null
  const cfg: Rec = node.data.config ?? {}
  const variables = flowVariables(flow)
  const set = (patch: Rec) =>
    onApply(updateNodeData(flow, node.id, { config: { ...cfg, ...patch } }))
  const ctx: PanelCtx = { flow, node, cfg, variables, set }
  const t = (key: string, label: string, opts: { multiline?: boolean } = {}) => (
    <TemplateField
      key={`${uid}-${key}`}
      label={label}
      multiline={opts.multiline}
      value={str(cfg[key])}
      variables={variables}
      onChange={(v) => set({ [key]: v })}
    />
  )

  let fields: ReactNode = null
  switch (node.type) {
    case 'webhook-entrada':
      fields = <WebhookInFields {...ctx} />
      break
    case 'webhook-saida':
      fields = <WebhookOutFields {...ctx} />
      break
    case 'agendamento':
      fields = (
        <>
          <Field label="Frequência" span="full">
            <Select
              label="Frequência"
              options={[
                { value: 'diario', label: 'Diário' },
                { value: 'semanal', label: 'Semanal' },
                { value: 'mensal', label: 'Mensal' },
              ]}
              value={str(cfg.frequency) || 'diario'}
              onChange={(v) => set({ frequency: v ?? 'diario' })}
            />
          </Field>
          <Field label="Horário" span="full" required>
            <Input type="time" value={str(cfg.time)} onChange={(v) => set({ time: v })} />
          </Field>
        </>
      )
      break
    case 'registro-criado':
      fields = (
        <RadioGroup
          aria-label="Registro"
          options={[
            { value: 'cliente', label: 'Cliente' },
            { value: 'pedido', label: 'Pedido' },
            { value: 'negocio', label: 'Negócio' },
          ]}
          value={str(cfg.record) || 'cliente'}
          onChange={(v) => set({ record: v })}
        />
      )
      break
    case 'whatsapp':
      fields = (
        <>
          {t('to', 'Para')}
          {t('message', 'Mensagem', { multiline: true })}
        </>
      )
      break
    case 'email':
      fields = (
        <>
          {t('to', 'Para')}
          {t('subject', 'Assunto')}
          {t('message', 'Mensagem', { multiline: true })}
        </>
      )
      break
    case 'tarefa':
      fields = (
        <>
          {t('title', 'Título')}
          <Field label="Responsável" span="full">
            <Input value={str(cfg.assignee)} onChange={(v) => set({ assignee: v })} />
          </Field>
          <Field label="Prazo em dias" span="full">
            <Input
              inputMode="numeric"
              value={String(cfg.dueDays ?? '')}
              onChange={(v) => set({ dueDays: Number(v.replace(/\D/g, '')) || 0 })}
            />
          </Field>
        </>
      )
      break
    case 'espera':
      fields = (
        <>
          <Field
            label="Duração"
            span="full"
            error={
              typeof cfg.duration === 'number' && cfg.duration > 0
                ? undefined
                : 'Informe um número maior que zero.'
            }
          >
            <Input
              inputMode="numeric"
              value={cfg.duration === undefined ? '' : String(cfg.duration)}
              onChange={(v) => set({ duration: Number(v.replace(/\D/g, '')) || 0 })}
            />
          </Field>
          <Field label="Unidade" span="full">
            <Select
              label="Unidade"
              options={FLOW_WAIT_UNITS.map((u) => ({ value: u, label: u }))}
              value={str(cfg.unit) || 'minutos'}
              onChange={(v) => set({ unit: v ?? 'minutos' })}
            />
          </Field>
        </>
      )
      break
    case 'condicao':
      fields = <ConditionFields {...ctx} onApply={onApply} />
      break
    default:
      break
  }

  return (
    <FlowPanelShell
      title={FLOW_BLOCKS[node.type].name}
      onClose={onClose}
      closeLabel="Fechar configuração"
    >
      <Field label="Nome do bloco" span="full">
        <Input
          value={node.data.label}
          onChange={(v) => onApply(updateNodeData(flow, node.id, { label: v }))}
        />
      </Field>
      {fields}
      <section aria-label="Ligações" className="flex flex-col gap-3 border-t pt-4">
        <h3 className="text-xs font-medium text-muted-foreground">Ligações</h3>
        <LinkFields flow={flow} node={node} onApply={onApply} />
      </section>
    </FlowPanelShell>
  )
}
