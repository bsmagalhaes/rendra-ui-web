// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { activeBrand, availablePalettes, BrandProvider } from '@/brand'
import type { FeedbackType } from '@/brand/types'
import { renderApp } from '@/test/render'
import { BrandFeedbackIcon } from './brand-feedback-icon'

describe('BrandFeedbackIcon', () => {
  it('renderiza com o rótulo acessível e o código do catálogo', () => {
    const { container } = renderApp(<BrandFeedbackIcon type="success" label="Sucesso" />)
    const icon = container.querySelector('[data-rendra="BFI-001"]')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-label', 'Sucesso')
  })

  it.each([
    ['success', 'M3 6.2 5.1 8.2 9 4'],
    ['error', 'M4 4l4 4M8 4 4 8'],
    ['warning', 'M6 3.2v3.3M6 8.8v0'],
    ['info', 'M6 3.2v0M6 5.5v3.3'],
  ] as const)('tipo %s mostra o traço de status próprio do tipo', (type, path) => {
    const { container } = renderApp(<BrandFeedbackIcon type={type} />)
    const svgs = container.querySelectorAll('[data-rendra="BFI-001"] svg')
    const glyphPath = svgs[svgs.length - 1]?.querySelector('path')
    expect(glyphPath).toHaveAttribute('d', path)
  })

  describe('props novas (padrão igual ao de hoje)', () => {
    const tipos: FeedbackType[] = ['success', 'error', 'warning', 'info']
    const textoDoEstado = {
      success: 'text-success',
      error: 'text-destructive',
      warning: 'text-warning',
      info: 'text-info',
    } as const
    const iconeLucide = {
      success: 'lucide-circle-check',
      error: 'lucide-circle-x',
      warning: 'lucide-triangle-alert',
      info: 'lucide-info',
    } as const
    const raiz = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-rendra="BFI-001"]')!
    const simbolo = (c: HTMLElement) =>
      c.querySelector<SVGElement>('[data-rendra="BFI-001"] > svg')!
    const cls = (el: Element) => el.getAttribute('class')?.split(/\s+/) ?? []

    it.each(tipos)(
      'padrão (%s): texto do estado na raiz, selo sobreposto, pop só se animado',
      (type) => {
        const { container } = renderApp(<BrandFeedbackIcon type={type} />)
        expect(cls(raiz(container))).toContain(textoDoEstado[type])
        expect(cls(simbolo(container))).toContain('mask-status-cutout')
        expect(container.querySelector('[data-rendra="BFI-001"] .absolute')).toBeInTheDocument()
        expect(container.innerHTML).not.toContain('animate-')
      },
    )

    it.each(tipos)(
      'symbolTone="brand" (%s): a raiz perde o texto do estado, o símbolo usa text-primary-text e o selo mantém a cor do estado',
      (type) => {
        const { container } = renderApp(<BrandFeedbackIcon type={type} symbolTone="brand" />)
        for (const t of tipos) expect(cls(raiz(container))).not.toContain(textoDoEstado[t])
        expect(cls(simbolo(container))).toContain('text-primary-text')
        const selo = container.querySelector('[data-rendra="BFI-001"] .absolute')!
        expect(selo.className).toContain(
          {
            success: 'bg-success',
            error: 'bg-destructive',
            warning: 'bg-warning',
            info: 'bg-info',
          }[type],
        )
      },
    )

    it('symbolTone="state" explícito é igual ao padrão', () => {
      const { container } = renderApp(<BrandFeedbackIcon type="success" symbolTone="state" />)
      expect(cls(raiz(container))).toContain('text-success')
      expect(cls(simbolo(container))).not.toContain('text-primary-text')
    })

    it.each(tipos)(
      'statusBadge (%s): sem selo sobreposto, sem máscara e com o ícone Lucide do estado ao lado',
      (type) => {
        const { container } = renderApp(<BrandFeedbackIcon type={type} statusBadge />)
        expect(container.querySelector('[data-rendra="BFI-001"] .absolute')).not.toBeInTheDocument()
        expect(cls(simbolo(container))).not.toContain('mask-status-cutout')
        const svgs = container.querySelectorAll('[data-rendra="BFI-001"] svg')
        expect(svgs).toHaveLength(2)
        const selo = svgs[1]!
        expect(cls(selo)).toContain(iconeLucide[type])
        expect(cls(selo)).toContain(textoDoEstado[type])
        expect(selo).toHaveAttribute('aria-hidden', 'true')
      },
    )

    it('statusBadge com feedbackIcons[type] configurado: o ícone customizado vence e não há selo', () => {
      const Custom = (props: React.SVGProps<SVGSVGElement>) => (
        <svg data-testid="custom" viewBox="0 0 10 10" {...props} />
      )
      const marca = { ...activeBrand, feedbackIcons: { success: Custom } }
      const { container } = render(
        <BrandProvider
          brands={[marca]}
          palettes={availablePalettes}
          defaultBrand={marca}
          forcedMode="light"
        >
          <BrandFeedbackIcon type="success" statusBadge />
        </BrandProvider>,
      )
      expect(container.querySelectorAll('[data-rendra="BFI-001"] svg')).toHaveLength(1)
      expect(container.querySelector('[data-testid="custom"]')).toBeInTheDocument()
      expect(container.querySelector('svg.lucide')).not.toBeInTheDocument()
      const raiz = container.querySelector('[data-rendra="BFI-001"]')!
      expect(raiz).toHaveClass('size-icon-md')
      expect(raiz).not.toHaveClass('gap-1')
    })

    it('animated com animation="encaixe": símbolo e selo usam animate-encaixe, sem pop, sem desenho e sem tremor', () => {
      const { container } = renderApp(
        <BrandFeedbackIcon type="error" animated animation="encaixe" />,
      )
      expect(cls(simbolo(container))).toContain('animate-encaixe')
      expect(cls(simbolo(container))).not.toContain('animate-pop')
      expect(cls(raiz(container))).not.toContain('animate-shake')
      const selo = container.querySelector('[data-rendra="BFI-001"] .absolute')!
      expect(cls(selo)).toContain('animate-encaixe')
      expect(container.innerHTML).not.toContain('animate-pop')
      expect(container.innerHTML).not.toContain('animate-draw')
    })

    it('animation="encaixe" sem animated não anima nada', () => {
      const { container } = renderApp(<BrandFeedbackIcon type="success" animation="encaixe" />)
      expect(container.innerHTML).not.toContain('animate-')
    })

    it('animation="pop" (padrão) segue como hoje: pop, desenho e tremor no erro', () => {
      const { container } = renderApp(<BrandFeedbackIcon type="error" animated animation="pop" />)
      expect(cls(simbolo(container))).toContain('animate-pop')
      expect(cls(raiz(container))).toContain('animate-shake')
      expect(container.innerHTML).toContain('animate-draw')
      expect(container.innerHTML).not.toContain('animate-encaixe')
    })

    it('combinação brand + statusBadge + animated (pop e encaixe)', () => {
      const pop = renderApp(
        <BrandFeedbackIcon type="warning" symbolTone="brand" statusBadge animated />,
      )
      expect(cls(simbolo(pop.container))).toEqual(
        expect.arrayContaining(['text-primary-text', 'animate-pop']),
      )
      expect(cls(pop.container.querySelector('svg.lucide')!)).toEqual(
        expect.arrayContaining(['text-warning', 'animate-pop']),
      )
      pop.unmount()
      const encaixe = renderApp(
        <BrandFeedbackIcon
          type="warning"
          symbolTone="brand"
          statusBadge
          animated
          animation="encaixe"
        />,
      )
      expect(cls(simbolo(encaixe.container))).toContain('animate-encaixe')
      expect(cls(encaixe.container.querySelector('svg.lucide')!)).toContain('animate-encaixe')
    })

    it('statusBadge em cada tamanho tem o ícone com tamanho próprio', () => {
      for (const size of ['sm', 'md', 'lg', 'xl', '2xl'] as const) {
        const { container, unmount } = renderApp(
          <BrandFeedbackIcon type="info" size={size} statusBadge />,
        )
        expect(cls(container.querySelector('svg.lucide')!).some((c) => c.startsWith('size-'))).toBe(
          true,
        )
        unmount()
      }
    })
  })
})
