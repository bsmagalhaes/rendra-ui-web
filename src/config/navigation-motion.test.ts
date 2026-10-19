import { describe, expect, it } from 'vitest'
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
})
