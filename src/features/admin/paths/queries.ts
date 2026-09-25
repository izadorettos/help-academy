import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export interface AdminPathSummary {
  id: string
  title: string
  slug: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
  required: boolean
  sequential: boolean
  ownerDepartmentId: string | null
  ownerDepartmentName: string | null
  moduleCount: number
  lessonCount: number
  enrolledCount: number
  position: number
  createdAt: string
  updatedAt: string
}

export interface AdminLesson {
  id: string
  moduleId: string
  title: string
  contentType: 'text' | 'video' | 'pdf' | 'link' | 'embed' | 'task' | 'challenge' | 'survey' | 'game' | 'image' | 'presentation'
  content: string | null
  externalUrl: string | null
  filePath: string | null
  estimatedMinutes: number | null
  required: boolean
  published: boolean
  position: number
  hasQuiz: boolean
}

export interface AdminModule {
  id: string
  pathId: string
  title: string
  description: string | null
  position: number
  lessons: AdminLesson[]
}

export interface AdminPathDetail {
  id: string
  title: string
  slug: string
  description: string | null
  coverUrl: string | null
  status: 'draft' | 'published' | 'archived'
  required: boolean
  sequential: boolean
  ownerDepartmentId: string | null
  ownerDepartmentName: string | null
  position: number
  publishedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  modules: AdminModule[]
  assignedDepartmentIds: string[]
}

export interface AdminPathFilters {
  status?: 'draft' | 'published' | 'archived'
}

export interface AdminModuleSummary {
  id: string
  title: string
  position: number
}

/**
 * Returns all modules for a learning path, ordered by position. Admin-only.
 */
export async function adminGetModulesForPath(pathId: string): Promise<AdminModuleSummary[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('modules')
    .select('id, title, position')
    .eq('learning_path_id', pathId)
    .order('position', { ascending: true })

  if (error || !data) return []
  return data.map((m) => ({ id: m.id, title: m.title, position: m.position }))
}

/**
 * Returns all learning paths with counts. Admin-only.
 */
export async function adminGetPaths(filters?: AdminPathFilters): Promise<AdminPathSummary[]> {
  const supabase = await createServerClient()

  let query = supabase
    .from('learning_paths')
    .select(
      `id, title, slug, description, status, required, sequential,
       owner_department_id, position, created_at, updated_at,
       departments!learning_paths_owner_department_id_fkey (name),
       modules (id, lessons (id)),
       user_learning_paths (id)`,
    )
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error || !data) return []

  return data.map((row) => {
    const modules = Array.isArray(row.modules) ? row.modules : []
    const lessonCount = modules.reduce((sum: number, m: { lessons: unknown[] }) => {
      const lessons = Array.isArray(m.lessons) ? m.lessons : []
      return sum + lessons.length
    }, 0)
    const departmentRow = Array.isArray(row.departments)
      ? row.departments[0]
      : row.departments

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description ?? null,
      status: row.status as 'draft' | 'published' | 'archived',
      required: row.required,
      sequential: row.sequential,
      ownerDepartmentId: row.owner_department_id ?? null,
      ownerDepartmentName: departmentRow?.name ?? null,
      moduleCount: modules.length,
      lessonCount,
      enrolledCount: Array.isArray(row.user_learning_paths) ? row.user_learning_paths.length : 0,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

/**
 * Returns a single path with full structure. Admin-only.
 */
export async function adminGetPath(id: string): Promise<AdminPathDetail | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .select(
      `id, title, slug, description, cover_url, status, required, sequential,
       owner_department_id, position, published_at, created_by, created_at, updated_at,
       departments!learning_paths_owner_department_id_fkey (name),
       modules (
         id, learning_path_id, title, description, position,
         lessons (
           id, module_id, title, content_type, content, external_url, file_path,
           estimated_minutes, required, published, position,
           quizzes (id)
         )
       ),
       learning_path_departments (department_id)`,
    )
    .eq('id', id)
    .single()

  if (error || !data) return null

  const modules = Array.isArray(data.modules) ? data.modules : []
  const sortedModules = [...modules].sort((a, b) => a.position - b.position)

  const departmentRow = Array.isArray(data.departments)
    ? data.departments[0]
    : data.departments

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description ?? null,
    coverUrl: data.cover_url ?? null,
    status: data.status as 'draft' | 'published' | 'archived',
    required: data.required,
    sequential: data.sequential,
    ownerDepartmentId: data.owner_department_id ?? null,
    ownerDepartmentName: departmentRow?.name ?? null,
    position: data.position,
    publishedAt: data.published_at ?? null,
    createdBy: data.created_by ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    modules: sortedModules.map((m) => {
      const lessons = Array.isArray(m.lessons) ? m.lessons : []
      const sortedLessons = [...lessons].sort((a, b) => a.position - b.position)
      return {
        id: m.id,
        pathId: m.learning_path_id,
        title: m.title,
        description: m.description ?? null,
        position: m.position,
        lessons: sortedLessons.map((l) => ({
          id: l.id,
          moduleId: l.module_id,
          title: l.title,
          contentType: l.content_type as AdminLesson['contentType'],
          content: l.content ?? null,
          externalUrl: l.external_url ?? null,
          filePath: l.file_path ?? null,
          estimatedMinutes: l.estimated_minutes ?? null,
          required: l.required,
          published: l.published,
          position: l.position,
          hasQuiz: Array.isArray(l.quizzes) ? l.quizzes.length > 0 : l.quizzes !== null,
        })),
      }
    }),
    assignedDepartmentIds: Array.isArray(data.learning_path_departments)
      ? data.learning_path_departments.map((lpd: { department_id: string }) => lpd.department_id)
      : [],
  }
}
