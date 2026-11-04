import { useState, type FormEvent } from 'react'
import { TimesInput } from '@/components/TimesInput'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { api, toApiError } from '@/lib/api'

type MedicationFormProps = {
  patientId: string
  onSaved: () => void
  onCancel: () => void
}

export function MedicationForm({ patientId, onSaved, onCancel }: MedicationFormProps) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [tagId, setTagId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validTimes = times.filter(Boolean)
    if (validTimes.length === 0) {
      setError('Agrega al menos un horario.')
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      await api.createMedication(patientId, {
        name: name.trim(),
        dose: dose.trim(),
        times: validTimes,
        tagId: tagId.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(toApiError(err).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-hairline bg-surface p-4">
      <TextField label="Medicamento" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Losartán" />
      <TextField label="Dosis" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="50 mg" />
      <TimesInput value={times} onChange={setTimes} />
      <TextField
        label="Etiqueta NFC"
        value={tagId}
        onChange={(e) => setTagId(e.target.value)}
        placeholder="toma-abc"
        hint="Opcional. Si la dejas vacía, creamos una nueva."
      />
      {error && (
        <p role="alert" className="font-bold text-alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
