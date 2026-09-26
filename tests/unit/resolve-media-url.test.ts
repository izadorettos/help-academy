import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock server-only ────────────────────────────────────────────────────────
vi.mock('server-only', () => ({}))

// ─── Mock admin client ────────────────────────────────────────────────────────
const mockCreateSignedUrl = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  }),
}))

const { resolveMediaUrl } = await import('@/lib/media/resolve-media-url')

describe('resolveMediaUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for null or empty input', async () => {
    expect(await resolveMediaUrl(null)).toBeNull()
    expect(await resolveMediaUrl(undefined)).toBeNull()
    expect(await resolveMediaUrl('')).toBeNull()
  })

  it('resolves storage: URL to a signed file URL', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://cdn.example.com/signed' },
      error: null,
    })

    const result = await resolveMediaUrl('storage:tutorials/slug/file.mp4')
    expect(result).toEqual({ kind: 'file', url: 'https://cdn.example.com/signed' })
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('slug/file.mp4', 3600)
  })

  it('returns error kind when storage signed URL fails', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const result = await resolveMediaUrl('storage:tutorials/slug/file.mp4')
    expect(result?.kind).toBe('error')
  })

  it('resolves youtu.be URL to YouTube embed', async () => {
    const result = await resolveMediaUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result).toEqual({
      kind: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    })
  })

  it('resolves youtube.com/watch URL to YouTube embed', async () => {
    const result = await resolveMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toEqual({
      kind: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    })
  })

  it('resolves vimeo.com URL to Vimeo embed', async () => {
    const result = await resolveMediaUrl('https://vimeo.com/123456789')
    expect(result).toEqual({
      kind: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    })
  })

  it('passes through any other https:// URL as CDN', async () => {
    const url = 'https://cdn.example.com/video.mp4'
    const result = await resolveMediaUrl(url)
    expect(result).toEqual({ kind: 'cdn', url })
  })
})
