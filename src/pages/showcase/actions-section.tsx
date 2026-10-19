import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  ChevronDown,
  Copy,
  Download,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Stack } from '@/components/layout'
import { ActionBar } from '@/components/ui/action-bar'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CatalogCode, Demo, GroupTitle, Row } from './demo'

export function ActionsSection() {
  const [view, setView] = useState('lista')
  return (
    <>
      <GroupTitle
        id="grupo-acoes"
        title="Ações"
        description="Botões, grupos, menus e a barra de ações com a regra 100% / 30-70 / menu."
      />

      <Demo
        id="botao"
        title="Botão"
        description="Um único botão. Hover troca para a cor de hover do template e eleva; pressionar comprime. Ghost e link assumem a cor primária no hover. No celular a altura mínima é 44px."
        props="variant (primary, secondary, outline, ghost, destructive, link), size, icon, iconRight, iconOnly, loading, fullWidth, disabled, asChild"
      >
        <Row label="Variantes">
          <Stack gap="1" align="center">
            <Button>Primário</Button>
            <CatalogCode code="BTN-001" />
          </Stack>
          <Stack gap="1" align="center">
            <Button variant="secondary">Secundário</Button>
            <CatalogCode code="BTN-002" />
          </Stack>
          <Stack gap="1" align="center">
            <Button variant="outline">Outline</Button>
            <CatalogCode code="BTN-003" />
          </Stack>
          <Stack gap="1" align="center">
            <Button variant="ghost">Ghost</Button>
            <CatalogCode code="BTN-004" />
          </Stack>
          <Stack gap="1" align="center">
            <Button variant="destructive">Destrutivo</Button>
            <CatalogCode code="BTN-005" />
          </Stack>
          <Stack gap="1" align="center">
            <Button variant="link">Link</Button>
            <CatalogCode code="BTN-006" />
          </Stack>
        </Row>
        <Row label="Tamanhos">
          <Button size="sm">Pequeno</Button>
          <Button size="md">Médio</Button>
          <Button size="lg">Grande</Button>
        </Row>
        <Row label="Com ícone e só ícone">
          <Button icon={<Plus />}>Novo cliente</Button>
          <Button variant="outline" icon={<Download />}>
            Exportar
          </Button>
          <Button variant="outline" iconRight={<ChevronDown />}>
            Mais ações
          </Button>
          <Button variant="ghost" iconOnly aria-label="Editar">
            <Pencil />
          </Button>
          <Button variant="destructive" iconOnly aria-label="Excluir">
            <Trash2 />
          </Button>
        </Row>
        <Row label="Estados">
          <Button>Padrão</Button>
          <Button className="bg-primary-hover text-primary-hover-foreground shadow-md">
            Hover
          </Button>
          <Button className="focus-ring">Foco visível</Button>
          <Button className="scale-98 bg-primary-hover text-primary-hover-foreground">Ativo</Button>
          <Button disabled>Desabilitado</Button>
          <Button loading>Salvando</Button>
        </Row>
        <Row label="Largura total">
          <Button fullWidth icon={<Save />}>
            Salvar alterações
          </Button>
        </Row>
      </Demo>

      <Demo
        id="button-group"
        title="ButtonGroup"
        description="Agrupa botões encostados ou funciona como controle segmentado de escolha única. Quebra linha em vez de rolar."
        props="children | options + value + onChange, size, fullWidth"
        code="BTNG-001"
      >
        <Row label="Botões agrupados">
          <ButtonGroup aria-label="Alinhamento">
            <Button variant="outline" iconOnly aria-label="Esquerda">
              <AlignLeft />
            </Button>
            <Button variant="outline" iconOnly aria-label="Centro">
              <AlignCenter />
            </Button>
            <Button variant="outline" iconOnly aria-label="Direita">
              <AlignRight />
            </Button>
          </ButtonGroup>
          <ButtonGroup aria-label="Arquivo">
            <Button variant="outline" icon={<Copy />}>
              Duplicar
            </Button>
            <Button variant="outline" icon={<Archive />}>
              Arquivar
            </Button>
          </ButtonGroup>
        </Row>
        <Row label="Vertical (orientation)" code="BTNG-002">
          <ButtonGroup aria-label="Ações do cliente" orientation="vertical">
            <Button variant="outline" icon={<Copy />}>
              Duplicar
            </Button>
            <Button variant="outline" icon={<Archive />}>
              Arquivar
            </Button>
          </ButtonGroup>
        </Row>
        <Row
          label="Responsivo: vertical no celular, lado a lado a partir do tablet"
          code="BTNG-003"
        >
          <ButtonGroup aria-label="Ações do pedido" orientation="responsive">
            <Button variant="outline" icon={<Copy />}>
              Duplicar
            </Button>
            <Button variant="outline" icon={<Archive />}>
              Arquivar
            </Button>
            <Button variant="outline" icon={<List />}>
              Ver itens
            </Button>
          </ButtonGroup>
        </Row>
        <Row label="Segmentado">
          <ButtonGroup
            aria-label="Visualização"
            value={view}
            onChange={setView}
            options={[
              { value: 'lista', label: 'Lista', icon: <List /> },
              { value: 'grade', label: 'Grade', icon: <LayoutGrid /> },
            ]}
          />
        </Row>
      </Demo>

      <Demo
        id="menu-suspenso"
        title="DropdownMenu"
        description="Ações secundárias e menu de três pontinhos. Itens com 44px no celular. Item destrutivo em vermelho."
        props="DropdownMenuItem (destructive), CheckboxItem, RadioItem, Label, Separator, Sub"
        code="DDM-001"
      >
        <Row label="Exemplos">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" iconRight={<ChevronDown />}>
                Ações
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" iconOnly aria-label="Mais ações">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Duplicar</DropdownMenuItem>
              <DropdownMenuItem>Arquivar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </Demo>

      <Demo
        id="action-bar"
        title="ActionBar"
        description="A regra de botões do sistema, em qualquer tela: 1 botão ocupa 100%; 2 botões ficam 30% (cancelar) e 70% (principal); a partir da terceira, as extras vão para o menu. O envio mostra carregamento e trava o botão."
        props="primary (label, type, loading, destructive), cancel, secondary[], sticky"
        code="ACB-001"
      >
        <ActionBar primary={{ label: 'Salvar' }} />
        <ActionBar cancel={{ label: 'Cancelar' }} primary={{ label: 'Salvar cliente' }} />
        <ActionBar
          cancel={{ label: 'Cancelar' }}
          primary={{ label: 'Salvar e enviar' }}
          secondary={[
            { label: 'Salvar rascunho', icon: <Save /> },
            { label: 'Duplicar', icon: <Copy /> },
            { label: 'Excluir', icon: <Trash2 />, destructive: true },
          ]}
        />
        <ActionBar cancel={{ label: 'Cancelar' }} primary={{ label: 'Salvar', loading: true }} />
      </Demo>
    </>
  )
}
