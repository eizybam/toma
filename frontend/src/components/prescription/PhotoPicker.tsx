import { Camera } from 'lucide-react'
import { FileInput, FileUploader } from '@/components/ui/file-upload'

const MAX_SIZE = 20 * 1024 * 1024

export function PhotoPicker({ onPick }: { onPick: (file: File) => void }) {
  return (
    <FileUploader
      value={null}
      onValueChange={(files) => {
        const [file] = files ?? []
        if (file) onPick(file)
      }}
      dropzoneOptions={{ accept: { 'image/*': [] }, maxFiles: 1, maxSize: MAX_SIZE, multiple: false }}
    >
      <FileInput className="bg-surface">
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-pine-soft text-pine">
            <Camera aria-hidden className="size-10" />
          </span>
          <p className="font-display text-2xl font-semibold">Toma una foto de la receta</p>
          <p className="text-ink-muted">o elige una imagen. Que se vea completa y con buena luz.</p>
        </div>
      </FileInput>
    </FileUploader>
  )
}
