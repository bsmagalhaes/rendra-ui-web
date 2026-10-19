import { describe, expect, it } from 'vitest'
import { initials } from './initials'

describe('initials', () => {
  it('primeira letra do primeiro e do último nome, em maiúsculas', () => {
    expect(initials('Ana Souza')).toBe('AS')
    expect(initials('maria da silva')).toBe('MS')
  })

  it('uma palavra só dá uma letra', () => {
    expect(initials('Madonna')).toBe('M')
  })

  it('ignora espaços nas pontas e repetidos', () => {
    expect(initials('  Ana   Souza  ')).toBe('AS')
  })

  it('texto vazio dá vazio', () => {
    expect(initials('')).toBe('')
  })
})
