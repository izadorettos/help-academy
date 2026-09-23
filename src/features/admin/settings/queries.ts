import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export interface GamificationSetting {
  key: string
  value: number
  description: string
  updatedAt: string
}

export interface Level {
  level: number
  minXp: number
  name: string | null
}

/**
 * Returns all gamification_settings rows, ordered by key.
 * Admin-only read is permitted by RLS (authenticated can SELECT).
 */
export async function adminGetGamificationSettings(): Promise<GamificationSetting[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('gamification_settings')
    .select('key, value, description, updated_at')
    .order('key', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    key: row.key,
    value: row.value,
    description: row.description,
    updatedAt: row.updated_at,
  }))
}

/**
 * Returns all levels ordered by level number ascending.
 * Admin-only read is permitted by RLS (authenticated can SELECT).
 */
export async function adminGetLevels(): Promise<Level[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('levels')
    .select('level, min_xp, name')
    .order('level', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    level: row.level,
    minXp: row.min_xp,
    name: row.name,
  }))
}
