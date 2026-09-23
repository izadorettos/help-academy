'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { pathSchema, parsePathFormData, generateSlug } from './schemas'

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createPath(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const raw = parsePathFormData(formData)

    // Auto-generate slug from title if not provided
    if (!raw.slug && typeof raw.title === 'string') {
      raw.slug = generateSlug(raw.title)
    }

    const parsed = pathSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { title, slug, description, owner_department_id, required, sequential } = parsed.data

    const supabase = await createServerClient()

    // Get current max position
    const { data: maxPos } = await supabase
      .from('learning_paths')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = maxPos ? maxPos.position + 1 : 0

    const { data, error } = await supabase
      .from('learning_paths')
      .insert({
        title,
        slug,
        description: description ?? null,
        owner_department_id: owner_department_id ?? null,
        required,
        sequential,
        status: 'draft',
        position,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return fail('Já existe uma trilha com este slug. Escolha outro.')
      }
      console.error('[createPath] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/trilhas')
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createPath] unexpected error:', err)
    return fail()
  }
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updatePath(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = parsePathFormData(formData)
    if (!raw.slug && typeof raw.title === 'string') {
      raw.slug = generateSlug(raw.title)
    }

    const parsed = pathSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return fail('Dados inválidos.', fieldErrors)
    }

    const { title, slug, description, owner_department_id, required, sequential } = parsed.data

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('learning_paths')
      .update({
        title,
        slug,
        description: description ?? null,
        owner_department_id: owner_department_id ?? null,
        required,
        sequential,
      })
      .eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return fail('Já existe uma trilha com este slug. Escolha outro.')
      }
      console.error('[updatePath] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/trilhas')
    revalidatePath(`/admin/trilhas/${id}`)
    revalidatePath(`/admin/trilhas/${id}/editar`)
    return ok()
  } catch (err) {
    console.error('[updatePath] unexpected error:', err)
    return fail()
  }
}

// ─── Publish ───────────────────────────────────────────────────────────────────

export async function publishPath(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Validate: must have at least 1 published module with at least 1 published lesson
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, lessons!inner(id)')
      .eq('learning_path_id', id)
      .eq('lessons.published', true)

    if (modulesError) {
      console.error('[publishPath] modules query error:', modulesError.message)
      return fail()
    }

    const hasPublishedContent = modules && modules.length > 0

    if (!hasPublishedContent) {
      return fail(
        'A trilha precisa ter pelo menos 1 módulo com pelo menos 1 aula publicada para ser publicada.',
      )
    }

    const { error } = await supabase
      .from('learning_paths')
      .update({ status: 'published' })
      .eq('id', id)
      .eq('status', 'draft')

    if (error) {
      console.error('[publishPath] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/trilhas')
    revalidatePath(`/admin/trilhas/${id}`)
    return ok()
  } catch (err) {
    console.error('[publishPath] unexpected error:', err)
    return fail()
  }
}

// ─── Unpublish ─────────────────────────────────────────────────────────────────

export async function unpublishPath(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('learning_paths')
      .update({ status: 'draft' })
      .eq('id', id)
      .eq('status', 'published')

    if (error) {
      console.error('[unpublishPath] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/trilhas')
    revalidatePath(`/admin/trilhas/${id}`)
    return ok()
  } catch (err) {
    console.error('[unpublishPath] unexpected error:', err)
    return fail()
  }
}

// ─── Archive ───────────────────────────────────────────────────────────────────

export async function archivePath(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('learning_paths')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) {
      console.error('[archivePath] DB error:', error.message)
      return fail()
    }

    revalidatePath('/admin/trilhas')
    revalidatePath(`/admin/trilhas/${id}`)
    return ok()
  } catch (err) {
    console.error('[archivePath] unexpected error:', err)
    return fail()
  }
}

// ─── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicatePath(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Fetch original path
    const { data: original, error: fetchError } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !original) {
      return fail('Trilha não encontrada.')
    }

    // Get next slug (append -copia or -copia-2, etc.)
    const baseSlug = `${original.slug}-copia`
    let finalSlug = baseSlug
    let attempt = 1
    while (true) {
      const { data: existing } = await supabase
        .from('learning_paths')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle()
      if (!existing) break
      attempt++
      finalSlug = `${baseSlug}-${attempt}`
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from('learning_paths')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = maxPos ? maxPos.position + 1 : 0

    // Insert new path
    const { data: newPath, error: insertError } = await supabase
      .from('learning_paths')
      .insert({
        title: `${original.title} (cópia)`,
        slug: finalSlug,
        description: original.description,
        cover_url: original.cover_url,
        owner_department_id: original.owner_department_id,
        required: original.required,
        sequential: original.sequential,
        status: 'draft',
        position,
      })
      .select('id')
      .single()

    if (insertError || !newPath) {
      console.error('[duplicatePath] insert path error:', insertError?.message)
      return fail()
    }

    const newPathId = newPath.id

    // Copy department assignments
    const { data: depts } = await supabase
      .from('learning_path_departments')
      .select('department_id')
      .eq('learning_path_id', id)

    if (depts && depts.length > 0) {
      await supabase.from('learning_path_departments').insert(
        depts.map((d) => ({
          learning_path_id: newPathId,
          department_id: d.department_id,
        })),
      )
    }

    // Fetch modules
    const { data: modules } = await supabase
      .from('modules')
      .select('*')
      .eq('learning_path_id', id)
      .order('position', { ascending: true })

    for (const srcModule of modules ?? []) {
      const { data: newModule, error: moduleError } = await supabase
        .from('modules')
        .insert({
          learning_path_id: newPathId,
          title: srcModule.title,
          description: srcModule.description,
          position: srcModule.position,
        })
        .select('id')
        .single()

      if (moduleError || !newModule) {
        console.error('[duplicatePath] insert module error:', moduleError?.message)
        continue
      }

      // Fetch lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', srcModule.id)
        .order('position', { ascending: true })

      for (const lesson of lessons ?? []) {
        const { data: newLesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            module_id: newModule.id,
            title: lesson.title,
            description: lesson.description,
            content_type: lesson.content_type,
            content: lesson.content,
            external_url: lesson.external_url,
            file_path: lesson.file_path,
            estimated_minutes: lesson.estimated_minutes,
            xp_reward: lesson.xp_reward,
            required: lesson.required,
            published: false, // copy starts unpublished
            position: lesson.position,
          })
          .select('id')
          .single()

        if (lessonError || !newLesson) {
          console.error('[duplicatePath] insert lesson error:', lessonError?.message)
          continue
        }

        // Copy quiz if exists
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('*')
          .eq('lesson_id', lesson.id)
          .maybeSingle()

        if (quiz) {
          const { data: newQuiz, error: quizError } = await supabase
            .from('quizzes')
            .insert({
              lesson_id: newLesson.id,
              title: quiz.title,
              passing_score: quiz.passing_score,
              xp_reward: quiz.xp_reward,
            })
            .select('id')
            .single()

          if (quizError || !newQuiz) continue

          const { data: questions } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', quiz.id)
            .order('position', { ascending: true })

          for (const question of questions ?? []) {
            const { data: newQuestion, error: questionError } = await supabase
              .from('quiz_questions')
              .insert({
                quiz_id: newQuiz.id,
                question: question.question,
                type: question.type,
                explanation: question.explanation,
                position: question.position,
              })
              .select('id')
              .single()

            if (questionError || !newQuestion) continue

            const { data: options } = await supabase
              .from('quiz_options')
              .select('*')
              .eq('question_id', question.id)
              .order('position', { ascending: true })

            if (options && options.length > 0) {
              await supabase.from('quiz_options').insert(
                options.map((opt) => ({
                  question_id: newQuestion.id,
                  text: opt.text,
                  is_correct: opt.is_correct,
                  position: opt.position,
                })),
              )
            }
          }
        }
      }
    }

    revalidatePath('/admin/trilhas')
    return ok({ id: newPathId })
  } catch (err) {
    console.error('[duplicatePath] unexpected error:', err)
    return fail()
  }
}

// ─── Set departments ───────────────────────────────────────────────────────────

export async function setPathDepartments(
  id: string,
  departmentIds: string[],
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Delete all current assignments
    const { error: deleteError } = await supabase
      .from('learning_path_departments')
      .delete()
      .eq('learning_path_id', id)

    if (deleteError) {
      console.error('[setPathDepartments] delete error:', deleteError.message)
      return fail()
    }

    // Insert new ones
    if (departmentIds.length > 0) {
      const { error: insertError } = await supabase.from('learning_path_departments').insert(
        departmentIds.map((dept_id) => ({
          learning_path_id: id,
          department_id: dept_id,
        })),
      )

      if (insertError) {
        console.error('[setPathDepartments] insert error:', insertError.message)
        return fail()
      }
    }

    revalidatePath(`/admin/trilhas/${id}`)
    return ok()
  } catch (err) {
    console.error('[setPathDepartments] unexpected error:', err)
    return fail()
  }
}

// ─── Reorder modules ───────────────────────────────────────────────────────────

export async function reorderModules(
  pathId: string,
  moduleIds: string[],
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    for (let i = 0; i < moduleIds.length; i++) {
      const moduleId = moduleIds[i]
      if (!moduleId) continue
      const { error } = await supabase
        .from('modules')
        .update({ position: i + 1 })
        .eq('id', moduleId)
        .eq('learning_path_id', pathId)

      if (error) {
        console.error('[reorderModules] update error:', error.message)
        return fail()
      }
    }

    revalidatePath(`/admin/trilhas/${pathId}`)
    return ok()
  } catch (err) {
    console.error('[reorderModules] unexpected error:', err)
    return fail()
  }
}
