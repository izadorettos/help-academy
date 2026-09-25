'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// ─── Types ─────────────────────────────────────────────────────────────────────

type MediaKind = 'video' | 'image' | 'pdf' | 'presentation'

// Size limits in bytes per kind
const SIZE_LIMITS: Record<MediaKind, number> = {
  video: 50 * 1024 * 1024,       // 50 MB
  image: 10 * 1024 * 1024,       // 10 MB
  pdf: 50 * 1024 * 1024,         // 50 MB
  presentation: 50 * 1024 * 1024, // 50 MB
}

// Allowed MIME types per kind
const ALLOWED_MIMES: Record<MediaKind, string[]> = {
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  presentation: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
}

// Extension map
const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

// ─── requestUpload ─────────────────────────────────────────────────────────────

export async function requestUpload(
  lessonId: string,
  kind: MediaKind,
  fileName: string,
  fileSize: number,
  mimeType: string,
): Promise<ActionResult<{ signedUrl: string; token: string; path: string }>> {
  try {
    await requireAdmin()

    if (!lessonId) return fail('lessonId é obrigatório.')

    const allowedMimes = ALLOWED_MIMES[kind]
    if (!allowedMimes) return fail('Tipo de mídia inválido.')
    if (!allowedMimes.includes(mimeType)) {
      return fail(`Tipo de arquivo não permitido para ${kind}. Tipos aceitos: ${allowedMimes.join(', ')}`)
    }

    const sizeLimit = SIZE_LIMITS[kind]
    if (fileSize > sizeLimit) {
      return fail(`Arquivo muito grande. Limite para ${kind}: ${Math.round(sizeLimit / 1024 / 1024)} MB.`)
    }

    const ext = MIME_TO_EXT[mimeType] ?? fileName.split('.').pop() ?? 'bin'
    const uuid = randomUUID()
    const path = `lessons/${lessonId}/${uuid}.${ext}`

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage
      .from('lesson-media')
      .createSignedUploadUrl(path)

    if (error || !data) {
      console.error('[requestUpload] signed URL error:', error?.message)
      return fail('Não foi possível gerar URL de upload. Tente novamente.')
    }

    return ok({ signedUrl: data.signedUrl, token: data.token, path })
  } catch (err) {
    console.error('[requestUpload] unexpected error:', err)
    return fail()
  }
}

// ─── confirmUpload ─────────────────────────────────────────────────────────────

export async function confirmUpload(
  lessonId: string,
  filePath: string,
  pathId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    if (!lessonId || !filePath) return fail('Dados inválidos.')

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('lessons')
      .update({ file_path: filePath })
      .eq('id', lessonId)

    if (error) {
      console.error('[confirmUpload] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    revalidatePath(`/admin/conteudos`)
    return ok()
  } catch (err) {
    console.error('[confirmUpload] unexpected error:', err)
    return fail()
  }
}

// ─── deleteMediaFile ───────────────────────────────────────────────────────────

export async function deleteMediaFile(
  lessonId: string,
  pathId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Fetch current file_path
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select('file_path')
      .eq('id', lessonId)
      .single()

    if (fetchError || !lesson) return fail('Aula não encontrada.')

    const filePath = lesson.file_path
    if (!filePath) return ok()

    // Delete from storage
    const adminClient = createAdminClient()
    const { error: storageError } = await adminClient.storage
      .from('lesson-media')
      .remove([filePath])

    if (storageError) {
      console.error('[deleteMediaFile] storage error:', storageError.message)
      // Continue to clear DB even if storage fails (orphan cleanup)
    }

    // Clear file_path in DB
    const { error: dbError } = await supabase
      .from('lessons')
      .update({ file_path: null })
      .eq('id', lessonId)

    if (dbError) {
      console.error('[deleteMediaFile] DB error:', dbError.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    revalidatePath('/admin/conteudos')
    return ok()
  } catch (err) {
    console.error('[deleteMediaFile] unexpected error:', err)
    return fail()
  }
}

// ─── requestSignedReadUrl ──────────────────────────────────────────────────────

export async function requestSignedReadUrl(
  lessonId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select('file_path')
      .eq('id', lessonId)
      .single()

    if (fetchError || !lesson) return fail('Aula não encontrada.')
    if (!lesson.file_path) return fail('Esta aula não possui arquivo de mídia.')

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage
      .from('lesson-media')
      .createSignedUrl(lesson.file_path, 3600)

    if (error || !data) {
      console.error('[requestSignedReadUrl] error:', error?.message)
      return fail('Não foi possível gerar URL de leitura.')
    }

    return ok({ url: data.signedUrl })
  } catch (err) {
    console.error('[requestSignedReadUrl] unexpected error:', err)
    return fail()
  }
}

// ─── requestSignedReadUrlForMember ─────────────────────────────────────────────

/**
 * Generates a signed read URL for a member who has access to the lesson.
 * Used by the lesson viewer server component.
 */
export async function requestSignedReadUrlForMember(
  lessonId: string,
  filePath: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = await createServerClient()

    // Verify lesson access via RLS
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('id, file_path')
      .eq('id', lessonId)
      .single()

    if (error || !lesson) return fail('Aula não encontrada.')
    if (!lesson.file_path) return fail('Esta aula não possui arquivo de mídia.')

    const adminClient = createAdminClient()
    const { data, error: urlError } = await adminClient.storage
      .from('lesson-media')
      .createSignedUrl(filePath, 3600)

    if (urlError || !data) {
      console.error('[requestSignedReadUrlForMember] error:', urlError?.message)
      return fail('Não foi possível gerar URL de leitura.')
    }

    return ok({ url: data.signedUrl })
  } catch (err) {
    console.error('[requestSignedReadUrlForMember] unexpected error:', err)
    return fail()
  }
}
