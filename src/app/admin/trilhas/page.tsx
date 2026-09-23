import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetPaths } from '@/features/admin/paths/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PathStatusActions } from './path-status-actions'
import { BookOpen, Plus, Pencil, Copy, Layers, FileText } from 'lucide-react'

export const metadata: Metadata = { title: 'Trilhas — Admin — Help Academy' }

const STATUS_BADGE: Record<
  'draft' | 'published' | 'archived',
  { label: string; variant: 'warning' | 'success' | 'muted' }
> = {
  draft: { label: 'Rascunho', variant: 'warning' },
  published: { label: 'Publicada', variant: 'success' },
  archived: { label: 'Arquivada', variant: 'muted' },
}

export default async function AdminTrilhasPage() {
  await requireAdmin()
  const paths = await adminGetPaths()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold">Trilhas</h1>
          <p className="text-text-muted mt-1 text-sm">
            Gerencie trilhas de aprendizagem da plataforma.
          </p>
        </div>
        <Link
          href="/admin/trilhas/nova"
          className="bg-brand text-on-brand hover:bg-brand-hover inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" aria-hidden />
          Nova trilha
        </Link>
      </div>

      {paths.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma trilha cadastrada"
          description="Crie a primeira trilha para começar."
          action={
            <Link
              href="/admin/trilhas/nova"
              className="bg-brand text-on-brand hover:bg-brand-hover inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
            >
              <Plus className="size-4" aria-hidden />
              Nova trilha
            </Link>
          }
        />
      ) : (
        <Card>
          <div className="divide-border divide-y">
            {paths.map((path) => {
              const statusInfo = STATUS_BADGE[path.status]
              return (
                <div key={path.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/trilhas/${path.id}`}
                        className="hover:text-brand truncate font-medium transition-colors"
                      >
                        {path.title}
                      </Link>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      {path.required && <Badge variant="required">Obrigatória</Badge>}
                    </div>
                    <div className="text-text-muted mt-1 flex flex-wrap items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Layers className="size-3.5" aria-hidden />
                        {path.moduleCount} módulo{path.moduleCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" aria-hidden />
                        {path.lessonCount} aula{path.lessonCount !== 1 ? 's' : ''}
                      </span>
                      {path.ownerDepartmentName && (
                        <span className="text-text-subtle">{path.ownerDepartmentName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/admin/trilhas/${path.id}/editar`}
                      aria-label={`Editar ${path.title}`}
                      className="text-text-muted hover:text-text hover:bg-surface-muted inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
                    >
                      <Pencil className="size-4" aria-hidden />
                      Editar
                    </Link>
                    <PathStatusActions
                      id={path.id}
                      title={path.title}
                      status={path.status}
                      showDuplicate
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Link
          href="/admin/conteudos"
          className="text-text-muted hover:text-text inline-flex items-center gap-2 text-sm transition-colors"
        >
          <Copy className="size-4" aria-hidden />
          Ver todas as aulas
        </Link>
      </div>
    </div>
  )
}
