import { CircleX, Snowflake, Trash2, Trophy } from 'lucide-react'
import type { KanbanDropTarget } from '@/components/ui/kanban'

/** Motivos de perda da demonstração. */
export const lossReasons = [
  { value: 'preco', label: 'Preço' },
  { value: 'concorrente', label: 'Escolheu concorrente' },
  { value: 'sem-retorno', label: 'Sem retorno' },
  { value: 'outro', label: 'Outro' },
]

/**
 * Destinos de arraste da demonstração (rodapé flutuante): cada um com descrição curta, cor e
 * confirmação. A demonstração só remove o card e mostra um aviso: lixeira com restauração e
 * descongelar não existem, o componente só entrega o evento.
 */
export const kanbanDemoTargets: KanbanDropTarget[] = [
  {
    id: 'lixeira',
    label: 'Lixeira',
    hint: 'Remove o card do funil',
    icon: <Trash2 />,
    tone: 'neutral',
    confirm: {
      title: 'Mover para a lixeira?',
      description: 'O card sai do funil e pode ser restaurado pela lixeira por 30 dias.',
      confirmLabel: 'Mover para a lixeira',
    },
  },
  {
    id: 'congelar',
    label: 'Congelar',
    hint: 'Pausa o card e a cadência',
    icon: <Snowflake />,
    tone: 'info',
    confirm: {
      title: 'Congelar o card?',
      description: 'A cadência para de contar até o card ser descongelado.',
      confirmLabel: 'Congelar',
    },
  },
  {
    id: 'perdido',
    label: 'Perder',
    hint: 'Encerra como perdido, com motivo',
    icon: <CircleX />,
    tone: 'error',
    confirm: {
      title: 'Marcar como perdido?',
      description: 'Encerra o card como perdido. Escolha o motivo.',
      confirmLabel: 'Perder',
      destructive: true,
      reasons: lossReasons,
    },
  },
  {
    id: 'ganho',
    label: 'Ganhar',
    hint: 'Encerra como ganho',
    icon: <Trophy />,
    tone: 'success',
    confirm: {
      title: 'Marcar como ganho?',
      description: 'Encerra o card como ganho.',
      confirmLabel: 'Ganhar',
    },
  },
]

/** Aviso da demonstração para cada destino (o card já saiu do quadro). */
export function demoTargetMessage(targetId: string, reason?: string) {
  const lost = lossReasons.find((r) => r.value === reason)?.label
  if (targetId === 'lixeira') return 'Card movido para a lixeira'
  if (targetId === 'congelar') return 'Card congelado'
  if (targetId === 'perdido') return lost ? `Card perdido. Motivo: ${lost}` : 'Card perdido'
  return 'Card ganho'
}
