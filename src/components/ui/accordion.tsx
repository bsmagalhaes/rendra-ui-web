import { ChevronDown } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { Accordion as A } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

export interface AccordionItem {
  value: string
  title: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface AccordionProps {
  items: AccordionItem[]
  /** Permite abrir vários ao mesmo tempo. */
  multiple?: boolean
  defaultValue?: string[]
  className?: string
}

/** Accordion único, com animação de altura e área de toque de 44px no mobile. */
export function Accordion({ items, multiple, defaultValue, className }: AccordionProps) {
  const motion = useMotionMode()
  const presets = useMotionPresets()
  // Só em `on`: o valor aberto é espelhado aqui, para o conteúdo continuar montado durante a
  // saída animada. Sempre uma lista; no modo único tem no máximo um item.
  const [open, setOpen] = useState<string[]>(
    multiple ? (defaultValue ?? []) : defaultValue?.[0] ? [defaultValue[0]] : [],
  )

  if (motion === 'on') {
    const rootProps = multiple
      ? ({ type: 'multiple', value: open, onValueChange: setOpen } as const)
      : ({
          type: 'single',
          collapsible: true,
          value: open[0] ?? '',
          onValueChange: (v: string) => setOpen(v ? [v] : []),
        } as const)
    return (
      <A.Root {...rootProps} data-rendra="ACRN-001" className={cn('flex flex-col', className)}>
        {items.map((it) => {
          const isOpen = open.includes(it.value)
          return (
            <A.Item
              key={it.value}
              value={it.value}
              disabled={it.disabled}
              className="border-b last:border-b-0"
            >
              <A.Header>
                <A.Trigger className="group flex min-h-touch w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0">
                  {it.title}
                  <m.span
                    aria-hidden
                    className="flex shrink-0"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={presets.fade.transition}
                  >
                    <ChevronDown className="size-icon-sm text-muted-foreground" />
                  </m.span>
                </A.Trigger>
              </A.Header>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <A.Content forceMount asChild>
                    <m.div
                      className="overflow-hidden text-sm wrap-break-word text-muted-foreground"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={presets.fade.transition}
                    >
                      <div className="pb-4">{it.content}</div>
                    </m.div>
                  </A.Content>
                )}
              </AnimatePresence>
            </A.Item>
          )
        })}
      </A.Root>
    )
  }

  const content = items.map((it) => (
    <A.Item
      key={it.value}
      value={it.value}
      disabled={it.disabled}
      className="border-b last:border-b-0"
    >
      <A.Header>
        <A.Trigger className="group flex min-h-touch w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0">
          {it.title}
          <ChevronDown
            aria-hidden
            className="size-icon-sm shrink-0 text-muted-foreground transition-transform duration-(--rendra-duration-base) ease-move group-data-[state=open]:rotate-180"
          />
        </A.Trigger>
      </A.Header>
      <A.Content className="overflow-hidden text-sm wrap-break-word text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pb-4">{it.content}</div>
      </A.Content>
    </A.Item>
  ))
  return multiple ? (
    <A.Root
      type="multiple"
      defaultValue={defaultValue}
      data-rendra="ACRN-001"
      className={cn('flex flex-col', className)}
    >
      {content}
    </A.Root>
  ) : (
    <A.Root
      type="single"
      collapsible
      defaultValue={defaultValue?.[0]}
      data-rendra="ACRN-001"
      className={cn('flex flex-col', className)}
    >
      {content}
    </A.Root>
  )
}
