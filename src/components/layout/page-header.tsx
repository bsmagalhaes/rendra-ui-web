import { useContext, useEffect, type ReactNode } from 'react'
import { ShellContext } from '@/components/app-shell/shell-context'
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb'
import { InfoHint } from '@/components/ui/info-hint'
import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  /** Título da página. Dentro do AppShell ele já aparece no header, então aqui fica oculto. */
  title: ReactNode
  /**
   * Mostra o título no corpo da página. Use só quando o título do corpo for diferente
   * do header (ex.: no detalhe, o nome do cliente em vez de "Detalhe do cliente"),
   * ou em telas fora do AppShell.
   */
  showTitle?: boolean
  /**
   * Dado curto sobre o conteúdo (status, segmento, cidade). Nunca instrução de uso: texto
   * orientativo vai em `help`.
   */
  description?: ReactNode
  /**
   * Texto orientativo da tela (como usar, o que cada parte faz). Vira um ícone de informação
   * ao lado do título, no header fixo, que abre um modal. Nunca um parágrafo no corpo.
   */
  help?: ReactNode
  /** Trilha própria. Dentro do AppShell a trilha já aparece no header, abaixo do título. */
  breadcrumb?: BreadcrumbItem[]
  /**
   * Ação principal (e no máximo uma secundária). No mobile ficam abaixo da descrição,
   * dividindo a largura; no desktop ficam à direita, com largura automática.
   */
  actions?: ReactNode
  /**
   * Título discreto no topo do corpo quando o cabeçalho do shell esconde o título (no celular,
   * com `headerLogo`): `text-base` abaixo de `md` e só de leitor de tela a partir dele.
   * `showTitle` vence. Padrão: `false`.
   */
  bodyTitle?: boolean
  /**
   * `reserve` (padrão): o bloco do título ocupa lugar mesmo quando o título é só de leitor de
   * tela (o vão de 16 px acima das ações no celular). `none`: sem título visível e sem
   * `description`, o bloco não é desenhado e o vão some; o `h1` segue no DOM para o leitor.
   */
  titleSpace?: 'reserve' | 'none'
  /** Conteúdo abaixo, como abas ou metadados. */
  children?: ReactNode
  /**
   * Classes extras, que vencem as do componente. Para zerar a margem negativa de baixo (que
   * aproxima o cabeçalho do conteúdo) use `className="mb-0 md:mb-0"`.
   */
  className?: string
}

/**
 * Cabeçalho de conteúdo: descrição e ações da tela, logo abaixo do header.
 * O título fica no header (com a trilha); aqui ele só é lido por leitores de tela,
 * para que cada página tenha um único título principal (h1).
 */
export function PageHeader({
  title,
  showTitle = false,
  description,
  help,
  breadcrumb,
  actions,
  bodyTitle = false,
  titleSpace = 'reserve',
  children,
  className,
}: PageHeaderProps) {
  const shell = useContext(ShellContext)
  const setPageHelp = shell?.setPageHelp
  // Dentro do AppShell, o ícone de ajuda vai para o header, ao lado do título da tela.
  useEffect(() => {
    if (!setPageHelp) return
    setPageHelp(help ?? null)
    return () => setPageHelp(null)
  }, [help, setPageHelp])
  const inlineHelp = help && !shell
  const visible =
    showTitle || bodyTitle || description || actions || breadcrumb || children || inlineHelp
  // Sem título visível e sem descrição, o bloco do título só carregaria o h1 sr-only (que não
  // ocupa lugar); com titleSpace="none" ele nem é desenhado e o vão acima das ações some.
  const titleOnlyForReader = !showTitle && !bodyTitle && !inlineHelp
  const collapseTitle = titleSpace === 'none' && titleOnlyForReader && !description
  const titleClass =
    showTitle || inlineHelp
      ? 'text-2xl md:text-3xl'
      : bodyTitle
        ? 'text-base md:sr-only'
        : 'sr-only'
  return (
    <header
      className={cn('-mb-2 flex min-w-0 flex-col gap-4 md:-mb-4', !visible && 'sr-only', className)}
    >
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        {collapseTitle ? (
          <h1 className="sr-only">{title}</h1>
        ) : (
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-1">
              <h1 className={titleClass}>{title}</h1>
              {inlineHelp && (
                <InfoHint title={typeof title === 'string' ? title : 'Sobre esta tela'}>
                  {help}
                </InfoHint>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground md:text-base">{description}</p>
            )}
          </div>
        )}
        {actions && (
          <div className="flex w-full shrink-0 gap-3 md:ml-auto md:w-auto [&>*]:flex-1 md:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>
      {children}
    </header>
  )
}
