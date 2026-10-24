import { Stack } from '@/components/layout'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { FormSection } from '@/components/ui/form'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { people, type AutomationDraft } from './automation-draft'

interface TabProps {
  draft: AutomationDraft
  onChange: (patch: Partial<AutomationDraft>) => void
}

/** Aba Configurações: alertas de erro, aplicação retroativa e a situação em cartões. */
export function AutomationSettingsTab({ draft, onChange }: TabProps) {
  return (
    <Stack gap="section">
      <FormSection
        title="Alertas de erro"
        description="Quem recebe aviso quando uma execução falha."
        columns={1}
      >
        <Switch
          label="Avisar quando houver erro"
          checked={draft.alertsOn}
          onCheckedChange={(alertsOn) => onChange({ alertsOn })}
        />
        {draft.alertsOn && (
          <>
            <Field label="Destinatários">
              <Select
                multiple
                label="Destinatários"
                value={draft.alertRecipients}
                onChange={(alertRecipients) => onChange({ alertRecipients })}
                options={people}
              />
            </Field>
            <div role="group" aria-label="Canais do aviso" className="flex flex-col gap-3">
              <Checkbox
                label="E-mail"
                checked={draft.alertEmail}
                onCheckedChange={(v) => onChange({ alertEmail: v === true })}
              />
              <Checkbox
                label="WhatsApp"
                checked={draft.alertWhatsapp}
                onCheckedChange={(v) => onChange({ alertWhatsapp: v === true })}
              />
            </div>
          </>
        )}
      </FormSection>
      <FormSection title="Aplicação" description="Quais registros a automação alcança." columns={1}>
        <RadioGroup
          aria-label="Aplicação"
          value={draft.apply}
          onChange={(v) => onChange({ apply: v as AutomationDraft['apply'] })}
          options={[
            { value: 'daqui-para-frente', label: 'Só daqui para frente' },
            { value: 'retroativo', label: 'Também nos registros existentes' },
          ]}
        />
      </FormSection>
      <FormSection title="Situação" description="Se a automação está valendo." columns={1}>
        <RadioGroup
          aria-label="Situação da automação"
          variant="cards"
          columns={3}
          value={draft.status}
          onChange={(v) => onChange({ status: v as AutomationDraft['status'] })}
          options={[
            { value: 'rascunho', label: 'Rascunho', description: 'Em construção, não executa.' },
            { value: 'ativo', label: 'Ativo', description: 'Executa a cada gatilho.' },
            {
              value: 'desativado',
              label: 'Desativado',
              description: 'Pausada, mantém o histórico.',
            },
          ]}
        />
      </FormSection>
    </Stack>
  )
}
