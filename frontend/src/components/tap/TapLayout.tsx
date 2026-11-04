import type { ReactNode } from 'react'
import { BrandMark } from '@/components/BrandMark'
import { cn } from '@/lib/utils'

export type Tone = 'pine' | 'alert' | 'calm' | 'ink'

const bands: Record<Tone, string> = {
  pine: 'bg-pine',
  alert: 'bg-alert',
  calm: 'bg-calm',
  ink: 'bg-hairline',
}

const labels: Record<Tone, string> = {
  pine: 'bg-pine text-surface',
  alert: 'bg-alert text-surface',
  calm: 'bg-calm text-surface',
  ink: 'bg-ink text-surface',
}

type TapLayoutProps = {
  tone: Tone
  title: string
  label?: string
  children: ReactNode
}

export function TapLayout({ tone, title, label, children }: TapLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <title>{`${title} · Toma`}</title>
      <div className={cn('h-3 transition-colors duration-500', bands[tone])} />
      <main
        aria-live="polite"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center"
      >
        {label && (
          <p className={cn('rounded-full px-5 py-1.5 text-lg font-bold tracking-widest uppercase', labels[tone])}>
            {label}
          </p>
        )}
        {children}
      </main>
      <footer className="flex justify-center pb-8">
        <BrandMark />
      </footer>
    </div>
  )
}
