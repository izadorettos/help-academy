'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MediaUpload } from '@/components/admin/media-upload'
import { updateLessonContent } from '@/features/admin/lessons/actions'
import { requestUpload, confirmUpload, deleteMediaFile } from '@/features/admin/media/actions'
import type { AdminLessonEditorData } from '@/features/admin/quiz/queries'

interface Props {
  lesson: AdminLessonEditorData
  pathId: string
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  text: 'Texto (Markdown)',
  video: 'Vídeo (YouTube)',
  link: 'Link',
  embed: 'Embed',
  pdf: 'PDF',
  image: 'Imagem',
  presentation: 'Apresentação',
}

export function LessonContentForm({ lesson, pathId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState(lesson.content ?? '')
  const [externalUrl, setExternalUrl] = useState(lesson.externalUrl ?? '')
  const [_titleOverride, setTitleOverride] = useState(lesson.content ?? '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const contentType = lesson.contentType

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    if (contentType === 'pdf' && selectedFile) {
      formData.set('file', selectedFile)
    }

    startTransition(async () => {
      const result = await updateLessonContent(lesson.id, pathId, formData)
      if (result.ok) {
        setSuccess(true)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-2">
        <span className="bg-surface-muted text-text-muted rounded px-2 py-0.5 text-xs font-medium">
          {CONTENT_TYPE_LABEL[contentType] ?? contentType}
        </span>
      </div>

      {/* TEXT type */}
      {contentType === 'text' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="content" className="block text-sm font-medium">
              Conteúdo (Markdown)
            </label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="text-brand text-sm underline"
            >
              {showPreview ? 'Editar' : 'Visualizar'}
            </button>
          </div>
          {showPreview ? (
            <div className="border-border bg-surface-muted prose prose-sm min-h-40 rounded-md border p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">{previewContent}</pre>
            </div>
          ) : (
            <textarea
              id="content"
              name="content"
              rows={20}
              className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus:ring-1"
              placeholder="# Título&#10;&#10;Escreva o conteúdo em Markdown..."
              defaultValue={lesson.content ?? ''}
              onChange={(e) => setPreviewContent(e.target.value)}
              required
            />
          )}
        </div>
      )}

      {/* VIDEO type */}
      {contentType === 'video' && (
        <div className="space-y-3">
          <label htmlFor="external_url" className="block text-sm font-medium">
            URL do YouTube
          </label>
          <input
            id="external_url"
            name="external_url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
            defaultValue={lesson.externalUrl ?? ''}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            required
          />
          <p className="text-text-muted text-xs">
            Formatos aceitos: youtube.com/watch?v=ID ou youtu.be/ID
          </p>
          {externalUrl && (
            <div className="aspect-video overflow-hidden rounded-md">
              <iframe
                src={externalUrl.replace('youtu.be/', 'www.youtube.com/embed/').replace('watch?v=', 'embed/')}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Preview do vídeo"
              />
            </div>
          )}
        </div>
      )}

      {/* LINK type */}
      {contentType === 'link' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="external_url" className="block text-sm font-medium">
              URL do link
            </label>
            <input
              id="external_url"
              name="external_url"
              type="url"
              placeholder="https://..."
              defaultValue={lesson.externalUrl ?? ''}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-medium">
              Título do link <span className="text-text-muted font-normal">(opcional)</span>
            </label>
            <input
              id="content"
              name="content"
              type="text"
              placeholder="Texto exibido como título"
              defaultValue={lesson.content ?? ''}
              onChange={(e) => setTitleOverride(e.target.value)}
              className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            />
          </div>
        </div>
      )}

      {/* EMBED type */}
      {contentType === 'embed' && (
        <div className="space-y-3">
          <label htmlFor="external_url" className="block text-sm font-medium">
            URL de embed
          </label>
          <input
            id="external_url"
            name="external_url"
            type="url"
            placeholder="https://..."
            defaultValue={lesson.externalUrl ?? ''}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            required
          />
          <p className="text-text-muted text-xs">
            Domínios permitidos: YouTube, Vimeo, Google Docs, Loom, Wistia
          </p>
          {externalUrl && (
            <div className="aspect-video overflow-hidden rounded-md border">
              <iframe
                src={externalUrl}
                className="h-full w-full"
                allowFullScreen
                title="Preview do embed"
              />
            </div>
          )}
        </div>
      )}

      {/* PDF type */}
      {contentType === 'pdf' && (
        <div className="space-y-3">
          <label htmlFor="file" className="block text-sm font-medium">
            Arquivo PDF
          </label>
          {lesson.filePath && (
            <p className="text-text-muted text-sm">
              Arquivo atual:{' '}
              <span className="font-mono text-xs">{lesson.filePath.split('/').pop()}</span>
            </p>
          )}
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="border-border bg-surface text-text focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          />
          <p className="text-text-muted text-xs">Apenas arquivos PDF. Tamanho máximo: 50 MB.</p>
          {selectedFile && (
            <p className="text-text-muted text-sm">
              Selecionado: <span className="font-medium">{selectedFile.name}</span> (
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      )}

      {/* IMAGE type */}
      {contentType === 'image' && (
        <MediaUpload
          kind="image"
          lessonId={lesson.id}
          pathId={pathId}
          currentFilePath={lesson.filePath}
          onRequestUpload={requestUpload}
          onConfirmUpload={confirmUpload}
          onDeleteFile={deleteMediaFile}
        />
      )}

      {/* PRESENTATION type */}
      {contentType === 'presentation' && (
        <MediaUpload
          kind="presentation"
          lessonId={lesson.id}
          pathId={pathId}
          currentFilePath={lesson.filePath}
          onRequestUpload={requestUpload}
          onConfirmUpload={confirmUpload}
          onDeleteFile={deleteMediaFile}
        />
      )}

      {error && (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="text-success text-sm" role="status">
          Conteúdo salvo com sucesso.
        </p>
      )}

      {/* Image and presentation use MediaUpload — no traditional form submit */}
      {contentType !== 'image' && contentType !== 'presentation' && (
        <div className="flex gap-3">
          <Button type="submit" loading={isPending}>
            Salvar conteúdo
          </Button>
        </div>
      )}
    </form>
  )
}
