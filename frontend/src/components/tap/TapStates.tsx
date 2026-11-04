import { CircleHelp, Hourglass, Nfc, RotateCcw, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import seal from '@/assets/seal.svg'
import { ConfirmationHalo } from '@/components/effects/ConfirmationHalo'
import { Button } from '@/components/ui/button'
import type { ApiError } from '@/lib/api'
import { formatDuration, parseNextDose } from '@/lib/time'
import type { TapResult } from '@/lib/types'
import { TapLayout } from './TapLayout'

type Result<S extends TapResult['status']> = Extract<TapResult, { status: S }>

function MedicineLine({ name, dose }: { name: string; dose: string | null }) {
  return (
    <p className="text-3xl font-bold">
      {name}
      {dose && <span className="font-normal text-ink-muted"> · {dose}</span>}
    </p>
  )
}

export function LoadingState() {
  return (
    <TapLayout tone="ink" title="Registrando">
      <img src={seal} alt="" className="size-32 animate-pulse opacity-50" />
      <h1 className="text-4xl font-semibold">Registrando tu dosis…</h1>
    </TapLayout>
  )
}

export function RecordedState({ result }: { result: Result<'recorded'> }) {
  const next = parseNextDose(result.nextDose)
  return (
    <TapLayout tone="pine" title="Dosis registrada" label="Registrada">
      <div className="relative grid size-72 place-items-center">
        <ConfirmationHalo className="absolute inset-0" />
        <motion.img
          src={seal}
          alt=""
          className="relative size-40"
          initial={{ scale: 1.6, rotate: -14, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
        />
      </div>
      <h1 className="text-5xl font-semibold text-pine">
        {result.patientName ? `¡Listo, ${result.patientName}!` : '¡Listo!'}
      </h1>
      <MedicineLine name={result.medName} dose={result.dose} />
      {next && (
        <p className="text-2xl text-ink-muted">
          Tu próxima toma es {next.tomorrow ? 'mañana' : 'hoy'} a las{' '}
          <strong className="text-ink">{next.time}</strong>
        </p>
      )}
    </TapLayout>
  )
}

export function DuplicateState({ result }: { result: Result<'duplicate'> }) {
  const ago = result.minutesAgo < 1 ? 'hace un momento' : `hace ${formatDuration(result.minutesAgo)}`
  return (
    <TapLayout tone="alert" title="Dosis repetida" label="Cuidado">
      <motion.div
        className="grid size-32 place-items-center rounded-full border-4 border-alert bg-alert-soft"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, x: [0, -10, 10, -8, 8, -4, 0] }}
        transition={{ duration: 0.7 }}
      >
        <TriangleAlert aria-hidden className="size-16 text-alert" strokeWidth={2.5} />
      </motion.div>
      <h1 className="text-5xl font-semibold text-alert">
        Ya tomaste esta dosis <span className="block">{ago}</span>
      </h1>
      <MedicineLine name={result.medName} dose={result.dose} />
      <p className="w-full rounded-xl bg-alert-soft px-5 py-4 text-3xl font-bold text-alert">No la vuelvas a tomar.</p>
      <p className="text-2xl text-ink-muted">Ya le avisamos a tu familiar.</p>
    </TapLayout>
  )
}

export function EarlyState({ result }: { result: Result<'early'> }) {
  return (
    <TapLayout tone="calm" title="Todavía no toca" label="Aún no es hora">
      <motion.div
        className="grid size-32 place-items-center rounded-full border-4 border-calm bg-calm-soft"
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <Hourglass aria-hidden className="size-14 text-calm" strokeWidth={2.5} />
      </motion.div>
      <h1 className="text-5xl font-semibold text-calm">Todavía no toca</h1>
      <p className="text-3xl">
        Tu {result.medName} es a las <strong>{result.slot}</strong>
      </p>
      <p className="text-2xl text-ink-muted">Faltan {formatDuration(result.minutesUntil)}. No registramos nada.</p>
    </TapLayout>
  )
}

type ErrorCopy = { icon: LucideIcon; label: string; title: string; body: string; canRetry: boolean }

function errorCopy(code: string): ErrorCopy {
  switch (code) {
    case 'unknown_tag':
    case 'unknown_med':
    case 'missing_tag':
    case 'no_schedule':
    case 'scheme_unavailable':
      return {
        icon: CircleHelp,
        label: 'Etiqueta desconocida',
        title: 'No reconocimos esta etiqueta',
        body: 'Pide ayuda a tu familiar para revisarla.',
        canRetry: false,
      }
    case 'replay':
    case 'bad_ctr':
      return {
        icon: Nfc,
        label: 'Toque repetido',
        title: 'Este toque ya se usó',
        body: 'Vuelve a acercar tu teléfono a la etiqueta de tu medicina.',
        canRetry: false,
      }
    default:
      return {
        icon: WifiOff,
        label: 'Sin registrar',
        title: 'No pudimos registrar tu dosis',
        body: 'Revisa tu conexión a internet e inténtalo de nuevo.',
        canRetry: true,
      }
  }
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const { icon: Icon, label, title, body, canRetry } = errorCopy(error.code)
  return (
    <TapLayout tone="ink" title={title} label={label}>
      <div className="grid size-32 place-items-center rounded-full border-4 border-ink bg-surface">
        <Icon aria-hidden className="size-14" strokeWidth={2.5} />
      </div>
      <h1 className="text-5xl font-semibold">{title}</h1>
      <p className="text-2xl text-ink-muted">{body}</p>
      {canRetry && (
        <Button variant="secondary" size="lg" className="w-full" onClick={onRetry}>
          <RotateCcw aria-hidden className="size-6" />
          Intentar de nuevo
        </Button>
      )}
    </TapLayout>
  )
}
