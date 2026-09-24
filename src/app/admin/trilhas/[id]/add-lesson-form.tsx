'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createLesson } from '@/features/admin/lessons/actions'
import type { AdminLesson } from '@/features/admin/paths/queries'

const CONTENT_TYPES = [
  { value: 'text', label: 'Texto (Markdown)' },
  { value: 'video', label: 'Vídeo (URL ou placeholder)' },
  { value: 'link', label: 'Link externo' },
  { value: 'embed', label: 'Embed (iframe)' },
  { value: 'pdf', label: 'PDF' },
  { value: 'task', label: 'Tarefa (checklist)' },
  { value: 'challenge', label: 'Desafio (resposta aberta)' },
  { value: 'survey', label: 'Questionário' },
  { value: 'game', label: 'Game (drag & sort / say-dont-say)' },
] as const

type ContentType = (typeof CONTENT_TYPES)[number]['value']

const ACTIVITY_TYPES: readonly ContentType[] = ['task', 'challenge', 'survey', 'game']

const CONFIG_TEMPLATES: Record<ContentType, string> = {
  text: '',
  link: '',
  embed: '',
  pdf: '',
  video: JSON.stringify(
    {
      provider: 'placeholder',
      duration_seconds: 120,
      chapters: [
        { label: 'Introdução', seconds: 0 },
        { label: 'Conclusão', seconds: 60 },
      ],
    },
    null,
    2,
  ),
  task: JSON.stringify(
    {
      intro: 'Complete os passos abaixo para concluir a tarefa.',
      items: [
        { id: 'p1', label: 'Primeiro passo', required: true },
        { id: 'p2', label: 'Segundo passo', required: true },
      ],
      note_optional: true,
      note_max_length: 500,
    },
    null,
    2,
  ),
  challenge: JSON.stringify(
    {
      scenario: 'Descreva o cenário aqui.',
      instructions: 'Explique como você resolveria a situação.',
      min_length: 200,
      max_length: 2000,
      evaluation_criteria: [
        { id: 'c1', label: 'Foco no cliente' },
        { id: 'c2', label: 'Clareza de comunicação' },
      ],
      blocked_terms: [],
      reference_answer: 'Resposta modelo aparece depois de concluir.',
    },
    null,
    2,
  ),
  survey: JSON.stringify(
    {
      intro: 'Sua opinião é anônima.',
      questions: [
        { id: 'q1', question: 'De 1 a 5, como avalia o treinamento?', type: 'scale', required: true },
        { id: 'q2', question: 'Deixe um comentário.', type: 'long_text', required: false, max_length: 500 },
      ],
    },
    null,
    2,
  ),
  game: JSON.stringify(
    {
      kind: 'drag_sort',
      intro: 'Coloque os passos na ordem correta.',
      items: [
        { id: 'a', label: 'Primeiro' },
        { id: 'b', label: 'Segundo' },
        { id: 'c', label: 'Terceiro' },
      ],
    },
    null,
    2,
  ),
}

interface Props {
  moduleId: string
  pathId: string
  onSuccess: (lesson: AdminLesson) => void
  onCancel: () => void
}

export function AddLessonForm({ moduleId, pathId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [contentType, setContentType] = useState<ContentType>('text')
  const [configJson, setConfigJson] = useState<string>(CONFIG_TEMPLATES.text)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function onContentTypeChange(next: ContentType) {
    setContentType(next)
    setConfigJson(CONFIG_TEMPLATES[next] ?? '')
  }

  const showConfig = contentType === 'video' || ACTIVITY_TYPES.includes(contentType)
  const showUrlField = contentType === 'video' || contentType === 'link' || contentType === 'embed'
  const urlRequired = contentType === 'link' || contentType === 'embed'

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
        const externalUrlValue = formData.get('external_url')
        const newLesson: AdminLesson = {
          id: result.data.id,
          moduleId,
          title,
          contentType,
          content: contentType === 'text' ? (formData.get('content') as string) : null,
          externalUrl:
            showUrlField && typeof externalUrlValue === 'string' && externalUrlValue.length > 0
              ? externalUrlValue
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
          onChange={(e) => onContentTypeChange(e.target.value as ContentType)}
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

      {showUrlField && (
        <div>
          <label htmlFor="lesson-url" className="mb-1 block text-xs font-medium">
            URL
            {urlRequired && <span aria-hidden className="text-danger"> *</span>}
            {contentType === 'video' && (
              <span className="ml-1 font-normal text-text-subtle">
                (opcional se usar provider &quot;placeholder&quot; no config)
              </span>
            )}
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

      {showConfig && (
        <div>
          <label htmlFor="lesson-config" className="mb-1 block text-xs font-medium">
            Configuração (JSON)
            {ACTIVITY_TYPES.includes(contentType) && (
              <span aria-hidden className="text-danger"> *</span>
            )}
          </label>
          <textarea
            id="lesson-config"
            name="config_json"
            rows={8}
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 font-mono text-xs outline-none focus:ring-1"
          />
          <p className="text-text-subtle mt-1 text-xs">
            Modelo pré-preenchido para o tipo selecionado. Edite conforme necessário.
          </p>
          {fieldError('config_json') && (
            <p className="text-danger mt-1 text-xs">{fieldError('config_json')}</p>
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
