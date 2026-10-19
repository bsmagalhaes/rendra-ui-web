import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Download, MoreHorizontal, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ActionBar } from '@/components/ui/action-bar'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/* ------------------------------------------------ Button */

const buttonMeta = {
  title: 'Ações/Botões, grupos, menus e barra de ações',
  component: Button,
  args: {
    children: 'Salvar cliente',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    fullWidth: false,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>
export default buttonMeta
type Story = StoryObj<typeof buttonMeta>

export const Padrao: Story = {}
export const Secundario: Story = { args: { variant: 'secondary' } }
export const Outline: Story = { args: { variant: 'outline' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Destrutivo: Story = { args: { variant: 'destructive', children: 'Excluir' } }
export const Link: Story = { args: { variant: 'link', children: 'Ver detalhes' } }
export const ComIcone: Story = { args: { icon: <Plus />, children: 'Novo cliente' } }
export const SoIcone: Story = {
  args: { iconOnly: true, 'aria-label': 'Editar', variant: 'ghost', children: <Pencil /> },
}
export const Carregando: Story = { args: { loading: true, children: 'Salvando' } }
export const Desabilitado: Story = { args: { disabled: true } }
export const LarguraTotal: Story = { args: { fullWidth: true, icon: <Save /> } }
export const Tamanhos: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Pequeno</Button>
      <Button size="md">Médio</Button>
      <Button size="lg">Grande</Button>
    </div>
  ),
}

/* ------------------------------------------------ ButtonGroup, DropdownMenu e ActionBar */

export const Grupo: Story = {
  name: 'ButtonGroup: agrupado',
  render: () => (
    <ButtonGroup aria-label="Arquivo">
      <Button variant="outline" icon={<Copy />}>
        Duplicar
      </Button>
      <Button variant="outline" icon={<Download />}>
        Exportar
      </Button>
    </ButtonGroup>
  ),
}

export const GrupoVertical: Story = {
  name: 'ButtonGroup: vertical e responsivo',
  render: () => (
    <div className="flex flex-col gap-6">
      <ButtonGroup aria-label="Ações do cliente" orientation="vertical">
        <Button variant="outline" icon={<Copy />}>
          Duplicar
        </Button>
        <Button variant="outline" icon={<Download />}>
          Exportar
        </Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Ações do pedido" orientation="responsive">
        <Button variant="outline" icon={<Copy />}>
          Duplicar
        </Button>
        <Button variant="outline" icon={<Download />}>
          Exportar
        </Button>
        <Button variant="outline">Ver itens</Button>
      </ButtonGroup>
    </div>
  ),
}

function SegmentedDemo() {
  const [v, setV] = useState('mes')
  return (
    <ButtonGroup
      aria-label="Período"
      value={v}
      onChange={setV}
      options={[
        { value: 'dia', label: 'Hoje' },
        { value: 'semana', label: 'Semana' },
        { value: 'mes', label: 'Mês' },
      ]}
    />
  )
}
export const Segmentado: Story = {
  name: 'ButtonGroup: segmentado',
  render: () => <SegmentedDemo />,
}

export const Menu: Story = {
  name: 'DropdownMenu',
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" iconOnly aria-label="Mais ações">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Cliente</DropdownMenuLabel>
        <DropdownMenuItem>
          <Pencil aria-hidden />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download aria-hidden />
          Exportar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive>
          <Trash2 aria-hidden />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

function MenuComSubitensDemo() {
  const [comEmail, setComEmail] = useState(true)
  const [ordenar, setOrdenar] = useState('nome')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Colunas e ordenação</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Colunas</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={comEmail}
          onCheckedChange={(v) => setComEmail(v === true)}
        >
          E-mail
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Ordenar por</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={ordenar} onValueChange={setOrdenar}>
              <DropdownMenuRadioItem value="nome">Nome</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="data">Data de cadastro</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export const MenuComSubitens: Story = {
  name: 'DropdownMenu: subitens (checkbox, submenu e opções)',
  render: () => <MenuComSubitensDemo />,
}

export const BarraUmBotao: Story = {
  name: 'ActionBar: um botão (100%)',
  render: () => <ActionBar primary={{ label: 'Entendi' }} />,
}
export const BarraDoisBotoes: Story = {
  name: 'ActionBar: dois botões (30/70)',
  render: () => <ActionBar cancel={{ label: 'Cancelar' }} primary={{ label: 'Salvar' }} />,
}
export const BarraComMenu: Story = {
  name: 'ActionBar: três ou mais (menu)',
  render: () => (
    <ActionBar
      cancel={{ label: 'Cancelar' }}
      primary={{ label: 'Publicar' }}
      secondary={[{ label: 'Salvar rascunho' }, { label: 'Excluir', destructive: true }]}
    />
  ),
}
export const BarraCarregando: Story = {
  name: 'ActionBar: enviando',
  render: () => (
    <ActionBar cancel={{ label: 'Cancelar' }} primary={{ label: 'Salvar', loading: true }} />
  ),
}
