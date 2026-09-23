import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetUser, adminGetPublishedPaths } from '@/features/admin/users/queries'
import { adminGetDepartments } from '@/features/admin/departments/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserToggleButton } from '../user-toggle-button'
import { UserEditForm } from './user-edit-form'
import { PathAssignButton } from './path-assign-button'
import { PathRemoveButton } from './path-remove-button'
import { ArrowLeft, BookOpen } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const user = await adminGetUser(id)
  return {
    title: user ? `${user.name} — Admin — Help Academy` : 'Usuário — Admin — Help Academy',
  }
}

export default async function AdminUsuarioDetailPage({ params }: Props) {
  await requireAdmin()

  const { id } = await params
  const [user, departments, publishedPaths] = await Promise.all([
    adminGetUser(id),
    adminGetDepartments(),
    adminGetPublishedPaths(),
  ])

  if (!user) notFound()

  // Paths already individually assigned
  const assignedPathIds = new Set(
    user.assignedPaths.filter((p) => p.assignedIndividually).map((p) => p.pathId),
  )

  const availablePaths = publishedPaths.filter((p) => !assignedPathIds.has(p.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/usuarios"
          aria-label="Voltar para lista de usuários"
          className="text-text-muted hover:text-text mt-1 rounded-md p-1 transition-colors"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1 font-bold">{user.name}</h1>
            <Badge variant={user.role === 'admin' ? 'brand' : 'neutral'}>
              {user.role === 'admin' ? 'Admin' : 'Membro'}
            </Badge>
            <Badge variant={user.active ? 'success' : 'warning'}>
              {user.active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-text-muted mt-0.5 text-sm">{user.email}</p>
        </div>
        <UserToggleButton id={user.id} name={user.name} active={user.active} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <Card>
            <div className="border-border border-b px-6 py-4">
              <h2 className="font-semibold">Informações do usuário</h2>
            </div>
            <div className="p-6">
              <UserEditForm user={user} departments={departments} />
            </div>
          </Card>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card>
            <div className="border-border border-b px-6 py-4">
              <h2 className="font-semibold">Estatísticas</h2>
            </div>
            <div className="divide-border divide-y">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-text-muted text-sm">Aulas concluídas</span>
                <span className="font-semibold">{user.completedLessonsCount}</span>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-text-muted text-sm">Trilhas com acesso</span>
                <span className="font-semibold">{user.assignedPaths.length}</span>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-text-muted text-sm">Trilhas concluídas</span>
                <span className="font-semibold">
                  {user.assignedPaths.filter((p) => p.completedAt !== null).length}
                </span>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-text-muted text-sm">Último acesso</span>
                <span className="text-sm">
                  {user.lastSeenAt ? (
                    <time dateTime={user.lastSeenAt}>
                      {new Date(user.lastSeenAt).toLocaleDateString('pt-BR')}
                    </time>
                  ) : (
                    <span className="text-text-subtle">Nunca</span>
                  )}
                </span>
              </div>
              {user.hireDate && (
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-text-muted text-sm">Data de admissão</span>
                  <time className="text-sm" dateTime={user.hireDate}>
                    {new Date(user.hireDate).toLocaleDateString('pt-BR')}
                  </time>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Assigned paths */}
      <Card>
        <div className="border-border flex items-center justify-between gap-4 border-b px-6 py-4">
          <h2 className="font-semibold">Trilhas atribuídas individualmente</h2>
          {availablePaths.length > 0 && (
            <PathAssignButton userId={user.id} availablePaths={availablePaths} />
          )}
        </div>

        {user.assignedPaths.filter((p) => p.assignedIndividually).length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <BookOpen className="text-text-subtle size-8" aria-hidden />
            <p className="text-text-muted text-sm">
              Nenhuma trilha atribuída individualmente a este usuário.
            </p>
            {availablePaths.length > 0 && (
              <PathAssignButton userId={user.id} availablePaths={availablePaths} />
            )}
          </div>
        ) : (
          <div className="divide-border divide-y">
            {user.assignedPaths
              .filter((p) => p.assignedIndividually)
              .map((path) => (
                <div
                  key={path.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{path.title}</span>
                      {path.completedAt && (
                        <Badge variant="success">Concluída</Badge>
                      )}
                      {!path.completedAt && path.startedAt && (
                        <Badge variant="warning">Em andamento</Badge>
                      )}
                    </div>
                    <p className="text-text-muted text-xs">
                      {path.startedAt
                        ? `Iniciada em ${new Date(path.startedAt).toLocaleDateString('pt-BR')}`
                        : 'Não iniciada'}
                    </p>
                  </div>
                  <PathRemoveButton
                    userId={user.id}
                    pathId={path.pathId}
                    pathTitle={path.title}
                  />
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  )
}
