import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import type { TutorialListItem } from '@/features/help/queries'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return dateStr
  return `${day}/${month}/${year}`
}

export function isRecentlyUpdated(dateStr: string, days = 60): boolean {
  const date = new Date(dateStr)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  video:   'Vídeo',
  pdf:     'PDF',
  image:   'Passo a passo',
  app:     'App',
  link:    'Link',
  article: 'Artigo',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TutorialCardProps {
  tutorial: TutorialListItem
  /** Pass a resolved thumbnail URL (already signed if from storage) */
  thumbnailUrl?: string | null
  backUrl?: string
}

export function TutorialCard({ tutorial, thumbnailUrl, backUrl }: TutorialCardProps) {
  const href = backUrl
    ? `/ajuda/${tutorial.slug}?back=${encodeURIComponent(backUrl)}`
    : `/ajuda/${tutorial.slug}`

  const coverUrl = thumbnailUrl ?? tutorial.thumbnail_signed_url ?? null
  const freshRecently = isRecentlyUpdated(tutorial.last_content_update)
  const typeLabel = CONTENT_TYPE_LABEL[tutorial.content_type] ?? tutorial.content_type

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border bg-surface transition-all duration-[160ms] hover:-translate-y-0.5 hover:border-brand hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      aria-label={tutorial.title}
    >
      {/* Cover 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-surface-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            unoptimized
            alt=""
            aria-hidden
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-surface-muted">
            <span className="text-text-subtle text-xs">{typeLabel}</span>
          </div>
        )}

        {/* Type chip — top left */}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-white">
          {typeLabel}
        </span>

        {/* Duration / pages chip — bottom right */}
        {(tutorial.duration_seconds != null || tutorial.pages != null) && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[0.6875rem] text-white">
            {tutorial.duration_seconds != null
              ? formatDuration(tutorial.duration_seconds)
              : `${tutorial.pages} págs.`}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        {/* Audience eyebrow */}
        {tutorial.audiences.length > 0 && (
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-text-subtle">
            {tutorial.audiences.map((a) => a.name).join(' · ')}
          </p>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2">{tutorial.title}</h3>

        {/* Description */}
        <p className="text-xs text-text-muted line-clamp-2">{tutorial.description}</p>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1">
          {tutorial.freshness === 'needs_update' && (
            <Badge variant="warning">Atualização solicitada</Badge>
          )}
          {tutorial.freshness === 'current' && freshRecently && (
            <Badge variant="success">Atualizado recentemente</Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[0.6875rem] text-text-subtle">
            Atualizado em {formatDate(tutorial.last_content_update)}
          </span>
          <span
            className="shrink-0 text-xs font-medium text-brand group-hover:underline"
            aria-hidden
          >
            Acessar conteúdo →
          </span>
        </div>
      </div>
    </Link>
  )
}
