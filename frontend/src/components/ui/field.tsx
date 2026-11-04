import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'min-h-12 w-full rounded-lg border border-hairline bg-surface px-3 text-base text-ink placeholder:text-ink-muted/70 focus-visible:border-pine'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

export function TextField({ label, hint, className, ...props }: TextFieldProps) {
  const id = useId()
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input id={id} className={inputClass} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
