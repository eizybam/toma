import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'quiet'
type Size = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-surface hover:bg-ink-muted',
  secondary: 'border-2 border-ink bg-surface text-ink hover:bg-paper',
  quiet: 'text-ink-muted hover:bg-paper hover:text-ink',
}

const sizes: Record<Size, string> = {
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-16 px-6 text-xl',
}

function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

type ButtonLinkProps = LinkProps & { variant?: Variant; size?: Size }

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, typeof className === 'string' ? className : undefined)} {...props} />
}
