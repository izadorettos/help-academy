'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { inviteUserSchema, updateUserSchema } from './schemas'

// ─── Invite user ───────────────────────────────────────────────────────────────

/**
 * Invites a new user via Supabase Auth Admin API.
 * Sets profile role and department after successful invite.
 */
export async function inviteUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = {
      email: formData.get('email'),
      name: formData.get('name'),
      role: formData.get('role'),
      department_id: formData.get('department_id'),
    }

    const parsed = inviteUserSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { email, name, role, department_id } = parsed.data
    const deptId = department_id && department_id !== '' ? department_id : null

    const adminSupabase = createAdminClient()

    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
      email,
      { data: { name } },
    )

    if (inviteError) {
      if (inviteError.message.toLowerCase().includes('already registered')) {
        return fail('Já existe um usuário com este e-mail.')
      }
      console.error('[inviteUser] invite error:', inviteError.message)
      return fail()
    }

    if (!inviteData?.user?.id) {
      console.error('[inviteUser] no user id returned from invite')
      return fail()
    }

    // Update profile with role and department (the trigger creates the profile)
    const supabase = await createServerClient()
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role,
        department_id: deptId,
      })
      .eq('id', inviteData.user.id)

    if (profileError) {
      console.error('[inviteUser] profile update error:', profileError.message)
      // Not a fatal error — user was invited, just metadata update failed
    }

    revalidatePath('/admin/usuarios')
    return ok()
  } catch (err) {
    console.error('[inviteUser] unexpected error:', err)
    return fail()
  }
}

// ─── Update user ───────────────────────────────────────────────────────────────

/**
 * Updates user name, department, and role.
 * Admin cannot remove their own admin role.
 */
export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const currentAdmin = await requireAdmin()

    const raw = {
      name: formData.get('name'),
      role: formData.get('role'),
      department_id: formData.get('department_id'),
    }

    const parsed = updateUserSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { name, role, department_id } = parsed.data
    const deptId = department_id && department_id !== '' ? department_id : null

    // Admin cannot change their own role away from admin
    if (currentAdmin.id === id && role !== 'admin') {
      return fail('Você não pode remover seu próprio perfil de administrador.')
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({ name, role, department_id: deptId })
      .eq('id', id)

    if (error) {
      console.error('[updateUser] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/usuarios')
    revalidatePath(`/admin/usuarios/${id}`)
    return ok()
  } catch (err) {
    console.error('[updateUser] unexpected error:', err)
    return fail()
  }
}

// ─── Toggle user active ────────────────────────────────────────────────────────

/**
 * Activates or deactivates a user.
 * Admin cannot deactivate themselves.
 */
export async function toggleUserActive(id: string): Promise<ActionResult> {
  try {
    const currentAdmin = await requireAdmin()

    if (currentAdmin.id === id) {
      return fail('Você não pode desativar sua própria conta.')
    }

    const supabase = await createServerClient()

    const { data: current, error: fetchError } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return fail('Usuário não encontrado.')
    }

    const newActive = !current.active
    const adminSupabase = createAdminClient()

    // Sync with Supabase Auth: ban or unban
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(id, {
      ban_duration: newActive ? 'none' : '876600h',
    })

    if (authError) {
      console.error('[toggleUserActive] auth update error:', authError.message)
      return fail()
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ active: newActive })
      .eq('id', id)

    if (profileError) {
      console.error('[toggleUserActive] profile update error:', profileError.message)
      return fail()
    }

    revalidatePath('/admin/usuarios')
    revalidatePath(`/admin/usuarios/${id}`)
    return ok()
  } catch (err) {
    console.error('[toggleUserActive] unexpected error:', err)
    return fail()
  }
}

// ─── Resend invite ─────────────────────────────────────────────────────────────

/**
 * Resends an invite email to a user.
 */
export async function resendInvite(email: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    if (!email || !email.includes('@')) {
      return fail('E-mail inválido.')
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email)

    if (error) {
      console.error('[resendInvite] error:', error.message)
      return fail()
    }

    return ok()
  } catch (err) {
    console.error('[resendInvite] unexpected error:', err)
    return fail()
  }
}

// ─── Assign path to user ───────────────────────────────────────────────────────

/**
 * Assigns a learning path individually to a user.
 */
export async function assignPathToUser(userId: string, pathId: string): Promise<ActionResult> {
  try {
    const currentAdmin = await requireAdmin()

    const supabase = await createServerClient()

    // Check if path exists
    const { data: path, error: pathError } = await supabase
      .from('learning_paths')
      .select('id')
      .eq('id', pathId)
      .single()

    if (pathError || !path) {
      return fail('Trilha não encontrada.')
    }

    // Upsert: if already assigned via department, mark assigned_individually = true
    const { error } = await supabase
      .from('user_learning_paths')
      .upsert(
        {
          user_id: userId,
          learning_path_id: pathId,
          assigned_individually: true,
          assigned_by: currentAdmin.id,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,learning_path_id' },
      )

    if (error) {
      console.error('[assignPathToUser] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/usuarios/${userId}`)
    return ok()
  } catch (err) {
    console.error('[assignPathToUser] unexpected error:', err)
    return fail()
  }
}

// ─── Remove path from user ─────────────────────────────────────────────────────

/**
 * Removes individual path assignment from a user.
 * Sets assigned_individually = false (preserves progress).
 */
export async function removePathFromUser(userId: string, pathId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Per DATABASE.md: removing = assigned_individually = false (preserves started_at/completed_at)
    const { error } = await supabase
      .from('user_learning_paths')
      .update({ assigned_individually: false })
      .eq('user_id', userId)
      .eq('learning_path_id', pathId)

    if (error) {
      console.error('[removePathFromUser] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/usuarios/${userId}`)
    return ok()
  } catch (err) {
    console.error('[removePathFromUser] unexpected error:', err)
    return fail()
  }
}
