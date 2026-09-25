import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetPath } from '@/features/admin/paths/queries'
import { adminGetDepartments } from '@/features/admin/departments/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PathStatusActions } from '../path-status-actions'
import { DepartmentAssignment } from './department-assignment'
import { ModuleBuilder } from './module-builder'
import { Pencil, ArrowLeft, Plus } from 'lucide-react'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const path = await adminGetPath(id)
  return { title: `${path?.title ?? 'Trilha'} — Admin — Help Academy` }
}

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_BADGE: Record<
  'draft' | 'published' | 'archived',
  { label: string; variant: 'warning' | 'success' | 'muted' }
> = {
  draft: { label: 'Rascunho', variant: 'warning' },
  published: { label: 'Publicada', variant: 'success' },
  archived: { label: 'Arquivada', variant: 'muted' },
}

export default async function TrilhaBuilderPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const [path, departments] = await Promise.all([
    adminGetPath(id),
    adminGetDepartments(),
  ])

  if (!path) notFound()

  const statusInfo = STATUS_BADGE[path.status]

  return (
    <div className="space-y-8">
      {/* Back nav */}
      <Link
        href="/admin/trilhas"
        className="text-text-muted hover:text-text inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Todas as trilhas
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1 font-bold">{path.title}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {path.required && <Badge variant="required">Obrigatória</Badge>}
          </div>
          {path.description && (
            <p className="text-text-muted mt-1 max-w-prose text-sm">{path.description}</p>
          )}
          <p className="text-text-subtle mt-1 font-mono text-xs">/trilhas/{path.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/admin/conteudos/novo?trilha=${id}`}>
            <Button size="sm">
              <Plus className="size-4" aria-hidden />
              Novo conteúdo
            </Button>
          </Link>
          <Link
            href={`/admin/trilhas/${id}/editar`}
            className="text-text-muted hover:text-text hover:bg-surface-muted inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
          >
            <Pencil className="size-4" aria-hidden />
            Editar metadados
          </Link>
          <PathStatusActions
            id={path.id}
            title={path.title}
            status={path.status}
            showDuplicate
          />
        </div>
      </div>

      {/* Department assignment */}
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold">Áreas atribuídas</h2>
        <p className="text-text-muted mb-4 text-sm">
          Selecione as áreas cujos usuários terão acesso a esta trilha.
        </p>
        <DepartmentAssignment
          pathId={path.id}
          departments={departments}
          assignedIds={path.assignedDepartmentIds}
        />
      </Card>

      {/* Module builder */}
      <div>
        <h2 className="mb-4 text-base font-semibold">Módulos e aulas</h2>
        <ModuleBuilder pathId={path.id} modules={path.modules} />
      </div>
    </div>
  )
}
