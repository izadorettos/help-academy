'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnlockedAchievement {
  id: string
  code: string
  name: string
  icon: string
}

interface AchievementToastProps {
  achievements: UnlockedAchievement[]
  onDismiss?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Client component that briefly displays achievement unlock notifications.
 * Shows the first unshown achievement; auto-dismisses after 4 seconds.
 * Renders nothing when achievements array is empty.
 *
 * Usage after completeLesson / submitQuiz returns achievementsUnlocked:
 *   <AchievementToast achievements={result.achievementsUnlocked} onDismiss={() => setAchievements([])} />
 */
export function AchievementToast({ achievements, onDismiss }: AchievementToastProps) {
  const shownIdRef = useRef<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const current = achievements[0]

  useEffect(() => {
    if (!current || current.id === shownIdRef.current) return

    shownIdRef.current = current.id
    setDismissed(false)

    const timer = setTimeout(() => {
      setDismissed(true)
      onDismiss?.()
    }, 4000)

    return () => clearTimeout(timer)
  }, [current, onDismiss])

  if (!current || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 shadow-pop animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand"
        aria-hidden
      >
        <Trophy className="size-4 fill-current" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Conquista desbloqueada!
        </p>
        <p className="text-sm font-bold text-text">{current.name}</p>
      </div>
    </div>
  )
}
