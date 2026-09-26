'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import {
  tutorialSchema,
  categorySchema,
  audienceSchema,
  type CategoryFormValues,
  type AudienceFormValues,
} from './schemas'

// ─── Tutorial CRUD ────────────────────────────────────────────────────────────

export async function createTutorial(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin()
    const raw = parseTutorialFormData(formData)
    const parsed = tutorialSchema.safeParse(raw)
    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const { audience_ids, ...tutorialData } = parsed.data
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('tutorials')
      .insert({ ...tutorialData, created_by: admin.id, updated_by: admin.id })
      .select('id')
      .single()

    if (error) {
      console.error('[createTutorial] DB error:', error.message)
      return fail()
    }

    // Insert audiences
    const audRows = audience_ids.map((aid) => ({ tutorial_id: data.id, audience_id: aid }))
    await supabase.from('tutorial_audiences').insert(audRows)

    revalidatePath('/admin/tutoriais')
    revalidatePath('/ajuda')
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createTutorial] unexpected:', err)
    return fail()
  }
}

export async function updateTutorial(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    const raw = parseTutorialFormData(formData)
    const parsed = tutorialSchema.safeParse(raw)
    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const { audience_ids, ...tutorialData } = parsed.data
    const supabase = await createServerClient()

    const { error } = await supabase
      .from('tutorials')
      .update({ ...tutorialData, updated_by: admin.id })
      .eq('id', id)

    if (error) {
      console.error('[updateTutorial] DB error:', error.message)
      return fail()
    }

    // Sync audiences: delete + insert
    await supabase.from('tutorial_audiences').delete().eq('tutorial_id', id)
    const audRows = audience_ids.map((aid) => ({ tutorial_id: id, audience_id: aid }))
    if (audRows.length > 0) {
      await supabase.from('tutorial_audiences').insert(audRows)
    }

    revalidatePath('/admin/tutoriais')
    revalidatePath('/ajuda')
    revalidatePath(`/ajuda/${tutorialData.slug}`)
    return ok()
  } catch (err) {
    console.error('[updateTutorial] unexpected:', err)
    return fail()
  }
}

export async function deleteTutorial(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()
    const adminClient = createAdminClient()

    // Get tutorial to find storage paths
    const { data: tut } = await supabase
      .from('tutorials')
      .select('slug, video_url, file_url, thumbnail_url')
      .eq('id', id)
      .single()

    if (tut) {
      // Remove storage files
      const storagePaths = [tut.video_url, tut.file_url, tut.thumbnail_url]
        .filter((u): u is string => typeof u === 'string' && u.startsWith('storage:tutorials/'))
        .map((u) => u.replace('storage:tutorials/', ''))

      if (storagePaths.length > 0) {
        const { error: storageErr } = await adminClient.storage
          .from('tutorials')
          .remove(storagePaths)
        if (storageErr) {
          console.error('[deleteTutorial] storage remove error:', storageErr.message)
        }
      }
    }

    const { error } = await supabase.from('tutorials').delete().eq('id', id)
    if (error) {
      console.error('[deleteTutorial] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/tutoriais')
    revalidatePath('/ajuda')
    return ok()
  } catch (err) {
    console.error('[deleteTutorial] unexpected:', err)
    return fail()
  }
}

export async function toggleTutorialPublished(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const { data: tut } = await supabase
      .from('tutorials')
      .select('is_published')
      .eq('id', id)
      .single()

    if (!tut) return fail('Tutorial não encontrado.')

    const { error } = await supabase
      .from('tutorials')
      .update({ is_published: !tut.is_published })
      .eq('id', id)

    if (error) return fail()

    revalidatePath('/admin/tutoriais')
    revalidatePath('/ajuda')
    return ok()
  } catch (err) {
    console.error('[toggleTutorialPublished] unexpected:', err)
    return fail()
  }
}

export async function toggleTutorialFeatured(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const { data: tut } = await supabase
      .from('tutorials')
      .select('is_featured')
      .eq('id', id)
      .single()

    if (!tut) return fail('Tutorial não encontrado.')

    const { error } = await supabase
      .from('tutorials')
      .update({ is_featured: !tut.is_featured })
      .eq('id', id)

    if (error) return fail()

    revalidatePath('/admin/tutoriais')
    revalidatePath('/ajuda')
    return ok()
  } catch (err) {
    console.error('[toggleTutorialFeatured] unexpected:', err)
    return fail()
  }
}

// ─── Media Upload (signed URLs) ───────────────────────────────────────────────

export async function requestTutorialUpload(
  tutorialId: string,
  kind: 'media' | 'thumbnail',
  fileName: string,
  _fileSize: number,
  _mimeType: string,
): Promise<ActionResult<{ signedUrl: string; token: string; path: string }>> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    // Get tutorial slug for path
    const { data: tut } = await supabase
      .from('tutorials')
      .select('slug')
      .eq('id', tutorialId)
      .single()

    if (!tut) return fail('Tutorial não encontrado.')

    const ext = fileName.split('.').pop() ?? ''
    const storagePath =
      kind === 'thumbnail'
        ? `${tut.slug}/cover.${ext}`
        : `${tut.slug}/${fileName}`

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage
      .from('tutorials')
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('[requestTutorialUpload] error:', error?.message)
      return fail()
    }

    return ok({ signedUrl: data.signedUrl, token: data.token, path: storagePath })
  } catch (err) {
    console.error('[requestTutorialUpload] unexpected:', err)
    return fail()
  }
}

export async function confirmTutorialUpload(
  tutorialId: string,
  filePath: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const storageRef = `storage:tutorials/${filePath}`

    // Determine if it's video or other file
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    const isVideo = ext === 'mp4' || ext === 'webm' || ext === 'mov'

    const update = isVideo
      ? { video_url: storageRef }
      : { file_url: storageRef }

    const { error } = await supabase
      .from('tutorials')
      .update(update)
      .eq('id', tutorialId)

    if (error) return fail()

    revalidatePath('/admin/tutoriais')
    return ok()
  } catch (err) {
    console.error('[confirmTutorialUpload] unexpected:', err)
    return fail()
  }
}

export async function requestThumbnailUpload(
  tutorialId: string,
  fileName: string,
  _fileSize: number,
  _mimeType: string,
): Promise<ActionResult<{ signedUrl: string; token: string; path: string }>> {
  return requestTutorialUpload(tutorialId, 'thumbnail', fileName, _fileSize, _mimeType)
}

export async function confirmThumbnailUpload(
  tutorialId: string,
  thumbnailPath: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const { error } = await supabase
      .from('tutorials')
      .update({ thumbnail_url: `storage:tutorials/${thumbnailPath}` })
      .eq('id', tutorialId)

    if (error) return fail()

    revalidatePath('/admin/tutoriais')
    return ok()
  } catch (err) {
    console.error('[confirmThumbnailUpload] unexpected:', err)
    return fail()
  }
}

// ─── Category CRUD ────────────────────────────────────────────────────────────

export async function createCategory(data: CategoryFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
    const parsed = categorySchema.safeParse(data)
    if (!parsed.success) return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)

    const supabase = await createServerClient()
    const { data: cat, error } = await supabase
      .from('help_categories')
      .insert(parsed.data)
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') return fail('Já existe uma categoria com este slug.')
      return fail()
    }

    revalidatePath('/admin/tutoriais/categorias')
    return ok({ id: cat.id })
  } catch (err) {
    console.error('[createCategory] unexpected:', err)
    return fail()
  }
}

export async function updateCategory(id: string, data: CategoryFormValues): Promise<ActionResult> {
  try {
    await requireAdmin()
    const parsed = categorySchema.safeParse(data)
    if (!parsed.success) return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('help_categories')
      .update(parsed.data)
      .eq('id', id)

    if (error) return fail()

    revalidatePath('/admin/tutoriais/categorias')
    revalidatePath('/ajuda')
    return ok()
  } catch (err) {
    console.error('[updateCategory] unexpected:', err)
    return fail()
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    // Check if in use
    const { count } = await supabase
      .from('tutorials')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if ((count ?? 0) > 0) {
      return fail('Esta categoria está em uso por tutoriais. Mova-os antes de excluir.')
    }

    const { error } = await supabase.from('help_categories').delete().eq('id', id)
    if (error) return fail()

    revalidatePath('/admin/tutoriais/categorias')
    return ok()
  } catch (err) {
    console.error('[deleteCategory] unexpected:', err)
    return fail()
  }
}

// ─── Audience CRUD ────────────────────────────────────────────────────────────

export async function createAudience(data: AudienceFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
    const parsed = audienceSchema.safeParse(data)
    if (!parsed.success) return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)

    const supabase = await createServerClient()
    const { data: aud, error } = await supabase
      .from('help_audiences')
      .insert(parsed.data)
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') return fail('Já existe um público com este slug.')
      return fail()
    }

    revalidatePath('/admin/tutoriais/publicos')
    return ok({ id: aud.id })
  } catch (err) {
    console.error('[createAudience] unexpected:', err)
    return fail()
  }
}

export async function updateAudience(id: string, data: AudienceFormValues): Promise<ActionResult> {
  try {
    await requireAdmin()
    const parsed = audienceSchema.safeParse(data)
    if (!parsed.success) return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('help_audiences')
      .update(parsed.data)
      .eq('id', id)

    if (error) return fail()

    revalidatePath('/admin/tutoriais/publicos')
    revalidatePath('/ajuda')
    return ok()
  } catch (err) {
    console.error('[updateAudience] unexpected:', err)
    return fail()
  }
}

export async function deleteAudience(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createServerClient()

    const { error } = await supabase.from('help_audiences').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') return fail('Este público está em uso por tutoriais.')
      return fail()
    }

    revalidatePath('/admin/tutoriais/publicos')
    return ok()
  } catch (err) {
    console.error('[deleteAudience] unexpected:', err)
    return fail()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTutorialFormData(formData: FormData): Record<string, unknown> {
  const get = (k: string) => formData.get(k)
  return {
    title:               get('title'),
    slug:                get('slug'),
    description:         get('description'),
    category_id:         get('category_id'),
    content_type:        get('content_type'),
    video_url:           get('video_url') || null,
    file_url:            get('file_url') || null,
    thumbnail_url:       get('thumbnail_url') || null,
    duration_seconds:    get('duration_seconds') ? Number(get('duration_seconds')) : null,
    pages:               get('pages') ? Number(get('pages')) : null,
    app_version:         get('app_version') || null,
    freshness:           get('freshness') || 'current',
    freshness_note:      get('freshness_note') || null,
    visibility:          get('visibility') || 'authenticated',
    is_published:        get('is_published') === 'true',
    is_featured:         get('is_featured') === 'true',
    sort_order:          get('sort_order') ? Number(get('sort_order')) : 0,
    series_id:           get('series_id') || null,
    series_position:     get('series_position') ? Number(get('series_position')) : null,
    last_content_update: get('last_content_update'),
    date_source:         get('date_source') || null,
    audience_ids:        formData.getAll('audience_ids'),
  }
}
