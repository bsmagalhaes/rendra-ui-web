// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Button } from './button'
import { ButtonGroup } from './button-group'

/** ButtonGroup é controlado: só o chamador guarda o valor selecionado. */
function GrupoControlado() {
  const [value, setValue] = useState('mes')
  return (
    <ButtonGroup
      aria-label="Visão"
      value={value}
      onChange={setValue}
      options={[
        { value: 'mes', label: 'Mês' },
        { value: 'semana', label: 'Semana' },
      ]}
    />
  )
}

describe('ButtonGroup', () => {
  it('modo segmentado escolhe uma opção e usa o código do catálogo', async () => {
    const onChange = vi.fn()
    renderApp(
      <ButtonGroup
        aria-label="Visão"
        value="mes"
        onChange={onChange}
        options={[
          { value: 'mes', label: 'Mês' },
          { value: 'semana', label: 'Semana' },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Semana' }))
    expect(onChange).toHaveBeenCalledWith('semana')
    expect(screen.getByRole('radiogroup', { name: 'Visão' })).toHaveAttribute(
      'data-rendra',
      'BTNG-001',
    )
  })

  it('marca a opção selecionada e desmarca a anterior ao escolher outra', async () => {
    renderApp(<GrupoControlado />)
    const mes = screen.getByRole('radio', { name: 'Mês' })
    const semana = screen.getByRole('radio', { name: 'Semana' })
    expect(mes).toHaveAttribute('aria-checked', 'true')
    expect(semana).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(semana)

    expect(semana).toHaveAttribute('aria-checked', 'true')
    expect(mes).toHaveAttribute('aria-checked', 'false')
  })

  describe('modo agrupado (children) e orientation', () => {
    const botoes = [
      <Button key="a" variant="outline">
        Um
      </Button>,
      <Button key="b" variant="outline">
        Dois
      </Button>,
      <Button key="c" variant="outline">
        Três
      </Button>,
    ]
    const grupo = () => screen.getByRole('group', { name: 'Ações' })
    const classes = (el: HTMLElement) => el.className.split(/\s+/)

    it('padrão (horizontal): inline-flex e raios horizontais, como antes', () => {
      renderApp(<ButtonGroup aria-label="Ações">{botoes}</ButtonGroup>)
      const c = classes(grupo())
      expect(c).toContain('inline-flex')
      expect(c).not.toContain('flex-col')
      expect(c).toContain('[&>*:first-child]:rounded-l-control')
      expect(c).toContain('[&>*:last-child]:rounded-r-control')
      expect(c).toContain('[&>*:not(:first-child)]:-ml-px')
      expect(grupo()).toHaveAttribute('data-rendra', 'BTNG-001')
    })

    it('orientation="horizontal" explícito é igual ao padrão', () => {
      renderApp(
        <ButtonGroup aria-label="Ações" orientation="horizontal">
          {botoes}
        </ButtonGroup>,
      )
      expect(grupo().className).toContain('[&>*:first-child]:rounded-l-control')
      expect(grupo()).toHaveAttribute('data-rendra', 'BTNG-001')
    })

    it('vertical: coluna, botões na largura toda, cantos só no primeiro e no último', () => {
      renderApp(
        <ButtonGroup aria-label="Ações" orientation="vertical">
          {botoes}
        </ButtonGroup>,
      )
      const c = classes(grupo())
      expect(c).toContain('flex-col')
      expect(c).toContain('[&>*]:w-full')
      expect(c).toContain('[&>*:first-child]:rounded-t-control')
      expect(c).toContain('[&>*:last-child]:rounded-b-control')
      expect(c).toContain('[&>*:not(:first-child)]:-mt-px')
      expect(c).not.toContain('[&>*:first-child]:rounded-l-control')
      expect(c).not.toContain('[&>*:last-child]:rounded-r-control')
      expect(c).not.toContain('[&>*:not(:first-child)]:-ml-px')
      expect(grupo()).toHaveAttribute('data-rendra', 'BTNG-002')
    })

    it('responsive: vertical abaixo de md e horizontal a partir dele, com o reset dos cantos', () => {
      renderApp(
        <ButtonGroup aria-label="Ações" orientation="responsive">
          {botoes}
        </ButtonGroup>,
      )
      const c = classes(grupo())
      expect(c).toContain('flex-col')
      expect(c).toContain('md:flex-row')
      expect(c).toContain('[&>*:first-child]:rounded-t-control')
      expect(c).toContain('[&>*:last-child]:rounded-b-control')
      expect(c).toContain('[&>*:not(:first-child)]:-mt-px')
      // A partir de md: raios horizontais e zera o que a vertical pôs.
      expect(c).toContain('md:[&>*:first-child]:rounded-l-control')
      expect(c).toContain('md:[&>*:first-child]:rounded-tr-none')
      expect(c).toContain('md:[&>*:last-child]:rounded-r-control')
      expect(c).toContain('md:[&>*:last-child]:rounded-bl-none')
      expect(c).toContain('md:[&>*:not(:first-child)]:mt-0')
      expect(c).toContain('md:[&>*:not(:first-child)]:-ml-px')
      expect(c).toContain('md:[&>*]:w-auto')
      expect(grupo()).toHaveAttribute('data-rendra', 'BTNG-003')
    })

    it('fullWidth combinado com vertical: largura toda e sem flex-1 nos filhos', () => {
      renderApp(
        <ButtonGroup aria-label="Ações" orientation="vertical" fullWidth>
          {botoes}
        </ButtonGroup>,
      )
      const c = classes(grupo())
      expect(c).toContain('flex')
      expect(c).toContain('w-full')
      expect(c).toContain('flex-col')
      expect(c).not.toContain('[&>*]:flex-1')
    })

    it('fullWidth horizontal segue com flex-1 nos filhos', () => {
      renderApp(
        <ButtonGroup aria-label="Ações" fullWidth>
          {botoes}
        </ButtonGroup>,
      )
      expect(grupo().className).toContain('[&>*]:flex-1')
    })

    it('o modo segmentado ignora orientation: mesmas classes e BTNG-001', () => {
      const opcoes = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]
      const { unmount } = renderApp(<ButtonGroup aria-label="Visão" value="a" options={opcoes} />)
      const antes = screen.getByRole('radiogroup', { name: 'Visão' }).className
      unmount()
      renderApp(
        <ButtonGroup aria-label="Visão" value="a" options={opcoes} orientation="vertical" />,
      )
      const grupoSeg = screen.getByRole('radiogroup', { name: 'Visão' })
      expect(grupoSeg.className).toBe(antes)
      expect(grupoSeg).toHaveAttribute('data-rendra', 'BTNG-001')
    })

    it('className do chamador entra no fim e vence', () => {
      renderApp(
        <ButtonGroup aria-label="Ações" className="w-1/2">
          {botoes}
        </ButtonGroup>,
      )
      expect(classes(grupo())).toContain('w-1/2')
    })
  })
})
