import seal from '@/assets/seal.svg'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-xl font-semibold text-pine', className)}>
      <img src={seal} alt="" className="size-7" />
      Toma
    </span>
  )
}
