import { LayoutDashboard, Nfc, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { BrandMark } from '@/components/BrandMark'
import { Button, ButtonLink } from '@/components/ui/button'
import { api, toApiError } from '@/lib/api'

const TAGS = [
  { id: 'toma-demo-1', label: 'Metformina', hint: 'Toca ahora: registra la dosis.' },
  { id: 'toma-demo-2', label: 'Losartán', hint: 'Si no la tocas en 5 s, llega la alerta de dosis olvidada.' },
]

type Status = { kind: 'idle' } | { kind: 'seeding' } | { kind: 'ready'; info: string } | { kind: 'error'; message: string }

export function DemoPage() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function seed() {
    setStatus({ kind: 'seeding' })
    try {
      const { info } = await api.seedDemo()
      setStatus({ kind: 'ready', info })
    } catch (error) {
      setStatus({ kind: 'error', message: toApiError(error).message })
    }
  }

  return (
    <main className="mx-auto grid max-w-xl gap-8 px-4 py-8 sm:px-8 lg:py-12">
      <title>Demo · Toma</title>
      <BrandMark />
      <header className="grid gap-2">
        <h1 className="text-4xl font-semibold">Ensayo de la demo</h1>
        <p className="text-lg text-ink-muted">
          Reinicia a Doña Rosa con dos medicamentos. La Metformina toca ahora y el Losartán se marca como olvidado a los pocos segundos.
        </p>
      </header>

      <div className="grid gap-3">
        <Button size="lg" onClick={() => void seed()} disabled={status.kind === 'seeding'}>
          <RotateCcw aria-hidden className="size-6" />
          {status.kind === 'seeding' ? 'Reiniciando…' : 'Reiniciar demo'}
        </Button>
        <p role="status" className="min-h-6 text-ink-muted">
          {status.kind === 'ready' && status.info}
          {status.kind === 'error' && <span className="font-bold text-alert">{status.message}</span>}
        </p>
      </div>

      <section aria-labelledby="demo-links" className="grid gap-3">
        <h2 id="demo-links" className="border-b border-hairline pb-2 text-2xl font-semibold">
          Enlaces
        </h2>
        <ButtonLink to="/p/demo" variant="secondary" className="justify-start">
          <LayoutDashboard aria-hidden className="size-5" />
          Panel del cuidador
        </ButtonLink>
        {TAGS.map((tag) => (
          <ButtonLink key={tag.id} to={`/t/${tag.id}`} variant="secondary" className="h-auto justify-start py-3 text-left">
            <Nfc aria-hidden className="size-5 shrink-0" />
            <span className="grid">
              <span>
                {tag.label} <span className="font-mono text-sm font-normal text-ink-muted">/t/{tag.id}</span>
              </span>
              <span className="text-sm font-normal text-ink-muted">{tag.hint}</span>
            </span>
          </ButtonLink>
        ))}
      </section>
    </main>
  )
}
