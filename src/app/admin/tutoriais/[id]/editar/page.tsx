import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { getAudiences, getCategories } from '@/features/help/queries'
import { createServerClient } from '@/lib/supabase/server'
import { TutorialForm } from '../../_components/tutorial-form'
import { DeleteTutorialButton } from '../../_components/delete-tutorial-button'
import type { TutorialDetail } from '@/features/help/queries'

export const metadata: Metadata = { title: 'Editar Tutorial — Admin Help Academy' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarTutorialPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('tutorials')
    .select(`
      id, slug, title, description, content_type,
      video_url, file_url, thumbnail_url,
      duration_seconds, pages, file_size_bytes, mime_type, sha256, app_version,
      freshness, freshness_note, visibility, is_published, is_featured,
      sort_order, source_file, date_source, last_content_update,
      created_at, updated_at, series_id, series_position,
      help_categories (id, slug, name, icon, sort_order),
      help_series (id, slug, name, description),
      tutorial_audiences (
        help_audiences (id, slug, name, sort_order)
      )
    `)
    .eq('id', id)
    .single()

  if (!data) notFound()

  // Build TutorialDetail shape
  const tutorial: TutorialDetail = {
    id:                  data.id,
    slug:                data.slug,
    title:               data.title,
    description:         data.description,
    content_type:        data.content_type,
    video_url:           data.video_url,
    file_url:            data.file_url,
    thumbnail_url:       data.thumbnail_url,
    duration_seconds:    data.duration_seconds,
    pages:               data.pages,
    file_size_bytes:     data.file_size_bytes,
    mime_type:           data.mime_type,
    sha256:              data.sha256,
    app_version:         data.app_version,
    freshness:           data.freshness,
    freshness_note:      data.freshness_note,
    visibility:          data.visibility,
    is_published:        data.is_published,
    is_featured:         data.is_featured,
    sort_order:          data.sort_order,
    source_file:         data.source_file,
    date_source:         data.date_source,
    last_content_update: data.last_content_update,
    created_at:          data.created_at,
    updated_at:          data.updated_at,
    series_position:     data.series_position,
    category:            data.help_categories ?? { id: '', slug: '', name: '', icon: '', sort_order: 0 },
    series:              data.help_series ?? null,
    audiences: (data.tutorial_audiences ?? [])
      .map((ta: { help_audiences: { id: string; slug: string; name: string; sort_order: number } | null }) => ta.help_audiences)
      .filter((a): a is { id: string; slug: string; name: string; sort_order: number } => a !== null),
  }

  const [audiences, categories] = await Promise.all([getAudiences(), getCategories()])

  return (
    <div className="space-y-6">
      <nav>
        <Link
          href="/admin/tutoriais"
          className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Tutoriais
        </Link>
      </nav>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-h1 font-bold">Editar tutorial</h1>
        <DeleteTutorialButton id={tutorial.id} title={tutorial.title} />
      </div>
      <TutorialForm tutorial={tutorial} audiences={audiences} categories={categories} />
    </div>
  )
}
