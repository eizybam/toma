import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { DraftCard, type Draft } from '@/components/prescription/DraftCard'
import { PhotoPicker } from '@/components/prescription/PhotoPicker'
import { ReadingPreview } from '@/components/prescription/ReadingPreview'
import { Button, ButtonLink } from '@/components/ui/button'
import { ApiError, api } from '@/lib/api'
import { resizeImage } from '@/lib/image'
import type { ParsedMedication } from '@/lib/types'

type Phase =
  | { name: 'pick' }
  | { name: 'reading' }
  | { name: 'review'; drafts: Draft[] }
  | { name: 'unreadable'; notes: string }

function toDraft(med: ParsedMedication, index: number): Draft {
  return {
    key: `${index}-${med.name ?? ''}`,
    include: med.times.length > 0,
    name: med.name ?? '',
    dose: med.dose ?? '',
    times: med.times.length > 0 ? med.times : [''],
    notes: med.notes ?? '',
    durationDays: med.durationDays,
  }
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'No pudimos leer la imagen. Prueba con otra foto.'
}

export function PrescriptionPage() {
  const { patientId = '' } = useParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ name: 'pick' })
  const [preview, setPreview] = useState<string>()
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const panelPath = `/p/${encodeURIComponent(patientId)}`

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  async function read(file: File) {
    setPreview(URL.createObjectURL(file))
    setError(undefined)
    setPhase({ name: 'reading' })
    try {
      const image = await resizeImage(file)
      const result = await api.parsePrescription({ imageBase64: image.dataUrl, mediaType: image.mediaType, patientId })
      if (!result.legible || result.medications.length === 0) {
        setPhase({ name: 'unreadable', notes: result.notes })
      } else {
        setPhase({ name: 'review', drafts: result.medications.map(toDraft) })
      }
    } catch (err) {
      setError(errorMessage(err))
      setPhase({ name: 'pick' })
    }
  }

  async function save(drafts: Draft[]) {
    const selected = drafts.filter((d) => d.include)
    if (selected.some((d) => !d.name.trim() || !d.times.some(Boolean))) {
      setError('Cada medicamento necesita un nombre y al menos un horario.')
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      for (const draft of selected) {
        await api.createMedication(patientId, {
          name: draft.name.trim(),
          dose: draft.dose.trim(),
          times: draft.times.filter(Boolean),
          notes: draft.notes.trim(),
        })
      }
      toast.success(selected.length === 1 ? 'Guardamos 1 medicamento.' : `Guardamos ${selected.length} medicamentos.`)
      navigate(panelPath)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const updateDraft = (drafts: Draft[], next: Draft) =>
    setPhase({ name: 'review', drafts: drafts.map((d) => (d.key === next.key ? next : d)) })

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-6 sm:px-8 lg:py-10">
      <title>Subir receta · Toma</title>
      <ButtonLink to={panelPath} variant="quiet" className="justify-self-start px-2">
        <ArrowLeft aria-hidden className="size-5" />
        Volver al panel
      </ButtonLink>
      <header className="grid gap-2">
        <h1 className="text-4xl font-semibold">Subir receta</h1>
        <p className="text-lg text-ink-muted">Leemos la foto y te mostramos los horarios para que los revises antes de guardar.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border-l-4 border-alert bg-alert-soft p-4 font-bold text-alert">
          {error}
        </p>
      )}

      {phase.name === 'pick' && <PhotoPicker onPick={read} />}

      {phase.name === 'reading' && preview && <ReadingPreview src={preview} />}

      {phase.name === 'unreadable' && (
        <div className="grid gap-4 rounded-xl border border-hairline bg-surface p-6">
          <h2 className="text-2xl font-semibold">No pudimos leer la receta</h2>
          <p className="text-ink-muted">{phase.notes || 'Prueba con una foto más cercana y con buena luz.'}</p>
          <Button onClick={() => setPhase({ name: 'pick' })}>Probar con otra foto</Button>
        </div>
      )}

      {phase.name === 'review' && (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save(phase.drafts)
          }}
        >
          <h2 className="text-2xl font-semibold">Revisa lo que encontramos</h2>
          <ul className="grid gap-4">
            {phase.drafts.map((draft) => (
              <DraftCard key={draft.key} draft={draft} onChange={(next) => updateDraft(phase.drafts, next)} />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={saving || !phase.drafts.some((d) => d.include)}>
              {saving ? 'Guardando…' : 'Guardar en el panel'}
            </Button>
            <Button variant="quiet" size="lg" onClick={() => setPhase({ name: 'pick' })} disabled={saving}>
              Usar otra foto
            </Button>
          </div>
        </form>
      )}
    </main>
  )
}
