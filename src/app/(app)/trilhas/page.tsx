import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { requireUser } from '@/lib/auth/guards'
import { getUserPaths } from '@/features/learning/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { PathTabsNav } from './tabs-nav'
import type { UserPath, PathStatus } from '@/features/learning/queries'

export const metadata: Metadata = { title: 'Trilhas — Help Academy' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PathStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
}

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'muted' | 'xp' | 'required' | 'brand'

const STATUS_VARIANT: Record<PathStatus, BadgeVariant> = {
  not_started: 'muted',
  in_progress: 'warning',
  completed: 'success',
}

const EMPTY_MESSAGES: Record<string, { title: string; description: string }> = {
  em_andamento: {
    title: 'Nenhuma trilha em andamento',
    description: 'Você ainda não iniciou nenhuma trilha. Escolha uma trilha e comece agora!',
  },
  concluidas: {
    title: 'Nenhuma trilha concluída',
    description: 'Você ainda não concluiu nenhuma trilha. Continue avançando!',
  },
  nao_iniciadas: {
    title: 'Nenhuma trilha pendente',
    description: 'Parabéns! Você iniciou todas as trilhas atribuídas ao seu perfil.',
  },
  todas: {
    title: 'Nenhuma trilha atribuída',
    description:
      'Você ainda não possui trilhas de aprendizado atribuídas ao seu perfil. Fale com o seu gestor.',
  },
}

// ─── Path card ────────────────────────────────────────────────────────────────

function PathCard({ path }: { path: UserPath }) {
  return (
    <Link href={`/trilhas/${path.slug}`} className="block focus:outline-none">
      <Card interactive className="flex h-full flex-col gap-3 p-4">
        {path.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={path.coverUrl}
            alt=""
            aria-hidden
            className="h-32 w-full rounded-lg object-cover"
          />
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-h3 font-semibold leading-snug">{path.title}</h3>
          <Badge variant={STATUS_VARIANT[path.status]} className="shrink-0">
            {STATUS_LABEL[path.status]}
          </Badge>
        </div>
        {path.description && (
          <p className="line-clamp-2 text-sm text-text-muted">{path.description}</p>
        )}
        <div className="mt-auto">
          <ProgressBar
            value={path.percent}
            label={`${path.requiredDone} de ${path.requiredTotal} aulas obrigatórias`}
            showValue
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-text-subtle">
          {path.required && <Badge variant="required">Obrigatória</Badge>}
          {path.sequential && <span>Sequencial</span>}
        </div>
      </Card>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'todas' | 'em_andamento' | 'concluidas' | 'nao_iniciadas'

const STATUS_FILTER_MAP: Record<StatusFilter, PathStatus | null> = {
  todas: null,
  em_andamento: 'in_progress',
  concluidas: 'completed',
  nao_iniciadas: 'not_started',
}

export default async function TrilhasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await requireUser()
  const params = await searchParams
  const rawStatus = params.status ?? 'todas'
  const activeFilter: StatusFilter =
    rawStatus in STATUS_FILTER_MAP ? (rawStatus as StatusFilter) : 'todas'

  const paths = await getUserPaths(user.id)

  const filterStatus = STATUS_FILTER_MAP[activeFilter]
  const filtered = filterStatus === null ? paths : paths.filter((p) => p.status === filterStatus)

  const emptyMsg = EMPTY_MESSAGES[activeFilter] ?? EMPTY_MESSAGES['todas']!

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header>
        <h1 className="text-h1 font-bold">Minhas Trilhas</h1>
        <p className="mt-1 text-sm text-text-muted">
          Acompanhe seu progresso em cada trilha de aprendizado.
        </p>
      </header>

      <section aria-label="Trilhas de aprendizado">
        <PathTabsNav />

        <div className="mt-6" role="tabpanel">
          {filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={emptyMsg.title}
              description={emptyMsg.description}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Lista de trilhas">
              {filtered.map((path) => (
                <li key={path.id}>
                  <PathCard path={path} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
