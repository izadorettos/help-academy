'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createTutorial, updateTutorial } from '@/features/help/actions'
import type { TutorialAudience, TutorialCategory, TutorialDetail } from '@/features/help/queries'
import { tutorialContentTypeValues, tutorialFreshnessValues, tutorialVisibilityValues } from '@/features/help/schemas'

interface TutorialFormProps {
  audiences: TutorialAudience[]
  categories: TutorialCategory[]
  tutorial?: TutorialDetail | null
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function TutorialForm({ audiences, categories, tutorial }: TutorialFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [titleVal, setTitleVal] = useState(tutorial?.title ?? '')
  const [slugVal, setSlugVal] = useState(tutorial?.slug ?? '')
  const [slugManual, setSlugManual] = useState(!!tutorial?.slug)

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitleVal(e.target.value)
      if (!slugManual) {
        setSlugVal(slugify(e.target.value))
      }
    },
    [slugManual],
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = tutorial
        ? await updateTutorial(tutorial.id, formData)
        : await createTutorial(formData)

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (!tutorial && result.data) {
        router.push(`/admin/tutoriais/${result.data.id}/editar`)
      } else {
        router.push('/admin/tutoriais')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <label htmlFor="title" className="block text-sm font-medium">Título *</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={titleVal}
          onChange={handleTitleChange}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1">
        <label htmlFor="slug" className="block text-sm font-medium">Slug *</label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          value={slugVal}
          onChange={(e) => { setSlugVal(e.target.value); setSlugManual(true) }}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none"
          pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium">Descrição *</label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={tutorial?.description}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none resize-none"
        />
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label htmlFor="category_id" className="block text-sm font-medium">Categoria *</label>
        <select
          id="category_id"
          name="category_id"
          required
          defaultValue={tutorial?.category.id ?? ''}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Selecionar…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Audiences */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Público(s) *</legend>
        <div className="flex flex-wrap gap-3">
          {audiences.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="audience_ids"
                value={a.id}
                defaultChecked={tutorial?.audiences.some((ta) => ta.id === a.id)}
                className="rounded border-border"
              />
              {a.name}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Content type */}
      <div className="space-y-1">
        <label htmlFor="content_type" className="block text-sm font-medium">Tipo de conteúdo *</label>
        <select
          id="content_type"
          name="content_type"
          required
          defaultValue={tutorial?.content_type ?? 'video'}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          {tutorialContentTypeValues.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Media URL */}
      <div className="space-y-1">
        <label htmlFor="video_url" className="block text-sm font-medium">
          URL de vídeo (YouTube, Vimeo ou storage:)
        </label>
        <input
          id="video_url"
          name="video_url"
          type="text"
          defaultValue={tutorial?.video_url ?? ''}
          placeholder="https://youtu.be/... ou storage:tutorials/slug/file.mp4"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="file_url" className="block text-sm font-medium">
          URL do arquivo (PDF, imagem, APK ou storage:)
        </label>
        <input
          id="file_url"
          name="file_url"
          type="text"
          defaultValue={tutorial?.file_url ?? ''}
          placeholder="storage:tutorials/slug/file.pdf"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="thumbnail_url" className="block text-sm font-medium">
          URL da capa (storage: ou https://)
        </label>
        <input
          id="thumbnail_url"
          name="thumbnail_url"
          type="text"
          defaultValue={tutorial?.thumbnail_url ?? ''}
          placeholder="storage:tutorials/slug/cover.jpg"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Duration / pages */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="duration_seconds" className="block text-sm font-medium">Duração (segundos)</label>
          <input
            id="duration_seconds"
            name="duration_seconds"
            type="number"
            min="0"
            defaultValue={tutorial?.duration_seconds ?? ''}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="pages" className="block text-sm font-medium">Páginas (PDF)</label>
          <input
            id="pages"
            name="pages"
            type="number"
            min="1"
            defaultValue={tutorial?.pages ?? ''}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* App version */}
      <div className="space-y-1">
        <label htmlFor="app_version" className="block text-sm font-medium">Versão do app</label>
        <input
          id="app_version"
          name="app_version"
          type="text"
          defaultValue={tutorial?.app_version ?? ''}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Last content update */}
      <div className="space-y-1">
        <label htmlFor="last_content_update" className="block text-sm font-medium">
          Data da última atualização de conteúdo *
        </label>
        <input
          id="last_content_update"
          name="last_content_update"
          type="date"
          required
          defaultValue={tutorial?.last_content_update ?? new Date().toISOString().split('T')[0]}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="date_source" className="block text-sm font-medium">Origem da data</label>
        <input
          id="date_source"
          name="date_source"
          type="text"
          defaultValue={tutorial?.date_source ?? ''}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Freshness */}
      <div className="space-y-1">
        <label htmlFor="freshness" className="block text-sm font-medium">Status do conteúdo</label>
        <select
          id="freshness"
          name="freshness"
          defaultValue={tutorial?.freshness ?? 'current'}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          {tutorialFreshnessValues.map((v) => (
            <option key={v} value={v}>
              {v === 'current' ? 'Atual' : v === 'needs_update' ? 'Atualização solicitada' : 'Revisar'}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="freshness_note" className="block text-sm font-medium">Nota de status</label>
        <textarea
          id="freshness_note"
          name="freshness_note"
          rows={2}
          defaultValue={tutorial?.freshness_note ?? ''}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none resize-none"
        />
      </div>

      {/* Visibility */}
      <div className="space-y-1">
        <label htmlFor="visibility" className="block text-sm font-medium">Visibilidade</label>
        <select
          id="visibility"
          name="visibility"
          defaultValue={tutorial?.visibility ?? 'authenticated'}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          {tutorialVisibilityValues.map((v) => (
            <option key={v} value={v}>
              {v === 'authenticated' ? 'Apenas membros autenticados' : 'Público (sem login)'}
            </option>
          ))}
        </select>
      </div>

      {/* Sort order */}
      <div className="space-y-1">
        <label htmlFor="sort_order" className="block text-sm font-medium">Ordem</label>
        <input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={tutorial?.sort_order ?? 0}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_published"
            value="true"
            defaultChecked={tutorial?.is_published ?? false}
          />
          Publicado
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_featured"
            value="true"
            defaultChecked={tutorial?.is_featured ?? false}
          />
          Destaque
        </label>
      </div>

      {/* Hidden fallbacks for unchecked checkboxes */}
      <input type="hidden" name="is_published" value="false" />
      <input type="hidden" name="is_featured" value="false" />

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : tutorial ? 'Salvar alterações' : 'Criar tutorial'}
        </button>
        <a
          href="/admin/tutoriais"
          className="text-sm font-medium text-text-muted hover:text-text transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  )
}
