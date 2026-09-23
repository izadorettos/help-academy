import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

const PAGE_SIZE = 20

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'member' | 'admin'
  active: boolean
  departmentId: string | null
  departmentName: string | null
  lastSeenAt: string | null
  createdAt: string
}

export interface AdminUserDetail extends AdminUser {
  jobTitle: string | null
  hireDate: string | null
  avatarUrl: string | null
  assignedPaths: AssignedPath[]
  completedLessonsCount: number
}

export interface AssignedPath {
  id: string
  pathId: string
  title: string
  status: string
  assignedIndividually: boolean
  startedAt: string | null
  completedAt: string | null
}

export interface AdminUsersResult {
  users: AdminUser[]
  total: number
  page: number
  pageCount: number
}

/**
 * Returns a paginated list of users, with optional search by name/email.
 * Admin-only: RLS requires is_admin().
 */
export async function adminGetUsers(
  page: number = 1,
  search?: string,
): Promise<AdminUsersResult> {
  const supabase = await createServerClient()

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('profiles')
    .select(
      'id, name, email, role, active, department_id, last_seen_at, created_at, departments(name)',
      { count: 'exact' },
    )

  if (search && search.trim().length > 0) {
    const term = search.trim()
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(from, to)

  if (error || !data) return { users: [], total: 0, page, pageCount: 0 }

  const total = count ?? 0
  const pageCount = Math.ceil(total / PAGE_SIZE)

  const users: AdminUser[] = data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    departmentId: row.department_id,
    departmentName:
      row.departments && !Array.isArray(row.departments)
        ? (row.departments as { name: string }).name
        : null,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  }))

  return { users, total, page, pageCount }
}

/**
 * Returns a single user with profile info, assigned paths, and completion stats.
 * Admin-only: RLS requires is_admin().
 */
export async function adminGetUser(id: string): Promise<AdminUserDetail | null> {
  const supabase = await createServerClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, name, email, role, active, department_id, last_seen_at, created_at, job_title, hire_date, avatar_url, departments(name)',
    )
    .eq('id', id)
    .single()

  if (error || !profile) return null

  // Get individually assigned paths with learning path title
  const { data: pathRows } = await supabase
    .from('user_learning_paths')
    .select(
      'id, learning_path_id, assigned_individually, started_at, completed_at, learning_paths(title, status)',
    )
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  // Get completed lessons count
  const { count: completedLessonsCount } = await supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', id)
    .not('completed_at', 'is', null)

  const assignedPaths: AssignedPath[] = (pathRows ?? []).map((row) => {
    const lp = row.learning_paths as { title: string; status: string } | null
    return {
      id: row.id,
      pathId: row.learning_path_id,
      title: lp?.title ?? '',
      status: lp?.status ?? '',
      assignedIndividually: row.assigned_individually,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }
  })

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    active: profile.active,
    departmentId: profile.department_id,
    departmentName:
      profile.departments && !Array.isArray(profile.departments)
        ? (profile.departments as { name: string }).name
        : null,
    lastSeenAt: profile.last_seen_at,
    createdAt: profile.created_at,
    jobTitle: profile.job_title,
    hireDate: profile.hire_date,
    avatarUrl: profile.avatar_url,
    assignedPaths,
    completedLessonsCount: completedLessonsCount ?? 0,
  }
}

/**
 * Returns all published learning paths (for path assignment UI).
 */
export async function adminGetPublishedPaths() {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('learning_paths')
    .select('id, title')
    .eq('status', 'published')
    .order('title', { ascending: true })

  return data ?? []
}
