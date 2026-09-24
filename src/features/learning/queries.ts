import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import {
  computeOverallProgress,
  type PathStatus,
  type OverallProgress,
} from '@/features/learning/progress'
import type { Database } from '@/types/database.types'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { PathStatus, OverallProgress } from '@/features/learning/progress'
export { computeOverallProgress } from '@/features/learning/progress'

type LessonType = Database['public']['Enums']['lesson_type']

export type LessonState = 'locked' | 'available' | 'completed'

export interface PathLesson {
  id: string
  title: string
  contentType: LessonType
  estimatedMinutes: number | null
  required: boolean
  position: number
  state: LessonState
  completedAt: string | null
}

export interface PathModule {
  id: string
  title: string
  description: string | null
  position: number
  lessons: PathLesson[]
}

export interface PathDetail {
  id: string
  title: string
  description: string | null
  slug: string
  coverUrl: string | null
  required: boolean
  sequential: boolean
  requiredTotal: number
  requiredDone: number
  percent: number
  status: PathStatus
  modules: PathModule[]
}

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

/**
 * Returns the full detail of a learning path accessible to the user,
 * including all published modules and lessons with their progress state.
 * Returns null if the path does not exist or the user cannot access it
 * (RLS enforces access — the query will return no rows for inaccessible paths).
 */
export async function getPathBySlug(
  slug: string,
  userId: string,
): Promise<PathDetail | null> {
  const supabase = await createServerClient()

  // 1. Fetch the path (RLS: only published paths the user can access)
  const { data: pathRow, error: pathError } = await supabase
    .from('learning_paths')
    .select(
      `id, title, description, slug, cover_url, required, sequential, position,
       modules(
         id, title, description, position,
         lessons(
           id, title, content_type, estimated_minutes, required, position, published
         )
       )`,
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (pathError || !pathRow) return null

  // 2. Fetch lesson_progress for this user (only for lessons in this path)
  const allLessons = (
    pathRow.modules as Array<{
      id: string
      lessons: Array<{ id: string }>
    }>
  ).flatMap((m) => m.lessons.map((l) => l.id))

  const { data: progressRows } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', userId)
    .in('lesson_id', allLessons.length > 0 ? allLessons : ['00000000-0000-0000-0000-000000000000'])

  const completedMap = new Map<string, string | null>(
    (progressRows ?? []).map((p) => [p.lesson_id, p.completed_at]),
  )

  // 3. Sort modules and lessons by position
  const sortedModules = (
    pathRow.modules as Array<{
      id: string
      title: string
      description: string | null
      position: number
      lessons: Array<{
        id: string
        title: string
        content_type: LessonType
        estimated_minutes: number | null
        required: boolean
        position: number
        published: boolean
      }>
    }>
  )
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      ...m,
      lessons: m.lessons.slice().sort((a, b) => a.position - b.position),
    }))

  // 4. Compute lesson states
  // For sequential paths: a required lesson at position N is locked until all
  // required published lessons before it (across all modules in order) are completed.
  // Optional lessons are never locked.
  const sequential = Boolean(pathRow.sequential)

  // Build a flat ordered list of required published lessons across all modules
  const orderedRequiredLessons: string[] = sortedModules.flatMap((m) =>
    m.lessons.filter((l) => l.published && l.required).map((l) => l.id),
  )

  // For sequential: find the index of first incomplete required lesson
  // All required lessons at a higher index than that are locked.
  let firstIncompleteRequiredIndex = orderedRequiredLessons.length // all done by default
  if (sequential) {
    for (let i = 0; i < orderedRequiredLessons.length; i++) {
      const lessonId = orderedRequiredLessons[i]
      if (!lessonId) continue
      const completedAt = completedMap.get(lessonId)
      if (!completedAt) {
        firstIncompleteRequiredIndex = i
        break
      }
    }
  }

  const getLessonState = (lesson: {
    id: string
    required: boolean
    published: boolean
  }): LessonState => {
    if (!lesson.published) return 'locked'

    const completedAt = completedMap.get(lesson.id)
    if (completedAt) return 'completed'

    if (sequential && lesson.required) {
      // A required lesson is locked if there's any incomplete required lesson before it
      const idx = orderedRequiredLessons.indexOf(lesson.id)
      if (idx > firstIncompleteRequiredIndex) return 'locked'
    }

    return 'available'
  }

  // 5. Count required/done for progress
  const publishedRequiredLessons = sortedModules.flatMap((m) =>
    m.lessons.filter((l) => l.published && l.required),
  )
  const requiredTotal = publishedRequiredLessons.length
  const requiredDone = publishedRequiredLessons.filter(
    (l) => completedMap.has(l.id) && completedMap.get(l.id) !== null,
  ).length
  const percent = requiredTotal === 0 ? 0 : Math.floor((requiredDone / requiredTotal) * 100)

  let status: PathStatus = 'not_started'
  if (requiredDone === requiredTotal && requiredTotal > 0) status = 'completed'
  else if (requiredDone > 0) status = 'in_progress'
  // also check if any lesson has been started
  else if (allLessons.some((id) => completedMap.has(id))) status = 'in_progress'

  // 6. Build the result
  const modules: PathModule[] = sortedModules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    position: m.position,
    lessons: m.lessons
      .filter((l) => l.published) // members only see published lessons
      .map((l) => ({
        id: l.id,
        title: l.title,
        contentType: l.content_type,
        estimatedMinutes: l.estimated_minutes,
        required: l.required,
        position: l.position,
        state: getLessonState(l),
        completedAt: completedMap.get(l.id) ?? null,
      })),
  }))

  return {
    id: String(pathRow.id),
    title: String(pathRow.title),
    description: pathRow.description != null ? String(pathRow.description) : null,
    slug: String(pathRow.slug),
    coverUrl: pathRow.cover_url != null ? String(pathRow.cover_url) : null,
    required: Boolean(pathRow.required),
    sequential,
    requiredTotal,
    requiredDone,
    percent,
    status,
    modules,
  }
}

// ─── Lesson viewer ────────────────────────────────────────────────────────────

// ─── Quiz types (safe — no is_correct) ───────────────────────────────────────

export interface QuizOptionSafe {
  id: string
  text: string
}

export interface QuizQuestionSafe {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false'
  options: QuizOptionSafe[]
}

export interface QuizForLesson {
  id: string
  title: string
  passingScore: number
  questions: QuizQuestionSafe[]
}

export interface LastQuizAttempt {
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  passingScore: number
  completedAt: string
}

export interface LastActivitySubmission {
  id: string
  kind: 'task' | 'challenge' | 'survey' | 'game'
  status: 'submitted' | 'in_review' | 'completed'
  score: number | null
  payload: Record<string, unknown>
  feedback: Record<string, unknown> | null
  createdAt: string
}

export interface LessonForMember {
  id: string
  title: string
  description: string | null
  contentType: LessonType
  content: string | null
  externalUrl: string | null
  filePath: string | null
  estimatedMinutes: number | null
  required: boolean
  position: number
  /** Configuração específica do tipo de atividade (task/challenge/survey/game/video). Sempre objeto. */
  config: Record<string, unknown>
  /** Progresso 0..100 do vídeo (ou 0 para outros tipos). */
  progressPercent: number
  /** Posição em segundos do último ponto assistido (vídeo). */
  positionSeconds: number | null
  /** true when the lesson exists and is published but the sequential rule blocks access */
  locked: boolean
  /** true when lesson_progress.completed_at is not null */
  completed: boolean
  completedAt: string | null
  startedAt: string | null
  /** Signed URL for PDF lessons (expires in 1 hour) */
  signedPdfUrl: string | null
  module: {
    id: string
    title: string
    position: number
  }
  path: {
    id: string
    title: string
    slug: string
    sequential: boolean
  }
  prevLessonId: string | null
  nextLessonId: string | null
  /** Quiz data — null when lesson has no quiz. NEVER includes is_correct. */
  quiz: QuizForLesson | null
  /** Most recent quiz attempt by this user — null if never attempted */
  lastAttempt: LastQuizAttempt | null
  /** Última submissão de atividade (task/challenge/survey/game). Null se nunca enviou. */
  lastSubmission: LastActivitySubmission | null
}

/**
 * Returns lesson data for the member viewer, including breadcrumb info,
 * locked/completed state, prev/next navigation, and signed PDF URL if applicable.
 *
 * Returns null when the lesson does not exist, is not published, or the user
 * cannot access the path it belongs to (RLS enforces this).
 *
 * If the lesson is locked (sequential path, prior required lessons incomplete),
 * returns the lesson with `locked: true` so the UI can show the lock screen.
 */
export async function getLessonForMember(
  lessonId: string,
  userId: string,
): Promise<LessonForMember | null> {
  const supabase = await createServerClient()

  // 1. Fetch the lesson with its module and path info
  // RLS on lessons: member can SELECT published lessons where can_access_path holds
  const { data: lessonRow, error: lessonError } = await supabase
    .from('lessons')
    .select(
      `id, title, description, content_type, content, external_url, file_path,
       estimated_minutes, required, position, published, config,
       modules!inner(
         id, title, position,
         learning_paths!inner(
           id, title, slug, sequential, status
         )
       )`,
    )
    .eq('id', lessonId)
    .eq('published', true)
    .single()

  if (lessonError || !lessonRow) return null

  const mod = lessonRow.modules as {
    id: string
    title: string
    position: number
    learning_paths: {
      id: string
      title: string
      slug: string
      sequential: boolean
      status: string
    }
  }

  // Path must be published
  if (mod.learning_paths.status !== 'published') return null

  // 2. Fetch lesson progress for this user
  const { data: progressRow } = await supabase
    .from('lesson_progress')
    .select('started_at, completed_at, last_accessed_at, progress_percent, position_seconds')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  // 2b. Fetch the latest activity_submissions row for this user + lesson
  const { data: submissionRow } = await supabase
    .from('activity_submissions')
    .select('id, kind, status, score, payload, feedback, created_at')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 3. Determine if lesson is locked (only relevant for sequential paths)
  let locked = false
  if (mod.learning_paths.sequential && lessonRow.required) {
    // Fetch all required published lessons in this path ordered by module.position, lesson.position
    const { data: allLessonsInPath } = await supabase
      .from('lessons')
      .select(
        `id, position, required, published,
         modules!inner(position, learning_path_id)`,
      )
      .eq('modules.learning_path_id' as never, mod.learning_paths.id)
      .eq('published', true)
      .eq('required', true)

    if (allLessonsInPath && allLessonsInPath.length > 0) {
      // Sort by module position then lesson position
      const sorted = (
        allLessonsInPath as Array<{
          id: string
          position: number
          required: boolean
          published: boolean
          modules: { position: number; learning_path_id: string }
        }>
      )
        .slice()
        .sort((a, b) => {
          const modDiff = a.modules.position - b.modules.position
          return modDiff !== 0 ? modDiff : a.position - b.position
        })

      const currentIndex = sorted.findIndex((l) => l.id === lessonId)
      if (currentIndex > 0) {
        // Fetch completion status for lessons before this one
        const priorIds = sorted.slice(0, currentIndex).map((l) => l.id)
        const { data: completedPrior } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .in('lesson_id', priorIds)

        const completedSet = new Set((completedPrior ?? []).map((p) => p.lesson_id))
        locked = priorIds.some((id) => !completedSet.has(id))
      }
    }
  }

  // 4. Fetch previous and next lesson IDs in the same path
  // Prev/next navigate across all published lessons in the path (ordered by module.position, lesson.position)
  const { data: allLessonsForNav } = await supabase
    .from('lessons')
    .select(`id, position, modules!inner(position, learning_path_id)`)
    .eq('modules.learning_path_id' as never, mod.learning_paths.id)
    .eq('published', true)

  let prevLessonId: string | null = null
  let nextLessonId: string | null = null

  if (allLessonsForNav && allLessonsForNav.length > 0) {
    const sortedNav = (
      allLessonsForNav as Array<{
        id: string
        position: number
        modules: { position: number; learning_path_id: string }
      }>
    )
      .slice()
      .sort((a, b) => {
        const modDiff = a.modules.position - b.modules.position
        return modDiff !== 0 ? modDiff : a.position - b.position
      })

    const idx = sortedNav.findIndex((l) => l.id === lessonId)
    if (idx > 0) prevLessonId = sortedNav[idx - 1]!.id
    if (idx >= 0 && idx < sortedNav.length - 1) nextLessonId = sortedNav[idx + 1]!.id
  }

  // 5. Generate signed URL for PDF lessons
  let signedPdfUrl: string | null = null
  if (lessonRow.content_type === 'pdf' && lessonRow.file_path) {
    const adminClient = createAdminClient()
    const { data: signedData } = await adminClient.storage
      .from('lesson-files')
      .createSignedUrl(lessonRow.file_path, 3600)
    signedPdfUrl = signedData?.signedUrl ?? null
  }

  // 6. Fetch quiz for this lesson (WITHOUT is_correct — members never get the answer key)
  // RLS on quiz_options blocks SELECT for members entirely; we only select from
  // quizzes and quiz_questions here. Options are fetched via admin client to bypass RLS,
  // but only id and text are returned (is_correct is never selected).
  let quizData: QuizForLesson | null = null
  let lastAttempt: LastQuizAttempt | null = null

  const { data: quizRow } = await supabase
    .from('quizzes')
    .select('id, title, passing_score')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (quizRow) {
    // Fetch questions via admin client (quiz_options RLS blocks member SELECT)
    // We explicitly exclude is_correct from the select projection
    const adminClient = createAdminClient()
    const { data: questionsData } = await adminClient
      .from('quiz_questions')
      .select(
        `id, question, type, position,
         quiz_options(id, text, position)`,
      )
      .eq('quiz_id', quizRow.id)
      .order('position', { ascending: true })

    if (questionsData) {
      const questions: QuizQuestionSafe[] = (
        questionsData as Array<{
          id: string
          question: string
          type: string
          position: number
          quiz_options: Array<{ id: string; text: string; position: number }>
        }>
      ).map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type as 'multiple_choice' | 'true_false',
        options: (q.quiz_options ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((o) => ({ id: o.id, text: o.text })),
      }))

      quizData = {
        id: String(quizRow.id),
        title: String(quizRow.title),
        passingScore: Number(quizRow.passing_score),
        questions,
      }
    }

    // Fetch most recent attempt for this user + quiz
    const { data: attemptRow } = await supabase
      .from('quiz_attempts')
      .select('score, passed, correct_count, total_questions, completed_at')
      .eq('quiz_id', quizRow.id)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (attemptRow) {
      lastAttempt = {
        score: Number(attemptRow.score),
        passed: Boolean(attemptRow.passed),
        correctCount: Number(attemptRow.correct_count),
        totalQuestions: Number(attemptRow.total_questions),
        passingScore: Number(quizRow.passing_score),
        completedAt: String(attemptRow.completed_at),
      }
    }
  }

  // 7. Fire-and-forget: call start_lesson to track last_accessed_at.
  // Only call when the lesson is not locked (RPC would throw LESSON_LOCKED otherwise).
  // Errors are intentionally swallowed — this must not fail the page load.
  if (!locked) {
    void Promise.resolve(
      supabase.rpc('start_lesson', { p_lesson_id: lessonId }),
    ).then(({ error }) => {
      if (error) {
        console.error('[getLessonForMember] start_lesson error:', error.message)
      }
    }).catch((err: unknown) => {
      console.error('[getLessonForMember] start_lesson unexpected error:', err)
    })
  }

  const rawConfig = (lessonRow as { config?: unknown }).config
  const config: Record<string, unknown> =
    rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)
      ? (rawConfig as Record<string, unknown>)
      : {}

  const rawPayload = submissionRow?.payload
  const rawFeedback = submissionRow?.feedback
  const lastSubmission: LastActivitySubmission | null = submissionRow
    ? {
        id: String(submissionRow.id),
        kind: submissionRow.kind as 'task' | 'challenge' | 'survey' | 'game',
        status: submissionRow.status as 'submitted' | 'in_review' | 'completed',
        score: submissionRow.score != null ? Number(submissionRow.score) : null,
        payload:
          rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
            ? (rawPayload as Record<string, unknown>)
            : {},
        feedback:
          rawFeedback && typeof rawFeedback === 'object' && !Array.isArray(rawFeedback)
            ? (rawFeedback as Record<string, unknown>)
            : null,
        createdAt: String(submissionRow.created_at),
      }
    : null

  return {
    id: String(lessonRow.id),
    title: String(lessonRow.title),
    description: lessonRow.description != null ? String(lessonRow.description) : null,
    contentType: lessonRow.content_type as LessonType,
    content: lessonRow.content ?? null,
    externalUrl: lessonRow.external_url ?? null,
    filePath: lessonRow.file_path ?? null,
    estimatedMinutes: lessonRow.estimated_minutes ?? null,
    required: Boolean(lessonRow.required),
    position: Number(lessonRow.position),
    config,
    progressPercent: Number(progressRow?.progress_percent ?? 0),
    positionSeconds:
      progressRow?.position_seconds != null ? Number(progressRow.position_seconds) : null,
    locked,
    completed: progressRow?.completed_at != null,
    completedAt: progressRow?.completed_at ?? null,
    startedAt: progressRow?.started_at ?? null,
    signedPdfUrl,
    module: {
      id: String(mod.id),
      title: String(mod.title),
      position: Number(mod.position),
    },
    path: {
      id: String(mod.learning_paths.id),
      title: String(mod.learning_paths.title),
      slug: String(mod.learning_paths.slug),
      sequential: Boolean(mod.learning_paths.sequential),
    },
    prevLessonId,
    nextLessonId,
    quiz: quizData,
    lastAttempt,
    lastSubmission,
  }
}

/**
 * Returns quiz data for a lesson, safe to send to client (no is_correct).
 * Uses admin client to read quiz_options (RLS blocks members from reading quiz_options).
 * Returns null if no quiz exists for this lesson.
 */
export async function getQuizForLesson(lessonId: string): Promise<QuizForLesson | null> {
  const supabase = await createServerClient()

  const { data: quizRow } = await supabase
    .from('quizzes')
    .select('id, title, passing_score')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!quizRow) return null

  const adminClient = createAdminClient()
  const { data: questionsData } = await adminClient
    .from('quiz_questions')
    .select(
      `id, question, type, position,
       quiz_options(id, text, position)`,
    )
    .eq('quiz_id', quizRow.id)
    .order('position', { ascending: true })

  if (!questionsData) return null

  const questions: QuizQuestionSafe[] = (
    questionsData as Array<{
      id: string
      question: string
      type: string
      position: number
      quiz_options: Array<{ id: string; text: string; position: number }>
    }>
  ).map((q) => ({
    id: q.id,
    question: q.question,
    type: q.type as 'multiple_choice' | 'true_false',
    options: (q.quiz_options ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, text: o.text })),
  }))

  return {
    id: String(quizRow.id),
    title: String(quizRow.title),
    passingScore: Number(quizRow.passing_score),
    questions,
  }
}
