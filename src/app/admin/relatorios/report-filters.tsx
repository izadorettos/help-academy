'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface Department {
  id: string
  name: string
}

interface LearningPath {
  id: string
  title: string
}

interface Props {
  departments: Department[]
  paths: LearningPath[]
  currentDepartmentId?: string
  currentPathId?: string
  currentStatus?: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'not_started', label: 'Não iniciado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
]

export function ReportFilters({
  departments,
  paths,
  currentDepartmentId = '',
  currentPathId = '',
  currentStatus = '',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset to page 1 on filter change
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-text-muted text-xs font-medium">Área</span>
        <select
          value={currentDepartmentId}
          onChange={(e) => updateParam('departmentId', e.target.value)}
          aria-label="Filtrar por área"
          className="border-border bg-surface focus:border-brand focus:ring-brand min-w-40 rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        >
          <option value="">Todas as áreas</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted text-xs font-medium">Trilha</span>
        <select
          value={currentPathId}
          onChange={(e) => updateParam('pathId', e.target.value)}
          aria-label="Filtrar por trilha"
          className="border-border bg-surface focus:border-brand focus:ring-brand min-w-48 rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        >
          <option value="">Todas as trilhas</option>
          {paths.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted text-xs font-medium">Status</span>
        <select
          value={currentStatus}
          onChange={(e) => updateParam('status', e.target.value)}
          aria-label="Filtrar por status"
          className="border-border bg-surface focus:border-brand focus:ring-brand min-w-40 rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
