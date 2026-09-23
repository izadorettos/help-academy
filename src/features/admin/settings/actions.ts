'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { gamificationSettingsSchema, levelSchema } from './schemas'

// ─── XP Settings ──────────────────────────────────────────────────────────────

/**
 * Updates all five gamification XP settings at once.
 * Each key is updated individually (the table has no batch upsert helper).
 */
export async function updateGamificationSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = {
      xp_lesson_default: formData.get('xp_lesson_default'),
      xp_quiz_default: formData.get('xp_quiz_default'),
      xp_quiz_perfect_bonus: formData.get('xp_quiz_perfect_bonus'),
      xp_module_completed: formData.get('xp_module_completed'),
      xp_path_completed: formData.get('xp_path_completed'),
    }

    const parsed = gamificationSettingsSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const supabase = await createServerClient()

    const entries = Object.entries(parsed.data) as [string, number][]

    for (const [key, value] of entries) {
      const { error } = await supabase
        .from('gamification_settings')
        .update({ value })
        .eq('key', key)

      if (error) {
        console.error('[updateGamificationSettings] DB error:', error.message, { key })
        return fail()
      }
    }

    revalidatePath('/admin/configuracoes')
    return ok()
  } catch (err) {
    console.error('[updateGamificationSettings] unexpected error:', err)
    return fail()
  }
}

// ─── Levels ───────────────────────────────────────────────────────────────────

/**
 * Updates a single level's name and min_xp.
 * Level 1 always has min_xp = 0 (enforced by DB constraint).
 */
export async function updateLevel(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = {
      level: formData.get('level'),
      name: formData.get('name') ?? undefined,
      min_xp: formData.get('min_xp'),
    }

    const parsed = levelSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { level, name, min_xp } = parsed.data

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('levels')
      .update({ name: name ?? null, min_xp })
      .eq('level', level)

    if (error) {
      // Unique constraint on min_xp
      if (error.code === '23505') {
        return fail('Já existe um nível com esse valor de XP mínimo.')
      }
      // Check constraint violation (level 1 must have min_xp = 0)
      if (error.code === '23514') {
        return fail('O nível 1 deve ter XP mínimo igual a 0.')
      }
      console.error('[updateLevel] DB error:', error.message, { level })
      return fail()
    }

    revalidatePath('/admin/configuracoes')
    return ok()
  } catch (err) {
    console.error('[updateLevel] unexpected error:', err)
    return fail()
  }
}
