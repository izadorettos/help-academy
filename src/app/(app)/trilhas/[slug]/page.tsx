import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  CheckCircle2,
  Lock,
  ChevronRight,
  FileText,
  Video,
  FileType,
  ExternalLink,
  Code2,
  BookOpen,
  CheckSquare,
  Zap,
  ListChecks,
  Puzzle,
} from 'lucide-react'
import { requireUser } from '@/lib/auth/guards'
import { getPathBySlug } from '@/features/learning/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import type { PathLesson, PathModule, LessonState } from '@/features/learning/queries'
import type { Database } from '@/types/database.types'

type LessonType = Database['public']['Enums']['lesson_type']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTENT_TYPE_LABEL: Record<LessonType, string> = {
  text: 'Texto',
  video: 'Vídeo',
  pdf: 'PDF',
  link: 'Link',
  embed: 'Incorporado',
  task: 'Tarefa',
  challenge: 'Desafio',
  survey: 'Questionário',
  game: 'Game',
}

function ContentTypeIcon({ type }: { type: LessonType }) {
  const cls = 'size-4 shrink-0'
  switch (type) {
    case 'video':
      return <Video className={cls} aria-hidden />
    case 'pdf':
      return <FileType className={cls} aria-hidden />
    case 'link':
      return <ExternalLink className={cls} aria-hidden />
    case 'embed':
      return <Code2 className={cls} aria-hidden />
    case 'task':
      return <CheckSquare className={cls} aria-hidden />
    case 'challenge':
      return <Zap className={cls} aria-hidden />
    case 'survey':
      return <ListChecks className={cls} aria-hidden />
    case 'game':
      return <Puzzle className={cls} aria-hidden />
    default:
      return <FileText className={cls} aria-hidden />
  }
}

const STATE_STYLES: Record<LessonState, string> = {
  completed: 'text-success',
  available: 'text-brand',
  locked: 'text-text-subtle',
}

function LessonStateIcon({ state }: { state: LessonState }) {
  switch (state) {
    case 'completed':
      return <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Concluída" />
    case 'locked':
      return <Lock className="size-5 shrink-0 text-text-subtle" aria-label="Bloqueada" />
    default:
      return (
        <ChevronRight
          className="size-5 shrink-0 text-brand"
          aria-label="Disponível"
        />
      )
  }
}

// ─── Lesson item ──────────────────────────────────────────────────────────────

function LessonItem({ lesson }: { lesson: PathLesson }) {
  const isLocked = lesson.state === 'locked'

  const content = (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isLocked
          ? 'cursor-default text-text-subtle'
          : 'cursor-pointer hover:bg-surface-muted focus-within:ring-2 focus-within:ring-focus'
      }`}
    >
      <LessonStateIcon state={lesson.state} />
      <div className={`flex min-w-0 flex-1 items-center gap-2 ${STATE_STYLES[lesson.state]}`}>
        <ContentTypeIcon type={lesson.contentType} />
        <span className="truncate text-sm font-medium">{lesson.title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-text-subtle">
        {lesson.estimatedMinutes != null && lesson.estimatedMinutes > 0 && (
          <span>{lesson.estimatedMinutes} min</span>
        )}
        {!lesson.required && (
          <Badge variant="muted" className="text-xs">
            Opcional
          </Badge>
        )}
        <span className="sr-only">{CONTENT_TYPE_LABEL[lesson.contentType]}</span>
      </div>
    </div>
  )

  if (isLocked) {
    return <li>{content}</li>
  }

  return (
    <li>
      <Link href={`/aula/${lesson.id}`} className="block focus:outline-none">
        {content}
      </Link>
    </li>
  )
}

// ─── Module section ───────────────────────────────────────────────────────────

function ModuleSection({ module: mod, index }: { module: PathModule; index: number }) {
  const totalLessons = mod.lessons.length
  const completedLessons = mod.lessons.filter((l) => l.state === 'completed').length

  return (
    <section aria-label={`Módulo: ${mod.title}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="bg-brand text-on-brand flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 truncate font-semibold">{mod.title}</h2>
          {mod.description && (
            <p className="mt-0.5 text-xs text-text-muted">{mod.description}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-text-subtle">
          {completedLessons}/{totalLessons}
        </span>
      </div>

      {mod.lessons.length === 0 ? (
        <p className="px-3 py-2 text-sm text-text-muted">
          Nenhuma aula disponível neste módulo.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {mod.lessons.map((lesson) => (
            <LessonItem key={lesson.id} lesson={lesson} />
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  // We could fetch the path here, but to avoid double fetching we keep it simple.
  return { title: `Trilha — Help Academy`, alternates: { canonical: `/trilhas/${slug}` } }
}

export default async function TrilhaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await requireUser()

  const path = await getPathBySlug(slug, user.id)

  if (!path) notFound()

  const totalLessons = path.modules.reduce((sum, m) => sum + m.lessons.length, 0)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Navegação estrutural" className="text-sm text-text-muted">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/trilhas" className="hover:text-text hover:underline underline-offset-2">
              Trilhas
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li className="truncate font-medium text-text" aria-current="page">
            {path.title}
          </li>
        </ol>
      </nav>

      {/* Path header */}
      <header>
        {path.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={path.coverUrl}
            alt=""
            aria-hidden
            className="mb-4 h-48 w-full rounded-xl object-cover"
          />
        )}
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="text-h1 flex-1 font-bold leading-tight">{path.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            {path.required && <Badge variant="required">Obrigatória</Badge>}
            {path.sequential && <Badge variant="neutral">Sequencial</Badge>}
          </div>
        </div>
        {path.description && (
          <p className="mt-2 text-sm text-text-muted">{path.description}</p>
        )}

        {/* Progress bar */}
        <Card className="mt-4 p-4">
          <div className="mb-3 flex items-center justify-between gap-4 text-sm">
            <span className="text-text-muted">
              <BookOpen className="mr-1 inline size-4 align-text-bottom" aria-hidden />
              {totalLessons} {totalLessons === 1 ? 'aula' : 'aulas'}
              {path.requiredTotal > 0 && (
                <> · {path.requiredTotal} {path.requiredTotal === 1 ? 'obrigatória' : 'obrigatórias'}</>
              )}
            </span>
            <span className="font-medium">
              {path.requiredDone}/{path.requiredTotal} concluídas
            </span>
          </div>
          <ProgressBar
            value={path.percent}
            showValue
            variant={path.percent === 100 ? 'success' : 'brand'}
          />
        </Card>
      </header>

      {/* Modules */}
      <div className="space-y-6">
        {path.modules.length === 0 ? (
          <p className="text-sm text-text-muted">Esta trilha ainda não possui módulos.</p>
        ) : (
          path.modules.map((mod, index) => (
            <Card key={mod.id} className="p-4">
              <ModuleSection module={mod} index={index} />
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
