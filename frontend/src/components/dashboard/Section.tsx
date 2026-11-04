import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionProps = {
  title: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function Section({ title, action, className, children }: SectionProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('grid content-start gap-4', className)}>
      <div className="flex items-end justify-between gap-3 border-b border-hairline pb-2">
        <h2 id={id} className="text-2xl font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
