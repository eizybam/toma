import { Camera, Nfc, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { api, toApiError } from '@/lib/api'
import type { Medication } from '@/lib/types'
import { MedicationForm } from './MedicationForm'

type MedicationListProps = {
  patientId: string
  meds: Medication[]
  onChange: () => void
}

export function MedicationList({ patientId, meds, onChange }: MedicationListProps) {
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string>()

  async function remove(med: Medication) {
    if (!window.confirm(`¿Eliminar ${med.name}? Su etiqueta ${med.tagId} dejará de registrar tomas.`)) return
    setError(undefined)
    try {
      await api.deleteMedication(patientId, med.medId)
      onChange()
    } catch (err) {
      setError(toApiError(err).message)
    }
  }

  return (
    <div className="grid gap-4">
      {meds.length === 0 && <p className="text-ink-muted">Todavía no hay medicamentos.</p>}
      <ul className="grid gap-3">
        <AnimatePresence initial={false}>
          {meds.map((med) => (
            <motion.li
              key={med.medId}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="flex items-start justify-between gap-3 rounded-xl border border-hairline bg-surface p-4"
            >
              <div className="grid gap-1">
                <p className="text-lg font-bold">{med.name}</p>
                <p className="text-ink-muted">
                  {[med.dose, med.times.join(', ')].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 justify-self-start rounded-md border border-hairline bg-paper px-2 py-1 font-mono text-sm text-ink-muted">
                  <Nfc aria-hidden className="size-4" />
                  {med.tagId}
                </p>
              </div>
              <Button variant="quiet" className="w-12 shrink-0 px-0 hover:text-alert" onClick={() => remove(med)} aria-label={`Eliminar ${med.name}`}>
                <Trash2 aria-hidden className="size-5" />
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {error && (
        <p role="alert" className="font-bold text-alert">
          {error}
        </p>
      )}
      {adding ? (
        <MedicationForm
          patientId={patientId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            onChange()
          }}
        />
      ) : (
        <div className="grid gap-2">
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-5" />
            Agregar medicamento
          </Button>
          <ButtonLink to={`/p/${encodeURIComponent(patientId)}/receta`} variant="secondary">
            <Camera aria-hidden className="size-5" />
            Subir receta
          </ButtonLink>
        </div>
      )}
    </div>
  )
}
