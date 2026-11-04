import { InkSeal } from '@/components/effects/InkSeal'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

function LiveIndicator({ offline }: { offline: boolean }) {
  return (
    <p
      role="status"
      className={cn(
        'inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-bold',
        offline ? 'border-due/30 bg-due-soft text-due' : 'border-pine/20 bg-pine-soft text-pine',
      )}
    >
      <span className="relative flex size-2.5" aria-hidden>
        {!offline && <span className="absolute inline-flex size-full animate-ping rounded-full bg-pine opacity-60" />}
        <span className={cn('relative inline-flex size-2.5 rounded-full', offline ? 'bg-due' : 'bg-pine')} />
      </span>
      {offline ? 'Sin conexión · reintentando' : 'En vivo · se actualiza cada 5 s'}
    </p>
  )
}

export function PatientHeader({ profile, offline }: { profile: Profile; offline: boolean }) {
  return (
    <header className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <InkSeal className="size-20 shrink-0" />
        <div>
          <h1 className="text-4xl font-semibold sm:text-5xl">{profile.name}</h1>
          {profile.caregiverName && <p className="mt-1 text-lg text-ink-muted">A cargo de {profile.caregiverName}</p>}
        </div>
      </div>
      <LiveIndicator offline={offline} />
    </header>
  )
}
