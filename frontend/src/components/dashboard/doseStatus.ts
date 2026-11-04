import { CircleAlert, CircleCheck, Clock, Moon, type LucideIcon } from 'lucide-react'
import type { DoseStatus } from '@/lib/types'

type StatusStyle = { label: string; icon: LucideIcon; chip: string; dot: string; card: string }

export const doseStatus: Record<DoseStatus, StatusStyle> = {
  taken: {
    label: 'Tomada',
    icon: CircleCheck,
    chip: 'bg-pine-soft text-pine',
    dot: 'bg-pine',
    card: 'border-hairline bg-surface',
  },
  due: {
    label: 'Toca ahora',
    icon: Clock,
    chip: 'bg-due-soft text-due',
    dot: 'bg-due ring-4 ring-due-soft',
    card: 'border-due/40 bg-due-soft/40',
  },
  missed: {
    label: 'Se pasó',
    icon: CircleAlert,
    chip: 'bg-alert-soft text-alert',
    dot: 'bg-alert',
    card: 'border-alert/40 bg-alert-soft/50',
  },
  upcoming: {
    label: 'Más tarde',
    icon: Moon,
    chip: 'bg-calm-soft text-calm',
    dot: 'border-2 border-hairline bg-surface',
    card: 'border-dashed border-hairline',
  },
}
