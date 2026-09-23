import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export interface DashboardMetrics {
  activeUsersCount: number
  publishedPathsCount: number
  lessonCompletionsToday: number
  lessonCompletionsAllTime: number
}

export interface TopUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  totalXp: number
  departmentName: string | null
}

export interface LowCompletionPath {
  id: string
  title: string
  slug: string
  avgCompletion: number
  enrolledCount: number
}

export async function adminGetDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createServerClient()

  const [activeUsersResult, publishedPathsResult, todayCompletionsResult, allTimeCompletionsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('active', true)
        .neq('role', 'admin'),
      supabase
        .from('learning_paths')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .not('completed_at', 'is', null)
        .gte('completed_at', new Date().toISOString().slice(0, 10)),
      supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .not('completed_at', 'is', null),
    ])

  return {
    activeUsersCount: activeUsersResult.count ?? 0,
    publishedPathsCount: publishedPathsResult.count ?? 0,
    lessonCompletionsToday: todayCompletionsResult.count ?? 0,
    lessonCompletionsAllTime: allTimeCompletionsResult.count ?? 0,
  }
}

export async function adminGetTopUsers(limit = 5): Promise<TopUser[]> {
  const supabase = await createServerClient()

  // Get top users by XP — sum xp_transactions per user
  const { data, error } = await supabase
    .from('xp_transactions')
    .select('user_id, amount')

  if (error || !data) return []

  // Aggregate XP per user
  const xpByUser = new Map<string, number>()
  for (const row of data) {
    xpByUser.set(row.user_id, (xpByUser.get(row.user_id) ?? 0) + row.amount)
  }

  // Sort by XP descending, take top N
  const topUserIds = [...xpByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  if (topUserIds.length === 0) return []

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, departments(name)')
    .in('id', topUserIds)

  if (profilesError || !profiles) return []

  return topUserIds
    .map((userId) => {
      const profile = profiles.find((p) => p.id === userId)
      if (!profile) return null
      const dept = profile.departments as { name: string } | null
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        totalXp: xpByUser.get(userId) ?? 0,
        departmentName: dept?.name ?? null,
      }
    })
    .filter((u): u is TopUser => u !== null)
}

export async function adminGetLowCompletionPaths(limit = 5): Promise<LowCompletionPath[]> {
  const supabase = await createServerClient()

  // Fetch published paths
  const { data: paths, error: pathsError } = await supabase
    .from('learning_paths')
    .select('id, title, slug')
    .eq('status', 'published')

  if (pathsError || !paths || paths.length === 0) return []

  // Fetch user_learning_paths (started/completed) for these paths
  const pathIds = paths.map((p) => p.id)
  const { data: ulpRows, error: ulpError } = await supabase
    .from('user_learning_paths')
    .select('learning_path_id, started_at, completed_at')
    .in('learning_path_id', pathIds)
    .not('started_at', 'is', null)

  if (ulpError) return []

  const ulpData = ulpRows ?? []

  // Compute avg completion per path
  const pathStats = paths.map((path) => {
    const entries = ulpData.filter((u) => u.learning_path_id === path.id)
    const enrolled = entries.length
    if (enrolled === 0) {
      return { id: path.id, title: path.title, slug: path.slug, avgCompletion: 0, enrolledCount: 0 }
    }
    const completed = entries.filter((u) => u.completed_at !== null).length
    const avgCompletion = Math.round((completed / enrolled) * 100)
    return { id: path.id, title: path.title, slug: path.slug, avgCompletion, enrolledCount: enrolled }
  })

  // Sort by avgCompletion ascending (lowest first), then limit
  return pathStats
    .sort((a, b) => a.avgCompletion - b.avgCompletion)
    .slice(0, limit)
}
