import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  Lock,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  ExternalLink,
  FileType,
} from 'lucide-react'
import { requireUser } from '@/lib/auth/guards'
import { getLessonForMember } from '@/features/learning/queries'
import { isAllowedEmbed, getYouTubeEmbedUrl } from '@/lib/embed-allowlist'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { renderMarkdown } from '@/lib/markdown'
import { CompleteButton } from '@/components/learning/complete-button'
import type { LessonForMember } from '@/features/learning/queries'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Aula — Help Academy',
    alternates: { canonical: `/aula/${id}` },
  }
}

// ─── Locked screen ────────────────────────────────────────────────────────────

function LockedLesson({ lesson }: { lesson: LessonForMember }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="bg-surface-muted flex size-16 items-center justify-center rounded-full">
          <Lock className="text-text-subtle size-8" aria-hidden />
        </div>
        <div>
          <h1 className="text-h2 font-bold">{lesson.title}</h1>
          <p className="mt-2 text-sm text-text-muted">
            Esta aula ainda está bloqueada. Conclua as aulas anteriores obrigatórias da trilha{' '}
            <strong>{lesson.path.title}</strong> para desbloqueá-la.
          </p>
        </div>
        <Link
          href={`/trilhas/${lesson.path.slug}`}
          className="text-brand hover:underline text-sm font-medium underline-offset-2"
        >
          Voltar para a trilha
        </Link>
      </Card>
    </div>
  )
}

// ─── Content viewers ──────────────────────────────────────────────────────────

function TextViewer({ content }: { content: string }) {
  const html = renderMarkdown(content)
  return (
    <div
      className="prose prose-sm max-w-none"
      // HTML sanitizado por renderMarkdown (sanitize-html)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function VideoViewer({ externalUrl }: { externalUrl: string }) {
  const embedUrl = getYouTubeEmbedUrl(externalUrl)

  if (embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={embedUrl}
          title="Vídeo da aula"
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  // Fallback: direct video file
  if (isAllowedEmbed(externalUrl)) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <video src={externalUrl} controls className="size-full">
          <track kind="captions" />
        </video>
      </div>
    )
  }

  return (
    <Card className="p-4 text-sm text-text-muted">
      Não foi possível carregar o vídeo. URL fora do domínio permitido.
    </Card>
  )
}

function LinkViewer({ externalUrl, title }: { externalUrl: string; title: string }) {
  return (
    <Card className="p-6">
      <p className="mb-4 text-sm text-text-muted">
        Esta aula contém um link externo. Clique no botão abaixo para acessá-lo.
      </p>
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-brand text-on-brand inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
      >
        <ExternalLink className="size-4" aria-hidden />
        {title}
      </a>
    </Card>
  )
}

function EmbedViewer({ externalUrl }: { externalUrl: string }) {
  if (!isAllowedEmbed(externalUrl)) {
    return (
      <Card className="p-4 text-sm text-text-muted">
        Conteúdo incorporado não pôde ser exibido: domínio fora da lista de permissões.
      </Card>
    )
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
      <iframe
        src={externalUrl}
        title="Conteúdo incorporado"
        className="size-full"
        allow="autoplay"
        allowFullScreen
      />
    </div>
  )
}

function PdfViewer({
  signedPdfUrl,
  filePath,
}: {
  signedPdfUrl: string | null
  filePath: string | null
}) {
  if (!signedPdfUrl) {
    return (
      <Card className="p-4 text-sm text-text-muted">
        Não foi possível carregar o PDF. Tente novamente mais tarde.
      </Card>
    )
  }

  const fileName = filePath?.split('/').pop() ?? 'documento.pdf'

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <div className="bg-surface-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
          <FileType className="text-text-muted size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fileName}</p>
          <p className="text-xs text-text-muted">Documento PDF · link válido por 1 hora</p>
        </div>
        <a
          href={signedPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand text-on-brand shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
        >
          Abrir PDF
        </a>
      </div>
    </Card>
  )
}

function LessonViewer({ lesson }: { lesson: LessonForMember }) {
  switch (lesson.contentType) {
    case 'text':
      return lesson.content ? (
        <TextViewer content={lesson.content} />
      ) : (
        <p className="text-sm text-text-muted">Conteúdo não disponível.</p>
      )

    case 'video':
      return lesson.externalUrl ? (
        <VideoViewer externalUrl={lesson.externalUrl} />
      ) : (
        <p className="text-sm text-text-muted">URL do vídeo não disponível.</p>
      )

    case 'link':
      return lesson.externalUrl ? (
        <LinkViewer externalUrl={lesson.externalUrl} title={lesson.title} />
      ) : (
        <p className="text-sm text-text-muted">Link não disponível.</p>
      )

    case 'embed':
      return lesson.externalUrl ? (
        <EmbedViewer externalUrl={lesson.externalUrl} />
      ) : (
        <p className="text-sm text-text-muted">URL de incorporação não disponível.</p>
      )

    case 'pdf':
      return (
        <PdfViewer signedPdfUrl={lesson.signedPdfUrl} filePath={lesson.filePath} />
      )

    default:
      return <p className="text-sm text-text-muted">Tipo de conteúdo não reconhecido.</p>
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function LessonNav({
  prevLessonId,
  nextLessonId,
}: {
  prevLessonId: string | null
  nextLessonId: string | null
}) {
  if (!prevLessonId && !nextLessonId) return null

  return (
    <nav
      aria-label="Navegação entre aulas"
      className="flex items-center justify-between gap-4 border-t border-border pt-6"
    >
      <div>
        {prevLessonId && (
          <Link
            href={`/aula/${prevLessonId}`}
            className="text-brand inline-flex items-center gap-1.5 text-sm font-medium hover:underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-focus rounded"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Aula anterior
          </Link>
        )}
      </div>
      <div>
        {nextLessonId && (
          <Link
            href={`/aula/${nextLessonId}`}
            className="text-brand inline-flex items-center gap-1.5 text-sm font-medium hover:underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-focus rounded"
          >
            Próxima aula
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AulaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()

  const lesson = await getLessonForMember(id, user.id)

  // No lesson, not published, or no path access → 404
  if (!lesson) notFound()

  // Locked lesson → show lock screen (not 404)
  if (lesson.locked) {
    return <LockedLesson lesson={lesson} />
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Navegação estrutural" className="text-sm text-text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/trilhas" className="hover:text-text hover:underline underline-offset-2">
              Trilhas
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link
              href={`/trilhas/${lesson.path.slug}`}
              className="hover:text-text hover:underline underline-offset-2 truncate max-w-[160px] inline-block align-bottom"
            >
              {lesson.path.title}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li className="truncate max-w-[120px] text-text-subtle">
            {lesson.module.title}
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li className="truncate font-medium text-text" aria-current="page">
            {lesson.title}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="text-h1 flex-1 font-bold leading-tight">{lesson.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            {!lesson.required && (
              <Badge variant="muted">Opcional</Badge>
            )}
            {lesson.completed && (
              <Badge variant="success" className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Concluída
              </Badge>
            )}
          </div>
        </div>

        {lesson.description && (
          <p className="text-sm text-text-muted">{lesson.description}</p>
        )}

        {lesson.estimatedMinutes != null && lesson.estimatedMinutes > 0 && (
          <p className="flex items-center gap-1 text-xs text-text-subtle">
            <Clock className="size-3.5" aria-hidden />
            {lesson.estimatedMinutes} min estimados
          </p>
        )}
      </header>

      {/* Content */}
      <Card className="p-6">
        <LessonViewer lesson={lesson} />
      </Card>

      {/* Complete button */}
      <div className="flex justify-end border-t border-border pt-4">
        <CompleteButton lessonId={lesson.id} isCompleted={lesson.completed} />
      </div>

      {/* Prev/Next navigation */}
      <LessonNav prevLessonId={lesson.prevLessonId} nextLessonId={lesson.nextLessonId} />
    </div>
  )
}
