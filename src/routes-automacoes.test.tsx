// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { navigation } from './config/navigation'
import { publicRoutes } from './config/routes-list'
import { seoFor } from './config/seo'
import { routes } from './routes'

describe('rotas das automações', () => {
  const raiz = routes[0]!.children!
  const shell = raiz.find((r) => r.children)!

  it('/automacoes fica dentro do shell; /automacoes/nova fica fora, irmã do shell', () => {
    expect(shell.children!.map((r) => r.path)).toContain('automacoes')
    expect(shell.children!.find((r) => r.path === 'automacoes')!.handle).toEqual({
      crumb: 'Automações',
    })
    expect(shell.children!.map((r) => r.path)).not.toContain('automacoes/nova')
    const nova = raiz.find((r) => r.path === 'automacoes/nova')!
    expect(nova.handle).toEqual({ crumb: 'Nova automação' })
  })

  it('as duas rotas estão na lista dos testes, com título e descrição de SEO', () => {
    for (const rota of ['/automacoes', '/automacoes/nova'] as const) {
      expect(publicRoutes).toContain(rota)
      expect(seoFor(rota)?.title).toBeTruthy()
      expect(seoFor(rota)?.description.length).toBeGreaterThan(20)
    }
  })

  it('o menu tem "Automações" no grupo Operação, logo depois do Funil de vendas', () => {
    const operacao = navigation.find((g) => g.title === 'Operação')!
    const titulos = operacao.items.map((i) => i.title)
    expect(titulos.indexOf('Automações')).toBe(titulos.indexOf('Funil de vendas') + 1)
    expect(operacao.items.find((i) => i.title === 'Automações')!.to).toBe('/automacoes')
  })
})
