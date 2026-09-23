import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export interface AdminDepartment {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Returns all departments (active + inactive), sorted by name.
 * Admin-only: RLS requires is_admin().
 */
export async function adminGetDepartments(): Promise<AdminDepartment[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, slug, active, created_at, updated_at')
    .order('name', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Returns a single department by ID.
 * Returns null if not found.
 */
export async function adminGetDepartmentById(id: string): Promise<AdminDepartment | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, slug, active, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    active: data.active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
