import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TutorialSeries } from '@/features/help/queries'

interface SeriesTutorial {
  id: string
  slug: string
  title: string
  series_position: number
}

interface SeriesNavigatorProps {
  series: TutorialSeries
  tutorials: SeriesTutorial[]
  currentSlug: string
  backUrl?: string
}

export function SeriesNavigator({ series, tutorials, currentSlug, backUrl }: SeriesNavigatorProps) {
  const sorted = [...tutorials].sort((a, b) => a.series_position - b.series_position)
  const currentIdx = sorted.findIndex((t) => t.slug === currentSlug)
  const total = sorted.length

  const prev = currentIdx > 0 ? sorted[currentIdx - 1] : null
  const next = currentIdx < total - 1 ? sorted[currentIdx + 1] : null

  function href(slug: string) {
    return backUrl ? `/ajuda/${slug}?back=${encodeURIComponent(backUrl)}` : `/ajuda/${slug}`
  }

  return (
    <nav aria-label={`Série: ${series.name}`} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-muted">
          Série: {series.name} — Parte {currentIdx + 1} de {total}
        </p>
      </div>

      {/* Part list */}
      <ol className="space-y-1">
        {sorted.map((t, idx) => {
          const isActive = t.slug === currentSlug
          return (
            <li key={t.id}>
              {isActive ? (
                <div className="flex items-center gap-3 rounded-lg bg-brand-soft px-3 py-2">
                  <span className="font-mono text-xs font-semibold text-brand-text w-5 text-right">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-brand-text">{t.title}</span>
                </div>
              ) : (
                <Link
                  href={href(t.slug)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface-muted hover:text-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="font-mono text-xs w-5 text-right">{idx + 1}</span>
                  {t.title}
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {/* Prev / Next navigation */}
      <div className="flex items-center gap-3">
        {prev ? (
          <Link
            href={href(prev.slug)}
            className="flex flex-1 items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted hover:border-brand hover:text-brand transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Anterior: {prev.title}</span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next && (
          <Link
            href={href(next.slug)}
            className="flex flex-1 items-center justify-end gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted hover:border-brand hover:text-brand transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="truncate">Próxima: {next.title}</span>
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  )
}
