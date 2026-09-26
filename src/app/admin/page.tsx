import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import {
  adminGetDashboardMetrics,
  adminGetTopUsers,
  adminGetLowCompletionPaths,
} from '@/features/admin/dashboard/queries'
import { getAdminTutorialStats } from '@/features/help/queries'
import { Card } from '@/components/ui/card'
import { Users, BookOpen, CheckCircle, TrendingDown, LifeBuoy, Clock, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/components/help/tutorial-card'

export const metadata: Metadata = { title: 'Painel Admin — Help Academy' }

export default async function AdminPage() {
  const user = await requireAdmin()
  const [metrics, topUsers, lowPaths, tutorialStats] = await Promise.all([
    adminGetDashboardMetrics(),
    adminGetTopUsers(5),
    adminGetLowCompletionPaths(5),
    getAdminTutorialStats(),
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

      {/* Central de Ajuda block */}
      <section aria-label="Central de Ajuda">
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-semibold flex items-center gap-2">
              <LifeBuoy className="size-5 text-brand" aria-hidden />
              Central de Ajuda
            </h2>
            <Link
              href="/admin/tutoriais"
              className="text-sm font-medium text-brand hover:underline underline-offset-2"
            >
              Gerenciar tutoriais →
            </Link>
          </div>

          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-surface-muted p-4 space-y-1">
              <p className="text-xs text-text-muted font-medium">Publicados</p>
              <p className="text-2xl font-bold">{tutorialStats.totalPublished}</p>
            </div>
            <div className="rounded-lg bg-surface-muted p-4 space-y-1">
              <p className="text-xs flex items-center gap-1 text-text-muted font-medium">
                <Clock className="size-3" aria-hidden />
                Últimos 60 dias
              </p>
              <p className="text-2xl font-bold">{tutorialStats.updatedLast60d}</p>
            </div>
            <div className="rounded-lg bg-surface-muted p-4 space-y-1">
              <p className="text-xs flex items-center gap-1 text-text-muted font-medium">
                <AlertTriangle className="size-3" aria-hidden />
                Precisam atenção
              </p>
              <p className={`text-2xl font-bold ${tutorialStats.needsAttention > 0 ? 'text-warning' : ''}`}>
                {tutorialStats.needsAttention}
              </p>
            </div>
            {tutorialStats.byAudience.length > 0 && (
              <div className="rounded-lg bg-surface-muted p-4 space-y-2">
                <p className="text-xs text-text-muted font-medium">Por público</p>
                {tutorialStats.byAudience.map((a) => (
                  <div key={a.slug} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="truncate text-text-muted">{a.name}</span>
                        <span className="font-mono font-semibold shrink-0 ml-1">{a.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{
                            width: tutorialStats.totalPublished > 0
                              ? `${Math.round((a.count / tutorialStats.totalPublished) * 100)}%`
                              : '0%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently updated list */}
          {tutorialStats.recentlyUpdated.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle mb-2">
                Últimos atualizados
              </p>
              <ol className="space-y-2">
                {tutorialStats.recentlyUpdated.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm truncate">{t.title}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-text-subtle">
                        {formatDate(t.last_content_update)}
                      </span>
                      <Link
                        href={`/admin/tutoriais/${t.id}/editar`}
                        className="text-xs font-medium text-brand hover:underline underline-offset-2"
                      >
                        Editar
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>
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
