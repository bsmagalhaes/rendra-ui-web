import { Check, ChevronRight } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { DropdownMenu as D } from 'radix-ui'
import { createContext, useContext, useState, type ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { useMotionMode, useMotionPresets } from '@/lib/motion'

/*
 * Em `on` o menu e o submenu precisam saber se estão abertos para manter o conteúdo montado
 * durante a saída animada. `Root` e `Sub` viram wrappers com exatamente os mesmos tipos do
 * Radix que espelham o estado (controlado ou não) num contexto; em `off` são o `D.Root` e o
 * `D.Sub` de sempre. O estado do submenu vive no próprio `D.Sub`, por isso o wrapper dele.
 */
const MenuOpenContext = createContext<boolean | null>(null)
const SubOpenContext = createContext<boolean | null>(null)

function MirroredRoot({ open, defaultOpen, onOpenChange, ...rest }: ComponentProps<typeof D.Root>) {
  const [inner, setInner] = useState(defaultOpen ?? false)
  const current = open ?? inner
  return (
    <MenuOpenContext.Provider value={current}>
      <D.Root
        {...rest}
        open={current}
        onOpenChange={(next) => {
          setInner(next)
          onOpenChange?.(next)
        }}
      />
    </MenuOpenContext.Provider>
  )
}

function MirroredSub({ open, defaultOpen, onOpenChange, ...rest }: ComponentProps<typeof D.Sub>) {
  const [inner, setInner] = useState(defaultOpen ?? false)
  const current = open ?? inner
  return (
    <SubOpenContext.Provider value={current}>
      <D.Sub
        {...rest}
        open={current}
        onOpenChange={(next) => {
          setInner(next)
          onOpenChange?.(next)
        }}
      />
    </SubOpenContext.Provider>
  )
}

export function DropdownMenu(props: ComponentProps<typeof D.Root>) {
  return useMotionMode() === 'on' ? <MirroredRoot {...props} /> : <D.Root {...props} />
}
export const DropdownMenuTrigger = D.Trigger
export const DropdownMenuGroup = D.Group
export function DropdownMenuSub(props: ComponentProps<typeof D.Sub>) {
  return useMotionMode() === 'on' ? <MirroredSub {...props} /> : <D.Sub {...props} />
}
export const DropdownMenuRadioGroup = D.RadioGroup

const panelBase =
  'z-50 w-max min-w-3xs max-w-popover overflow-hidden rounded-surface border bg-popover p-1 text-popover-foreground shadow-md'
const panelOff = cn(
  panelBase,
  'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
)

// Itens com 44px no mobile (toque) e compactos a partir de md.
const item =
  'relative flex min-h-touch cursor-pointer items-center gap-2 rounded-item px-3 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground md:min-h-0 md:py-2 [&_svg]:size-icon-sm [&_svg]:shrink-0 [&_svg]:text-muted-foreground'

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  children,
  asChild,
  ...props
}: ComponentProps<typeof D.Content>) {
  const open = useContext(MenuOpenContext)
  const motion = useMotionMode()
  const presets = useMotionPresets()

  if (motion === 'on' && open !== null && !asChild) {
    return (
      <AnimatePresence>
        {open && (
          <D.Portal forceMount key="menu">
            <D.Content
              forceMount
              asChild
              sideOffset={sideOffset}
              collisionPadding={16}
              data-rendra="DDM-001"
              className={cn(panelBase, className)}
              {...props}
            >
              <m.div {...presets.scale}>{children}</m.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    )
  }

  return (
    <D.Portal>
      <D.Content
        sideOffset={sideOffset}
        collisionPadding={16}
        data-rendra="DDM-001"
        className={cn(panelOff, className)}
        asChild={asChild}
        {...props}
      >
        {children}
      </D.Content>
    </D.Portal>
  )
}

interface ItemProps extends ComponentProps<typeof D.Item> {
  /** Item destrutivo (excluir, sair): texto na cor destrutiva. */
  destructive?: boolean
}

export function DropdownMenuItem({ className, destructive, ...props }: ItemProps) {
  return (
    <D.Item
      className={cn(
        item,
        destructive &&
          'text-destructive data-highlighted:bg-destructive-soft data-highlighted:text-destructive-soft-foreground [&_svg]:text-current',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof D.CheckboxItem>) {
  return (
    <D.CheckboxItem className={cn(item, 'pl-8', className)} {...props}>
      <span className="absolute left-2 flex size-icon-sm items-center justify-center">
        <D.ItemIndicator>
          <Check className="text-primary-text" />
        </D.ItemIndicator>
      </span>
      {children}
    </D.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof D.RadioItem>) {
  return (
    <D.RadioItem className={cn(item, 'pl-8', className)} {...props}>
      <span className="absolute left-2 flex size-icon-sm items-center justify-center">
        <D.ItemIndicator>
          <Check className="text-primary-text" />
        </D.ItemIndicator>
      </span>
      {children}
    </D.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof D.Label>) {
  return (
    <D.Label
      className={cn('px-2 py-2 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof D.Separator>) {
  return <D.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof D.SubTrigger>) {
  return (
    <D.SubTrigger className={cn(item, 'data-[state=open]:bg-accent', className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </D.SubTrigger>
  )
}

export function DropdownMenuSubContent({
  className,
  children,
  asChild,
  ...props
}: ComponentProps<typeof D.SubContent>) {
  const open = useContext(SubOpenContext)
  const motion = useMotionMode()
  const presets = useMotionPresets()

  if (motion === 'on' && open !== null && !asChild) {
    return (
      <AnimatePresence>
        {open && (
          <D.Portal forceMount key="submenu">
            <D.SubContent
              forceMount
              asChild
              collisionPadding={16}
              className={cn(panelBase, className)}
              {...props}
            >
              <m.div {...presets.scale}>{children}</m.div>
            </D.SubContent>
          </D.Portal>
        )}
      </AnimatePresence>
    )
  }

  return (
    <D.Portal>
      <D.SubContent
        collisionPadding={16}
        className={cn(panelOff, className)}
        asChild={asChild}
        {...props}
      >
        {children}
      </D.SubContent>
    </D.Portal>
  )
}
