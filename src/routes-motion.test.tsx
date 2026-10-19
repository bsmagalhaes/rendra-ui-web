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

describe('rota /dashboard-motion', () => {
  it('existe, logo depois de /componentes-motion, com o título na trilha', () => {
    const shell = routes[0]!.children!.find((r) => r.children)!
    const caminhos = shell.children!.map((r) => r.path)
    expect(caminhos.indexOf('dashboard-motion')).toBe(caminhos.indexOf('componentes-motion') + 1)
    const rota = shell.children!.find((r) => r.path === 'dashboard-motion')!
    expect(rota.handle).toEqual({ crumb: 'Dashboard com motion' })
  })
})
