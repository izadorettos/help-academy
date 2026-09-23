'use client'

import { useActionState, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { completeLesson } from '@/features/learning/actions'
import type { ActionResult, UnlockedAchievement } from '@/features/learning/actions'
import { RewardToast } from '@/components/gamification/reward-toast'
import { AchievementToast } from '@/components/gamification/achievement-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompleteButtonProps {
  lessonId: string
  isCompleted: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

const initialState: ActionResult | null = null

export function CompleteButton({ lessonId, isCompleted }: CompleteButtonProps) {
  const [xpEarned, setXpEarned] = useState(0)
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([])

  const [state, dispatch, isPending] = useActionState(
    async (_prev: ActionResult | null) => {
      const result = await completeLesson(lessonId)
      if (result.ok) {
        if (result.xpEarned > 0) setXpEarned(result.xpEarned)
        if (result.achievementsUnlocked.length > 0) setAchievements(result.achievementsUnlocked)
      }
      return result
    },
    initialState,
  )

  // Success state: either prop says already completed, or action returned ok
  const completed = isCompleted || (state?.ok === true)

  if (completed) {
    return (
      <>
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-5 py-2.5 text-sm font-semibold text-success"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Aula concluída
        </div>
        <RewardToast xpEarned={xpEarned} onDismiss={() => setXpEarned(0)} />
        <AchievementToast achievements={achievements} onDismiss={() => setAchievements([])} />
      </>
    )
  }

  const errorMessage = state?.ok === false ? state.error : null

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <form action={dispatch}>
          <button
            type="submit"
            disabled={isPending}
            aria-disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Concluindo…
              </>
            ) : (
              'Concluir aula'
            )}
          </button>
        </form>

        {errorMessage && (
          <p role="alert" className="text-xs text-error">
            {errorMessage}
          </p>
        )}
      </div>
      <RewardToast xpEarned={xpEarned} onDismiss={() => setXpEarned(0)} />
      <AchievementToast achievements={achievements} onDismiss={() => setAchievements([])} />
    </>
  )
}
