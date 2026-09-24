'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { lessonSchema, parseLessonFormData } from './schemas'
import { getYouTubeEmbedUrl, isAllowedEmbed } from '@/lib/embed-allowlist'
import type { Database } from '@/types/database.types'

type Json = Database['public']['Tables']['lessons']['Insert']['config']

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createLesson(
  moduleId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const raw = parseLessonFormData(formData)
    const parsed = lessonSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { title, content_type, content, external_url, file_path, estimated_minutes, required, config } =
      parsed.data

    const supabase = await createServerClient()

    // Get max position for lessons in this module
    const { data: maxPos } = await supabase
      .from('lessons')
      .select('position')
      .eq('module_id', moduleId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = maxPos ? maxPos.position + 1 : 1

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title,
        content_type,
        content: content ?? null,
        external_url: external_url ?? null,
        file_path: file_path ?? null,
        estimated_minutes: estimated_minutes ?? null,
        required,
        published: false,
        position,
        config: (config ?? {}) as Json,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createLesson] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    revalidatePath('/admin/conteudos')
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createLesson] unexpected error:', err)
    return fail()
  }
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updateLesson(
  id: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = parseLessonFormData(formData)
    const parsed = lessonSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { title, content_type, content, external_url, file_path, estimated_minutes, required, config } =
      parsed.data

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('lessons')
      .update({
        title,
        content_type,
        content: content ?? null,
        external_url: external_url ?? null,
        file_path: file_path ?? null,
        estimated_minutes: estimated_minutes ?? null,
        required,
        config: (config ?? {}) as Json,
      })
      .eq('id', id)

    if (error) {
      console.error('[updateLesson] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    revalidatePath('/admin/conteudos')
    return ok()
  } catch (err) {
    console.error('[updateLesson] unexpected error:', err)
    return fail()
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteLesson(id: string, pathId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Check if lesson has any progress
    const { count, error: checkError } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', id)

    if (checkError) {
      console.error('[deleteLesson] check error:', checkError.message)
      return fail()
    }

    if (count && count > 0) {
      return fail('Não é possível excluir uma aula que já possui progresso de usuários.')
    }

    const { error } = await supabase.from('lessons').delete().eq('id', id)

    if (error) {
      console.error('[deleteLesson] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    revalidatePath('/admin/conteudos')
    return ok()
  } catch (err) {
    console.error('[deleteLesson] unexpected error:', err)
    return fail()
  }
}

// ─── Update lesson content ─────────────────────────────────────────────────────

/**
 * Updates lesson content/URL/file depending on content_type.
 * PDF files are uploaded to Supabase Storage via the admin client (service role).
 */
export async function updateLessonContent(
  lessonId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Fetch lesson to determine content_type
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select('id, content_type')
      .eq('id', lessonId)
      .single()

    if (fetchError || !lesson) return fail('Aula não encontrada.')

    const contentType = lesson.content_type

    if (contentType === 'text') {
      const content = formData.get('content') as string | null
      if (!content?.trim()) return fail('Conteúdo é obrigatório para aulas de texto.')

      const { error } = await supabase
        .from('lessons')
        .update({ content: content.trim() })
        .eq('id', lessonId)

      if (error) {
        console.error('[updateLessonContent] text update error:', error.message)
        return fail()
      }
    } else if (contentType === 'video') {
      const rawUrl = (formData.get('external_url') as string | null)?.trim() ?? ''
      if (!rawUrl) return fail('URL do vídeo é obrigatória.')
      const embedUrl = getYouTubeEmbedUrl(rawUrl)
      if (!embedUrl) return fail('URL do YouTube inválida. Use o formato https://youtu.be/... ou https://www.youtube.com/watch?v=...')

      const { error } = await supabase
        .from('lessons')
        .update({ external_url: embedUrl })
        .eq('id', lessonId)

      if (error) {
        console.error('[updateLessonContent] video update error:', error.message)
        return fail()
      }
    } else if (contentType === 'link') {
      const url = (formData.get('external_url') as string | null)?.trim() ?? ''
      if (!url) return fail('URL é obrigatória.')
      if (!url.startsWith('https://')) return fail('URL deve começar com https://')
      const titleOverride = (formData.get('content') as string | null)?.trim() || null

      const { error } = await supabase
        .from('lessons')
        .update({ external_url: url, content: titleOverride })
        .eq('id', lessonId)

      if (error) {
        console.error('[updateLessonContent] link update error:', error.message)
        return fail()
      }
    } else if (contentType === 'embed') {
      const url = (formData.get('external_url') as string | null)?.trim() ?? ''
      if (!url) return fail('URL de embed é obrigatória.')
      if (!isAllowedEmbed(url)) return fail('Domínio de embed não permitido. Verifique a lista de domínios autorizados.')

      const { error } = await supabase
        .from('lessons')
        .update({ external_url: url })
        .eq('id', lessonId)

      if (error) {
        console.error('[updateLessonContent] embed update error:', error.message)
        return fail()
      }
    } else if (contentType === 'pdf') {
      const file = formData.get('file') as File | null
      if (!file || file.size === 0) return fail('Selecione um arquivo PDF.')
      if (file.type !== 'application/pdf') return fail('Apenas arquivos PDF são aceitos.')
      if (file.size > 50 * 1024 * 1024) return fail('Arquivo muito grande. O tamanho máximo é 50 MB.')

      const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `lessons/${lessonId}/${Date.now()}_${safeFilename}`

      const adminClient = createAdminClient()
      const { error: uploadError } = await adminClient.storage
        .from('lesson-files')
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('[updateLessonContent] storage upload error:', uploadError.message)
        return fail('Falha no upload do arquivo. Tente novamente.')
      }

      const { error } = await supabase
        .from('lessons')
        .update({ file_path: storagePath })
        .eq('id', lessonId)

      if (error) {
        console.error('[updateLessonContent] pdf db update error:', error.message)
        return fail()
      }
    } else {
      return fail('Tipo de conteúdo não suportado.')
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    revalidatePath(`/admin/trilhas/${pathId}/aulas/${lessonId}/editar`)
    revalidatePath('/admin/conteudos')
    return ok()
  } catch (err) {
    console.error('[updateLessonContent] unexpected error:', err)
    return fail()
  }
}

// ─── Toggle published ──────────────────────────────────────────────────────────

export async function toggleLessonPublished(
  id: string,
  pathId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    const { data: current, error: fetchError } = await supabase
      .from('lessons')
      .select('published')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return fail('Aula não encontrada.')
    }

    const { error } = await supabase
      .from('lessons')
      .update({ published: !current.published })
      .eq('id', id)

    if (error) {
      console.error('[toggleLessonPublished] DB error:', error.message)
      return fail()
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    revalidatePath('/admin/conteudos')
    return ok()
  } catch (err) {
    console.error('[toggleLessonPublished] unexpected error:', err)
    return fail()
  }
}
