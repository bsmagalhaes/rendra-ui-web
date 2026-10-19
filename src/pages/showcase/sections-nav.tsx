import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

/*
 * Navegação lateral das vitrines (/componentes e /componentes-motion): os grupos de seções, o
 * scrollspy e a lista de links. Extraído de components-page.tsx sem mudar nada do que renderiza.
 */

export const groups = [
  {
    title: 'Ações',
    items: [
      ['botao', 'Botão'],
      ['button-group', 'ButtonGroup'],
      ['menu-suspenso', 'DropdownMenu'],
      ['action-bar', 'ActionBar'],
    ],
  },
  {
    title: 'Formulário',
    items: [
      ['field', 'Field e Label'],
      ['input', 'Input'],
      ['textarea', 'Textarea'],
      ['editor', 'RichTextEditor'],
      ['select', 'Select'],
      ['cor', 'ColorPicker'],
      ['checkbox-radio', 'Checkbox, Radio, Switch'],
      ['datepicker', 'DatePicker'],
      ['slider', 'Slider'],
      ['upload', 'Upload'],
      ['otp', 'OtpInput'],
      ['avaliacao', 'Rating'],
      ['campo-repetivel', 'RepeatableField'],
      ['checklist', 'Checklist'],
      ['formulario-validado', 'Formulário validado'],
    ],
  },
  {
    title: 'Navegação',
    items: [
      ['tabs', 'Tabs'],
      ['breadcrumb', 'Breadcrumb'],
      ['paginacao', 'Pagination'],
      ['wizard', 'Wizard e Stepper'],
    ],
  },
  {
    title: 'Dados',
    items: [
      ['table', 'Table'],
      ['statcard', 'StatCard'],
      ['card', 'Card'],
      ['badge', 'Badge'],
      ['avatar', 'Avatar'],
      ['lista', 'Lista'],
      ['timeline', 'Timeline'],
      ['accordion', 'Accordion'],
      ['chart', 'Chart'],
      ['qrcode', 'QrCode'],
      ['widgets', 'WidgetGrid'],
    ],
  },
  {
    title: 'Planejamento',
    items: [
      ['calendario', 'Calendar (agenda)'],
      ['kanban', 'Kanban'],
      ['atendimento', 'Atendimento (chat)'],
      ['visualizador', 'ImageViewer'],
      ['documentos', 'DocumentViewer'],
    ],
  },
  {
    title: 'Feedback',
    items: [
      ['icone-feedback', 'Ícone de feedback'],
      ['logotipo', 'Logotipo da marca'],
      ['credito', 'Crédito Feito com Rendra'],
      ['alert', 'Alert'],
      ['toast', 'Toast'],
      ['modal', 'Modal'],
      ['texto-orientativo', 'Texto orientativo (InfoHint)'],
      ['popover-tooltip', 'Popover e Tooltip'],
      ['empty-state', 'EmptyState'],
      ['progress-skeleton', 'Progress, Skeleton e Spinner'],
      ['pagina-erro', 'Página de erro'],
    ],
  },
  {
    title: 'Composição',
    items: [
      ['drawer', 'Drawer'],
      ['container-certo', 'Qual contêiner'],
      ['regra-botoes', 'Proporção dos botões'],
      ['regra-card', 'Card sem card'],
      ['regra-tabela', 'Tabela em cards'],
      ['primitivas', 'Primitivas de layout'],
    ],
  },
] as const

export const allIds = groups.flatMap((g) => g.items.map(([id]) => id))
export const titleOf: Record<string, string> = Object.fromEntries(
  groups.flatMap((g) => g.items.map(([id, t]) => [id, t])),
)

export function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? '')
  useEffect(() => {
    const root = document.getElementById('conteudo')
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { root, rootMargin: '-10% 0px -75% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [ids])
  return active
}

export function SectionNav({
  active,
  onNavigate,
  include = () => true,
}: {
  active: string
  onNavigate?: () => void
  /** Filtra os itens mostrados (a vitrine de motion tira "primitivas"). */
  include?: (id: string) => boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-1">
          <span className="px-3 text-xs font-semibold tracking-wide text-foreground uppercase">
            {g.title}
          </span>
          <ul className="flex flex-col">
            {g.items
              .filter(([id]) => include(id))
              .map(([id, title]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={onNavigate}
                    aria-current={active === id ? 'location' : undefined}
                    className={cn(
                      'flex min-h-touch items-center rounded-item px-3 text-sm transition-colors md:h-8 md:min-h-0',
                      active === id
                        ? 'bg-primary-soft font-medium text-primary-soft-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {title}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
