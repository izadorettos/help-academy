import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type ResolvedMedia =
  | { kind: 'file'; url: string }
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'vimeo'; embedUrl: string }
  | { kind: 'cdn'; url: string }
  | { kind: 'error'; message: string }

/**
 * Resolves a media URL from different sources:
 *
 * - `storage:tutorials/slug/file.mp4` → signed URL (1h) via adminClient
 * - `https://youtu.be/...` or `https://www.youtube.com/...` → YouTube embed URL
 * - `https://vimeo.com/...` → Vimeo embed URL
 * - Any other `https://` → pass-through (CDN)
 */
export async function resolveMediaUrl(raw: string | null | undefined): Promise<ResolvedMedia | null> {
  if (!raw) return null

  // storage: protocol → signed URL
  if (raw.startsWith('storage:')) {
    const path = raw.slice('storage:'.length) // e.g. "tutorials/slug/file.mp4"
    const [bucket, ...rest] = path.split('/')
    if (!bucket || rest.length === 0) {
      return { kind: 'error', message: `URL de armazenamento inválida: ${raw}` }
    }
    const objectPath = rest.join('/')
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(objectPath, 3600)
    if (error || !data?.signedUrl) {
      console.error('[resolveMediaUrl] signed URL error:', error?.message)
      return { kind: 'error', message: 'Não foi possível gerar o link para o arquivo.' }
    }
    return { kind: 'file', url: data.signedUrl }
  }

  if (!raw.startsWith('https://')) return null

  // YouTube
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const videoId = u.pathname.slice(1)
      return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${videoId}` }
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const videoId = u.searchParams.get('v')
      if (videoId) {
        return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${videoId}` }
      }
    }
    // Vimeo
    if (host === 'vimeo.com') {
      const videoId = u.pathname.slice(1)
      if (videoId) {
        return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${videoId}` }
      }
    }
  } catch {
    // not a valid URL — fall through
  }

  // Any other https:// → CDN pass-through
  return { kind: 'cdn', url: raw }
}
