'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { moduleSchema, parseModuleFormData } from './schemas'

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createModule(
  pathId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const raw = parseModuleFormData(formData)
    const parsed = moduleSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { title, description } = parsed.data

    const supabase = await createServerClient()

    // Get max position for modules in this path
    const { data: maxPos } = await supabase
      .from('modules')
      .select('position')
      .eq('learning_path_id', pathId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = maxPos ? maxPos.position + 1 : 1

    const { data, error } = await supabase
      .from('modules')
      .insert({
        learning_path_id: pathId,
        title,
        description: description ?? null,
        position,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createModule] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createModule] unexpected error:', err)
    return fail()
  }
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updateModule(
  id: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = parseModuleFormData(formData)
    const parsed = moduleSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { title, description } = parsed.data

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('modules')
      .update({ title, description: description ?? null })
      .eq('id', id)

    if (error) {
      console.error('[updateModule] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    return ok()
  } catch (err) {
    console.error('[updateModule] unexpected error:', err)
    return fail()
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteModule(id: string, pathId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Fetch lesson IDs for this module
    const { data: lessonRows, error: lessonFetchError } = await supabase
      .from('lessons')
      .select('id')
      .eq('module_id', id)

    if (lessonFetchError) {
      console.error('[deleteModule] lesson fetch error:', lessonFetchError.message)
      return fail()
    }

    const lessonIds = (lessonRows ?? []).map((l) => l.id)

    // Check if any lesson has progress
    if (lessonIds.length > 0) {
      const { count, error: checkError } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .in('lesson_id', lessonIds)

      if (checkError) {
        console.error('[deleteModule] check error:', checkError.message)
        return fail()
      }

      if (count && count > 0) {
        return fail('Não é possível excluir um módulo que já possui progresso de usuários.')
      }
    }

    const { error } = await supabase.from('modules').delete().eq('id', id)

    if (error) {
      console.error('[deleteModule] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    return ok()
  } catch (err) {
    console.error('[deleteModule] unexpected error:', err)
    return fail()
  }
}

// ─── Reorder lessons ───────────────────────────────────────────────────────────

export async function reorderLessons(
  moduleId: string,
  pathId: string,
  lessonIds: string[],
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    for (let i = 0; i < lessonIds.length; i++) {
      const lessonId = lessonIds[i]
      if (!lessonId) continue
      const { error } = await supabase
        .from('lessons')
        .update({ position: i + 1 })
        .eq('id', lessonId)
        .eq('module_id', moduleId)

      if (error) {
        console.error('[reorderLessons] update error:', error.message)
        return fail()
      }
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    return ok()
  } catch (err) {
    console.error('[reorderLessons] unexpected error:', err)
    return fail()
  }
}
