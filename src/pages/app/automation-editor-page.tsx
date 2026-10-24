import { ArrowLeft, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { Container, Stack } from '@/components/layout'
import { useRendraLink } from '@/components/rendra-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FlowEditor } from '@/components/ui/flow-editor'
import { Tabs } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useRouteMeta } from '@/hooks/use-route-meta'
import { validateFlow, type Flow } from '@/lib/flow'
import { automationFlow, automationStatusLabel, automationStatusTone } from '@/mocks/automations'
import { AutomationGeneralTab } from './automation-general-tab'
import { initialDraft, type AutomationDraft } from './automation-draft'
import { AutomationHistoryTab } from './automation-history-tab'
import { AutomationSettingsTab } from './automation-settings-tab'

/**
 * Nova automação ou edição: sempre em tela cheia, fora do AppShell (sem sidebar nem header do
 * sistema). Tem a própria barra com voltar, nome, situação e as ações "Testar fluxo" e "Salvar"
 * (exceção registrada no DESIGN_RULES). A página não rola: rola só o <main>. Nada é gravado nem
 * executado de verdade.
 */
export function AutomationEditorPage() {
  useRouteMeta()
  const Link = useRendraLink()
  const { isMobile } = useBreakpoint()
  const [tab, setTab] = useState('workflow')
  const [draft, setDraft] = useState<AutomationDraft>(initialDraft)
  const [flow, setFlow] = useState<Flow>(automationFlow)
  const [testOpen, setTestOpen] = useState(false)
  const patch = (p: Partial<AutomationDraft>) => setDraft((d) => ({ ...d, ...p }))

  const save = () => {
    const issues = validateFlow(flow)
    if (issues.length > 0)
      toast.error(
        issues.length === 1 ? '1 problema no fluxo' : `${issues.length} problemas no fluxo`,
      )
    else toast.success('Automação salva')
  }

  // Fora do AppShell não há TooltipProvider (a tabela do histórico usa Tooltip nas ações da linha).
  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-background">
        <header className="flex shrink-0 items-center gap-3 border-b bg-card px-4 py-2 md:px-6">
          <Link
            to="/automacoes"
            aria-label="Voltar para Automações"
            className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-icon-md" aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-xs text-muted-foreground">Automações / Nova automação</p>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-semibold">{draft.name || 'Sem nome'}</h1>
              <Badge tone={automationStatusTone[draft.status]}>
                {automationStatusLabel[draft.status]}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            iconOnly={isMobile}
            aria-label="Testar fluxo"
            icon={<FlaskConical />}
            onClick={() => {
              setTab('workflow')
              setTestOpen(true)
            }}
          >
            {isMobile ? null : 'Testar fluxo'}
          </Button>
          <Button onClick={save}>Salvar</Button>
        </header>
        <main id="automacao" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Container padded>
            <Stack gap="section">
              <Tabs
                aria-label="Seções da automação"
                value={tab}
                onChange={setTab}
                items={[
                  {
                    value: 'geral',
                    label: 'Geral',
                    content: (
                      <div className="pt-4">
                        <AutomationGeneralTab draft={draft} onChange={patch} />
                      </div>
                    ),
                  },
                  {
                    value: 'workflow',
                    label: 'Workflow',
                    content: (
                      <div className="pt-4">
                        <FlowEditor
                          value={flow}
                          onChange={setFlow}
                          toolbar={false}
                          testOpen={testOpen}
                          onTestOpenChange={setTestOpen}
                        />
                      </div>
                    ),
                  },
                  {
                    value: 'configuracoes',
                    label: 'Configurações',
                    content: (
                      <div className="pt-4">
                        <AutomationSettingsTab draft={draft} onChange={patch} />
                      </div>
                    ),
                  },
                  {
                    value: 'historico',
                    label: 'Histórico de execuções',
                    content: (
                      <div className="pt-4">
                        <AutomationHistoryTab />
                      </div>
                    ),
                  },
                ]}
              />
            </Stack>
          </Container>
        </main>
      </div>
    </TooltipProvider>
  )
}
