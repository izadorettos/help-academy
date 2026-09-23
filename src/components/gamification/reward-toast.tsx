'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RewardToastProps {
  xpEarned: number
  onDismiss?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Client component that briefly displays an XP reward notification.
 * Auto-dismisses after 3 seconds. Renders nothing when xpEarned = 0.
 *
 * Usage after completeLesson / submitQuiz returns xpEarned > 0:
 *   <RewardToast xpEarned={result.xpEarned} onDismiss={() => setXpEarned(0)} />
 */
export function RewardToast({ xpEarned, onDismiss }: RewardToastProps) {
  // Track which xpEarned value we already showed to avoid duplicate dismissals
  const shownRef = useRef(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Only react to a new, positive xpEarned that we haven't shown yet
    if (xpEarned <= 0 || xpEarned === shownRef.current) return

    shownRef.current = xpEarned
    setDismissed(false)

    const timer = setTimeout(() => {
      setDismissed(true)
      onDismiss?.()
    }, 3000)

    return () => clearTimeout(timer)
  }, [xpEarned, onDismiss])

  if (xpEarned <= 0 || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-xp/30 bg-xp-soft px-4 py-3 shadow-pop animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-xp text-on-brand"
        aria-hidden
      >
        <Star className="size-4 fill-current" />
      </span>
      <div>
        <p className="text-sm font-bold text-xp">+{xpEarned} XP</p>
        <p className="text-xs text-xp/70">XP ganho!</p>
      </div>
    </div>
  )
}
