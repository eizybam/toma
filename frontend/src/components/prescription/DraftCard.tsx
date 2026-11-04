import { TimesInput } from '@/components/TimesInput'
import { TextField } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export type Draft = {
  key: string
  include: boolean
  name: string
  dose: string
  times: string[]
  notes: string
  durationDays: number | null
}

type DraftCardProps = {
  draft: Draft
  onChange: (draft: Draft) => void
}

export function DraftCard({ draft, onChange }: DraftCardProps) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value })

  return (
    <li className={cn('grid gap-4 rounded-xl border bg-surface p-4', draft.include ? 'border-pine/40' : 'border-hairline opacity-70')}>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 font-bold">
        <input
          type="checkbox"
          checked={draft.include}
          onChange={(e) => set('include', e.target.checked)}
          className="size-6 accent-pine"
        />
        Guardar este medicamento
      </label>
      <TextField label="Medicamento" required={draft.include} value={draft.name} onChange={(e) => set('name', e.target.value)} />
      <TextField label="Dosis" value={draft.dose} onChange={(e) => set('dose', e.target.value)} />
      <TimesInput value={draft.times} onChange={(times) => set('times', times)} />
      <TextField label="Indicaciones" value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      {draft.durationDays !== null && draft.durationDays > 0 && <p className="text-ink-muted">Por {draft.durationDays} días, según la receta.</p>}
    </li>
  )
}
