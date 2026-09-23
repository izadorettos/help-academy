import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export type ReportStatus = 'not_started' | 'in_progress' | 'completed'

export interface ReportRow {
  userId: string
  userName: string
  email: string
  department: string
  pathTitle: string
  pathSlug: string
  percentComplete: number
  lessonsCompleted: number
  totalLessons: number
  quizAvgScore: number | null
  lastAccess: string | null
  status: ReportStatus
}

export interface ReportFilters {
  departmentId?: string
  pathId?: string
  status?: ReportStatus
  page?: number
  pageSize?: number
}

export interface ReportResult {
  rows: ReportRow[]
  total: number
}

/**
 * Returns paginated report rows: one row per (user × learning_path) pair.
 * Joins profiles, departments, user_learning_paths, learning_paths, lesson_progress, quiz_attempts.
 * Admin-only: RLS requires is_admin().
 */
export async function adminGetReport(filters: ReportFilters): Promise<ReportResult> {
  const { departmentId, pathId, status, page = 1, pageSize = 20 } = filters
  const supabase = await createServerClient()

  // 1. Fetch user_learning_paths with user and path info
  // Use column hint "user_id" to disambiguate the profiles relation (user_id vs assigned_by both FK to profiles)
  let ulpQuery = supabase
    .from('user_learning_paths')
    .select(
      'id, user_id, learning_path_id, started_at, completed_at, user:user_id(id, name, email, department_id, last_seen_at, departments(name)), learning_paths(id, title, slug)',
    )

  if (pathId) {
    ulpQuery = ulpQuery.eq('learning_path_id', pathId)
  }

  if (departmentId) {
    // We need to filter by department via profiles — use inner filter
    ulpQuery = ulpQuery.eq('user.department_id', departmentId)
  }

  const { data: ulpRows, error: ulpError } = await ulpQuery

  if (ulpError || !ulpRows) return { rows: [], total: 0 }

  type ProfileRow = {
    id: string
    name: string
    email: string
    department_id: string | null
    last_seen_at: string | null
    departments: { name: string } | null
  }

  // Filter out rows where profile didn't match the department filter (Supabase returns null profile)
  const filteredUlp = ulpRows.filter((row) => {
    const profile = row.user as ProfileRow | null
    if (!profile) return false
    if (departmentId && profile.department_id !== departmentId) return false
    return true
  })

  if (filteredUlp.length === 0) return { rows: [], total: 0 }

  // 2. Fetch all published lessons for all paths in the result set
  const pathIds = [...new Set(filteredUlp.map((r) => r.learning_path_id))]

  const { data: modulesData } = await supabase
    .from('modules')
    .select('id, learning_path_id')
    .in('learning_path_id', pathIds)

  const moduleIds = (modulesData ?? []).map((m) => m.id)

  const { data: lessonsData } = moduleIds.length > 0
    ? await supabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', moduleIds)
        .eq('published', true)
    : { data: [] }

  // Build map: pathId → Set of lesson IDs
  const moduleToPath = new Map<string, string>()
  for (const m of modulesData ?? []) {
    moduleToPath.set(m.id, m.learning_path_id)
  }

  const pathLessonIds = new Map<string, Set<string>>()
  for (const lesson of lessonsData ?? []) {
    const pathId = moduleToPath.get(lesson.module_id)
    if (!pathId) continue
    if (!pathLessonIds.has(pathId)) pathLessonIds.set(pathId, new Set())
    pathLessonIds.get(pathId)!.add(lesson.id)
  }

  // 3. Fetch lesson_progress for all users in the result set
  const userIds = [...new Set(filteredUlp.map((r) => r.user_id))]
  const allLessonIds = [...new Set([...pathLessonIds.values()].flatMap((s) => [...s]))]

  const { data: progressData } = userIds.length > 0 && allLessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed_at')
        .in('user_id', userIds)
        .in('lesson_id', allLessonIds)
        .not('completed_at', 'is', null)
    : { data: [] }

  // Build map: userId+pathId → completed lesson count
  const completedKey = (userId: string, lessonId: string) => `${userId}::${lessonId}`
  const completedSet = new Set<string>()
  for (const p of progressData ?? []) {
    completedSet.add(completedKey(p.user_id, p.lesson_id))
  }

  // 4. Fetch passing quiz_attempts for users
  const { data: quizAttempts } = userIds.length > 0
    ? await supabase
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, passed, quizzes(lesson_id, lessons(module_id))')
        .in('user_id', userIds)
        .eq('passed', true)
    : { data: [] }

  // Build map: userId+pathId → [scores]
  type QuizAttemptRow = {
    user_id: string
    score: number
    passed: boolean
    quizzes: {
      lesson_id: string
      lessons: { module_id: string } | null
    } | null
  }
  const quizScoreMap = new Map<string, number[]>()
  for (const attempt of (quizAttempts ?? []) as QuizAttemptRow[]) {
    const lessonId = attempt.quizzes?.lesson_id
    const moduleId = attempt.quizzes?.lessons?.module_id
    if (!lessonId || !moduleId) continue
    const pathId = moduleToPath.get(moduleId)
    if (!pathId) continue
    const key = `${attempt.user_id}::${pathId}`
    if (!quizScoreMap.has(key)) quizScoreMap.set(key, [])
    quizScoreMap.get(key)!.push(attempt.score)
  }

  // 5. Build report rows
  const allRows: ReportRow[] = []

  for (const ulp of filteredUlp) {
    const profile = ulp.user as ProfileRow | null

    const lp = ulp.learning_paths as { id: string; title: string; slug: string } | null

    if (!profile || !lp) continue

    const dept = profile.departments as { name: string } | null
    const lessonSet = pathLessonIds.get(ulp.learning_path_id) ?? new Set<string>()
    const totalLessons = lessonSet.size

    let lessonsCompleted = 0
    for (const lessonId of lessonSet) {
      if (completedSet.has(completedKey(ulp.user_id, lessonId))) {
        lessonsCompleted++
      }
    }

    const percentComplete =
      totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0

    const scores = quizScoreMap.get(`${ulp.user_id}::${ulp.learning_path_id}`)
    const quizAvgScore =
      scores && scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null

    let rowStatus: ReportStatus
    if (ulp.completed_at) {
      rowStatus = 'completed'
    } else if (ulp.started_at || lessonsCompleted > 0) {
      rowStatus = 'in_progress'
    } else {
      rowStatus = 'not_started'
    }

    allRows.push({
      userId: profile.id,
      userName: profile.name,
      email: profile.email,
      department: dept?.name ?? '—',
      pathTitle: lp.title,
      pathSlug: lp.slug,
      percentComplete,
      lessonsCompleted,
      totalLessons,
      quizAvgScore,
      lastAccess: profile.last_seen_at,
      status: rowStatus,
    })
  }

  // 6. Filter by status
  const statusFiltered = status ? allRows.filter((r) => r.status === status) : allRows

  // 7. Sort: by userName asc, then pathTitle asc
  statusFiltered.sort((a, b) => {
    const nameCmp = a.userName.localeCompare(b.userName, 'pt-BR')
    if (nameCmp !== 0) return nameCmp
    return a.pathTitle.localeCompare(b.pathTitle, 'pt-BR')
  })

  const total = statusFiltered.length
  const from = (page - 1) * pageSize
  const rows = statusFiltered.slice(from, from + pageSize)

  return { rows, total }
}

/**
 * Returns list of all published learning paths for filter dropdowns.
 * Admin-only.
 */
export async function adminGetAllPathsForFilter() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('learning_paths')
    .select('id, title')
    .order('title', { ascending: true })
  return data ?? []
}

/**
 * Returns list of all departments for filter dropdowns.
 * Admin-only.
 */
export async function adminGetAllDepartmentsForFilter() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('departments')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true })
  return data ?? []
}
