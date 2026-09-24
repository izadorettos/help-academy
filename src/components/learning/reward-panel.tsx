'use client'

import Link from 'next/link'
import { CheckCircle2, Star, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { AchievementIcon } from '@/components/gamification/achievement-icon'
import type { UnlockedAchievement } from '@/features/learning/actions'

interface RewardPanelProps {
  xpEarned: number
  achievements: UnlockedAchievement[]
  nextLessonId: string | null
  pathSlug: string
  message?: string
}

/**
 * Painel não-modal exibido após concluir uma atividade.
 * Mostra XP, conquistas desbloqueadas e call-to-action para a próxima aula
 * (ou voltar para a trilha se não houver próxima).
 */
export function RewardPanel({
  xpEarned,
  achievements,
  nextLessonId,
  pathSlug,
  message = 'Atividade concluída!',
}: RewardPanelProps) {
  return (
    <Card
      className="p-5 space-y-4 border-success/30 bg-success-soft"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success text-on-brand">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-success">{message}</p>
          {xpEarned > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-xp">
              <Star className="size-3.5 fill-current" aria-hidden />
              +{xpEarned} XP
            </p>
          )}
        </div>
      </div>

      {achievements.length > 0 && (
        <div className="space-y-2 border-t border-success/20 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success/80">
            Novas conquistas
          </p>
          <ul className="space-y-1.5">
            {achievements.map((ach) => (
              <li key={ach.id} className="flex items-center gap-2 text-sm">
                <AchievementIcon iconName={ach.icon} className="size-4 text-xp" />
                <span className="font-medium">{ach.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end border-t border-success/20 pt-3">
        {nextLessonId ? (
          <Link
            href={`/aula/${nextLessonId}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-focus"
          >
            Próxima atividade
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <Link
            href={`/trilhas/${pathSlug}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus"
          >
            Voltar para a trilha
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </Card>
  )
}
