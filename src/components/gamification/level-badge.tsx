import { Star } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LevelBadgeProps {
  level: number
  levelName: string
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Small inline badge showing the user's current level number and name.
 * Example: "Nível 2 · Aprendiz"
 */
export function LevelBadge({ level, levelName, className = '' }: LevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-2.5 py-0.5 text-xs font-semibold text-xp ${className}`}
      aria-label={`Nível ${level}: ${levelName}`}
    >
      <Star className="size-3 fill-current" aria-hidden />
      Nível {level}
      <span className="text-xp/70" aria-hidden>·</span>
      {levelName}
    </span>
  )
}
