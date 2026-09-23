import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  position: number
}

export interface UserAchievement extends Achievement {
  unlocked: boolean
  earnedAt: string | null
}

export interface RecentAchievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  earnedAt: string
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns ALL active achievements joined with the user's unlock status.
 * Locked achievements have unlocked=false and earnedAt=null.
 * Ordered by position ascending.
 *
 * RLS on achievements: all authenticated users can SELECT.
 * RLS on user_achievements: member can SELECT own rows.
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const supabase = await createServerClient()

  // Fetch all active achievements
  const { data: achievements, error: achError } = await supabase
    .from('achievements')
    .select('id, code, name, description, icon, position')
    .eq('active', true)
    .order('position', { ascending: true })

  if (achError || !achievements) return []

  // Fetch user's unlocked achievements
  const { data: userAchs } = await supabase
    .from('user_achievements')
    .select('achievement_id, earned_at')
    .eq('user_id', userId)

  const earnedMap = new Map<string, string>(
    (userAchs ?? []).map((ua) => [ua.achievement_id, ua.earned_at]),
  )

  return achievements.map((a) => ({
    id: String(a.id),
    code: String(a.code),
    name: String(a.name),
    description: String(a.description),
    icon: String(a.icon),
    position: Number(a.position),
    unlocked: earnedMap.has(a.id),
    earnedAt: earnedMap.get(a.id) ?? null,
  }))
}

/**
 * Returns the N most recently unlocked achievements for a user.
 * Used in the dashboard to show recent conquistas.
 */
export async function getRecentAchievements(
  userId: string,
  limit = 3,
): Promise<RecentAchievement[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('user_achievements')
    .select(
      `earned_at,
       achievements!inner(id, code, name, description, icon)`,
    )
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return (
    data as Array<{
      earned_at: string
      achievements: {
        id: string
        code: string
        name: string
        description: string
        icon: string
      }
    }>
  ).map((row) => ({
    id: String(row.achievements.id),
    code: String(row.achievements.code),
    name: String(row.achievements.name),
    description: String(row.achievements.description),
    icon: String(row.achievements.icon),
    earnedAt: String(row.earned_at),
  }))
}
