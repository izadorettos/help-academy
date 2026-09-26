'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useTransition } from 'react'
import { Search } from 'lucide-react'
import { TutorialCard } from './tutorial-card'
import { TutorialFilters } from './tutorial-filters'
import type { TutorialListItem, TutorialAudience, TutorialCategory } from '@/features/help/queries'

interface HelpCenterClientProps {
  tutorials: TutorialListItem[]
  audiences: TutorialAudience[]
  categories: TutorialCategory[]
  currentQ: string
  currentAudience: string
  currentCategory: string
  currentType: string
}

function groupByCategory(tutorials: TutorialListItem[]): Map<string, TutorialListItem[]> {
  const map = new Map<string, TutorialListItem[]>()
  for (const t of tutorials) {
    const key = t.category.name
    const list = map.get(key) ?? []
    list.push(t)
    map.set(key, list)
  }
  return map
}

export function HelpCenterClient({
  tutorials,
  audiences,
  categories,
  currentQ,
  currentAudience,
  currentCategory,
  currentType,
}: HelpCenterClientProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [, startTransition] = useTransition()

  const searchRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onSearch = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) {
        next.set('q', value)
      } else {
        next.delete('q')
      }
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false })
      })
    },
    [params, pathname, router],
  )

  const hasFilters = currentQ || currentAudience || currentCategory || currentType

  // Featured / recent tutorials for "no filter" state
  const featuredTutorials = tutorials.filter((t) => t.is_featured)
  const recentTutorials   = [...tutorials]
    .sort((a, b) => b.last_content_update.localeCompare(a.last_content_update))
    .slice(0, 4)

  const grouped = groupByCategory(tutorials)

  const currentUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-muted" aria-hidden />
        <input
          ref={searchRef}
          type="search"
          defaultValue={currentQ}
          placeholder="Buscar por pedido, parada, QR Code, adiantamento…"
          aria-label="Buscar tutoriais"
          className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-10 text-base placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          onChange={(e) => onSearch(e.target.value)}
        />
        <kbd
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-xs text-text-subtle"
          aria-hidden
        >
          /
        </kbd>
      </div>

      {/* Filters */}
      <TutorialFilters
        audiences={audiences}
        categories={categories}
        currentAudience={currentAudience}
        currentCategory={currentCategory}
        currentType={currentType}
      />

      {/* Results */}
      {hasFilters ? (
        /* Filtered view */
        <section aria-label="Resultados">
          <p className="mb-4 text-sm text-text-muted">
            {tutorials.length} {tutorials.length === 1 ? 'material' : 'materiais'}
            {currentQ ? ` para "${currentQ}"` : ''}
          </p>
          {tutorials.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-text-muted">
                Nenhum material encontrado{currentQ ? ` para &quot;${currentQ}&quot;` : ''}.
              </p>
              <button
                type="button"
                onClick={() => {
                  startTransition(() => router.push(pathname, { scroll: false }))
                }}
                className="text-sm font-medium text-brand hover:underline underline-offset-2"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Tutoriais">
              {tutorials.map((t) => (
                <li key={t.id}>
                  <TutorialCard tutorial={t} backUrl={currentUrl} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        /* Default view: featured + recent + grouped by category */
        <>
          {/* Featured */}
          {featuredTutorials.length > 0 && (
            <section aria-label="Comece por aqui">
              <h2 className="mb-4 text-h3 font-semibold">Comece por aqui</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Materiais em destaque">
                {featuredTutorials.map((t) => (
                  <li key={t.id}>
                    <TutorialCard tutorial={t} backUrl={currentUrl} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recently updated */}
          {recentTutorials.length > 0 && (
            <section aria-label="Materiais atualizados recentemente">
              <h2 className="mb-4 text-h3 font-semibold">Materiais atualizados recentemente</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Tutoriais recentes">
                {recentTutorials.map((t) => (
                  <li key={t.id}>
                    <TutorialCard tutorial={t} backUrl={currentUrl} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* All grouped by category */}
          {Array.from(grouped.entries()).map(([catName, catTutorials]) => (
            <section key={catName} aria-label={catName}>
              <h2 className="mb-4 text-h3 font-semibold">{catName}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={`Tutoriais de ${catName}`}>
                {catTutorials.map((t) => (
                  <li key={t.id}>
                    <TutorialCard tutorial={t} backUrl={currentUrl} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
