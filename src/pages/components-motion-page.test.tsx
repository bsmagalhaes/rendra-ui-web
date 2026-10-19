// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useMotionMode } from '@/lib/motion'
import { renderApp } from '@/test/render'
import { ComponentsMotionPage } from './components-motion-page'
import { groups } from './showcase/sections-nav'

/*
 * As sete seções da vitrine são pesadas; os testes trocam cada uma por um marcador que lê o
 * modo de motion (a prova de que o seletor chega aos componentes de dentro das seções), e a
 * página inteira é exercitada na vitrine e nas capturas.
 */
vi.mock('./showcase/actions-section', () => ({ ActionsSection: () => <Probe id="actions" /> }))
vi.mock('./showcase/forms-section', () => ({ FormsSection: () => <Probe id="forms" /> }))
vi.mock('./showcase/navigation-section', () => ({ NavigationSection: () => <Probe id="nav" /> }))
vi.mock('./showcase/data-section', () => ({ DataSection: () => <Probe id="data" /> }))
vi.mock('./showcase/planning-section', () => ({ PlanningSection: () => <Probe id="plan" /> }))
vi.mock('./showcase/feedback-section', () => ({ FeedbackSection: () => <Probe id="fb" /> }))
vi.mock('./showcase/composition-section', () => ({ CompositionSection: () => <Probe id="comp" /> }))

function Probe({ id }: { id: string }) {
  return <p data-testid={`modo-${id}`}>{useMotionMode()}</p>
}

const ids = ['actions', 'forms', 'nav', 'data', 'plan', 'fb', 'comp']
const modos = () => ids.map((id) => screen.getByTestId(`modo-${id}`).textContent)

describe('ComponentsMotionPage', () => {
  it('abre em on, com o título e as sete seções', () => {
    renderApp(<ComponentsMotionPage />)
    expect(screen.getByRole('heading', { name: 'Componentes com motion' })).toBeInTheDocument()
    expect(modos()).toEqual(Array(7).fill('on'))
  })

  it('o seletor troca para off e de volta para on dentro de todas as seções', async () => {
    renderApp(<ComponentsMotionPage />)
    const seletor = screen.getByRole('radiogroup', { name: 'Motion' })
    expect(within(seletor).getByRole('radio', { name: 'Ligado' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await userEvent.click(within(seletor).getByRole('radio', { name: 'Desligado' }))
    expect(modos()).toEqual(Array(7).fill('off'))
    expect(within(seletor).getByRole('radio', { name: 'Desligado' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await userEvent.click(within(seletor).getByRole('radio', { name: 'Ligado' }))
    expect(modos()).toEqual(Array(7).fill('on'))
  })

  it('a navegação lateral lista os grupos da vitrine, sem a seção "Primitivas de layout", que não é um dos componentes', () => {
    renderApp(<ComponentsMotionPage />)
    const nav = screen.getByRole('navigation', { name: 'Seções da vitrine' })
    const todos = groups.flatMap((g) => g.items.map(([, titulo]) => titulo))
    expect(todos).toContain('Primitivas de layout')
    expect(within(nav).queryByText('Primitivas de layout')).not.toBeInTheDocument()
    expect(within(nav).getAllByText('Botão').length).toBeGreaterThan(0)
  })

  it('a página /componentes continua sem o seletor de motion', async () => {
    const { ComponentsPage } = await import('./components-page')
    renderApp(<ComponentsPage />)
    expect(screen.queryByRole('radiogroup', { name: 'Motion' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Componentes' })).toBeInTheDocument()
  })
})
