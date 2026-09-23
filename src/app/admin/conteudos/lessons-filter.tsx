'use client'

import { useRouter, usePathname } from 'next/navigation'

interface FilterPath {
  id: string
  title: string
}

interface CurrentFilters {
  content_type?: string
  published?: string
  path_id?: string
}

interface Props {
  paths: FilterPath[]
  currentFilters: CurrentFilters
}

export function LessonsFilter({ paths, currentFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams()
    if (key !== 'content_type' && currentFilters.content_type) {
      params.set('content_type', currentFilters.content_type)
    }
    if (key !== 'published' && currentFilters.published) {
      params.set('published', currentFilters.published)
    }
    if (key !== 'path_id' && currentFilters.path_id) {
      params.set('path_id', currentFilters.path_id)
    }
    if (value) {
      params.set(key, value)
    }
    // Always reset to page 1 on filter change
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Content type */}
      <select
        value={currentFilters.content_type ?? ''}
        onChange={(e) => updateFilter('content_type', e.target.value)}
        aria-label="Filtrar por tipo"
        className="border-border bg-surface focus:border-brand focus:ring-brand rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
      >
        <option value="">Todos os tipos</option>
        <option value="text">Texto</option>
        <option value="video">Vídeo</option>
        <option value="link">Link</option>
        <option value="embed">Embed</option>
        <option value="pdf">PDF</option>
      </select>

      {/* Status */}
      <select
        value={currentFilters.published ?? ''}
        onChange={(e) => updateFilter('published', e.target.value)}
        aria-label="Filtrar por status"
        className="border-border bg-surface focus:border-brand focus:ring-brand rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
      >
        <option value="">Todos os status</option>
        <option value="true">Publicadas</option>
        <option value="false">Rascunhos</option>
      </select>

      {/* Path */}
      <select
        value={currentFilters.path_id ?? ''}
        onChange={(e) => updateFilter('path_id', e.target.value)}
        aria-label="Filtrar por trilha"
        className="border-border bg-surface focus:border-brand focus:ring-brand max-w-xs rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
      >
        <option value="">Todas as trilhas</option>
        {paths.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  )
}
