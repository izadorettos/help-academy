'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

type TabValue = 'todas' | 'em_andamento' | 'concluidas' | 'nao_iniciadas'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluidas', label: 'Concluídas' },
  { value: 'nao_iniciadas', label: 'Não iniciadas' },
]

export function PathTabsNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const activeTab = (searchParams.get('status') as TabValue | null) ?? 'todas'

  function handleTabClick(value: TabValue) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'todas') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    const qs = params.toString()
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  return (
    <div
      role="tablist"
      aria-label="Filtrar trilhas por status"
      className={`border-border flex border-b overflow-x-auto ${isPending ? 'opacity-60' : ''}`}
    >
      {TABS.map(({ value, label }) => {
        const isActive = activeTab === value
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleTabClick(value)}
            className={`min-h-10 border-b-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'border-brand text-brand -mb-px'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
