'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guards'
import { ok, fail, type ActionResult } from '@/lib/action-result'

// ─── Schemas ───────────────────────────────────────────────────────────────────

const quizSchema = z.object({
  title: z
    .string()
    .min(2, 'Título deve ter no mínimo 2 caracteres')
    .max(160, 'Título deve ter no máximo 160 caracteres')
    .trim(),
  passing_score: z.coerce
    .number()
    .int()
    .min(0, 'Nota mínima não pode ser negativa')
    .max(100, 'Nota mínima não pode ser maior que 100'),
})

const questionSchema = z.object({
  question: z
    .string()
    .min(2, 'Pergunta deve ter no mínimo 2 caracteres')
    .max(500, 'Pergunta deve ter no máximo 500 caracteres')
    .trim(),
  type: z.enum(['multiple_choice', 'true_false'], {
    error: 'Tipo de pergunta inválido',
  }),
  explanation: z.string().max(1000).trim().optional().nullable(),
})

const optionSchema = z.object({
  text: z
    .string()
    .min(1, 'Opção não pode estar vazia')
    .max(300, 'Opção deve ter no máximo 300 caracteres')
    .trim(),
  is_correct: z.boolean().default(false),
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function revalidateQuizPages(pathId: string, lessonId: string) {
  revalidatePath(`/admin/trilhas/${pathId}/aulas/${lessonId}/quiz`)
  revalidatePath(`/admin/trilhas/${pathId}`)
}

// ─── Quiz CRUD ─────────────────────────────────────────────────────────────────

export async function createQuiz(
  lessonId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const parsed = quizSchema.safeParse({
      title: formData.get('title'),
      passing_score: formData.get('passing_score'),
    })

    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        lesson_id: lessonId,
        title: parsed.data.title,
        passing_score: parsed.data.passing_score,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createQuiz] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createQuiz] unexpected error:', err)
    return fail()
  }
}

export async function updateQuiz(
  quizId: string,
  lessonId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = quizSchema.safeParse({
      title: formData.get('title'),
      passing_score: formData.get('passing_score'),
    })

    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('quizzes')
      .update({
        title: parsed.data.title,
        passing_score: parsed.data.passing_score,
      })
      .eq('id', quizId)

    if (error) {
      console.error('[updateQuiz] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok()
  } catch (err) {
    console.error('[updateQuiz] unexpected error:', err)
    return fail()
  }
}

export async function deleteQuiz(
  quizId: string,
  lessonId: string,
  pathId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Check if quiz has any attempts
    const { count, error: checkError } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quizId)

    if (checkError) {
      console.error('[deleteQuiz] check error:', checkError.message)
      return fail()
    }

    if (count && count > 0) {
      return fail('Não é possível excluir um quiz que já possui tentativas de usuários.')
    }

    const { error } = await supabase.from('quizzes').delete().eq('id', quizId)

    if (error) {
      console.error('[deleteQuiz] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok()
  } catch (err) {
    console.error('[deleteQuiz] unexpected error:', err)
    return fail()
  }
}

// ─── Question CRUD ─────────────────────────────────────────────────────────────

export async function createQuestion(
  quizId: string,
  lessonId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const parsed = questionSchema.safeParse({
      question: formData.get('question'),
      type: formData.get('type'),
      explanation: formData.get('explanation') || null,
    })

    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const supabase = await createServerClient()

    // Get max position
    const { data: maxPos } = await supabase
      .from('quiz_questions')
      .select('position')
      .eq('quiz_id', quizId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = maxPos ? maxPos.position + 1 : 1

    const { data, error } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quizId,
        question: parsed.data.question,
        type: parsed.data.type,
        explanation: parsed.data.explanation ?? null,
        position,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createQuestion] DB error:', error.message)
      return fail()
    }

    // For true_false, auto-create the two options
    if (parsed.data.type === 'true_false') {
      await supabase.from('quiz_options').insert([
        { question_id: data.id, text: 'Verdadeiro', is_correct: false, position: 1 },
        { question_id: data.id, text: 'Falso', is_correct: false, position: 2 },
      ])
    }

    revalidateQuizPages(pathId, lessonId)
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createQuestion] unexpected error:', err)
    return fail()
  }
}

export async function updateQuestion(
  questionId: string,
  lessonId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = questionSchema.safeParse({
      question: formData.get('question'),
      type: formData.get('type'),
      explanation: formData.get('explanation') || null,
    })

    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('quiz_questions')
      .update({
        question: parsed.data.question,
        type: parsed.data.type,
        explanation: parsed.data.explanation ?? null,
      })
      .eq('id', questionId)

    if (error) {
      console.error('[updateQuestion] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok()
  } catch (err) {
    console.error('[updateQuestion] unexpected error:', err)
    return fail()
  }
}

export async function deleteQuestion(
  questionId: string,
  lessonId: string,
  pathId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()
    // Options cascade via FK
    const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId)

    if (error) {
      console.error('[deleteQuestion] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok()
  } catch (err) {
    console.error('[deleteQuestion] unexpected error:', err)
    return fail()
  }
}

// ─── Option CRUD ───────────────────────────────────────────────────────────────

export async function createOption(
  questionId: string,
  lessonId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    const parsed = optionSchema.safeParse({
      text: formData.get('text'),
      is_correct: formData.get('is_correct') === 'true',
    })

    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const supabase = await createServerClient()

    // Get max position
    const { data: maxPos } = await supabase
      .from('quiz_options')
      .select('position')
      .eq('question_id', questionId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = maxPos ? maxPos.position + 1 : 1

    const { data, error } = await supabase
      .from('quiz_options')
      .insert({
        question_id: questionId,
        text: parsed.data.text,
        is_correct: parsed.data.is_correct,
        position,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createOption] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok({ id: data.id })
  } catch (err) {
    console.error('[createOption] unexpected error:', err)
    return fail()
  }
}

export async function updateOption(
  optionId: string,
  lessonId: string,
  pathId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const parsed = optionSchema.safeParse({
      text: formData.get('text'),
      is_correct: formData.get('is_correct') === 'true',
    })

    if (!parsed.success) {
      return fail('Dados inválidos.', parsed.error.flatten().fieldErrors)
    }

    const supabase = await createServerClient()
    const { error } = await supabase
      .from('quiz_options')
      .update({
        text: parsed.data.text,
        is_correct: parsed.data.is_correct,
      })
      .eq('id', optionId)

    if (error) {
      console.error('[updateOption] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok()
  } catch (err) {
    console.error('[updateOption] unexpected error:', err)
    return fail()
  }
}

export async function deleteOption(
  optionId: string,
  lessonId: string,
  pathId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()
    const { error } = await supabase.from('quiz_options').delete().eq('id', optionId)

    if (error) {
      console.error('[deleteOption] DB error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok()
  } catch (err) {
    console.error('[deleteOption] unexpected error:', err)
    return fail()
  }
}

/**
 * For multiple_choice: marks the given option as correct and all others in the
 * same question as false.
 * For true_false: same behavior — sets exactly one option as correct.
 */
export async function setCorrectOption(
  questionId: string,
  optionId: string,
  lessonId: string,
  pathId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const supabase = await createServerClient()

    // Reset all options in this question to false
    const { error: resetError } = await supabase
      .from('quiz_options')
      .update({ is_correct: false })
      .eq('question_id', questionId)

    if (resetError) {
      console.error('[setCorrectOption] reset error:', resetError.message)
      return fail()
    }

    // Mark the target option as correct
    const { error } = await supabase
      .from('quiz_options')
      .update({ is_correct: true })
      .eq('id', optionId)

    if (error) {
      console.error('[setCorrectOption] update error:', error.message)
      return fail()
    }

    revalidateQuizPages(pathId, lessonId)
    return ok()
  } catch (err) {
    console.error('[setCorrectOption] unexpected error:', err)
    return fail()
  }
}
