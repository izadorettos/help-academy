import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export interface AdminLessonWithBreadcrumb {
  id: string
  moduleId: string
  moduleName: string
  pathId: string
  pathTitle: string
  title: string
  contentType: 'text' | 'video' | 'pdf' | 'link' | 'embed' | 'task' | 'challenge' | 'survey' | 'game' | 'image' | 'presentation'
  estimatedMinutes: number | null
  required: boolean
  published: boolean
  position: number
  hasQuiz: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminLessonFilters {
  contentType?: 'text' | 'video' | 'pdf' | 'link' | 'embed' | 'task' | 'challenge' | 'survey' | 'game' | 'image' | 'presentation'
  published?: boolean
  pathId?: string
  page?: number
  pageSize?: number
}

export interface AdminLessonPage {
  lessons: AdminLessonWithBreadcrumb[]
  total: number
  page: number
  pageSize: number
}

/**
 * Returns paginated lessons across all paths with breadcrumb info. Admin-only.
 */
export async function adminGetLessons(
  filters: AdminLessonFilters = {},
): Promise<AdminLessonPage> {
  const supabase = await createServerClient()

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('lessons')
    .select(
      `id, module_id, title, content_type, estimated_minutes, required, published, position,
       created_at, updated_at,
       quizzes (id),
       modules!inner (
         id, title, learning_path_id,
         learning_paths!inner (id, title)
       )`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.contentType) {
    query = query.eq('content_type', filters.contentType)
  }

  if (filters.published !== undefined) {
    query = query.eq('published', filters.published)
  }

  if (filters.pathId) {
    query = query.eq('modules.learning_path_id', filters.pathId)
  }

  const { data, error, count } = await query

  if (error || !data) return { lessons: [], total: 0, page, pageSize }

  const lessons: AdminLessonWithBreadcrumb[] = data.map((row) => {
    const rowModule = Array.isArray(row.modules) ? row.modules[0] : row.modules
    const path = rowModule
      ? Array.isArray(rowModule.learning_paths)
        ? rowModule.learning_paths[0]
        : rowModule.learning_paths
      : null

    return {
      id: row.id,
      moduleId: row.module_id,
      moduleName: rowModule?.title ?? '',
      pathId: path?.id ?? '',
      pathTitle: path?.title ?? '',
      title: row.title,
      contentType: row.content_type as AdminLessonWithBreadcrumb['contentType'],
      estimatedMinutes: row.estimated_minutes ?? null,
      required: row.required,
      published: row.published,
      position: row.position,
      hasQuiz: Array.isArray(row.quizzes) ? row.quizzes.length > 0 : row.quizzes !== null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })

  return {
    lessons,
    total: count ?? 0,
    page,
    pageSize,
  }
}
