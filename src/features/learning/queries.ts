import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import {
  computeOverallProgress,
  type PathStatus,
  type OverallProgress,
} from '@/features/learning/progress'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { PathStatus, OverallProgress } from '@/features/learning/progress'
export { computeOverallProgress } from '@/features/learning/progress'

export interface UserPath {
  id: string
  title: string
  description: string | null
  slug: string
  coverUrl: string | null
  required: boolean
  sequential: boolean
  position: number
  requiredTotal: number
  requiredDone: number
  percent: number
  status: 'not_started' | 'in_progress' | 'completed'
  startedAt: string | null
  completedAt: string | null
  lastAccessedAt: string | null
}

export interface LastStartedLesson {
  lessonId: string
  lessonTitle: string
  estimatedMinutes: number | null
  moduleTitle: string
  pathTitle: string
  pathSlug: string
  lastAccessedAt: string
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns all published learning paths accessible to the user,
 * joined with their progress (using v_user_path_progress if available,
 * otherwise computing from raw tables).
 *
 * RLS ensures the user can only see paths they can access.
 */
export async function getUserPaths(userId: string): Promise<UserPath[]> {
  const supabase = await createServerClient()

  // Query v_user_path_progress view — security_invoker=true means RLS applies.
  // The view filters to paths the user can access (via can_access_path logic).
  const { data, error } = await supabase
    .from('v_user_path_progress' as never)
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    // Fall back to raw query if view is not accessible (e.g., types not generated yet)
    return getUserPathsFallback(userId)
  }

  if (!data || !Array.isArray(data)) return []

  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row['learning_path_id']),
    title: String(row['title'] ?? ''),
    description: row['description'] != null ? String(row['description']) : null,
    slug: String(row['slug'] ?? ''),
    coverUrl: row['cover_url'] != null ? String(row['cover_url']) : null,
    required: Boolean(row['required']),
    sequential: Boolean(row['sequential']),
    position: Number(row['position'] ?? 0),
    requiredTotal: Number(row['required_total'] ?? 0),
    requiredDone: Number(row['required_done'] ?? 0),
    percent: Number(row['percent'] ?? 0),
    status: (row['status'] as PathStatus) ?? 'not_started',
    startedAt: row['started_at'] != null ? String(row['started_at']) : null,
    completedAt: row['completed_at'] != null ? String(row['completed_at']) : null,
    lastAccessedAt: row['last_accessed_at'] != null ? String(row['last_accessed_at']) : null,
  }))
}

/**
 * Fallback query when v_user_path_progress is not available.
 * Manually joins learning_paths, learning_path_departments, user_learning_paths,
 * and lesson_progress to compute progress.
 */
async function getUserPathsFallback(userId: string): Promise<UserPath[]> {
  const supabase = await createServerClient()

  // Fetch the user's department
  const { data: profile } = await supabase
    .from('profiles')
    .select('department_id')
    .eq('id', userId)
    .single()

  const departmentId = profile?.department_id

  // Build base query: paths accessible by department or individual assignment
  // RLS on learning_paths already limits to accessible + published paths.
  const { data: paths, error: pathsError } = await supabase
    .from('learning_paths')
    .select(
      `id, title, description, slug, cover_url, required, sequential, position,
       learning_path_departments!inner(department_id),
       user_learning_paths(user_id, started_at, completed_at, assigned_individually)`,
    )
    .eq('status', 'published')
    .order('position', { ascending: true })

  if (pathsError || !paths) return []

  // Filter: paths where user's dept is a target OR individually assigned
  const accessiblePaths = paths.filter((p) => {
    const lpd = p.learning_path_departments as Array<{ department_id: string }>
    const ulp = p.user_learning_paths as Array<{
      user_id: string
      assigned_individually: boolean
    }>
    const byDept = departmentId != null && lpd.some((d) => d.department_id === departmentId)
    const byIndividual = ulp.some((u) => u.user_id === userId && u.assigned_individually)
    return byDept || byIndividual
  })

  if (accessiblePaths.length === 0) return []

  const pathIds = accessiblePaths.map((p) => p.id)

  // Count required published lessons per path
  const { data: lessonCounts } = await supabase
    .from('lessons')
    .select('id, module_id, required, published, modules!inner(learning_path_id)')
    .eq('published', true)
    .eq('required', true)
    .in('modules.learning_path_id' as never, pathIds)

  // Count completed required lessons per path for this user
  const lessonIds = lessonCounts?.map((l) => l.id) ?? []

  const { data: completedProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000'])

  const completedSet = new Set((completedProgress ?? []).map((lp) => lp.lesson_id))

  // Build result
  return accessiblePaths.map((p) => {
    const pathLessons =
      lessonCounts?.filter((l) => {
        const mod = l.modules as { learning_path_id: string } | null
        return mod?.learning_path_id === p.id
      }) ?? []

    const requiredTotal = pathLessons.length
    const requiredDone = pathLessons.filter((l) => completedSet.has(l.id)).length
    const percent = requiredTotal === 0 ? 0 : Math.floor((requiredDone / requiredTotal) * 100)

    const ulpRow = (
      p.user_learning_paths as Array<{
        user_id: string
        started_at: string | null
        completed_at: string | null
      }>
    ).find((u) => u.user_id === userId)

    let status: PathStatus = 'not_started'
    if (ulpRow?.completed_at) status = 'completed'
    else if (ulpRow?.started_at) status = 'in_progress'

    return {
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      slug: p.slug,
      coverUrl: p.cover_url ?? null,
      required: p.required,
      sequential: p.sequential,
      position: p.position,
      requiredTotal,
      requiredDone,
      percent,
      status,
      startedAt: ulpRow?.started_at ?? null,
      completedAt: ulpRow?.completed_at ?? null,
      lastAccessedAt: null,
    }
  })
}

/**
 * Computes overall onboarding progress for a user (RN-05).
 * Reads from v_user_path_progress; falls back to getUserPaths if needed.
 */
export async function getOverallProgress(userId: string): Promise<OverallProgress> {
  const paths = await getUserPaths(userId)

  return computeOverallProgress(
    paths.map((p) => ({
      requiredTotal: p.requiredTotal,
      requiredDone: p.requiredDone,
      pathRequired: p.required,
    })),
  )
}

/**
 * Returns the most recently accessed incomplete lesson for the user.
 * Used for the "Continue de onde parou" card.
 */
export async function getLastStartedLesson(userId: string): Promise<LastStartedLesson | null> {
  const supabase = await createServerClient()

  // lesson_progress has an index on (user_id, last_accessed_at desc) where completed_at is null
  const { data, error } = await supabase
    .from('lesson_progress')
    .select(
      `lesson_id,
       last_accessed_at,
       lessons!inner(
         id,
         title,
         estimated_minutes,
         published,
         modules!inner(
           title,
           learning_paths!inner(
             id,
             title,
             slug,
             status
           )
         )
       )`,
    )
    .eq('user_id', userId)
    .is('completed_at', null)
    .order('last_accessed_at', { ascending: false })
    .limit(20) // check up to 20 to find one from an accessible, published path

  if (error || !data || data.length === 0) return null

  // Find first result where lesson is published and path is published
  for (const row of data) {
    const lesson = row.lessons as {
      id: string
      title: string
      estimated_minutes: number | null
      published: boolean
      modules: {
        title: string
        learning_paths: {
          id: string
          title: string
          slug: string
          status: string
        }
      }
    } | null

    if (!lesson?.published) continue
    if (lesson.modules.learning_paths.status !== 'published') continue

    return {
      lessonId: row.lesson_id,
      lessonTitle: lesson.title,
      estimatedMinutes: lesson.estimated_minutes,
      moduleTitle: lesson.modules.title,
      pathTitle: lesson.modules.learning_paths.title,
      pathSlug: lesson.modules.learning_paths.slug,
      lastAccessedAt: row.last_accessed_at,
    }
  }

  return null
}
