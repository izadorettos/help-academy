'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guards'
import { z } from 'zod'
import type { Database } from '@/types/database.types'

type ActivityPayloadJson = Database['public']['Functions']['submit_activity']['Args']['p_payload']

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnlockedAchievement {
  id: string
  code: string
  name: string
  icon: string
}

export type ActionResult =
  | { ok: true; xpEarned: number; achievementsUnlocked: UnlockedAchievement[] }
  | { ok: false; error: string }

export type QuizActionResult =
  | { ok: true; score: number; passed: boolean; correctCount: number; totalQuestions: number; passingScore: number; xpEarned: number; achievementsUnlocked: UnlockedAchievement[] }
  | { ok: false; error: string }

export type SaveProgressResult =
  | { ok: true; progressPercent: number; positionSeconds: number | null }
  | { ok: false; error: string }

export interface ActivityFeedback {
  [key: string]: unknown
}

export type SubmitActivityResult =
  | {
      ok: true
      status: 'submitted' | 'in_review' | 'completed'
      score: number | null
      feedback: ActivityFeedback | null
      xpEarned: number
      achievementsUnlocked: UnlockedAchievement[]
      nextLessonId: string | null
      submissionId: string
      alreadySubmitted: boolean
    }
  | { ok: false; error: string }

export type CheckAnswerResult =
  | { ok: true; correct: boolean; explanation: string | null }
  | { ok: false; error: string }

// ─── Schemas ─────────────────────────────────────────────────────────────────

// UUID regex — accepts all 8-4-4-4-12 hex patterns (including non-standard versions
// used in test seeds). Zod's built-in .uuid() requires RFC 4122 version bits.
const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID')

const answerSchema = z.object({
  questionId: uuidSchema,
  optionId: uuidSchema,
})

const submitQuizSchema = z.object({
  quizId: uuidSchema,
  answers: z.array(answerSchema).min(1).max(100),
})

const saveProgressSchema = z.object({
  lessonId: uuidSchema,
  progressPercent: z.number().int().min(0).max(100),
  positionSeconds: z.number().int().min(0).max(86_400).nullable().optional(),
})

const submitActivitySchema = z.object({
  lessonId: uuidSchema,
  payload: z.record(z.string(), z.unknown()),
})

const checkAnswerSchema = z.object({
  lessonId: uuidSchema,
  questionId: uuidSchema,
  optionId: uuidSchema,
})

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

    const { data: rpcData, error } = await supabase.rpc('complete_lesson', {
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

    const resultData = rpcData as {
      xp_awarded?: number
      already_completed?: boolean
      achievements_unlocked?: UnlockedAchievement[]
    } | null
    const xpEarned = resultData?.xp_awarded ?? 0
    const achievementsUnlocked = resultData?.achievements_unlocked ?? []

    // Revalidate pages that display lesson/path progress
    revalidatePath(`/aula/${lessonId}`)
    revalidatePath('/dashboard')
    revalidatePath('/trilhas')
    revalidatePath('/perfil')
    revalidatePath('/conquistas')

    return { ok: true, xpEarned, achievementsUnlocked }
  } catch (err) {
    console.error('[completeLesson] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado. Tente novamente.' }
  }
}

/**
 * Submits quiz answers by calling the `submit_quiz` RPC.
 * All answer checking happens server-side (is_correct is NEVER sent to client).
 * Returns the score, passed status, and counts on success.
 *
 * Security: requireUser() ensures only authenticated users can call this.
 * The RPC validates quiz access, answer integrity, and records the attempt.
 */
export async function submitQuiz(
  quizId: string,
  answers: { questionId: string; optionId: string }[],
): Promise<QuizActionResult> {
  try {
    await requireUser()

    // Validate inputs with Zod before sending to DB
    const parsed = submitQuizSchema.safeParse({ quizId, answers })
    if (!parsed.success) {
      return { ok: false, error: 'Dados inválidos. Verifique suas respostas e tente novamente.' }
    }

    const supabase = await createServerClient()

    // Convert camelCase answers to snake_case for the RPC
    const rpcAnswers = parsed.data.answers.map((a) => ({
      question_id: a.questionId,
      option_id: a.optionId,
    }))

    const { data, error } = await supabase.rpc('submit_quiz', {
      p_quiz_id: parsed.data.quizId,
      p_answers: rpcAnswers,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('NO_ACCESS')) {
        return { ok: false, error: 'Você não tem acesso a este quiz.' }
      }
      if (msg.includes('INVALID_ANSWERS')) {
        return { ok: false, error: 'Respostas inválidas. Responda todas as questões e tente novamente.' }
      }
      console.error('[submitQuiz] RPC error:', error.message)
      return { ok: false, error: 'Não foi possível enviar as respostas. Tente novamente.' }
    }

    const result = data as unknown as {
      score: number
      passed: boolean
      correct_count: number
      total_questions: number
      passing_score: number
      xp_awarded?: number
      achievements_unlocked?: UnlockedAchievement[]
    }

    // Revalidate lesson page to reflect updated attempt state
    revalidatePath(`/aula/${quizId}`)
    revalidatePath('/dashboard')
    revalidatePath('/trilhas')
    revalidatePath('/perfil')
    revalidatePath('/conquistas')

    return {
      ok: true,
      score: result.score,
      passed: result.passed,
      correctCount: result.correct_count,
      totalQuestions: result.total_questions,
      passingScore: result.passing_score,
      xpEarned: result.xp_awarded ?? 0,
      achievementsUnlocked: result.achievements_unlocked ?? [],
    }
  } catch (err) {
    console.error('[submitQuiz] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado. Tente novamente.' }
  }
}

/**
 * Salva progresso de vídeo (0..100 %) e opcionalmente a posição em segundos.
 * A RPC nunca reduz o progresso — usa greatest(existing, new) — e valida acesso.
 */
export async function saveLessonProgress(
  lessonId: string,
  progressPercent: number,
  positionSeconds: number | null = null,
): Promise<SaveProgressResult> {
  try {
    await requireUser()

    const parsed = saveProgressSchema.safeParse({ lessonId, progressPercent, positionSeconds })
    if (!parsed.success) {
      return { ok: false, error: 'Dados de progresso inválidos.' }
    }

    const supabase = await createServerClient()

    const { error } = await supabase.rpc('save_lesson_progress', {
      p_lesson_id: parsed.data.lessonId,
      p_percent: parsed.data.progressPercent,
      p_position: parsed.data.positionSeconds ?? undefined,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('NO_ACCESS')) {
        return { ok: false, error: 'Você não tem acesso a esta aula.' }
      }
      if (msg.includes('LESSON_LOCKED')) {
        return { ok: false, error: 'Esta aula está bloqueada.' }
      }
      console.error('[saveLessonProgress] RPC error:', error.message)
      return { ok: false, error: 'Não foi possível salvar o progresso.' }
    }

    return {
      ok: true,
      progressPercent: parsed.data.progressPercent,
      positionSeconds: parsed.data.positionSeconds ?? null,
    }
  } catch (err) {
    console.error('[saveLessonProgress] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado.' }
  }
}

/**
 * Envia uma atividade (task, challenge, survey, game) para avaliação server-side.
 * A RPC valida payload pelo config da aula, aplica regras, conclui a aula quando adequado
 * e distribui XP + conquistas.
 */
export async function submitActivity(
  lessonId: string,
  payload: Record<string, unknown>,
): Promise<SubmitActivityResult> {
  try {
    await requireUser()

    const parsed = submitActivitySchema.safeParse({ lessonId, payload })
    if (!parsed.success) {
      return { ok: false, error: 'Dados inválidos. Verifique sua resposta e tente novamente.' }
    }

    const supabase = await createServerClient()

    const { data, error } = await supabase.rpc('submit_activity', {
      p_lesson_id: parsed.data.lessonId,
      p_payload: parsed.data.payload as ActivityPayloadJson,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('NO_ACCESS')) {
        return { ok: false, error: 'Você não tem acesso a esta atividade.' }
      }
      if (msg.includes('LESSON_LOCKED')) {
        return { ok: false, error: 'Esta atividade está bloqueada.' }
      }
      if (msg.includes('INVALID_PAYLOAD')) {
        return { ok: false, error: 'Resposta incompleta. Preencha todos os campos obrigatórios.' }
      }
      if (msg.includes('INVALID_LESSON_TYPE')) {
        return { ok: false, error: 'Esta aula não aceita este tipo de envio.' }
      }
      if (msg.includes('MISSING_ANSWER_KEY')) {
        return { ok: false, error: 'Este game ainda não está configurado.' }
      }
      console.error('[submitActivity] RPC error:', error.message)
      return { ok: false, error: 'Não foi possível enviar sua resposta.' }
    }

    const result = data as {
      status?: string
      score?: number | null
      feedback?: ActivityFeedback | null
      xp_awarded?: number
      achievements_unlocked?: UnlockedAchievement[]
      next_lesson_id?: string | null
      submission_id?: string
      already_submitted?: boolean
    } | null

    revalidatePath(`/aula/${lessonId}`)
    revalidatePath('/dashboard')
    revalidatePath('/trilhas')
    revalidatePath('/perfil')
    revalidatePath('/conquistas')

    const status = (result?.status ?? 'submitted') as
      | 'submitted'
      | 'in_review'
      | 'completed'

    return {
      ok: true,
      status,
      score: result?.score ?? null,
      feedback: result?.feedback ?? null,
      xpEarned: result?.xp_awarded ?? 0,
      achievementsUnlocked: result?.achievements_unlocked ?? [],
      nextLessonId: result?.next_lesson_id ?? null,
      submissionId: String(result?.submission_id ?? ''),
      alreadySubmitted: Boolean(result?.already_submitted),
    }
  } catch (err) {
    console.error('[submitActivity] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado.' }
  }
}

/**
 * Verifica uma resposta de quiz individual (usado por quiz interativo).
 * Retorna se está correta + explicação. Não grava tentativa.
 */
export async function checkQuizAnswer(
  lessonId: string,
  questionId: string,
  optionId: string,
): Promise<CheckAnswerResult> {
  try {
    await requireUser()

    const parsed = checkAnswerSchema.safeParse({ lessonId, questionId, optionId })
    if (!parsed.success) {
      return { ok: false, error: 'Dados inválidos.' }
    }

    const supabase = await createServerClient()

    const { data, error } = await supabase.rpc('check_quiz_answer', {
      p_lesson_id: parsed.data.lessonId,
      p_question_id: parsed.data.questionId,
      p_option_id: parsed.data.optionId,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('NO_ACCESS')) {
        return { ok: false, error: 'Você não tem acesso a esta questão.' }
      }
      console.error('[checkQuizAnswer] RPC error:', error.message)
      return { ok: false, error: 'Não foi possível verificar a resposta.' }
    }

    const result = data as { correct?: boolean; explanation?: string | null } | null

    return {
      ok: true,
      correct: Boolean(result?.correct),
      explanation: result?.explanation ?? null,
    }
  } catch (err) {
    console.error('[checkQuizAnswer] unexpected error:', err)
    return { ok: false, error: 'Ocorreu um erro inesperado.' }
  }
}
