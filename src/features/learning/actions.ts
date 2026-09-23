'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guards'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult = { ok: true } | { ok: false; error: string }

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Marks a lesson as completed by calling the `complete_lesson` RPC.
 * Returns { ok: true } on success, or { ok: false, error } on failure.
 * Idempotent: calling twice returns success without double-counting.
 *
 * Security: requireUser() ensures only authenticated users can call this.
 * The RPC itself also validates access and locking via can_access_lesson +
 * is_lesson_unlocked (SECURITY DEFINER, server-side).
 */
export async function completeLesson(lessonId: string): Promise<ActionResult> {
  try {
    await requireUser()

    const supabase = await createServerClient()

    const { error } = await supabase.rpc('complete_lesson', {
      p_lesson_id: lessonId,
    })

    if (error) {
      // Map known error codes to user-friendly messages; never leak internals
      const msg = error.message ?? ''
      if (msg.includes('NO_ACCESS')) {
        return { ok: false, error: 'Você não tem acesso a esta aula.' }
      }
      if (msg.includes('LESSON_LOCKED')) {
        return {
          ok: false,
          error: 'Esta aula está bloqueada. Conclua as aulas anteriores primeiro.',
        }
      }
      if (msg.includes('QUIZ_REQUIRED')) {
        return {
          ok: false,
          error: 'Você precisa passar no quiz para concluir esta aula.',
        }
      }
      // Generic fallback — log detail server-side only
      console.error('[completeLesson] RPC error:', error.message)
      return { ok: false, error: 'Não foi possível concluir a aula. Tente novamente.' }
    }

    // Revalidate pages that display lesson/path progress
    revalidatePath(`/aula/${lessonId}`)
    revalidatePath('/dashboard')
    revalidatePath('/trilhas')

    return { ok: true }
  } catch (err) {
    console.error('[completeLesson] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado. Tente novamente.' }
  }
}
