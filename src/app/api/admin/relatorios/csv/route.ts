import { requireAdmin } from '@/lib/auth/guards'
import { adminGetReport, type ReportStatus, type ReportRow } from '@/features/admin/reports/queries'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

const CSV_HEADERS = [
  'Nome',
  'Email',
  'Área',
  'Trilha',
  '% Concluído',
  'Aulas Concluídas',
  'Total Aulas',
  'Média Quiz',
  'Último Acesso',
  'Status',
]

const STATUS_PT: Record<ReportStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in quotes if contains semicolon, quote, or newline
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowToCsvLine(row: ReportRow): string {
  const lastAccess = row.lastAccess ? new Date(row.lastAccess).toLocaleDateString('pt-BR') : ''

  const fields = [
    row.userName,
    row.email,
    row.department,
    row.pathTitle,
    String(row.percentComplete),
    String(row.lessonsCompleted),
    String(row.totalLessons),
    row.quizAvgScore !== null ? String(row.quizAvgScore) : '',
    lastAccess,
    STATUS_PT[row.status],
  ]

  return fields.map(escapeCsvField).join(';')
}

export async function GET(request: Request) {
  // Authorization: admin only — requireAdmin throws Next.js redirect/notFound for auth failures.
  // Re-throw those special errors so Next.js handles them; catch nothing else here.
  try {
    await requireAdmin()
  } catch (err) {
    // Always re-throw special Next.js navigation errors
    if (isRedirectError(err)) throw err
    // notFound() also throws a special error — check by digest
    if (err instanceof Error && 'digest' in err) throw err
    return new Response('Acesso não autorizado.', { status: 403 })
  }

  const url = new URL(request.url)
  const departmentId = url.searchParams.get('departmentId') ?? undefined
  const pathId = url.searchParams.get('pathId') ?? undefined
  const rawStatus = url.searchParams.get('status') ?? undefined

  const validStatuses: ReportStatus[] = ['not_started', 'in_progress', 'completed']
  const status =
    rawStatus && validStatuses.includes(rawStatus as ReportStatus)
      ? (rawStatus as ReportStatus)
      : undefined

  const { rows } = await adminGetReport({
    departmentId,
    pathId,
    status,
    page: 1,
    pageSize: 10_000,
  })

  // Build CSV
  const today = new Date().toISOString().slice(0, 10)
  const filename = `relatorio-academy-${today}.csv`

  const lines = [CSV_HEADERS.join(';'), ...rows.map(rowToCsvLine)]

  // UTF-8 BOM + lines joined with CRLF
  const BOM = '﻿'
  const csvContent = BOM + lines.join('\r\n')

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
