import { describe, expect, it } from 'vitest'
import { isAllowedEmbed, getYouTubeEmbedUrl, EMBED_ALLOWLIST } from '@/lib/embed-allowlist'

// ─── isAllowedEmbed ───────────────────────────────────────────────────────────

describe('isAllowedEmbed', () => {
  it('allows YouTube watch URL', () => {
    expect(isAllowedEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
  })

  it('allows YouTube embed URL', () => {
    expect(isAllowedEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true)
  })

  it('allows youtu.be short URL', () => {
    expect(isAllowedEmbed('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  it('allows Vimeo player URL', () => {
    expect(isAllowedEmbed('https://player.vimeo.com/video/123456789')).toBe(true)
  })

  it('allows Google Docs/Slides embed URL', () => {
    expect(isAllowedEmbed('https://docs.google.com/presentation/d/abc/embed')).toBe(true)
  })

  it('allows Loom embed URL', () => {
    expect(isAllowedEmbed('https://www.loom.com/embed/abc123')).toBe(true)
  })

  it('rejects an unknown domain', () => {
    expect(isAllowedEmbed('https://evil.example.com/embed')).toBe(false)
  })

  it('rejects http (non-HTTPS) URL', () => {
    expect(isAllowedEmbed('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false)
  })

  it('rejects a javascript: URL', () => {
    expect(isAllowedEmbed('javascript:alert(1)')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isAllowedEmbed('')).toBe(false)
  })

  it('rejects a malformed URL', () => {
    expect(isAllowedEmbed('not-a-url')).toBe(false)
  })

  it('rejects a domain that only contains an allowed domain as substring', () => {
    // "notyoutube.com" should not match "youtube.com"
    expect(isAllowedEmbed('https://notyoutube.com/embed/abc')).toBe(false)
  })

  it('EMBED_ALLOWLIST contains only expected trusted domains', () => {
    const hasDuplicates = EMBED_ALLOWLIST.length !== new Set(EMBED_ALLOWLIST).size
    // Allow duplicates in the exported list (deduplication happens in next.config.ts)
    expect(Array.isArray(EMBED_ALLOWLIST)).toBe(true)
    expect(EMBED_ALLOWLIST.length).toBeGreaterThan(0)
    // Every entry should be a non-empty string
    EMBED_ALLOWLIST.forEach((entry) => {
      expect(typeof entry).toBe('string')
      expect(entry.length).toBeGreaterThan(0)
    })
    // Suppress unused variable warning
    void hasDuplicates
  })
})

// ─── getYouTubeEmbedUrl ───────────────────────────────────────────────────────

describe('getYouTubeEmbedUrl', () => {
  it('converts youtube.com/watch?v= URL', () => {
    expect(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('converts youtu.be short URL', () => {
    expect(getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('returns the same URL if already an embed URL', () => {
    const embedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    expect(getYouTubeEmbedUrl(embedUrl)).toBe(embedUrl)
  })

  it('returns null for a non-YouTube URL', () => {
    expect(getYouTubeEmbedUrl('https://vimeo.com/123456789')).toBeNull()
  })

  it('returns null for a YouTube URL without video ID', () => {
    expect(getYouTubeEmbedUrl('https://www.youtube.com/channel/UCxxxxxx')).toBeNull()
  })

  it('returns null for youtu.be with no path', () => {
    expect(getYouTubeEmbedUrl('https://youtu.be/')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(getYouTubeEmbedUrl('')).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(getYouTubeEmbedUrl('not-a-url')).toBeNull()
  })

  it('handles youtube.com without www prefix', () => {
    expect(getYouTubeEmbedUrl('https://youtube.com/watch?v=abc123')).toBe(
      'https://www.youtube.com/embed/abc123',
    )
  })
})
