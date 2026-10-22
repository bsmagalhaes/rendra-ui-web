import { useCallback, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useMatches, useNavigate, type UIMatch } from 'react-router'
import {
  RendraProvider,
  type RendraBreadcrumbItem,
  type RendraLinkProps,
} from '@/components/rendra-provider'
import type { MotionMode } from '@/lib/motion/motion-context'
import type { RendraMotion } from '@/lib/motion/motion-on'

/**
 * Metadados de rota lidos pela trilha: handle: { crumb: 'Clientes' }. Convenção do
 * react-router (`handle`), que não existe em outros roteadores; por isso fica aqui, na
 * ponte, e não em src/components/app-shell/header.tsx.
 */
export interface RouteHandle {
  crumb?: string | ((params: Record<string, string | undefined>) => string)
}

/** `Link` do react-router com a interface do `RendraLinkProps` (repassa o resto). */
function RouterLink({ to, children, ...rest }: RendraLinkProps) {
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  )
}

/** Caminho atual do react-router. */
function useCurrentPathFromRouter(): string {
  return useLocation().pathname
}

/** Trilha a partir de `useMatches`/`handle.crumb`, a mesma convenção do header. */
function useBreadcrumbsFromMatches(): RendraBreadcrumbItem[] {
  const matches = useMatches() as UIMatch<unknown, RouteHandle | undefined>[]
  return matches
    .filter((m) => m.handle?.crumb)
    .map((m, i, all) => {
      const crumb = m.handle!.crumb!
      return {
        label: typeof crumb === 'function' ? crumb(m.params) : crumb,
        to: i < all.length - 1 ? m.pathname : undefined,
      }
    })
}

/**
 * Liga o `RendraProvider` ao `react-router` do boilerplate: link, caminho atual, navegar
 * e a trilha. É o único lugar do app que sabe que o roteador é o `react-router`; os
 * componentes de `src/components/ui` e o `AppShell` não importam `react-router` diretamente.
 * Sem `children`, renderiza `<Outlet />`, para ser usado como elemento raiz das rotas.
 */
export function RendraRouterBridge({
  children,
  motion,
}: { children?: ReactNode; motion?: MotionMode | RendraMotion } = {}) {
  const navigate = useNavigate()
  const go = useCallback(
    (to: string, options?: { replace?: boolean }) => navigate(to, options),
    [navigate],
  )
  const goBack = useCallback(() => navigate(-1), [navigate])
  return (
    <RendraProvider
      linkComponent={RouterLink}
      useCurrentPath={useCurrentPathFromRouter}
      navigate={go}
      goBack={goBack}
      useBreadcrumbs={useBreadcrumbsFromMatches}
      motion={motion}
    >
      {children ?? <Outlet />}
    </RendraProvider>
  )
}
