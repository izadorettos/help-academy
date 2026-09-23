'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createLesson } from '@/features/admin/lessons/actions'
import type { AdminLesson } from '@/features/admin/paths/queries'

const CONTENT_TYPES = [
  { value: 'text', label: 'Texto (Markdown)' },
  { value: 'video', label: 'Vídeo (URL)' },
  { value: 'link', label: 'Link externo' },
  { value: 'embed', label: 'Embed (iframe)' },
  { value: 'pdf', label: 'PDF' },
] as const

type ContentType = (typeof CONTENT_TYPES)[number]['value']

interface Props {
  moduleId: string
  pathId: string
  onSuccess: (lesson: AdminLesson) => void
  onCancel: () => void
}

export function AddLessonForm({ moduleId, pathId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [contentType, setContentType] = useState<ContentType>('text')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createLesson(moduleId, pathId, formData)
      if (result.ok) {
        // Build optimistic lesson from form
        const title = formData.get('title') as string
        const estimatedRaw = formData.get('estimated_minutes') as string
        const required = formData.get('required') !== 'false'
        const newLesson: AdminLesson = {
          id: result.data.id,
          moduleId,
          title,
          contentType,
          content: contentType === 'text' ? (formData.get('content') as string) : null,
          externalUrl: ['video', 'link', 'embed'].includes(contentType)
            ? (formData.get('external_url') as string)
            : null,
          filePath: contentType === 'pdf' ? (formData.get('file_path') as string) : null,
          estimatedMinutes: estimatedRaw ? parseInt(estimatedRaw, 10) : null,
          required,
          published: false,
          position: 9999, // will be refreshed
          hasQuiz: false,
        }
        onSuccess(newLesson)
      } else {
        setError(result.error)
        if ('fieldErrors' in result && result.fieldErrors) {
          setFieldErrors(result.fieldErrors as Record<string, string[]>)
        }
      }
    })
  }

  const fieldError = (field: string) => fieldErrors[field]?.[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="text-sm font-semibold">Nova aula</h4>

      {/* Title */}
      <div>
        <label htmlFor="lesson-title" className="mb-1 block text-xs font-medium">
          Título <span aria-hidden className="text-danger">*</span>
        </label>
        <input
          id="lesson-title"
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={160}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          placeholder="Título da aula"
          autoFocus
        />
        {fieldError('title') && (
          <p className="text-danger mt-1 text-xs">{fieldError('title')}</p>
        )}
      </div>

      {/* Content type */}
      <div>
        <label htmlFor="lesson-type" className="mb-1 block text-xs font-medium">
          Tipo de conteúdo <span aria-hidden className="text-danger">*</span>
        </label>
        <select
          id="lesson-type"
          name="content_type"
          value={contentType}
          onChange={(e) => setContentType(e.target.value as ContentType)}
          className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        >
          {CONTENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Conditional content fields */}
      {contentType === 'text' && (
        <div>
          <label htmlFor="lesson-content" className="mb-1 block text-xs font-medium">
            Conteúdo (Markdown) <span aria-hidden className="text-danger">*</span>
          </label>
          <textarea
            id="lesson-content"
            name="content"
            rows={4}
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            placeholder="Conteúdo em Markdown..."
          />
          {fieldError('content') && (
            <p className="text-danger mt-1 text-xs">{fieldError('content')}</p>
          )}
        </div>
      )}

      {['video', 'link', 'embed'].includes(contentType) && (
        <div>
          <label htmlFor="lesson-url" className="mb-1 block text-xs font-medium">
            URL <span aria-hidden className="text-danger">*</span>
          </label>
          <input
            id="lesson-url"
            name="external_url"
            type="url"
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            placeholder="https://..."
          />
          {fieldError('external_url') && (
            <p className="text-danger mt-1 text-xs">{fieldError('external_url')}</p>
          )}
        </div>
      )}

      {contentType === 'pdf' && (
        <div>
          <label htmlFor="lesson-file" className="mb-1 block text-xs font-medium">
            Caminho do arquivo no Storage <span aria-hidden className="text-danger">*</span>
          </label>
          <input
            id="lesson-file"
            name="file_path"
            type="text"
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus:ring-1"
            placeholder="lesson-files/..."
          />
          <p className="text-text-subtle mt-1 text-xs">
            Upload de arquivo disponível em fase posterior (14d).
          </p>
          {fieldError('file_path') && (
            <p className="text-danger mt-1 text-xs">{fieldError('file_path')}</p>
          )}
        </div>
      )}

      {/* Estimated minutes */}
      <div>
        <label htmlFor="lesson-minutes" className="mb-1 block text-xs font-medium">
          Duração estimada (minutos)
        </label>
        <input
          id="lesson-minutes"
          name="estimated_minutes"
          type="number"
          min={0}
          max={600}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-32 rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          placeholder="15"
        />
      </div>

      {/* Required */}
      <div className="flex items-center gap-2">
        <input
          id="lesson-required"
          name="required"
          type="checkbox"
          defaultChecked
          value="true"
          className="border-border size-4 rounded"
        />
        <label htmlFor="lesson-required" className="text-sm">
          Aula obrigatória
        </label>
      </div>

      {error && (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isPending}>
          Criar aula
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
