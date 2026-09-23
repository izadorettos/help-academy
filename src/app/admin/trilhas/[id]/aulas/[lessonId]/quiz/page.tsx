import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetQuiz, adminGetLessonForEditor } from '@/features/admin/quiz/queries'
import { ArrowLeft, BookOpen, ClipboardList } from 'lucide-react'
import { QuizBuilder } from './quiz-builder'

interface Props {
  params: Promise<{ id: string; lessonId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params
  const lesson = await adminGetLessonForEditor(lessonId)
  return { title: `Quiz: ${lesson?.title ?? 'Aula'} — Admin — Help Academy` }
}

export default async function QuizPage({ params }: Props) {
  await requireAdmin()
  const { id: pathId, lessonId } = await params

  const [lesson, quiz] = await Promise.all([
    adminGetLessonForEditor(lessonId),
    adminGetQuiz(lessonId),
  ])

  if (!lesson || lesson.pathId !== pathId) notFound()

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href={`/admin/trilhas/${pathId}`}
        className="text-text-muted hover:text-text inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {lesson.pathTitle}
      </Link>

      {/* Breadcrumb */}
      <div className="space-y-1">
        <p className="text-text-muted text-xs">
          {lesson.pathTitle} / {lesson.moduleName}
        </p>
        <h1 className="text-h1 font-bold">{lesson.title}</h1>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href={`/admin/trilhas/${pathId}/aulas/${lessonId}/editar`}
          className="border-border text-text-muted hover:text-text inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <BookOpen className="size-4" aria-hidden />
          Editar conteúdo
        </Link>
        <Link
          href={`/admin/trilhas/${pathId}/aulas/${lessonId}/quiz`}
          className="border-brand text-brand inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
          aria-current="page"
        >
          <ClipboardList className="size-4" aria-hidden />
          Gerenciar quiz
        </Link>
      </div>

      {/* Quiz builder */}
      <div>
        <h2 className="mb-4 text-base font-semibold">
          {quiz ? 'Quiz da aula' : 'Sem quiz'}
        </h2>
        <QuizBuilder quiz={quiz} lessonId={lessonId} pathId={pathId} />
      </div>
    </div>
  )
}
