import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

const STEPS = ['Leyendo la receta…', 'Buscando los medicamentos…', 'Revisando dosis y horarios…']

export function ReadingPreview({ src }: { src: string }) {
  const [step, setStep] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-surface">
        <img src={src} alt="Foto de la receta" className="max-h-96 w-full object-contain opacity-80" />
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="absolute inset-x-0 h-1 bg-terracotta/70"
            initial={{ top: '0%' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
      <p role="status" className="text-center font-display text-2xl font-semibold">
        {STEPS[step]}
      </p>
      <p className="text-center text-ink-muted">Esto tarda unos segundos.</p>
    </div>
  )
}
