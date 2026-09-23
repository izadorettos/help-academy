'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { setPathDepartments } from '@/features/admin/paths/actions'
import type { AdminDepartment } from '@/features/admin/departments/queries'

interface Props {
  pathId: string
  departments: AdminDepartment[]
  assignedIds: string[]
}

export function DepartmentAssignment({ pathId, departments, assignedIds }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await setPathDepartments(pathId, Array.from(selected))
      if (!result.ok) {
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {departments
          .filter((d) => d.active)
          .map((dept) => (
            <label
              key={dept.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                selected.has(dept.id)
                  ? 'border-brand bg-brand-soft text-brand-hover'
                  : 'border-border bg-surface text-text hover:bg-surface-muted'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.has(dept.id)}
                onChange={() => toggle(dept.id)}
              />
              {dept.name}
            </label>
          ))}
      </div>

      {departments.filter((d) => d.active).length === 0 && (
        <p className="text-text-subtle text-sm">Nenhuma área ativa cadastrada.</p>
      )}

      {error && (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}

      {saved && (
        <p className="text-success text-sm" role="status">
          Áreas salvas com sucesso.
        </p>
      )}

      <Button variant="secondary" size="sm" loading={isPending} onClick={handleSave}>
        Salvar áreas
      </Button>
    </div>
  )
}
