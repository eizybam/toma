import { CircleAlert, CircleCheck, CopyX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { timeAgo } from '@/lib/time'
import type { Alert } from '@/lib/types'

const MAX_VISIBLE = 5

const alertLabel: Record<Alert['type'], string> = {
  missed: 'Dosis olvidada',
  duplicate: 'Dosis repetida',
}

export function AlertsFeed({ alerts, now }: { alerts: Alert[]; now: string }) {
  if (alerts.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-hairline bg-surface p-4 text-ink-muted">
        <CircleCheck aria-hidden className="size-5 text-pine" />
        Sin alertas. Todo va en orden.
      </p>
    )
  }

  return (
    <ul className="grid gap-3" aria-live="polite">
      <AnimatePresence initial={false}>
        {alerts.slice(0, MAX_VISIBLE).map((alert) => {
          const Icon = alert.type === 'missed' ? CircleAlert : CopyX
          return (
            <motion.li
              key={`${alert.createdAt}-${alert.type}-${alert.slot}`}
              layout
              initial={{ opacity: 0, x: -24, backgroundColor: '#f3c4b6' }}
              animate={{ opacity: 1, x: 0, backgroundColor: '#f9e1da' }}
              transition={{ duration: 0.5, backgroundColor: { duration: 1.6 } }}
              className="flex items-start gap-3 rounded-xl border-l-4 border-alert bg-alert-soft p-4 text-alert"
            >
              <Icon aria-hidden className="mt-0.5 size-6 shrink-0" />
              <div className="grid gap-1">
                <p className="text-sm font-bold tracking-wide uppercase">{alertLabel[alert.type]}</p>
                <p className="font-bold">{alert.message}</p>
                <p className="text-sm">{timeAgo(alert.createdAt, now)}</p>
              </div>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
