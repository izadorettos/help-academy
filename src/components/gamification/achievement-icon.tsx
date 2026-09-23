import {
  BookOpen,
  Layers,
  Target,
  TrendingUp,
  Award,
  Trophy,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

// ─── Icon map ─────────────────────────────────────────────────────────────────

// Maps achievement icon names (stored in DB) to Lucide components.
// Add new entries here when new achievement icons are introduced.
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  'book-open':   BookOpen,
  'layers':      Layers,
  'target':      Target,
  'trending-up': TrendingUp,
  'award':       Award,
  'trophy':      Trophy,
}

const DEFAULT_ICON = Trophy

// ─── Component ────────────────────────────────────────────────────────────────

interface AchievementIconProps extends LucideProps {
  iconName: string
}

/**
 * Renders a Lucide icon by its kebab-case name as stored in achievements.icon.
 * Falls back to Trophy if the name is not recognised.
 */
export function AchievementIcon({ iconName, ...props }: AchievementIconProps) {
  const Icon = ICON_MAP[iconName] ?? DEFAULT_ICON
  return <Icon {...props} />
}
