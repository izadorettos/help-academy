import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserLevel {
  level: number
  name: string
  minXp: number
  nextMinXp: number | null
}

export interface ProfileData {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: 'member' | 'admin'
  jobTitle: string | null
  departmentName: string | null
  hireDate: string | null
  totalXp: number
  level: UserLevel
  completedPathsCount: number
  requiredTotal: number
  requiredDone: number
  overallPercent: number
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns full profile data for the authenticated user,
 * including XP, level, completed paths count, and overall progress.
 * Returns null if the user does not exist.
 */
export async function getProfile(userId: string): Promise<ProfileData | null> {
  const supabase = await createServerClient()

  // 1. Fetch profile with department
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role, job_title, hire_date, departments(name)')
    .eq('id', userId)
    .single()

  if (profileError || !profile) return null

  const dept = profile.departments as { name: string } | null

  // 2. Total XP from xp_transactions
  const { data: xpData } = await supabase
    .from('xp_transactions')
    .select('amount')
    .eq('user_id', userId)

  const totalXp = (xpData ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)

  // 3. Level for XP — call the SQL function
  const { data: levelRows } = await supabase.rpc('level_for_xp' as never, {
    p_xp: totalXp,
  } as never)

  const levelRow = (levelRows as Array<{
    level: number
    min_xp: number
    next_min_xp: number | null
  }> | null)?.[0]

  // Fallback: level 1 with data from levels table
  let userLevel: UserLevel
  if (levelRow) {
    // Get name from levels table (level_for_xp doesn't return name)
    const { data: levelNameRow } = await supabase
      .from('levels')
      .select('name')
      .eq('level', levelRow.level)
      .maybeSingle()

    userLevel = {
      level: levelRow.level,
      name: levelNameRow?.name ?? `Nível ${levelRow.level}`,
      minXp: levelRow.min_xp,
      nextMinXp: levelRow.next_min_xp,
    }
  } else {
    const { data: firstLevel } = await supabase
      .from('levels')
      .select('level, min_xp, name')
      .order('min_xp', { ascending: true })
      .limit(1)
      .maybeSingle()

    userLevel = {
      level: firstLevel?.level ?? 1,
      name: firstLevel?.name ?? 'Iniciante',
      minXp: firstLevel?.min_xp ?? 0,
      nextMinXp: null,
    }

    // Get nextMinXp for level 1
    const { data: nextLevel } = await supabase
      .from('levels')
      .select('min_xp')
      .gt('min_xp', firstLevel?.min_xp ?? 0)
      .order('min_xp', { ascending: true })
      .limit(1)
      .maybeSingle()

    userLevel.nextMinXp = nextLevel?.min_xp ?? null
  }

  // 4. Completed paths count
  const { data: completedPaths } = await supabase
    .from('user_learning_paths')
    .select('id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)

  const completedPathsCount = completedPaths?.length ?? 0

  // 5. Overall progress: count required published lessons across all accessible paths
  // Use v_user_path_progress if available; otherwise sum from xp_transactions won't work for this
  const { data: progressRows } = await supabase
    .from('v_user_path_progress' as never)
    .select('required_total, required_done')
    .eq('user_id', userId)

  let requiredTotal = 0
  let requiredDone = 0

  if (progressRows && Array.isArray(progressRows)) {
    for (const row of progressRows as Array<{ required_total: number; required_done: number }>) {
      requiredTotal += row.required_total ?? 0
      requiredDone += row.required_done ?? 0
    }
  }

  const overallPercent = requiredTotal === 0
    ? 0
    : Math.floor((requiredDone / requiredTotal) * 100)

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatar_url ?? null,
    role: profile.role as 'member' | 'admin',
    jobTitle: profile.job_title ?? null,
    departmentName: dept?.name ?? null,
    hireDate: profile.hire_date ?? null,
    totalXp,
    level: userLevel,
    completedPathsCount,
    requiredTotal,
    requiredDone,
    overallPercent,
  }
}
