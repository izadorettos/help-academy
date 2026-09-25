'use client'

import { useRef, useState } from 'react'
import { Upload, FileVideo, FileText, File, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/lib/action-result'

type MediaKind = 'video' | 'image' | 'pdf' | 'presentation'

interface MediaUploadProps {
  kind: MediaKind
  lessonId: string
  pathId: string
  currentFilePath?: string | null
  onRequestUpload: (
    lessonId: string,
    kind: MediaKind,
    fileName: string,
    fileSize: number,
    mimeType: string,
  ) => Promise<ActionResult<{ signedUrl: string; token: string; path: string }>>
  onConfirmUpload: (lessonId: string, filePath: string, pathId: string) => Promise<ActionResult>
  onDeleteFile?: (lessonId: string, pathId: string) => Promise<ActionResult>
}

const KIND_CONFIG: Record<
  MediaKind,
  {
    label: string
    accept: string
    icon: React.ReactNode
    maxSizeMb: number
    hint: string
  }
> = {
  video: {
    label: 'Arquivo de vídeo',
    accept: '.mp4,.webm,.mov',
    icon: <FileVideo className="size-5" aria-hidden />,
    maxSizeMb: 50,
    hint: 'MP4, WebM, MOV • máx. 50 MB. Para vídeos maiores, use YouTube.',
  },
  image: {
    label: 'Imagem',
    accept: '.jpg,.jpeg,.png,.webp',
    icon: <File className="size-5" aria-hidden />,
    maxSizeMb: 10,
    hint: 'JPG, PNG, WebP • máx. 10 MB',
  },
  pdf: {
    label: 'Arquivo PDF',
    accept: '.pdf',
    icon: <FileText className="size-5" aria-hidden />,
    maxSizeMb: 50,
    hint: 'PDF • máx. 50 MB. Acima de 20 MB pode demorar em conexões lentas.',
  },
  presentation: {
    label: 'Apresentação',
    accept: '.pdf,.pptx',
    icon: <FileText className="size-5" aria-hidden />,
    maxSizeMb: 50,
    hint: 'PDF (recomendado) ou PPTX • máx. 50 MB. Para PPTX, exporte como PDF para melhor visualização.',
  },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function MediaUpload({
  kind,
  lessonId,
  pathId,
  currentFilePath,
  onRequestUpload,
  onConfirmUpload,
  onDeleteFile,
}: MediaUploadProps) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentPath, setCurrentPath] = useState<string | null>(currentFilePath ?? null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const config = KIND_CONFIG[kind]

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(false)

    // Client-side size check
    if (file.size > config.maxSizeMb * 1024 * 1024) {
      setError(`Arquivo muito grande. Limite: ${config.maxSizeMb} MB.`)
      return
    }

    setSelectedFile(file)
  }

  async function handleUpload() {
    if (!selectedFile) return
    setError(null)
    setSuccess(false)
    setUploading(true)
    setProgress(0)

    // Request signed URL from server action
    const uploadResult = await onRequestUpload(
      lessonId,
      kind,
      selectedFile.name,
      selectedFile.size,
      selectedFile.type,
    )

    if (!uploadResult.ok) {
      setError(uploadResult.error)
      setUploading(false)
      return
    }

    const { signedUrl, path } = uploadResult.data

    // Upload directly to Storage via XHR
    try {
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
            reject(new Error(`Upload falhou com status ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('x-upsert', 'true')
        xhr.setRequestHeader('Content-Type', selectedFile.type)
        xhr.send(selectedFile)
      })

      // Confirm upload in DB
      const confirmResult = await onConfirmUpload(lessonId, path, pathId)
      if (!confirmResult.ok) {
        setError(confirmResult.error)
        setUploading(false)
        return
      }

      setCurrentPath(path)
      setSuccess(true)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no upload.'
      setError(message)
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  async function handleDelete() {
    if (!onDeleteFile) return
    setDeleting(true)
    setError(null)
    const result = await onDeleteFile(lessonId, pathId)
    if (result.ok) {
      setCurrentPath(null)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      setError(result.error)
    }
    setDeleting(false)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium">{config.label}</label>
        <p className="mt-0.5 text-xs text-text-muted">{config.hint}</p>
      </div>

      {/* Current file */}
      {currentPath && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted px-3 py-2">
          <span className="shrink-0 text-text-muted">{config.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-text">{currentPath.split('/').pop()}</p>
            <p className="text-xs text-text-muted">Arquivo atual</p>
          </div>
          {onDeleteFile && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Remover arquivo"
              className="shrink-0 text-text-muted hover:text-danger transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* File input */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept}
          onChange={handleFileChange}
          className="sr-only"
          id={`media-upload-${kind}`}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="size-4" aria-hidden />
          Escolher arquivo
        </Button>

        {selectedFile && !uploading && (
          <Button
            type="button"
            size="sm"
            loading={uploading}
            onClick={handleUpload}
          >
            Enviar
          </Button>
        )}
      </div>

      {/* Selected file info */}
      {selectedFile && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2">
          <span className="shrink-0 text-text-muted">{config.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-text-muted">{formatFileSize(selectedFile.size)}</p>
            {selectedFile.size > 6 * 1024 * 1024 && (
              <p className="text-xs text-text-muted">
                Arquivo grande — o upload pode demorar. Não feche a página.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {uploading && progress !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Enviando...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {success && !uploading && (
        <p className="text-sm text-success" role="status">
          Arquivo enviado com sucesso.
        </p>
      )}
    </div>
  )
}
