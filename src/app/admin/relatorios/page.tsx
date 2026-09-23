import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import {
  adminGetReport,
  adminGetAllPathsForFilter,
  adminGetAllDepartmentsForFilter,
  type ReportStatus,
} from '@/features/admin/reports/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ReportFilters } from './report-filters'
import { BarChart3, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Relatórios — Admin — Help Academy' }

const PAGE_SIZE = 20

const STATUS_LABELS: Record<ReportStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
}

const STATUS_BADGE_VARIANT: Record<ReportStatus, 'neutral' | 'success' | 'warning'> = {
  not_started: 'neutral',
  in_progress: 'warning',
  completed: 'success',
}

interface Props {
  searchParams: Promise<{
    departmentId?: string
    pathId?: string
    status?: string
    page?: string
  }>
}

function buildCsvUrl(params: {
  departmentId?: string
  pathId?: string
  status?: string
}): string {
  const sp = new URLSearchParams()
  if (params.departmentId) sp.set('departmentId', params.departmentId)
  if (params.pathId) sp.set('pathId', params.pathId)
  if (params.status) sp.set('status', params.status)
  const qs = sp.toString()
  return `/api/admin/relatorios/csv${qs ? `?${qs}` : ''}`
}

function buildPageUrl(
  page: number,
  params: { departmentId?: string; pathId?: string; status?: string },
): string {
  const sp = new URLSearchParams()
  if (params.departmentId) sp.set('departmentId', params.departmentId)
  if (params.pathId) sp.set('pathId', params.pathId)
  if (params.status) sp.set('status', params.status)
  if (page > 1) sp.set('page', String(page))
  const qs = sp.toString()
  return `/admin/relatorios${qs ? `?${qs}` : ''}`
}

export default async function AdminRelatoriosPage({ searchParams }: Props) {
  await requireAdmin()

  const params = await searchParams
  const departmentId = params.departmentId ?? ''
  const pathId = params.pathId ?? ''
  const rawStatus = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const validStatuses: ReportStatus[] = ['not_started', 'in_progress', 'completed']
  const status = validStatuses.includes(rawStatus as ReportStatus)
    ? (rawStatus as ReportStatus)
    : undefined

  const [{ rows, total }, departments, paths] = await Promise.all([
    adminGetReport({
      departmentId: departmentId || undefined,
      pathId: pathId || undefined,
      status,
      page,
      pageSize: PAGE_SIZE,
    }),
    adminGetAllDepartmentsForFilter(),
    adminGetAllPathsForFilter(),
  ])

  const pageCount = Math.ceil(total / PAGE_SIZE)
  const hasPrev = page > 1
  const hasNext = page < pageCount

  const filterParams = {
    departmentId: departmentId || undefined,
    pathId: pathId || undefined,
    status: rawStatus || undefined,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold">Relatórios</h1>
          <p className="text-text-muted mt-1 text-sm">
            Progresso por usuário e trilha —{' '}
            <span>
              {total} {total === 1 ? 'registro encontrado' : 'registros encontrados'}
            </span>
          </p>
        </div>
        <a
          href={buildCsvUrl(filterParams)}
          download
          className="border-border bg-surface text-text hover:bg-surface-muted inline-flex min-h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors"
        >
          <Download className="size-4" aria-hidden />
          Exportar CSV
        </a>
      </div>

      {/* Filters */}
      <Suspense>
        <ReportFilters
          departments={departments}
          paths={paths}
          currentDepartmentId={departmentId}
          currentPathId={pathId}
          currentStatus={rawStatus}
        />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhum registro encontrado"
          description="Nenhum usuário está matriculado em trilhas com os filtros selecionados."
        />
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-text-muted px-4 py-3 text-left font-medium">Usuário</th>
                    <th className="text-text-muted hidden px-4 py-3 text-left font-medium md:table-cell">
                      Área
                    </th>
                    <th className="text-text-muted hidden px-4 py-3 text-left font-medium lg:table-cell">
                      Trilha
                    </th>
                    <th className="text-text-muted px-4 py-3 text-right font-medium">% Concluído</th>
                    <th className="text-text-muted hidden px-4 py-3 text-right font-medium sm:table-cell">
                      Aulas
                    </th>
                    <th className="text-text-muted hidden px-4 py-3 text-right font-medium xl:table-cell">
                      Média Quiz
                    </th>
                    <th className="text-text-muted hidden px-4 py-3 text-left font-medium xl:table-cell">
                      Último acesso
                    </th>
                    <th className="text-text-muted px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.userId}-${row.pathSlug}-${idx}`}
                      className="hover:bg-surface-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.userName}</div>
                        <div className="text-text-muted text-xs">{row.email}</div>
                      </td>
                      <td className="text-text-muted hidden px-4 py-3 md:table-cell">
                        {row.department}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="font-medium">{row.pathTitle}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {row.percentComplete}%
                      </td>
                      <td className="text-text-muted hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                        {row.lessonsCompleted}/{row.totalLessons}
                      </td>
                      <td className="text-text-muted hidden px-4 py-3 text-right tabular-nums xl:table-cell">
                        {row.quizAvgScore !== null ? `${row.quizAvgScore}%` : '—'}
                      </td>
                      <td className="text-text-muted hidden px-4 py-3 xl:table-cell">
                        {row.lastAccess ? (
                          <time dateTime={row.lastAccess}>
                            {new Date(row.lastAccess).toLocaleDateString('pt-BR')}
                          </time>
                        ) : (
                          <span className="text-text-subtle">Nunca</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                          {STATUS_LABELS[row.status]}
                        </Badge>
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
                Página {page} de {pageCount} ({total} registros)
              </p>
              <div className="flex gap-2">
                {hasPrev ? (
                  <Link
                    href={buildPageUrl(page - 1, filterParams)}
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
                    href={buildPageUrl(page + 1, filterParams)}
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
