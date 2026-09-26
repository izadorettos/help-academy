'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import type { TutorialAudience, TutorialCategory } from '@/features/help/queries'

interface TutorialFiltersProps {
  audiences: TutorialAudience[]
  categories: TutorialCategory[]
  currentAudience: string
  currentCategory: string
  currentType: string
  totalCount?: number
}

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'video', label: 'Vídeo' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Passo a passo' },
  { value: 'app', label: 'App' },
]

export function TutorialFilters({
  audiences,
  categories,
  currentAudience,
  currentCategory,
  currentType,
}: TutorialFiltersProps) {
  const router    = useRouter()
  const pathname  = usePathname()
  const params    = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      // Reset page if changing audience/category
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false })
      })
    },
    [params, pathname, router],
  )

  const hasFilters = currentAudience || currentCategory || currentType

  return (
    <div className="space-y-4">
      {/* Audience segmented control */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">Público</p>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-muted p-1 sm:inline-flex">
          <button
            type="button"
            onClick={() => setParam('publico', '')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${!currentAudience ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            Todos
          </button>
          {audiences.map((aud) => (
            <button
              key={aud.slug}
              type="button"
              onClick={() => setParam('publico', aud.slug)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${currentAudience === aud.slug ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              {aud.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">Categoria</p>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setParam('categoria', '')}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${!currentCategory ? 'border-brand bg-brand-soft text-brand-text' : 'border-border text-text-muted hover:border-brand hover:text-brand'}`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setParam('categoria', cat.slug)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${currentCategory === cat.slug ? 'border-brand bg-brand-soft text-brand-text' : 'border-border text-text-muted hover:border-brand hover:text-brand'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Type chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">Tipo</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setParam('tipo', opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${currentType === opt.value ? 'border-brand bg-brand-soft text-brand-text' : 'border-border text-text-muted hover:border-brand hover:text-brand'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear button */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params.toString())
            next.delete('publico')
            next.delete('categoria')
            next.delete('tipo')
            startTransition(() => {
              router.push(`${pathname}?${next.toString()}`, { scroll: false })
            })
          }}
          className="text-sm text-text-muted underline underline-offset-2 hover:text-text"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
