'use client'

import { useRef, useState } from 'react'
import { ImageIcon, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  onUploadStart: (
    fileName: string,
    fileSize: number,
    mimeType: string,
  ) => Promise<{ signedUrl: string; token: string; path: string } | { error: string }>
  onConfirm: (path: string) => void
  currentPath?: string | null
  currentUrl?: string | null
  aspectRatio?: '16/9' | '1/1'
  maxSizeMb?: number
  label?: string
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.webp'

export function ImageUpload({
  onUploadStart,
  onConfirm,
  currentPath,
  currentUrl,
  aspectRatio = '16/9',
  maxSizeMb = 5,
  label = 'Imagem de capa',
}: ImageUploadProps) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Client-side validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Apenas imagens jpg, png ou webp são aceitas.')
      return
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`A imagem deve ter no máximo ${maxSizeMb} MB.`)
      return
    }

    // Preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setUploading(true)
    setProgress(0)

    // Request signed URL
    const result = await onUploadStart(file.name, file.size, file.type)
    if ('error' in result) {
      setError(result.error)
      setPreviewUrl(currentUrl ?? null)
      setUploading(false)
      return
    }

    const { signedUrl, path } = result

    // Upload directly to Storage via XHR
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setProgress(Math.round((ev.loaded / ev.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload falhou: ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'))
      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    }).then(() => {
      setProgress(100)
      setUploading(false)
      onConfirm(path)
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro no upload.'
      setError(message)
      setPreviewUrl(currentUrl ?? null)
      setUploading(false)
      setProgress(null)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRemove() {
    setPreviewUrl(null)
    setProgress(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onConfirm('')
  }

  const paddingPct = aspectRatio === '16/9' ? '56.25%' : '100%'

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>

      <div
        className="relative w-full overflow-hidden rounded-lg border border-border bg-surface-muted"
        style={{ paddingBottom: paddingPct }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="size-full object-cover"
              />
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  aria-label="Remover imagem"
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="size-4" />
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center text-text-subtle">
              <ImageIcon className="size-8" aria-hidden />
              <span className="text-xs">
                {aspectRatio === '16/9' ? 'Recomendado: 1600×900' : 'Quadrado'}
              </span>
            </div>
          )}

          {uploading && progress !== null && (
            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-white">{progress}%</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleFileChange}
          className="sr-only"
          id="image-upload-input"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
          {previewUrl ? 'Trocar imagem' : 'Escolher imagem'}
        </Button>
        <span className="text-xs text-text-muted">
          JPG, PNG, WebP • máx. {maxSizeMb} MB
        </span>
      </div>

      {currentPath && !previewUrl && (
        <p className="text-xs text-text-muted">
          Arquivo atual:{' '}
          <span className="font-mono">{currentPath.split('/').pop()}</span>
        </p>
      )}
    </div>
  )
}
