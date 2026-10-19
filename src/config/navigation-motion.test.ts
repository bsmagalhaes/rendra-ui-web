import { describe, expect, it } from 'vitest'
import { navigation } from './navigation'
import { experimentalRoutes, publicRoutes } from './routes-list'

/*
 * `/componentes-motion` é a tela de comparação da frente de motion. Ela fica fora das listas
 * dos testes de layout, acessibilidade e regressão visual (`publicRoutes`) para não exigir
 * referências novas; os testes dessas suítes só leem `publicRoutes`.
 */
describe('rota experimental de motion', () => {
  it('está em experimentalRoutes e não em publicRoutes', () => {
    expect(experimentalRoutes).toContain('/componentes-motion')
    expect(publicRoutes).not.toContain('/componentes-motion' as never)
  })

  it('o menu a traz como subitem de Componentes, logo abaixo da vitrine (sem ícone novo na barra recolhida)', () => {
    const sistema = navigation.find((g) => g.title === 'Sistema')!
    const componentes = sistema.items.find((i) => i.title === 'Componentes')!
    expect(componentes.children?.map((c) => c.to)).toEqual([
      '/componentes',
      '/componentes-motion',
      '/dashboard-motion',
    ])
    // nenhum item novo no nível de cima: a barra recolhida segue com os mesmos ícones
    expect(sistema.items.map((i) => i.title)).toEqual([
      'Componentes',
      'Tokens',
      'Galeria',
      'Configurações',
    ])
  })
})

describe('rota experimental do dashboard com motion', () => {
  it('está em experimentalRoutes e não em publicRoutes', () => {
    expect(experimentalRoutes).toContain('/dashboard-motion')
    expect(publicRoutes).not.toContain('/dashboard-motion' as never)
  })

  it('o menu a traz como terceiro filho de Componentes, chamado Dashboard com motion', () => {
    const sistema = navigation.find((g) => g.title === 'Sistema')!
    const componentes = sistema.items.find((i) => i.title === 'Componentes')!
    const filho = componentes.children?.find((c) => c.to === '/dashboard-motion')
    expect(filho?.title).toBe('Dashboard com motion')
  })
})
