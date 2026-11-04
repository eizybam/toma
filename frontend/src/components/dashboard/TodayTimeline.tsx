import { AnimatePresence, motion } from 'motion/react'
import { clockFromIso } from '@/lib/time'
import type { ScheduledDose } from '@/lib/types'
import { cn } from '@/lib/utils'
import { doseStatus } from './doseStatus'

function StatusChip({ dose }: { dose: ScheduledDose }) {
  const { label, icon: Icon, chip } = doseStatus[dose.status]
  return (
    <motion.span
      key={dose.status}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-bold whitespace-nowrap', chip)}
    >
      <Icon aria-hidden className="size-4" />
      {label}
      {dose.takenAt && ` ${clockFromIso(dose.takenAt)}`}
    </motion.span>
  )
}

export function TodayTimeline({ doses }: { doses: ScheduledDose[] }) {
  if (doses.length === 0) {
    return <p className="text-ink-muted">No hay tomas programadas para hoy.</p>
  }

  return (
    <ol className="grid">
      <AnimatePresence initial={false}>
        {doses.map((dose, index) => {
          const style = doseStatus[dose.status]
          const isLast = index === doses.length - 1
          return (
            <motion.li
              key={`${dose.medId}-${dose.slot}`}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-[3.5rem_1rem_1fr] gap-3"
            >
              <time className="pt-4 text-right font-bold tabular-nums">{dose.slot}</time>
              <div className="relative flex justify-center" aria-hidden>
                <span className={cn('relative z-10 mt-5 size-3.5 rounded-full', style.dot)} />
                {!isLast && <span className="absolute top-8 -bottom-1 w-px bg-hairline" />}
              </div>
              <div
                className={cn(
                  'mb-3 flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center',
                  style.card,
                )}
              >
                <div>
                  <p className="text-lg font-bold">{dose.medName}</p>
                  {dose.dose && <p className="text-ink-muted">{dose.dose}</p>}
                </div>
                <StatusChip dose={dose} />
              </div>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ol>
  )
}
