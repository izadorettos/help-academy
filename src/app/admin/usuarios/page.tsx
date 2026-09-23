import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetUsers } from '@/features/admin/users/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { UserToggleButton } from './user-toggle-button'
import { Users, Plus, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Usuários — Admin — Help Academy' }

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  await requireAdmin()

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const search = params.q ?? ''

  const { users, total, pageCount } = await adminGetUsers(page, search)

  const hasPrev = page > 1
  const hasNext = page < pageCount

  function buildUrl(p: number) {
    const sp = new URLSearchParams()
    if (search) sp.set('q', search)
    if (p > 1) sp.set('page', String(p))
    const qs = sp.toString()
    return `/admin/usuarios${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold">Usuários</h1>
          <p className="text-text-muted mt-1 text-sm">
            {total} {total === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
          </p>
        </div>
        <Link
          href="/admin/usuarios/convidar"
          className="bg-brand text-on-brand hover:bg-brand-hover inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" aria-hidden />
          Convidar usuário
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome ou e-mail…"
          aria-label="Buscar usuários"
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full max-w-sm rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        />
        <button
          type="submit"
          className="bg-brand text-on-brand hover:bg-brand-hover inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
        >
          Buscar
        </button>
        {search && (
          <Link
            href="/admin/usuarios"
            className="border-border bg-surface text-text hover:bg-surface-muted inline-flex min-h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
          description={
            search
              ? `Nenhum resultado para "${search}". Tente outro termo.`
              : 'Convide o primeiro usuário para começar.'
          }
          action={
            !search ? (
              <Link
                href="/admin/usuarios/convidar"
                className="bg-brand text-on-brand hover:bg-brand-hover inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors"
              >
                <Plus className="size-4" aria-hidden />
                Convidar usuário
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-text-muted px-6 py-3 text-left font-medium">Nome</th>
                    <th className="text-text-muted hidden px-6 py-3 text-left font-medium md:table-cell">
                      Área
                    </th>
                    <th className="text-text-muted hidden px-6 py-3 text-left font-medium sm:table-cell">
                      Perfil
                    </th>
                    <th className="text-text-muted hidden px-6 py-3 text-left font-medium lg:table-cell">
                      Último acesso
                    </th>
                    <th className="text-text-muted px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-text-muted text-xs">{user.email}</div>
                      </td>
                      <td className="text-text-muted hidden px-6 py-4 md:table-cell">
                        {user.departmentName ?? <span className="text-text-subtle">—</span>}
                      </td>
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <Badge variant={user.role === 'admin' ? 'brand' : 'neutral'}>
                          {user.role === 'admin' ? 'Admin' : 'Membro'}
                        </Badge>
                      </td>
                      <td className="text-text-muted hidden px-6 py-4 lg:table-cell">
                        {user.lastSeenAt ? (
                          <time dateTime={user.lastSeenAt}>
                            {new Date(user.lastSeenAt).toLocaleDateString('pt-BR')}
                          </time>
                        ) : (
                          <span className="text-text-subtle">Nunca</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.active ? 'success' : 'warning'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/usuarios/${user.id}`}
                            aria-label={`Ver detalhes de ${user.name}`}
                            className="text-text-muted hover:text-text hover:bg-surface-muted inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Editar
                          </Link>
                          <UserToggleButton
                            id={user.id}
                            name={user.name}
                            active={user.active}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-text-muted text-sm">
                Página {page} de {pageCount}
              </p>
              <div className="flex gap-2">
                {hasPrev ? (
                  <Link
                    href={buildUrl(page - 1)}
                    aria-label="Página anterior"
                    className="border-border bg-surface hover:bg-surface-muted inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Anterior
                  </Link>
                ) : (
                  <span className="border-border bg-surface inline-flex min-h-9 cursor-not-allowed items-center gap-1 rounded-md border px-3 text-sm font-medium opacity-50">
                    <ChevronLeft className="size-4" aria-hidden />
                    Anterior
                  </span>
                )}
                {hasNext ? (
                  <Link
                    href={buildUrl(page + 1)}
                    aria-label="Próxima página"
                    className="border-border bg-surface hover:bg-surface-muted inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors"
                  >
                    Próxima
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                ) : (
                  <span className="border-border bg-surface inline-flex min-h-9 cursor-not-allowed items-center gap-1 rounded-md border px-3 text-sm font-medium opacity-50">
                    Próxima
                    <ChevronRight className="size-4" aria-hidden />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
