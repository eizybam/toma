import type { ReactNode } from 'react'
import seal from '@/assets/seal.svg'
import { cn } from '@/lib/utils'

type PageMessageProps = {
  title: string
  body?: string
  loading?: boolean
  children?: ReactNode
}

export function PageMessage({ title, body, loading, children }: PageMessageProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center" aria-live="polite">
      <title>{`${title} · Toma`}</title>
      <img src={seal} alt="" className={cn('size-20', loading && 'animate-pulse opacity-60')} />
      <h1 className="text-3xl font-semibold">{title}</h1>
      {body && <p className="text-lg text-ink-muted">{body}</p>}
      {children}
    </main>
  )
}
