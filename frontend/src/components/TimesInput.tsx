import { Plus, X } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/ui/field'

type TimesInputProps = {
  value: string[]
  onChange: (times: string[]) => void
  label?: string
}

export function TimesInput({ value, onChange, label = 'Horarios' }: TimesInputProps) {
  const id = useId()
  const update = (index: number, time: string) => onChange(value.map((t, i) => (i === index ? time : t)))
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 font-bold">{label}</legend>
      {value.map((time, index) => (
        <div key={index} className="flex items-center gap-2">
          <label htmlFor={`${id}-${index}`} className="sr-only">
            Horario {index + 1}
          </label>
          <input
            id={`${id}-${index}`}
            type="time"
            required
            value={time}
            onChange={(event) => update(index, event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
          <Button variant="quiet" className="w-12 shrink-0 px-0" onClick={() => remove(index)} aria-label={`Quitar horario ${time || index + 1}`}>
            <X aria-hidden className="size-5" />
          </Button>
        </div>
      ))}
      <Button variant="quiet" className="justify-start px-2 text-pine" onClick={() => onChange([...value, ''])}>
        <Plus aria-hidden className="size-5" />
        Agregar horario
      </Button>
    </fieldset>
  )
}
