import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'

type TutorialContentType = Database['public']['Enums']['tutorial_content_type']
type TutorialFreshness   = Database['public']['Enums']['tutorial_freshness']
type TutorialVisibility  = Database['public']['Enums']['tutorial_visibility']

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TutorialAudience {
  id: string
  slug: string
  name: string
  sort_order: number
}

export interface TutorialCategory {
  id: string
  slug: string
  name: string
  icon: string
  sort_order: number
}

export interface TutorialSeries {
  id: string
  slug: string
  name: string
  description: string | null
}

export interface TutorialListItem {
  id: string
  slug: string
  title: string
  description: string
  content_type: TutorialContentType
  duration_seconds: number | null
  pages: number | null
  thumbnail_url: string | null
  freshness: TutorialFreshness
  freshness_note: string | null
  is_featured: boolean
  is_published: boolean
  sort_order: number
  last_content_update: string
  visibility: TutorialVisibility
  category: TutorialCategory
  audiences: TutorialAudience[]
  series: TutorialSeries | null
  series_position: number | null
}

export interface TutorialDetail extends TutorialListItem {
  video_url: string | null
  file_url: string | null
  file_size_bytes: number | null
  mime_type: string | null
  sha256: string | null
  app_version: string | null
  source_file: string | null
  date_source: string | null
  created_at: string
  updated_at: string
}

export interface TutorialSeriesFull extends TutorialSeries {
  tutorials: Array<{ id: string; slug: string; title: string; series_position: number }>
}

export interface AdminTutorialStats {
  totalPublished: number
  byAudience: Array<{ slug: string; name: string; count: number }>
  updatedLast60d: number
  needsAttention: number
  recentlyUpdated: Array<{
    id: string
    slug: string
    title: string
    last_content_update: string
    updated_at: string
  }>
}

export interface TutorialFilters {
  q?: string
  audience?: string
  category?: string
  type?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTutorialListItem(row: {
  id: string
  slug: string
  title: string
  description: string
  content_type: TutorialContentType
  duration_seconds: number | null
  pages: number | null
  thumbnail_url: string | null
  freshness: TutorialFreshness
  freshness_note: string | null
  is_featured: boolean
  is_published: boolean
  sort_order: number
  last_content_update: string
  visibility: TutorialVisibility
  series_position: number | null
  help_categories: { id: string; slug: string; name: string; icon: string; sort_order: number } | null
  help_series: { id: string; slug: string; name: string; description: string | null } | null
  tutorial_audiences: Array<{
    help_audiences: { id: string; slug: string; name: string; sort_order: number } | null
  }>
}): TutorialListItem {
  return {
    id:                  row.id,
    slug:                row.slug,
    title:               row.title,
    description:         row.description,
    content_type:        row.content_type,
    duration_seconds:    row.duration_seconds,
    pages:               row.pages,
    thumbnail_url:       row.thumbnail_url,
    freshness:           row.freshness,
    freshness_note:      row.freshness_note,
    is_featured:         row.is_featured,
    is_published:        row.is_published,
    sort_order:          row.sort_order,
    last_content_update: row.last_content_update,
    visibility:          row.visibility,
    series_position:     row.series_position,
    category: row.help_categories ?? { id: '', slug: '', name: '', icon: '', sort_order: 0 },
    series:   row.help_series ?? null,
    audiences: (row.tutorial_audiences ?? [])
      .map((ta) => ta.help_audiences)
      .filter((a): a is TutorialAudience => a !== null),
  }
}

const TUTORIAL_LIST_SELECT = `
  id, slug, title, description, content_type,
  duration_seconds, pages, thumbnail_url,
  freshness, freshness_note, is_featured, is_published,
  sort_order, last_content_update, visibility, series_position,
  help_categories (id, slug, name, icon, sort_order),
  help_series (id, slug, name, description),
  tutorial_audiences (
    help_audiences (id, slug, name, sort_order)
  )
`

// ─── getTutorials ─────────────────────────────────────────────────────────────

export async function getTutorials(filters: TutorialFilters = {}): Promise<TutorialListItem[]> {
  const supabase = await createServerClient()

  let query = supabase
    .from('tutorials')
    .select(TUTORIAL_LIST_SELECT)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (filters.category) {
    // join filter on category slug — we need a sub-filter via category_id lookup
    const { data: cat } = await supabase
      .from('help_categories')
      .select('id')
      .eq('slug', filters.category)
      .single()
    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }

  if (filters.type) {
    query = query.eq('content_type', filters.type as TutorialContentType)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getTutorials] error:', error.message)
    return []
  }

  let items = (data ?? []).map(buildTutorialListItem)

  // Client-side filter: audience + full-text search (list is small)
  if (filters.audience) {
    items = items.filter((t) =>
      t.audiences.some((a) => a.slug === filters.audience),
    )
  }

  if (filters.q) {
    const q = filters.q.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')
    items = items.filter((t) => {
      const haystack = [t.title, t.description, t.category.name, ...t.audiences.map((a) => a.name)]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Mn}/gu, '')
      return haystack.includes(q)
    })
  }

  return items
}

// ─── getTutorial ──────────────────────────────────────────────────────────────

export async function getTutorial(slug: string): Promise<TutorialDetail | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('tutorials')
    .select(`
      ${TUTORIAL_LIST_SELECT},
      video_url, file_url, file_size_bytes, mime_type, sha256,
      app_version, source_file, date_source, created_at, updated_at
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !data) return null

  const base = buildTutorialListItem(data as Parameters<typeof buildTutorialListItem>[0])

  return {
    ...base,
    video_url:       (data as { video_url: string | null }).video_url,
    file_url:        (data as { file_url: string | null }).file_url,
    file_size_bytes: (data as { file_size_bytes: number | null }).file_size_bytes,
    mime_type:       (data as { mime_type: string | null }).mime_type,
    sha256:          (data as { sha256: string | null }).sha256,
    app_version:     (data as { app_version: string | null }).app_version,
    source_file:     (data as { source_file: string | null }).source_file,
    date_source:     (data as { date_source: string | null }).date_source,
    created_at:      (data as { created_at: string }).created_at,
    updated_at:      (data as { updated_at: string }).updated_at,
  }
}

// ─── getTutorialSeriesTutorials ───────────────────────────────────────────────

export async function getTutorialSeriesTutorials(
  seriesId: string,
): Promise<Array<{ id: string; slug: string; title: string; series_position: number }>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('tutorials')
    .select('id, slug, title, series_position')
    .eq('series_id', seriesId)
    .eq('is_published', true)
    .order('series_position', { ascending: true })

  if (error) {
    console.error('[getTutorialSeriesTutorials] error:', error.message)
    return []
  }

  return (data ?? []).filter((t): t is { id: string; slug: string; title: string; series_position: number } =>
    t.series_position !== null,
  )
}

// ─── getRelatedTutorials ──────────────────────────────────────────────────────

export async function getRelatedTutorials(
  tutorial: TutorialListItem,
  limit = 4,
): Promise<TutorialListItem[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('tutorials')
    .select(TUTORIAL_LIST_SELECT)
    .eq('is_published', true)
    .eq('category_id', tutorial.category.id)
    .neq('id', tutorial.id)
    .order('sort_order', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[getRelatedTutorials] error:', error.message)
    return []
  }

  return (data ?? []).map(buildTutorialListItem)
}

// ─── getTutorialSignedUrl ─────────────────────────────────────────────────────

export async function getTutorialSignedUrl(rawUrl: string | null | undefined): Promise<string | null> {
  if (!rawUrl?.startsWith('storage:')) return rawUrl ?? null

  const path = rawUrl.slice('storage:'.length)
  const [bucket, ...rest] = path.split('/')
  if (!bucket || rest.length === 0) return null

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage
    .from(bucket)
    .createSignedUrl(rest.join('/'), 3600)

  if (error || !data?.signedUrl) {
    console.error('[getTutorialSignedUrl] error:', error?.message)
    return null
  }
  return data.signedUrl
}

// ─── getRecentTutorials ───────────────────────────────────────────────────────

export async function getRecentTutorials(limit = 3): Promise<TutorialListItem[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('tutorials')
    .select(TUTORIAL_LIST_SELECT)
    .eq('is_published', true)
    .order('last_content_update', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentTutorials] error:', error.message)
    return []
  }

  return (data ?? []).map(buildTutorialListItem)
}

// ─── getAdminTutorialStats ────────────────────────────────────────────────────

export async function getAdminTutorialStats(): Promise<AdminTutorialStats> {
  const supabase = await createServerClient()

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0]!

  const [totalRes, updatedRes, needsRes, recentRes, audiencesRes] = await Promise.all([
    supabase.from('tutorials').select('id', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('tutorials').select('id', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('last_content_update', sixtyDaysAgoStr),
    supabase.from('tutorials').select('id', { count: 'exact', head: true })
      .eq('is_published', true)
      .in('freshness', ['needs_update', 'needs_review']),
    supabase.from('tutorials')
      .select('id, slug, title, last_content_update, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase.from('help_audiences').select('id, slug, name'),
  ])

  // Count by audience
  const byAudience: Array<{ slug: string; name: string; count: number }> = []
  for (const aud of (audiencesRes.data ?? [])) {
    const { count } = await supabase
      .from('tutorial_audiences')
      .select('tutorial_id', { count: 'exact', head: true })
      .eq('audience_id', aud.id)
    byAudience.push({ slug: aud.slug, name: aud.name, count: count ?? 0 })
  }

  return {
    totalPublished:  totalRes.count ?? 0,
    byAudience,
    updatedLast60d:  updatedRes.count ?? 0,
    needsAttention:  needsRes.count ?? 0,
    recentlyUpdated: (recentRes.data ?? []) as AdminTutorialStats['recentlyUpdated'],
  }
}

// ─── getAdminTutorials ────────────────────────────────────────────────────────

export async function getAdminTutorials(filters: TutorialFilters = {}): Promise<TutorialListItem[]> {
  // Admin sees all (including unpublished) — use server client (session has admin role)
  const supabase = await createServerClient()

  let query = supabase
    .from('tutorials')
    .select(TUTORIAL_LIST_SELECT)
    .order('sort_order', { ascending: true })

  if (filters.category) {
    const { data: cat } = await supabase
      .from('help_categories')
      .select('id')
      .eq('slug', filters.category)
      .single()
    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }

  if (filters.type) {
    query = query.eq('content_type', filters.type as TutorialContentType)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getAdminTutorials] error:', error.message)
    return []
  }

  let items = (data ?? []).map(buildTutorialListItem)

  if (filters.audience) {
    items = items.filter((t) =>
      t.audiences.some((a) => a.slug === filters.audience),
    )
  }

  if (filters.q) {
    const q = filters.q.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')
    items = items.filter((t) => {
      const haystack = [t.title, t.description]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Mn}/gu, '')
      return haystack.includes(q)
    })
  }

  return items
}

// ─── getAudiences ─────────────────────────────────────────────────────────────

export async function getAudiences(): Promise<TutorialAudience[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('help_audiences')
    .select('id, slug, name, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return []
  return (data ?? []) as TutorialAudience[]
}

// ─── getCategories ────────────────────────────────────────────────────────────

export async function getCategories(): Promise<TutorialCategory[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('help_categories')
    .select('id, slug, name, icon, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return []
  return (data ?? []) as TutorialCategory[]
}
