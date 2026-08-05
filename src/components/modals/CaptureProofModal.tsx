import { Camera, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

type CaptureProofModalProps = {
  promptText: string
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onFile: (file: File) => void | Promise<void>
}

export default function CaptureProofModal({
  promptText,
  busy = false,
  error = null,
  onCancel,
  onFile,
}: CaptureProofModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLocalError('Please choose an image.')
      return
    }
    setLocalError(null)
    await onFile(file)
  }

  const showError = error || localError

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Photo proof</h2>
            <p className="mt-1 text-sm text-gray-600">
              Capture or upload a photo that matches:
            </p>
            <p className="mt-2 font-semibold text-gray-900">{promptText || 'This square'}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Cancel"
          >
            <X size={22} />
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Camera size={20} />
            {busy ? 'Uploading…' : 'Take photo'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-3 font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            <Upload size={20} />
            Choose from library
          </button>
        </div>

        {showError && (
          <p className="mt-3 text-sm font-semibold text-red-600" role="alert">
            {showError}
          </p>
        )}
      </div>
    </div>
  )
}
