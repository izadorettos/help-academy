import { describe, it, expect } from 'vitest'

// ─── Path builder ─────────────────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

type MediaKind = 'video' | 'image' | 'pdf' | 'presentation'

const SIZE_LIMITS: Record<MediaKind, number> = {
  video: 50 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  presentation: 50 * 1024 * 1024,
}

const ALLOWED_MIMES: Record<MediaKind, string[]> = {
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  presentation: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
}

function buildLessonMediaPath(lessonId: string, mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] ?? 'bin'
  // UUID portion is random, but the pattern is consistent
  return `lessons/${lessonId}/UUID.${ext}`
}

function validateMimeForKind(kind: MediaKind, mimeType: string): boolean {
  return ALLOWED_MIMES[kind]?.includes(mimeType) ?? false
}

function validateSizeForKind(kind: MediaKind, fileSize: number): boolean {
  return fileSize <= (SIZE_LIMITS[kind] ?? 0)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('media-upload path builder', () => {
  it('builds correct path for mp4 video', () => {
    const path = buildLessonMediaPath('lesson-123', 'video/mp4')
    expect(path).toMatch(/^lessons\/lesson-123\/UUID\.mp4$/)
  })

  it('builds correct path for jpeg image', () => {
    const path = buildLessonMediaPath('abc', 'image/jpeg')
    expect(path).toMatch(/^lessons\/abc\/UUID\.jpg$/)
  })

  it('builds correct path for pdf', () => {
    const path = buildLessonMediaPath('xyz', 'application/pdf')
    expect(path).toMatch(/^lessons\/xyz\/UUID\.pdf$/)
  })

  it('builds correct path for pptx', () => {
    const path = buildLessonMediaPath('xyz', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    expect(path).toMatch(/^lessons\/xyz\/UUID\.pptx$/)
  })

  it('path has three segments: lessons/{id}/{file}', () => {
    const path = buildLessonMediaPath('some-id', 'video/webm')
    const parts = path.split('/')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('lessons')
    expect(parts[1]).toBe('some-id')
    expect(parts[2]).toMatch(/\.webm$/)
  })
})

describe('MIME validation per kind', () => {
  // Video
  it('accepts mp4 for video', () => {
    expect(validateMimeForKind('video', 'video/mp4')).toBe(true)
  })
  it('accepts webm for video', () => {
    expect(validateMimeForKind('video', 'video/webm')).toBe(true)
  })
  it('accepts quicktime for video', () => {
    expect(validateMimeForKind('video', 'video/quicktime')).toBe(true)
  })
  it('rejects pdf for video', () => {
    expect(validateMimeForKind('video', 'application/pdf')).toBe(false)
  })
  it('rejects jpeg for video', () => {
    expect(validateMimeForKind('video', 'image/jpeg')).toBe(false)
  })

  // Image
  it('accepts jpeg for image', () => {
    expect(validateMimeForKind('image', 'image/jpeg')).toBe(true)
  })
  it('accepts png for image', () => {
    expect(validateMimeForKind('image', 'image/png')).toBe(true)
  })
  it('accepts webp for image', () => {
    expect(validateMimeForKind('image', 'image/webp')).toBe(true)
  })
  it('rejects mp4 for image', () => {
    expect(validateMimeForKind('image', 'video/mp4')).toBe(false)
  })

  // PDF
  it('accepts application/pdf for pdf', () => {
    expect(validateMimeForKind('pdf', 'application/pdf')).toBe(true)
  })
  it('rejects png for pdf', () => {
    expect(validateMimeForKind('pdf', 'image/png')).toBe(false)
  })

  // Presentation
  it('accepts pdf for presentation', () => {
    expect(validateMimeForKind('presentation', 'application/pdf')).toBe(true)
  })
  it('accepts pptx for presentation', () => {
    expect(validateMimeForKind('presentation', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true)
  })
  it('rejects jpeg for presentation', () => {
    expect(validateMimeForKind('presentation', 'image/jpeg')).toBe(false)
  })
})

describe('file size limits per kind', () => {
  it('accepts 50 MB for video', () => {
    expect(validateSizeForKind('video', 50 * 1024 * 1024)).toBe(true)
  })
  it('rejects 51 MB for video', () => {
    expect(validateSizeForKind('video', 51 * 1024 * 1024)).toBe(false)
  })

  it('accepts 10 MB for image', () => {
    expect(validateSizeForKind('image', 10 * 1024 * 1024)).toBe(true)
  })
  it('rejects 11 MB for image', () => {
    expect(validateSizeForKind('image', 11 * 1024 * 1024)).toBe(false)
  })

  it('accepts 50 MB for pdf', () => {
    expect(validateSizeForKind('pdf', 50 * 1024 * 1024)).toBe(true)
  })
  it('rejects 50 MB + 1 byte for pdf', () => {
    expect(validateSizeForKind('pdf', 50 * 1024 * 1024 + 1)).toBe(false)
  })

  it('accepts 50 MB for presentation', () => {
    expect(validateSizeForKind('presentation', 50 * 1024 * 1024)).toBe(true)
  })
  it('rejects 51 MB for presentation', () => {
    expect(validateSizeForKind('presentation', 51 * 1024 * 1024)).toBe(false)
  })
})

describe('MIME to extension mapping', () => {
  it('maps video/mp4 to mp4', () => {
    expect(MIME_TO_EXT['video/mp4']).toBe('mp4')
  })
  it('maps image/jpeg to jpg', () => {
    expect(MIME_TO_EXT['image/jpeg']).toBe('jpg')
  })
  it('maps application/pdf to pdf', () => {
    expect(MIME_TO_EXT['application/pdf']).toBe('pdf')
  })
  it('maps pptx MIME to pptx', () => {
    expect(MIME_TO_EXT['application/vnd.openxmlformats-officedocument.presentationml.presentation']).toBe('pptx')
  })
})
