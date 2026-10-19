// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

describe('rota /componentes-motion', () => {
  it('existe, logo depois de /componentes, com o título na trilha', () => {
    const shell = routes[0]!.children!.find((r) => r.children)!
    const caminhos = shell.children!.map((r) => r.path)
    expect(caminhos.indexOf('componentes-motion')).toBe(caminhos.indexOf('componentes') + 1)
    const rota = shell.children!.find((r) => r.path === 'componentes-motion')!
    expect(rota.handle).toEqual({ crumb: 'Componentes com motion' })
  })
})
