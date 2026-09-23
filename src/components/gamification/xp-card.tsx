import { Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XpCardProps {
  totalXp: number
  level: number
  levelName: string
  levelMinXp: number
  nextLevelMinXp: number | null
  className?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeProgress(
  totalXp: number,
  levelMinXp: number,
  nextLevelMinXp: number | null,
): { progressPercent: number; xpInLevel: number; xpForNextLevel: number | null } {
  if (nextLevelMinXp === null) {
    return { progressPercent: 100, xpInLevel: totalXp - levelMinXp, xpForNextLevel: null }
  }
  const range = nextLevelMinXp - levelMinXp
  const done = totalXp - levelMinXp
  const progressPercent = range > 0 ? Math.min(100, Math.floor((done / range) * 100)) : 100
  return {
    progressPercent,
    xpInLevel: done,
    xpForNextLevel: nextLevelMinXp - totalXp,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function XpCard({
  totalXp,
  level,
  levelName,
  levelMinXp,
  nextLevelMinXp,
  className = '',
}: XpCardProps) {
  const { progressPercent, xpInLevel, xpForNextLevel } = computeProgress(
    totalXp,
    levelMinXp,
    nextLevelMinXp,
  )

  return (
    <Card className={`p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-xp-soft text-xp"
          aria-hidden
        >
          <Star className="size-5 fill-current" />
        </div>
        <div>
          <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
            Nível {level}
          </p>
          <p className="text-lg font-bold leading-tight">{levelName}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-xp">{totalXp}</p>
          <p className="text-xs text-text-muted">XP total</p>
        </div>
      </div>

      <div>
        <ProgressBar
          value={progressPercent}
          label={
            xpForNextLevel !== null
              ? `Faltam ${xpForNextLevel} XP para o próximo nível`
              : 'Nível máximo atingido'
          }
          showValue
        />
        {xpForNextLevel !== null && nextLevelMinXp !== null && (
          <p className="mt-1 text-xs text-text-subtle">
            {xpInLevel} / {nextLevelMinXp - levelMinXp} XP neste nível
          </p>
        )}
      </div>
    </Card>
  )
}
