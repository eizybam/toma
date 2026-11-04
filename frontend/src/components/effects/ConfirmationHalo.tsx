import { lazy } from 'react'
import halo from '@/assets/halo.svg'
import { CanvasEffect } from './CanvasEffect'

const ParticleObject = lazy(() => import('@/components/canvasui/ParticleObject'))

export function ConfirmationHalo({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <CanvasEffect>
        <ParticleObject
          className="size-full"
          src={halo}
          count={2600}
          size={3}
          scale={4.6}
          drift={0.4}
          floatIntensity={0.5}
          rotationIntensity={0.25}
          radius={70}
          orbit={false}
        />
      </CanvasEffect>
    </div>
  )
}
