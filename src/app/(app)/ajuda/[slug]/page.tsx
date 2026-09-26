import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import {
  getTutorial,
  getTutorialSignedUrl,
  getTutorialSeriesTutorials,
  getRelatedTutorials,
} from '@/features/help/queries'
import { requireUser } from '@/lib/auth/guards'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Badge } from '@/components/ui/badge'
import { SeriesNavigator } from '@/components/help/series-navigator'
import { TutorialCard } from '@/components/help/tutorial-card'
import { AppDownloadCard } from '@/components/help/app-download-card'
import { VideoPlayer } from '@/components/learning/video-player'
import { ImageLesson } from '@/components/learning/image-lesson'
import { formatDate, isRecentlyUpdated } from '@/components/help/tutorial-card'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ back?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tutorial = await getTutorial(slug)
  if (!tutorial) return { title: 'Tutorial não encontrado' }
  return {
    title: `${tutorial.title} — Central de Ajuda`,
    description: tutorial.description,
  }
}

export default async function TutorialDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const backUrl = sp.back ?? '/ajuda'

  const user = await requireUser()

  const tutorial = await getTutorial(slug)
  if (!tutorial) notFound()

  // Resolve media URLs
  const [mediaUrl, thumbnailUrl, seriesTutorials, related] = await Promise.all([
    getTutorialSignedUrl(tutorial.video_url ?? tutorial.file_url),
    getTutorialSignedUrl(tutorial.thumbnail_url),
    tutorial.series ? getTutorialSeriesTutorials(tutorial.series.id) : Promise.resolve([]),
    getRelatedTutorials(tutorial, 4),
  ])

  const isAdmin = user.role === 'admin'
  const freshRecently = isRecentlyUpdated(tutorial.last_content_update)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Back + breadcrumb */}
      <nav aria-label="Navegação de retorno" className="flex items-center gap-2 text-sm">
        <Link
          href={backUrl}
          className="flex items-center gap-1 font-medium text-text-muted hover:text-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Voltar para a Central de Ajuda
        </Link>
        <span className="text-text-subtle" aria-hidden>·</span>
        <span className="text-text-subtle truncate">{tutorial.title}</span>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <Eyebrow>
          {tutorial.audiences.map((a) => a.name).join(' · ')} · {tutorial.category.name}
        </Eyebrow>
        <h1 className="text-h1 font-bold leading-snug">{tutorial.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <span className="font-mono">
            {tutorial.content_type === 'video' && tutorial.duration_seconds != null
              ? `Vídeo · ${Math.ceil(tutorial.duration_seconds / 60)} min`
              : tutorial.content_type === 'pdf' && tutorial.pages
                ? `PDF · ${tutorial.pages} páginas`
                : tutorial.content_type === 'image'
                  ? 'Imagem'
                  : tutorial.content_type === 'app'
                    ? 'App'
                    : tutorial.content_type}
          </span>
          <span aria-hidden>·</span>
          <span className="font-mono">Atualizado em {formatDate(tutorial.last_content_update)}</span>

          {tutorial.freshness === 'needs_update' && (
            <Badge variant="warning">Atualização solicitada</Badge>
          )}
          {tutorial.freshness === 'needs_review' && isAdmin && (
            <Badge variant="neutral">Revisar</Badge>
          )}
          {tutorial.freshness === 'current' && freshRecently && (
            <Badge variant="success">Atualizado recentemente</Badge>
          )}
        </div>

        {/* Freshness notice */}
        {tutorial.freshness === 'needs_update' && tutorial.freshness_note && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-text">
            <strong className="font-semibold text-warning-text">Atenção:</strong>{' '}
            {tutorial.freshness_note}
          </div>
        )}
        {tutorial.freshness === 'needs_review' && tutorial.freshness_note && isAdmin && (
          <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-text-muted">
            <strong className="font-semibold">Para revisão:</strong> {tutorial.freshness_note}
          </div>
        )}
      </header>

      {/* Media */}
      <section aria-label="Conteúdo do tutorial">
        {tutorial.content_type === 'video' && (
          <TutorialVideoPlayer
            mediaUrl={mediaUrl}
            thumbnailUrl={thumbnailUrl}
            durationSeconds={tutorial.duration_seconds}
          />
        )}

        {tutorial.content_type === 'pdf' && mediaUrl && (
          <PdfViewer
            url={mediaUrl}
            title={tutorial.title}
            fileSizeBytes={tutorial.file_size_bytes}
          />
        )}

        {tutorial.content_type === 'image' && mediaUrl && (
          <ImageLesson
            images={[{ url: mediaUrl, alt: tutorial.title }]}
          />
        )}

        {tutorial.content_type === 'app' && (
          <AppDownloadCard
            title={tutorial.title}
            version={tutorial.app_version}
            fileSizeBytes={tutorial.file_size_bytes}
            sha256={tutorial.sha256}
            downloadUrl={mediaUrl ?? '#'}
          />
        )}
      </section>

      {/* Description */}
      <section aria-label="Descrição">
        <p className="text-sm text-text-muted leading-relaxed">{tutorial.description}</p>
      </section>

      {/* Series navigator */}
      {tutorial.series && seriesTutorials.length > 1 && (
        <section aria-label={`Série: ${tutorial.series.name}`}>
          <h2 className="mb-4 text-h3 font-semibold">Nesta série</h2>
          <SeriesNavigator
            series={tutorial.series}
            tutorials={seriesTutorials}
            currentSlug={tutorial.slug}
            backUrl={backUrl}
          />
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section aria-label="Materiais relacionados">
          <h2 className="mb-4 text-h3 font-semibold">Materiais relacionados</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tutoriais relacionados">
            {related.map((t) => (
              <li key={t.id}>
                <TutorialCard tutorial={t} backUrl={backUrl} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TutorialVideoPlayer({
  mediaUrl,
  thumbnailUrl,
  durationSeconds,
}: {
  mediaUrl: string | null
  thumbnailUrl: string | null
  durationSeconds: number | null
}) {
  // Use the VideoPlayer component — adapt to tutorial mode (no lesson progress)
  if (!mediaUrl) {
    return (
      <div className="aspect-video w-full rounded-xl bg-surface-muted flex items-center justify-center">
        <p className="text-sm text-text-muted">Vídeo não disponível.</p>
      </div>
    )
  }

  return (
    <VideoPlayer
      lessonId="tutorial"
      externalUrl={mediaUrl}
      config={{
        provider: mediaUrl.startsWith('https://') ? 'external' : 'file',
        duration_seconds: durationSeconds ?? undefined,
        poster: thumbnailUrl ?? undefined,
      }}
      initialProgressPercent={0}
      initialPositionSeconds={null}
      completed={false}
    />
  )
}

function PdfViewer({
  url,
  title,
  fileSizeBytes,
}: {
  url: string
  title: string
  fileSizeBytes: number | null
}) {
  const sizeLabel = fileSizeBytes
    ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : null

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          src={url}
          title={title}
          className="h-[60vh] w-full"
          aria-label={`PDF: ${title}`}
        />
      </div>
      <a
        href={url}
        download
        className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        Baixar PDF{sizeLabel ? ` (${sizeLabel})` : ''} ↓
      </a>
    </div>
  )
}
