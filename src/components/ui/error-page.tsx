import { ArrowLeft, Home, RotateCw } from 'lucide-react'
import { useRendraLink, useRendraNavigate } from '@/components/rendra-provider'
import { BrandFeedbackIcon } from '@/components/ui/brand-feedback-icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const content = {
  404: {
    type: 'warning' as const,
    title: 'Página não encontrada',
    description:
      'O endereço pode ter mudado ou a página foi removida. Confira o link ou volte ao painel.',
  },
  500: {
    type: 'error' as const,
    title: 'Algo deu errado do nosso lado',
    description: 'Não foi possível carregar esta tela agora. Tente de novo em instantes.',
  },
}

export interface ErrorPageProps {
  code: 404 | 500
  /** Título próprio no lugar do padrão. */
  title?: string
  description?: string
  /** Ocupa a tela inteira (fora do AppShell). */
  fullScreen?: boolean
  /**
   * Mostra o botão Voltar (padrão). Com `false` só a ação principal é desenhada, na largura
   * toda (regra "um botão = 100%").
   */
  back?: boolean
}

/**
 * Tela de erro única (404 e 500), com o ícone de feedback da marca animado.
 * Ações seguem a regra 30/70: secundária à esquerda, principal à direita.
 */
export function ErrorPage({
  code,
  title,
  description,
  fullScreen = false,
  back = true,
}: ErrorPageProps) {
  const Link = useRendraLink()
  const { goBack } = useRendraNavigate()
  const c = content[code]
  // Sem o Voltar, a ação principal é o único botão: 100% da largura.
  const principal = back ? 'col-span-7' : 'col-span-10'

  return (
    <div
      data-rendra="ERRO-001"
      className={cn(
        'flex w-full items-center justify-center px-4 py-12',
        fullScreen ? 'min-h-dvh' : 'min-h-full',
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="relative flex items-center justify-center">
          <span aria-hidden className="absolute size-24 rounded-full bg-gradient-soft" />
          <BrandFeedbackIcon type={c.type} size="2xl" animated className="relative" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-muted-foreground tabular-nums">
            Erro {code}
          </p>
          <h1 className="text-2xl md:text-3xl">{title ?? c.title}</h1>
          <p className="text-base text-muted-foreground">{description ?? c.description}</p>
        </div>
        <div className="grid w-full grid-cols-10 gap-3">
          {back && (
            <Button
              variant="outline"
              icon={<ArrowLeft />}
              className="col-span-3"
              onClick={goBack}
              aria-label="Voltar"
            >
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          )}
          {code === 500 ? (
            <Button icon={<RotateCw />} className={principal} onClick={() => location.reload()}>
              Tentar de novo
            </Button>
          ) : (
            <Button asChild className={principal}>
              <Link to="/">
                <Home aria-hidden />
                Ir para o painel
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
