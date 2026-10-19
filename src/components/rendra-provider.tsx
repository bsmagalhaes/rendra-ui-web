import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from 'react'
import { MotionProvider, type MotionMode } from '@/lib/motion/motion-context'

/**
 * Link com a mesma interface do `<a>`/`Link`: recebe `to`, `className`, `children`,
 * `aria-*`, `onClick` e repassa o resto.
 */
export interface RendraLinkProps {
  to: string
  className?: string
  children?: ReactNode
  [key: string]: unknown
}

export interface RendraBreadcrumbItem {
  label: string
  to?: string
}

export interface RendraNavigateOptions {
  replace?: boolean
}

export interface RendraProviderProps {
  children: ReactNode
  /** Componente de link do roteador do host (ex.: `Link` do react-router). */
  linkComponent: ComponentType<RendraLinkProps>
  /** Devolve o caminho atual (ex.: `useLocation().pathname`). */
  useCurrentPath: () => string
  /** Navega para um caminho, com `replace` opcional. */
  navigate: (to: string, options?: RendraNavigateOptions) => void
  /** Volta à tela anterior. */
  goBack: () => void
  /** Trilha da rota atual (ex.: via `useMatches` e `handle.crumb`). Opcional. */
  useBreadcrumbs?: () => RendraBreadcrumbItem[]
  /**
   * Animações dos componentes. `off` (padrão): sem nenhuma animação do Motion, a árvore e o
   * comportamento de sempre. `on`: entradas, saídas e layout animados pelo Motion.
   */
  motion?: MotionMode
}

interface RendraContextValue {
  linkComponent: ComponentType<RendraLinkProps>
  useCurrentPath: () => string
  navigate: (to: string, options?: RendraNavigateOptions) => void
  goBack: () => void
  useBreadcrumbs: () => RendraBreadcrumbItem[]
}

/** Sem roteador nenhum: o link é só um `<a href>`. */
function DefaultLink({ to, children, ...rest }: RendraLinkProps) {
  return (
    <a href={to} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </a>
  )
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

/** Sem roteador nenhum: lê `window.location.pathname` direto. */
function useDefaultCurrentPath(): string {
  return useSyncExternalStore(
    subscribeToLocation,
    () => window.location.pathname,
    () => '/',
  )
}

/** Sem roteador nenhum: navega com `window.location`. */
function defaultNavigate(to: string, options?: RendraNavigateOptions) {
  if (options?.replace) {
    window.location.replace(to)
  } else {
    window.location.assign(to)
  }
}

/** Sem roteador nenhum: volta pelo histórico do navegador. */
function defaultGoBack() {
  window.history.back()
}

/** Sem roteador nenhum: nenhuma trilha para montar. */
function defaultUseBreadcrumbs(): RendraBreadcrumbItem[] {
  return []
}

const defaultValue: RendraContextValue = {
  linkComponent: DefaultLink,
  useCurrentPath: useDefaultCurrentPath,
  navigate: defaultNavigate,
  goBack: defaultGoBack,
  useBreadcrumbs: defaultUseBreadcrumbs,
}

const RendraContext = createContext<RendraContextValue>(defaultValue)

/**
 * Única peça que sabe como navegar (`react-router`, outro roteador, ou nenhum).
 * Sem `RendraProvider` na árvore, os hooks abaixo caem para um comportamento simples,
 * baseado só em `window.location`/`history`, e os componentes continuam funcionando.
 */
export function RendraProvider({
  children,
  linkComponent,
  useCurrentPath: useCurrentPathProp,
  navigate,
  goBack,
  useBreadcrumbs,
  motion = 'off',
}: RendraProviderProps) {
  const value = useMemo<RendraContextValue>(
    () => ({
      linkComponent,
      useCurrentPath: useCurrentPathProp,
      navigate,
      goBack,
      useBreadcrumbs: useBreadcrumbs ?? defaultUseBreadcrumbs,
    }),
    [linkComponent, useCurrentPathProp, navigate, goBack, useBreadcrumbs],
  )
  return (
    <RendraContext.Provider value={value}>
      <MotionProvider mode={motion}>{children}</MotionProvider>
    </RendraContext.Provider>
  )
}

/** Componente de link do provider ativo (ou `<a href>`, sem provider). */
export function useRendraLink(): ComponentType<RendraLinkProps> {
  return useContext(RendraContext).linkComponent
}

/** Caminho atual (ex.: `/clientes/novo`), do provider ativo ou de `window.location`. */
export function useCurrentPath(): string {
  const ctx = useContext(RendraContext)
  return ctx.useCurrentPath()
}

/** Navegar e voltar, do provider ativo ou de `window.location`/`history`. */
export function useRendraNavigate(): {
  navigate: (to: string, options?: RendraNavigateOptions) => void
  goBack: () => void
} {
  const ctx = useContext(RendraContext)
  return { navigate: ctx.navigate, goBack: ctx.goBack }
}

/** Trilha da rota atual, do provider ativo ou vazia, sem roteador. */
export function useRendraBreadcrumbs(): RendraBreadcrumbItem[] {
  const ctx = useContext(RendraContext)
  return ctx.useBreadcrumbs()
}
