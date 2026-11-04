import { lazy } from 'react'
import seal from '@/assets/seal.svg'
import { CanvasEffect } from './CanvasEffect'

const InkObject = lazy(() => import('@/components/canvasui/InkObject'))

export function InkSeal({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <CanvasEffect>
        <InkObject
          className="size-full"
          src={seal}
          inkColor="#0e4a36"
          lineSpacing={4}
          angle={-30}
          scale={3.4}
          depth={0.12}
          rotationIntensity={0.4}
          floatIntensity={0.3}
          orbit={false}
        />
      </CanvasEffect>
    </div>
  )
}
