import type { Metadata } from 'next'
import { Lock } from 'lucide-react'
import { requireUser } from '@/lib/auth/guards'
import { getUserAchievements } from '@/features/gamification/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AchievementIcon } from '@/components/gamification/achievement-icon'

export const metadata: Metadata = { title: 'Conquistas — Help Academy' }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConquistasPage() {
  const user = await requireUser()
  const achievements = await getUserAchievements(user.id)

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Header */}
      <section aria-label="Cabeçalho de conquistas">
        <h1 className="text-h1 font-bold">Conquistas</h1>
        <p className="mt-1 text-sm text-text-muted">
          {unlockedCount === 0
            ? 'Complete aulas e trilhas para desbloquear conquistas.'
            : `${unlockedCount} de ${achievements.length} conquistas desbloqueadas.`}
        </p>
      </section>

      {/* Grid */}
      <ul
        className="grid gap-4 sm:grid-cols-2"
        aria-label="Lista de conquistas"
      >
        {achievements.map((ach) => (
          <li key={ach.id}>
            <Card
              className={`flex items-start gap-4 p-5 transition-opacity ${
                ach.unlocked ? '' : 'opacity-60'
              }`}
            >
              {/* Icon area */}
              <div className="relative shrink-0">
                <div
                  className={`flex size-12 items-center justify-center rounded-full ${
                    ach.unlocked
                      ? 'bg-brand text-on-brand'
                      : 'bg-surface-muted text-text-subtle'
                  }`}
                  aria-hidden
                >
                  <AchievementIcon iconName={ach.icon} className="size-6" />
                </div>
                {!ach.unlocked && (
                  <span
                    className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface border border-border"
                    aria-hidden
                  >
                    <Lock className="size-3 text-text-subtle" />
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`font-semibold leading-snug ${
                      ach.unlocked ? 'text-text' : 'text-text-muted'
                    }`}
                  >
                    {ach.name}
                  </p>
                  {ach.unlocked && (
                    <Badge variant="success" className="shrink-0">
                      Desbloqueada
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-text-muted">{ach.description}</p>
                {ach.unlocked && ach.earnedAt && (
                  <p className="mt-1.5 text-xs text-text-subtle">
                    Desbloqueada em{' '}
                    {new Date(ach.earnedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
