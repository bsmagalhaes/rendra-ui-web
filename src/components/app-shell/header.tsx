import {
  ArrowLeft,
  ChevronDown,
  LayoutTemplate,
  LogOut,
  Menu,
  Monitor,
  MoreHorizontal,
  Moon,
  PanelLeft,
  Palette,
  Search,
  Sun,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useBrand } from '@/brand/use-brand'
import type { ColorMode } from '@/brand/brand-context'
import { useCurrentPath, useRendraBreadcrumbs, useRendraLink } from '@/components/rendra-provider'
import { Avatar } from '@/components/ui/avatar'
import { BrandLogo } from '@/components/ui/brand-logo'
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InfoHint } from '@/components/ui/info-hint'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/initials'
import { shapeLabels } from '@/lib/shape'
import { layoutOptions, type ShellLayout } from './layout'
import { MegaMenu } from './mega-menu'
import { Notifications } from './notifications'
import { useShell } from './shell-context'

/**
 * Voltar das telas de segundo nível (ex.: Novo cliente, Detalhe do cliente): leva à tela-pai
 * da trilha, não ao histórico, para ser previsível mesmo quando a pessoa chegou por um link.
 */
function BackButton({ crumbs }: { crumbs: BreadcrumbItem[] }) {
  const Link = useRendraLink()
  const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : undefined
  if (!parent?.to) return null
  return (
    <Tooltip content={`Voltar para ${parent.label}`} side="bottom">
      <Button variant="ghost" iconOnly asChild className="shrink-0">
        <Link to={parent.to} aria-label={`Voltar para ${parent.label}`}>
          <ArrowLeft aria-hidden />
        </Link>
      </Button>
    </Tooltip>
  )
}

const modes: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

function ModeItems() {
  const { mode, setMode } = useBrand()
  return (
    <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as ColorMode)}>
      {modes.map((m) => (
        <DropdownMenuRadioItem key={m.value} value={m.value}>
          <m.icon aria-hidden />
          {m.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

function LayoutItems() {
  const { layout, setLayout, resetLayout } = useShell()
  const radio = <K extends 'navigation' | 'sidebar' | 'submenu' | 'topbarSubmenu'>(
    key: K,
    title: string,
  ) => (
    <>
      <DropdownMenuLabel>{title}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={layout[key]}
        onValueChange={(v) => setLayout(key, v as ShellLayout[K])}
      >
        {layoutOptions[key].map((o) => (
          <DropdownMenuRadioItem key={o.value} value={o.value}>
            {o.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
  const sidebar = layout.navigation === 'sidebar'
  return (
    <>
      {radio('navigation', 'Posição do menu')}
      {!sidebar && (
        <>
          <DropdownMenuSeparator />
          {radio('topbarSubmenu', 'Submenu')}
        </>
      )}
      {sidebar && (
        <>
          <DropdownMenuSeparator />
          {radio('sidebar', 'Sidebar')}
          <DropdownMenuCheckboxItem
            checked={layout.expandOnHover}
            disabled={layout.sidebar !== 'collapsed'}
            onCheckedChange={(v) => setLayout('expandOnHover', v === true)}
            onSelect={(e) => e.preventDefault()}
          >
            Abrir ao passar o mouse
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {radio('submenu', 'Submenu')}
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        checked={layout.bottomNav}
        onCheckedChange={(v) => setLayout('bottomNav', v === true)}
        onSelect={(e) => e.preventDefault()}
      >
        Barra inferior no celular
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={resetLayout}>Voltar ao padrão do projeto</DropdownMenuItem>
    </>
  )
}

function UserMenu() {
  const Link = useRendraLink()
  const { user, userMenuItems, onLogout, userMenu, workspaces } = useShell()
  const { brand, brands, setBrandId, palette, palettes, setPaletteId } = useBrand()
  const showTheme = userMenu?.theme !== false
  const showTemplate = userMenu?.template !== false
  const showLayout = userMenu?.layout !== false
  // O separador antes do grupo só existe se ao menos um dos submenus existir.
  const showPreferences = showTheme || showTemplate || showLayout
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          iconOnly
          aria-label={`${initials(user.name)}, menu de ${user.name}`}
        >
          <Avatar name={user.name} src={user.avatarUrl} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{user.name}</span>
          {user.email && <span className="font-normal">{user.email}</span>}
        </DropdownMenuLabel>
        {workspaces && workspaces.items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{workspaces.label ?? 'Espaço'}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={workspaces.activeId} onValueChange={workspaces.onSelect}>
              {workspaces.items.map((w) => (
                <DropdownMenuRadioItem key={w.id} value={w.id}>
                  {w.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
        {userMenuItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {userMenuItems.map((item) => {
              const Icon = item.icon
              return item.to ? (
                <DropdownMenuItem key={item.label} asChild>
                  <Link to={item.to}>
                    {Icon && <Icon aria-hidden />}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={item.label} onSelect={item.onSelect}>
                  {Icon && <Icon aria-hidden />}
                  {item.label}
                </DropdownMenuItem>
              )
            })}
          </>
        )}
        {showPreferences && <DropdownMenuSeparator />}
        {showTheme && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun aria-hidden />
              Tema
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <ModeItems />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {showTemplate && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette aria-hidden />
              Template
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>Modelo</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={brand.id} onValueChange={setBrandId}>
                {brands.map((b) => (
                  <DropdownMenuRadioItem key={b.id} value={b.id}>
                    <span className="flex flex-col">
                      <span>{b.productName}</span>
                      <span className="text-xs text-muted-foreground">{shapeLabels[b.shape]}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Paleta de cores</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={palette.id}
                onValueChange={(v) => setPaletteId(v === brand.id ? null : v)}
              >
                {palettes.map((b) => (
                  <DropdownMenuRadioItem key={b.id} value={b.id}>
                    {b.name}
                    {b.id === brand.id && (
                      <span className="ml-auto pl-4 text-xs text-muted-foreground">do modelo</span>
                    )}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {showLayout && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LayoutTemplate aria-hidden />
              Layout
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <LayoutItems />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onLogout?.()}>
          <LogOut aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Menu superior. Os itens que não cabem na largura vão para o botão "Mais", no fim da
 * barra: o menu nunca passa por cima da busca e dos ícones, com qualquer número de itens.
 */
function TopNav() {
  const pathname = useCurrentPath()
  const Link = useRendraLink()
  const { navigation } = useShell()
  const items = navigation.flatMap((g) => g.items)
  const navRef = useRef<HTMLElement>(null)
  const widths = useRef<number[]>([])
  const [count, setCount] = useState(items.length)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const measure = () => {
      const lis = [...nav.querySelectorAll<HTMLLIElement>('li[data-item]')]
      // Mede só quando todos estão visíveis (primeira pintura e depois da fonte carregar).
      if (lis.length === items.length && lis.every((li) => li.offsetWidth > 0))
        widths.current = lis.map((li) => li.offsetWidth + 4)
      const avail = nav.clientWidth
      const total = widths.current.reduce((a, b) => a + b, 0)
      if (total <= avail) return setCount(items.length)
      const more = 104 // largura reservada para o botão Mais
      let used = 0
      let n = 0
      for (const w of widths.current) {
        if (used + w > avail - more) break
        used += w
        n++
      }
      setCount(n)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    void document.fonts?.ready.then(() => {
      setCount(items.length)
      requestAnimationFrame(measure)
    })
    return () => ro.disconnect()
  }, [items.length])

  const link =
    'inline-flex h-control-md items-center gap-2 rounded-item px-3 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-icon-sm'
  const idle = 'text-muted-foreground hover:bg-accent hover:text-foreground'
  const active = 'bg-primary-soft text-primary-soft-foreground'
  const isActive = (item: (typeof items)[number]) =>
    item.children
      ? item.children.some((c) => pathname.startsWith(c.to))
      : item.to === '/'
        ? pathname === '/'
        : pathname.startsWith(item.to ?? '/')
  const overflow = items.slice(count)

  return (
    <nav ref={navRef} aria-label="Navegação principal" className="hidden w-full min-w-0 lg:block">
      <ul className="flex items-center justify-center gap-1">
        {items.map((item, i) => {
          const Icon = item.icon
          const hidden = i >= count
          if (item.children) {
            return (
              <li key={item.title} data-item className={cn(hidden && 'hidden')}>
                <DropdownMenu>
                  <DropdownMenuTrigger className={cn(link, isActive(item) ? active : idle)}>
                    <Icon aria-hidden />
                    {item.title}
                    <ChevronDown aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {item.children.map((c) => (
                      <DropdownMenuItem key={c.to} asChild>
                        <Link to={c.to}>{c.title}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          }
          const to = item.to ?? '/'
          return (
            <li key={item.title} data-item className={cn(hidden && 'hidden')}>
              <Link to={to} className={cn(link, isActive(item) ? active : idle)}>
                <Icon aria-hidden />
                {item.title}
              </Link>
            </li>
          )
        })}
        {overflow.length > 0 && (
          <li>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(link, overflow.some(isActive) ? active : idle)}
                aria-label={`Mais ${overflow.length} itens do menu`}
              >
                <MoreHorizontal aria-hidden />
                Mais
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflow.flatMap((item) => {
                  const Icon = item.icon
                  return item.children
                    ? item.children.map((c) => (
                        <DropdownMenuItem key={c.to} asChild>
                          <Link to={c.to}>
                            <Icon aria-hidden />
                            {c.title}
                          </Link>
                        </DropdownMenuItem>
                      ))
                    : [
                        <DropdownMenuItem key={item.title} asChild>
                          <Link to={item.to ?? '/'}>
                            <Icon aria-hidden />
                            {item.title}
                          </Link>
                        </DropdownMenuItem>,
                      ]
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )}
      </ul>
    </nav>
  )
}

export function Header() {
  const {
    layout,
    setLayout,
    setMobileNavOpen,
    setSearchOpen,
    pageHelp,
    homeLabel,
    notifications,
    headerLogo,
  } = useShell()
  const { brand, resolvedMode } = useBrand()
  const Link = useRendraLink()
  const crumbs = useRendraBreadcrumbs()
  // Trilha do header: sempre começa no destino inicial (homeLabel).
  const trail =
    crumbs[0]?.to === '/' || crumbs.length === 0
      ? crumbs
      : [{ label: homeLabel, to: '/' }, ...crumbs]
  const ModeIcon = resolvedMode === 'dark' ? Moon : Sun
  const topbar = layout.navigation === 'topbar'
  const hasParent = Boolean(crumbs.length >= 2 && crumbs[crumbs.length - 2]?.to)
  // No celular, o menu fica no botão central da barra inferior (ou dá lugar à seta de voltar).
  const menuInFooter = layout.bottomNav || hasParent
  // Título e trilha em uma linha cada; se não couber, reticências (nunca quebra linha).
  const pageTitle = (
    <>
      {headerLogo && (
        <span aria-hidden className="flex min-w-0 flex-1 items-center md:hidden">
          {headerLogo}
        </span>
      )}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col justify-center',
          headerLogo && 'max-md:flex-none',
        )}
      >
        <span className="flex min-w-0 items-center gap-1">
          <p
            className={cn(
              'truncate text-sm leading-tight font-semibold md:text-base',
              headerLogo && 'max-md:sr-only',
            )}
          >
            {crumbs[crumbs.length - 1]?.label ?? brand.productName}
          </p>
          {pageHelp && (
            <InfoHint
              title={crumbs[crumbs.length - 1]?.label ?? brand.productName}
              className="-my-2"
            >
              {pageHelp}
            </InfoHint>
          )}
        </span>
        <Breadcrumb items={trail} variant="trail" className={cn(headerLogo && 'max-md:hidden')} />
      </div>
    </>
  )
  const collapsed = layout.sidebar === 'collapsed'

  return (
    <header className="relative z-30 flex h-header shrink-0 items-center gap-1 border-b bg-card px-2 md:gap-2 md:px-4">
      <Button
        variant="ghost"
        iconOnly
        aria-label="Abrir menu"
        className={cn(topbar ? 'lg:hidden' : 'md:hidden', menuInFooter && 'max-md:hidden')}
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu aria-hidden />
      </Button>

      {topbar ? (
        <>
          <Link
            to="/"
            aria-label={`${brand.productName}, ir para o painel`}
            className="hidden shrink-0 lg:block"
          >
            <BrandLogo on="surface" />
          </Link>
          <span className="flex min-w-0 flex-1 items-center gap-1 lg:hidden">
            <BackButton crumbs={crumbs} />
            {pageTitle}
          </span>
          <div className="hidden min-w-0 flex-1 lg:flex lg:justify-center">
            {layout.topbarSubmenu === 'mega' ? <MegaMenu /> : <TopNav />}
          </div>
        </>
      ) : (
        <>
          <Tooltip content={collapsed ? 'Expandir menu' : 'Recolher menu'} side="bottom">
            <Button
              variant="ghost"
              iconOnly
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-pressed={!collapsed}
              className="hidden md:inline-flex"
              onClick={() => setLayout('sidebar', collapsed ? 'expanded' : 'collapsed')}
            >
              <PanelLeft aria-hidden />
            </Button>
          </Tooltip>
          <span
            aria-hidden
            className={cn(
              'mx-1 h-8 w-px shrink-0 bg-border md:mx-2',
              menuInFooter && 'max-md:hidden',
            )}
          />
          <BackButton crumbs={crumbs} />
          {pageTitle}
        </>
      )}

      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        {/* Busca: campo no desktop, ícone abaixo disso (abre em tela cheia no mobile) */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={cn(
            'hidden h-control-md items-center gap-2 rounded-control border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary',
            topbar ? '2xl:flex 2xl:w-3xs' : 'lg:flex lg:w-3xs',
          )}
        >
          <Search className="size-icon-sm" aria-hidden />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="rounded-item border bg-muted px-2 text-xs">Ctrl K</kbd>
        </button>
        <Button
          variant="ghost"
          iconOnly
          aria-label="Buscar"
          className={topbar ? '2xl:hidden' : 'lg:hidden'}
          onClick={() => setSearchOpen(true)}
        >
          <Search aria-hidden />
        </Button>

        {notifications && <Notifications />}

        <DropdownMenu>
          <Tooltip content="Tema" side="bottom">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" iconOnly aria-label="Tema" className="hidden md:inline-flex">
                <ModeIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="end">
            <ModeItems />
          </DropdownMenuContent>
        </DropdownMenu>

        <UserMenu />
      </div>
    </header>
  )
}
