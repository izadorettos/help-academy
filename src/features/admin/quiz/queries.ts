import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export interface AdminQuizOption {
  id: string
  questionId: string
  text: string
  isCorrect: boolean
  position: number
}

export interface AdminQuizQuestion {
  id: string
  quizId: string
  question: string
  type: 'multiple_choice' | 'true_false'
  explanation: string | null
  position: number
  options: AdminQuizOption[]
}

export interface AdminQuiz {
  id: string
  lessonId: string
  title: string
  passingScore: number
  xpReward: number | null
  createdAt: string
  updatedAt: string
  questions: AdminQuizQuestion[]
}

/**
 * Returns the quiz for a lesson with all questions and options (including is_correct).
 * Admin-only — must be called from a server context after requireAdmin().
 */
export async function adminGetQuiz(lessonId: string): Promise<AdminQuiz | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `id, lesson_id, title, passing_score, xp_reward, created_at, updated_at,
       quiz_questions (
         id, quiz_id, question, type, explanation, position,
         quiz_options (
           id, question_id, text, is_correct, position
         )
       )`,
    )
    .eq('lesson_id', lessonId)
    .single()

  if (error || !data) return null

  const questions = (Array.isArray(data.quiz_questions) ? data.quiz_questions : [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((q: {
      id: string
      quiz_id: string
      question: string
      type: string
      explanation: string | null
      position: number
      quiz_options: Array<{
        id: string
        question_id: string
        text: string
        is_correct: boolean
        position: number
      }>
    }) => ({
      id: q.id,
      quizId: q.quiz_id,
      question: q.question,
      type: q.type as 'multiple_choice' | 'true_false',
      explanation: q.explanation ?? null,
      position: q.position,
      options: (Array.isArray(q.quiz_options) ? q.quiz_options : [])
        .sort((a, b) => a.position - b.position)
        .map((o) => ({
          id: o.id,
          questionId: o.question_id,
          text: o.text,
          isCorrect: o.is_correct,
          position: o.position,
        })),
    }))

  return {
    id: data.id,
    lessonId: data.lesson_id,
    title: data.title,
    passingScore: data.passing_score,
    xpReward: data.xp_reward ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    questions,
  }
}

/**
 * Returns a lesson with its breadcrumb for use in editor pages.
 */
export interface AdminLessonEditorData {
  id: string
  title: string
  contentType: 'text' | 'video' | 'pdf' | 'link' | 'embed' | 'task' | 'challenge' | 'survey' | 'game' | 'image' | 'presentation'
  content: string | null
  externalUrl: string | null
  filePath: string | null
  moduleId: string
  moduleName: string
  pathId: string
  pathTitle: string
}

export async function adminGetLessonForEditor(
  lessonId: string,
): Promise<AdminLessonEditorData | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(
      `id, title, content_type, content, external_url, file_path, module_id,
       modules!inner (
         id, title, learning_path_id,
         learning_paths!inner (id, title)
       )`,
    )
    .eq('id', lessonId)
    .single()

  if (error || !data) return null

  const mod = Array.isArray(data.modules) ? data.modules[0] : data.modules
  const path = mod
    ? Array.isArray(mod.learning_paths)
      ? mod.learning_paths[0]
      : mod.learning_paths
    : null

  return {
    id: data.id,
    title: data.title,
    contentType: data.content_type as AdminLessonEditorData['contentType'],
    content: data.content ?? null,
    externalUrl: data.external_url ?? null,
    filePath: data.file_path ?? null,
    moduleId: data.module_id,
    moduleName: mod?.title ?? '',
    pathId: path?.id ?? '',
    pathTitle: path?.title ?? '',
  }
}
