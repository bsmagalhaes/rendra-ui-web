import { Field } from '@/components/ui/field'
import { FormSection } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { modules, people, tagOptions, type AutomationDraft } from './automation-draft'

interface TabProps {
  draft: AutomationDraft
  onChange: (patch: Partial<AutomationDraft>) => void
}

/** Aba Geral: nome, descrição e o vínculo da automação (módulo, responsável e tags). */
export function AutomationGeneralTab({ draft, onChange }: TabProps) {
  return (
    <FormSection title="Dados da automação" description="Nome, descrição e vínculo.">
      <Field label="Nome" span="full" required>
        <Input value={draft.name} onChange={(name) => onChange({ name })} />
      </Field>
      <Field label="Descrição" span="full">
        <Textarea value={draft.description} onChange={(description) => onChange({ description })} />
      </Field>
      <Field label="Módulo ou funil">
        <Select
          label="Módulo ou funil"
          clearable
          value={draft.module}
          onChange={(module) => onChange({ module })}
          options={modules}
        />
      </Field>
      <Field label="Responsável">
        <Select
          label="Responsável"
          clearable
          value={draft.owner}
          onChange={(owner) => onChange({ owner })}
          options={people}
        />
      </Field>
      <Field label="Tags">
        <Select
          multiple
          label="Tags"
          value={draft.tags}
          onChange={(tags) => onChange({ tags })}
          options={tagOptions}
        />
      </Field>
    </FormSection>
  )
}
