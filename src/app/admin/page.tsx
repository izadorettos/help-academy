import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import {
  adminGetDashboardMetrics,
  adminGetTopUsers,
  adminGetLowCompletionPaths,
} from '@/features/admin/dashboard/queries'
import { Card } from '@/components/ui/card'
import { Users, BookOpen, CheckCircle, TrendingDown } from 'lucide-react'

export const metadata: Metadata = { title: 'Painel Admin — Help Academy' }

export default async function AdminPage() {
  const user = await requireAdmin()
  const [metrics, topUsers, lowPaths] = await Promise.all([
    adminGetDashboardMetrics(),
    adminGetTopUsers(5),
    adminGetLowCompletionPaths(5),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h1 font-bold">Painel Admin</h1>
        <p className="text-text-muted mt-1 text-sm">Bem-vindo, {user.name}.</p>
      </div>

      {/* Metric cards */}
      <section aria-label="Métricas gerais">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Users className="size-5" aria-hidden />}
            label="Usuários ativos"
            value={metrics.activeUsersCount}
          />
          <MetricCard
            icon={<BookOpen className="size-5" aria-hidden />}
            label="Trilhas publicadas"
            value={metrics.publishedPathsCount}
          />
          <MetricCard
            icon={<CheckCircle className="size-5" aria-hidden />}
            label="Conclusões hoje"
            value={metrics.lessonCompletionsToday}
          />
          <MetricCard
            icon={<CheckCircle className="size-5 text-brand" aria-hidden />}
            label="Conclusões total"
            value={metrics.lessonCompletionsAllTime}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 5 users by XP */}
        <section aria-label="Usuários mais ativos">
          <Card className="p-6">
            <h2 className="text-h3 mb-4 font-semibold">Top 5 — Usuários mais ativos (XP)</h2>
            {topUsers.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhum dado disponível.</p>
            ) : (
              <ol className="space-y-3">
                {topUsers.map((u, idx) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <span className="text-text-subtle w-5 text-right text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="text-text-muted truncate text-xs">
                        {u.departmentName ?? '—'}
                      </p>
                    </div>
                    <span className="text-brand shrink-0 text-sm font-semibold">
                      {u.totalXp.toLocaleString('pt-BR')} XP
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </section>

        {/* Bottom 5 paths by completion */}
        <section aria-label="Trilhas com menor conclusão">
          <Card className="p-6">
            <h2 className="text-h3 mb-4 flex items-center gap-2 font-semibold">
              <TrendingDown className="size-5 text-danger" aria-hidden />
              Trilhas com menor conclusão
            </h2>
            {lowPaths.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhuma trilha publicada.</p>
            ) : (
              <ol className="space-y-3">
                {lowPaths.map((path, idx) => (
                  <li key={path.id} className="flex items-center gap-3">
                    <span className="text-text-subtle w-5 text-right text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{path.title}</p>
                      <p className="text-text-muted truncate text-xs">
                        {path.enrolledCount === 0
                          ? 'Sem inscritos'
                          : `${path.enrolledCount} inscrito${path.enrolledCount !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        path.avgCompletion < 30
                          ? 'text-danger'
                          : path.avgCompletion < 60
                            ? 'text-warning'
                            : 'text-success'
                      }`}
                    >
                      {path.avgCompletion}%
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <Card className="p-5">
      <div className="text-text-muted mb-2 flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="text-h1 font-bold">{value.toLocaleString('pt-BR')}</p>
    </Card>
  )
}
