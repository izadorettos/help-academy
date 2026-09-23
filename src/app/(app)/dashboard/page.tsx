import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, LayoutDashboard, Play } from 'lucide-react'
import { requireUser } from '@/lib/auth/guards'
import { getUserPaths, getOverallProgress, getLastStartedLesson } from '@/features/learning/queries'
import { getProfile } from '@/features/profile/queries'
import { getRecentAchievements } from '@/features/gamification/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { ProgressRing } from '@/components/ui/progress-ring'
import { EmptyState } from '@/components/ui/empty-state'
import { LevelBadge } from '@/components/gamification/level-badge'
import { AchievementIcon } from '@/components/gamification/achievement-icon'
import type { PathStatus, UserPath } from '@/features/learning/queries'
import type { RecentAchievement } from '@/features/gamification/queries'

export const metadata: Metadata = { title: 'Dashboard — Help Academy' }

// ─── Status badge helpers ─────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function PathCard({ path }: { path: UserPath }) {
  return (
    <Link href={`/trilhas/${path.slug}`} className="block focus:outline-none">
      <Card
        interactive
        className="flex h-full flex-col p-4 gap-3"
      >
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
          <p className="text-text-muted line-clamp-2 text-sm">{path.description}</p>
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

// ─── Recent achievements sub-component ───────────────────────────────────────

function RecentAchievementCard({ achievement }: { achievement: RecentAchievement }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand"
        aria-hidden
      >
        <AchievementIcon iconName={achievement.icon} className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug truncate">{achievement.name}</p>
        <p className="text-xs text-text-subtle truncate">
          {new Date(achievement.earnedAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
          })}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await requireUser()

  const [paths, overall, lastLesson, profile, recentAchievements] = await Promise.all([
    getUserPaths(user.id),
    getOverallProgress(user.id),
    getLastStartedLesson(user.id),
    getProfile(user.id),
    getRecentAchievements(user.id, 3),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      {/* ── Greeting ── */}
      <section aria-label="Boas-vindas">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h1 font-bold">
            Olá, {user.name.split(' ')[0]}!
          </h1>
          {profile && (
            <LevelBadge
              level={profile.level.level}
              levelName={profile.level.name}
            />
          )}
        </div>
        <p className="text-text-muted text-sm mt-1">
          {profile && profile.totalXp > 0
            ? `${profile.totalXp} XP acumulados • Bem-vindo de volta à Help Academy.`
            : 'Bem-vindo de volta à Help Academy.'}
        </p>
        {user.role === 'admin' && (
          <Link
            href="/admin"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline underline-offset-2"
          >
            <LayoutDashboard className="size-4" aria-hidden />
            Ir para o painel administrativo
          </Link>
        )}
      </section>

      {/* ── Overall progress ── */}
      <section aria-label="Progresso geral do onboarding">
        <Card className="p-5 flex items-center gap-6">
          <ProgressRing
            value={overall.percent}
            size={96}
            strokeWidth={10}
            label="Progresso geral do onboarding"
          />
          <div className="min-w-0">
            <p className="text-h3 font-semibold">Progresso do onboarding</p>
            <p className="text-text-muted text-sm mt-1">
              {overall.requiredDone} de {overall.requiredTotal} aulas obrigatórias concluídas
            </p>
            {overall.percent === 100 && (
              <Badge variant="success" className="mt-2">
                Onboarding concluído!
              </Badge>
            )}
          </div>
        </Card>
      </section>

      {/* ── Recent achievements ── */}
      {recentAchievements.length > 0 && (
        <section aria-label="Conquistas recentes">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h3 font-semibold">Conquistas recentes</h2>
            <Link
              href="/conquistas"
              className="text-sm font-medium text-brand hover:underline underline-offset-2"
            >
              Ver todas
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3" aria-label="Lista de conquistas recentes">
            {recentAchievements.map((ach) => (
              <li key={ach.id}>
                <RecentAchievementCard achievement={ach} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Continue where you left off ── */}
      {lastLesson && (
        <section aria-label="Continue de onde parou">
          <h2 className="text-h3 font-semibold mb-3">Continue de onde parou</h2>
          <Link href={`/aula/${lastLesson.lessonId}`} className="block focus:outline-none">
            <Card interactive className="p-4 flex items-center gap-4">
              <div className="bg-brand-soft text-brand rounded-full p-3 shrink-0">
                <Play className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug truncate">{lastLesson.lessonTitle}</p>
                <p className="text-text-muted text-xs mt-0.5 truncate">
                  {lastLesson.pathTitle} › {lastLesson.moduleTitle}
                </p>
                {lastLesson.estimatedMinutes != null && lastLesson.estimatedMinutes > 0 && (
                  <p className="text-text-subtle text-xs mt-0.5">
                    {lastLesson.estimatedMinutes} min
                  </p>
                )}
              </div>
              <span
                className="text-brand text-sm font-medium shrink-0 hidden sm:block"
                aria-hidden
              >
                Continuar →
              </span>
            </Card>
          </Link>
        </section>
      )}

      {/* ── My paths ── */}
      <section aria-label="Minhas trilhas">
        <h2 className="text-h3 font-semibold mb-3">Minhas trilhas</h2>
        {paths.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma trilha atribuída"
            description="Você ainda não possui trilhas de aprendizado atribuídas ao seu perfil. Fale com o seu gestor."
          />
        ) : (
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Lista de trilhas"
          >
            {paths.map((path) => (
              <li key={path.id}>
                <PathCard path={path} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
