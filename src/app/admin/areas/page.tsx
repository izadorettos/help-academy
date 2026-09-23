import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetDepartments } from '@/features/admin/departments/queries'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DepartmentToggleButton } from './department-toggle-button'
import { Building2, Plus, Pencil } from 'lucide-react'

export const metadata: Metadata = { title: 'Áreas — Admin — Help Academy' }

export default async function AdminAreasPage() {
  await requireAdmin()
  const departments = await adminGetDepartments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold">Áreas</h1>
          <p className="text-text-muted mt-1 text-sm">
            Gerencie as áreas / departamentos da plataforma.
          </p>
        </div>
        <Link
          href="/admin/areas/nova"
          className="bg-brand text-on-brand hover:bg-brand-hover inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" aria-hidden />
          Nova área
        </Link>
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma área cadastrada"
          description="Crie a primeira área para começar."
          action={
            <Link
              href="/admin/areas/nova"
              className="bg-brand text-on-brand hover:bg-brand-hover inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
            >
              <Plus className="size-4" aria-hidden />
              Nova área
            </Link>
          }
        />
      ) : (
        <Card>
          <div className="divide-border divide-y">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{dept.name}</span>
                    {!dept.active && (
                      <span className="bg-surface-muted text-text-subtle shrink-0 rounded px-2 py-0.5 text-xs">
                        Inativa
                      </span>
                    )}
                  </div>
                  <p className="text-text-muted text-sm">{dept.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/areas/${dept.id}/editar`}
                    aria-label={`Editar ${dept.name}`}
                    className="text-text-muted hover:text-text hover:bg-surface-muted inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
                  >
                    <Pencil className="size-4" aria-hidden />
                    Editar
                  </Link>
                  <DepartmentToggleButton
                    id={dept.id}
                    name={dept.name}
                    active={dept.active}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
