'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { departmentSchema, generateSlug } from './schemas'

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Creates a new department.
 * Validates name with Zod, auto-generates slug, inserts into DB.
 */
export async function createDepartment(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const raw = { name: formData.get('name') }
    const parsed = departmentSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { name } = parsed.data
    const slug = generateSlug(name)

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('departments')
      .insert({ name, slug })
      .select('id')
      .single()

    if (error) {
      // Unique constraint on name (case-insensitive index) or slug
      if (error.code === '23505') {
        return fail('Já existe uma área com este nome.')
      }
      console.error('[createDepartment] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/areas')
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createDepartment] unexpected error:', err)
    return fail()
  }
}

// ─── Update ────────────────────────────────────────────────────────────────────

/**
 * Updates the name (and derived slug) of an existing department.
 */
export async function updateDepartment(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = { name: formData.get('name') }
    const parsed = departmentSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { name } = parsed.data
    const slug = generateSlug(name)

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('departments')
      .update({ name, slug })
      .eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return fail('Já existe uma área com este nome.')
      }
      console.error('[updateDepartment] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/areas')
    revalidatePath(`/admin/areas/${id}/editar`)
    return ok()
  } catch (err) {
    console.error('[updateDepartment] unexpected error:', err)
    return fail()
  }
}

// ─── Toggle active ─────────────────────────────────────────────────────────────

/**
 * Flips the active flag of a department.
 */
export async function toggleDepartmentActive(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Read current value first
    const { data: current, error: fetchError } = await supabase
      .from('departments')
      .select('active')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return fail('Área não encontrada.')
    }

    const { error } = await supabase
      .from('departments')
      .update({ active: !current.active })
      .eq('id', id)

    if (error) {
      console.error('[toggleDepartmentActive] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/areas')
    return ok()
  } catch (err) {
    console.error('[toggleDepartmentActive] unexpected error:', err)
    return fail()
  }
}
