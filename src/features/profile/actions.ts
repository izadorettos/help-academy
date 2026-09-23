'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guards'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileActionResult = { ok: true } | { ok: false; error: string }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Updates the authenticated user's display name.
 * Only the `name` column is updated; sensitive columns (role, active, etc.)
 * are protected by the `protect_profile_columns` trigger on the DB side.
 */
export async function updateProfile(formData: FormData): Promise<ProfileActionResult> {
  try {
    const user = await requireUser()
    const supabase = await createServerClient()

    const rawName = formData.get('name')
    const parsed = updateProfileSchema.safeParse({ name: rawName })
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Dados inválidos.'
      return { ok: false, error: msg }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ name: parsed.data.name })
      .eq('id', user.id)

    if (error) {
      console.error('[updateProfile] error:', error.message)
      return { ok: false, error: 'Não foi possível atualizar o nome. Tente novamente.' }
    }

    revalidatePath('/perfil')
    revalidatePath('/dashboard')

    return { ok: true }
  } catch (err) {
    console.error('[updateProfile] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado. Tente novamente.' }
  }
}

/**
 * Uploads the user's avatar to Supabase Storage (`avatars` bucket).
 * The file is stored at `{userId}/{timestamp}.{ext}`.
 * Uses the authenticated user's client (RLS on storage: only own folder).
 */
export async function uploadAvatar(formData: FormData): Promise<ProfileActionResult> {
  try {
    const user = await requireUser()
    const supabase = await createServerClient()

    const file = formData.get('avatar')
    if (!(file instanceof File)) {
      return { ok: false, error: 'Arquivo inválido.' }
    }

    // Validate: image only, max 2 MB
    if (!file.type.startsWith('image/')) {
      return { ok: false, error: 'O arquivo deve ser uma imagem.' }
    }
    if (file.size > 2 * 1024 * 1024) {
      return { ok: false, error: 'A imagem deve ter no máximo 2 MB.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[uploadAvatar] storage error:', uploadError.message)
      return { ok: false, error: 'Não foi possível fazer upload da imagem. Tente novamente.' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = urlData?.publicUrl ?? null

    if (!avatarUrl) {
      return { ok: false, error: 'Não foi possível obter a URL da imagem.' }
    }

    // Update profile with new avatar_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('[uploadAvatar] profile update error:', updateError.message)
      return { ok: false, error: 'Imagem enviada, mas não foi possível atualizar o perfil. Tente novamente.' }
    }

    revalidatePath('/perfil')
    revalidatePath('/dashboard')

    return { ok: true }
  } catch (err) {
    console.error('[uploadAvatar] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado. Tente novamente.' }
  }
}
