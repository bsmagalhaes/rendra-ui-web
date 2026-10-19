// @vitest-environment jsdom
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { formatCurrency } from '@/lib/masks'
import { realAnimations } from '@/test/motion'
import { renderApp } from '@/test/render'
import { DashboardMotionPage } from './dashboard-motion-page'

/*
 * Os testes de efeito ligam as animações de verdade (realAnimations): com as animações
 * desligadas (setup.ts) a opacidade e o contador já nascem no valor final e nada provaria
 * a entrada.
 */
let restaurar: (() => void) | undefined
afterEach(() => {
  restaurar?.()
  restaurar = undefined
})

const chave = () => screen.getByRole('radiogroup', { name: 'Motion' })
const blocos = () => Array.from(document.querySelectorAll<HTMLElement>('[data-bloco]'))
const cartao = () =>
  screen.getByText('Receita do mês').closest<HTMLElement>('[data-rendra="STAT-001"]')!
const valor = () => /R\$\s[\d.,]+/.exec(cartao().textContent ?? '')?.[0]
const final = formatCurrency(61300)

describe('DashboardMotionPage', () => {
  it('abre em ligado, com a chave e os blocos do painel', () => {
    renderApp(<DashboardMotionPage />)
    expect(screen.getByRole('heading', { name: 'Dashboard com motion' })).toBeInTheDocument()
    expect(within(chave()).getByRole('radio', { name: 'Ligado' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(within(chave()).getByRole('radio', { name: 'Desligado' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    for (const rotulo of [
      'Receita do mês',
      'Clientes ativos',
      'Ticket médio',
      'Vencem esta semana',
    ]) {
      expect(screen.getByText(rotulo)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Receita e meta por mês')).toBeInTheDocument()
    expect(screen.getByLabelText('Clientes por segmento')).toBeInTheDocument()
    expect(screen.getByText('Clientes recentes')).toBeInTheDocument()
    expect(screen.getByText('Contrato 1042 assinado')).toBeInTheDocument()
  })

  it('em ligado, cada bloco nasce transparente e termina em opacidade 1 (a entrada acontece)', async () => {
    restaurar = realAnimations()
    renderApp(<DashboardMotionPage />)
    const lista = blocos()
    expect(lista.length).toBeGreaterThanOrEqual(6)
    // logo após montar, o último da cascata ainda não apareceu
    expect(Number(lista[lista.length - 1]!.style.opacity)).toBeLessThan(1)
    await waitFor(() => expect(lista.every((b) => b.style.opacity === '1')).toBe(true), {
      timeout: 3000,
    })
  })

  it('a cascata é escalonada: quando o primeiro bloco já subiu, o último ainda não começou', async () => {
    restaurar = realAnimations()
    renderApp(<DashboardMotionPage />)
    await waitFor(() => expect(Number(blocos()[0]!.style.opacity)).toBeGreaterThanOrEqual(0.5), {
      timeout: 3000,
    })
    const ops = blocos().map((b) => Number(b.style.opacity))
    expect(ops[ops.length - 1]).toBeLessThan(ops[0]!)
    for (let i = 0; i < ops.length - 1; i++) expect(ops[i]).toBeGreaterThanOrEqual(ops[i + 1]!)
  })

  it('em desligado, nenhum bloco tem opacidade nem transform do Motion, mesmo com animações reais', async () => {
    restaurar = realAnimations()
    renderApp(<DashboardMotionPage />)
    await userEvent.click(within(chave()).getByRole('radio', { name: 'Desligado' }))
    const lista = blocos()
    expect(lista.length).toBeGreaterThanOrEqual(6)
    for (const b of lista) {
      expect(b.style.opacity).toBe('')
      expect(b.style.transform).toBe('')
    }
    await act(() => new Promise((r) => setTimeout(r, 150)))
    for (const b of blocos()) expect(b.style.opacity).toBe('')
    // o valor do contador aparece direto, sem contar
    expect(screen.getByText('Receita do mês')).toBeInTheDocument()
    expect(valor()).toBe(final)
  })

  it('religar remonta o painel e o contador volta a contar a partir de um valor menor que o final', async () => {
    restaurar = realAnimations()
    renderApp(<DashboardMotionPage />)
    await waitFor(() => expect(blocos().every((b) => b.style.opacity === '1')).toBe(true), {
      timeout: 3000,
    })
    const antes = blocos()[0]!
    await userEvent.click(within(chave()).getByRole('radio', { name: 'Desligado' }))
    await userEvent.click(within(chave()).getByRole('radio', { name: 'Ligado' }))
    const novos = blocos()
    expect(novos[0]).not.toBe(antes)
    expect(antes.isConnected).toBe(false)
    expect(Number(novos[novos.length - 1]!.style.opacity)).toBeLessThan(1)
    // contador: logo após religar não mostra o valor final; depois mostra exatamente
    await waitFor(() => expect(valor()).not.toBe(final))
    expect(valor()).toBeDefined()
    await waitFor(() => expect(valor()).toBe(final), { timeout: 3000 })
  })
})
