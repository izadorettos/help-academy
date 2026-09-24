import 'server-only'
import { cache } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthProvider } from '@/lib/auth'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

export type SessionUser = {
  id: string
  email: string
  name: string
  role: UserRole
  departmentId: string | null
  avatarUrl: string | null
}

const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const identity = await getAuthProvider().getIdentity()
  if (!identity) return null

  const supabase = await createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, active, department_id, avatar_url')
    .eq('id', identity.subject)
    .single()

  if (!profile?.active) return null

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    departmentId: profile.department_id,
    avatarUrl: profile.avatar_url,
  }
})

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') notFound()
  return user
}
