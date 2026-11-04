import { createContext, forwardRef, useCallback, useContext, useState, type HTMLAttributes } from 'react'
import { useDropzone, type DropzoneOptions, type DropzoneState, type FileRejection } from 'react-dropzone'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type FileUploaderContextType = {
  dropzoneState: DropzoneState
  isFileTooBig: boolean
}

const FileUploaderContext = createContext<FileUploaderContextType | null>(null)

const useFileUpload = () => {
  const context = useContext(FileUploaderContext)
  if (!context) throw new Error('useFileUpload must be used within a FileUploader')
  return context
}

type FileUploaderProps = {
  value: File[] | null
  onValueChange: (value: File[] | null) => void
  dropzoneOptions: DropzoneOptions
}

function rejectionMessage(rejection: FileRejection, maxSize: number) {
  const error = rejection.errors[0]
  if (error?.code === 'file-too-large') return `La imagen pesa demasiado. El máximo es ${maxSize / 1024 / 1024} MB.`
  if (error?.code === 'file-invalid-type') return 'Ese archivo no es una imagen.'
  return 'No pudimos usar ese archivo.'
}

export const FileUploader = forwardRef<HTMLDivElement, FileUploaderProps & HTMLAttributes<HTMLDivElement>>(
  ({ className, dropzoneOptions, value, onValueChange, children, ...props }, ref) => {
    const [isFileTooBig, setIsFileTooBig] = useState(false)
    const { maxFiles = 1, maxSize = 4 * 1024 * 1024 } = dropzoneOptions

    const onDrop = useCallback(
      (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
        const files = maxFiles === 1 ? acceptedFiles.slice(0, 1) : [...(value ?? []), ...acceptedFiles].slice(0, maxFiles)
        if (files.length > 0) onValueChange(files)
        const [rejection] = rejectedFiles
        if (rejection) toast.error(rejectionMessage(rejection, maxSize))
      },
      [maxFiles, maxSize, onValueChange, value],
    )

    const dropzoneState = useDropzone({
      ...dropzoneOptions,
      onDrop,
      onDropRejected: () => setIsFileTooBig(true),
      onDropAccepted: () => setIsFileTooBig(false),
    })

    return (
      <FileUploaderContext.Provider value={{ dropzoneState, isFileTooBig }}>
        <div ref={ref} className={cn('grid w-full', className)} {...props}>
          {children}
        </div>
      </FileUploaderContext.Provider>
    )
  },
)

FileUploader.displayName = 'FileUploader'

export const FileInput = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { dropzoneState, isFileTooBig } = useFileUpload()

    return (
      <div ref={ref} {...props} className="relative w-full cursor-pointer">
        <div
          className={cn(
            'w-full rounded-xl border-2 border-dashed transition-colors duration-300 ease-in-out',
            dropzoneState.isDragAccept && 'border-pine bg-pine-soft',
            dropzoneState.isDragReject && 'border-alert bg-alert-soft',
            isFileTooBig && 'border-alert',
            !dropzoneState.isDragActive && 'border-hairline hover:border-ink-muted',
            className,
          )}
          {...dropzoneState.getRootProps()}
        >
          {children}
        </div>
        <input {...dropzoneState.getInputProps()} />
      </div>
    )
  },
)

FileInput.displayName = 'FileInput'
