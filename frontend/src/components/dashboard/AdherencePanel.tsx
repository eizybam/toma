import NumberFlow from '@number-flow/react'
import { motion } from 'motion/react'
import { weekdayInitial, weekdayName } from '@/lib/time'
import type { AdherenceDay, PatientDashboard } from '@/lib/types'
import { cn } from '@/lib/utils'

function barColor(pct: number) {
  if (pct >= 80) return 'bg-pine'
  if (pct >= 50) return 'bg-due'
  return 'bg-alert'
}

function describeDay(day: AdherenceDay) {
  if (day.pct === null) return `${weekdayName(day.date)}: sin tomas para medir`
  return `${weekdayName(day.date)}: ${day.pct} %, ${day.taken} de ${day.expected} tomas`
}

function WeekBars({ days }: { days: AdherenceDay[] }) {
  return (
    <ul className="grid h-32 grid-cols-7 gap-2">
      {days.map((day, index) => {
        const isToday = index === days.length - 1
        return (
          <li key={day.date} className="flex flex-col items-center gap-2">
            <span className="sr-only">{describeDay(day)}</span>
            <div aria-hidden className="relative w-full flex-1 overflow-hidden rounded-md bg-paper">
              {day.pct === null ? (
                <span className="absolute inset-0 rounded-md border-2 border-dashed border-hairline" />
              ) : (
                <motion.span
                  className={cn('absolute inset-x-0 bottom-0 rounded-md', barColor(day.pct))}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(day.pct, 4)}%` }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                />
              )}
            </div>
            <span aria-hidden className={cn('text-sm font-bold', isToday ? 'text-pine underline underline-offset-4' : 'text-ink-muted')}>
              {weekdayInitial(day.date)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function AdherencePanel({ adherence }: { adherence: PatientDashboard['adherence'] }) {
  return (
    <div className="grid gap-5">
      <div className="flex items-end gap-3">
        {adherence.pct === null ? (
          <span className="font-display text-6xl font-semibold text-ink-muted">—</span>
        ) : (
          <NumberFlow
            value={adherence.pct}
            suffix=" %"
            locales="es-MX"
            className="font-display text-6xl font-semibold text-pine tabular-nums"
          />
        )}
        <span className="pb-2 text-ink-muted">
          {adherence.pct === null ? 'Aún no hay tomas para medir' : 'de las tomas, últimos 7 días'}
        </span>
      </div>
      <WeekBars days={adherence.days} />
    </div>
  )
}
