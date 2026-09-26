import { describe, it, expect } from 'vitest'
import { formatDate, formatDuration, isRecentlyUpdated } from '@/components/help/tutorial-card'
import { tutorialSchema } from '@/features/help/schemas'

describe('formatDate', () => {
  it('formats YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDate('2026-09-04')).toBe('04/09/2026')
    expect(formatDate('2026-01-15')).toBe('15/01/2026')
    expect(formatDate('2026-07-10')).toBe('10/07/2026')
  })

  it('handles already-formatted or invalid input gracefully', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('formatDuration', () => {
  it('formats seconds to mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(60)).toBe('1:00')
    expect(formatDuration(1055)).toBe('17:35')
    expect(formatDuration(257)).toBe('4:17')
    expect(formatDuration(608)).toBe('10:08')
    expect(formatDuration(37)).toBe('0:37')
  })
})

describe('isRecentlyUpdated', () => {
  it('returns true for a date within 60 days', () => {
    const recent = new Date()
    recent.setDate(recent.getDate() - 30)
    expect(isRecentlyUpdated(recent.toISOString().split('T')[0]!)).toBe(true)
  })

  it('returns true for today', () => {
    const today = new Date().toISOString().split('T')[0]!
    expect(isRecentlyUpdated(today)).toBe(true)
  })

  it('returns false for a date older than 60 days', () => {
    const old = new Date()
    old.setDate(old.getDate() - 90)
    expect(isRecentlyUpdated(old.toISOString().split('T')[0]!)).toBe(false)
  })

  it('respects custom days threshold', () => {
    const date = new Date()
    date.setDate(date.getDate() - 45)
    const dateStr = date.toISOString().split('T')[0]!
    expect(isRecentlyUpdated(dateStr, 30)).toBe(false)
    expect(isRecentlyUpdated(dateStr, 60)).toBe(true)
  })
})

describe('tutorialSchema', () => {
  // Using valid v4 UUIDs (not all-zeros) because Zod v4 enforces proper UUID format
  const VALID_UUID_1 = '550e8400-e29b-41d4-a716-446655440000'
  const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440001'

  const validData = {
    title:               'Tutorial de teste',
    slug:                'tutorial-de-teste',
    description:         'Uma descrição bem longa do tutorial de teste aqui.',
    category_id:         VALID_UUID_1,
    content_type:        'video' as const,
    video_url:           'https://youtu.be/abc123',
    freshness:           'current' as const,
    visibility:          'authenticated' as const,
    is_published:        false,
    is_featured:         false,
    sort_order:          0,
    last_content_update: '2026-09-01',
    audience_ids:        [VALID_UUID_2],
  }

  it('validates a complete tutorial record', () => {
    const result = tutorialSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid slug', () => {
    const result = tutorialSchema.safeParse({ ...validData, slug: 'Invalid Slug!' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields['slug']).toBeTruthy()
    }
  })

  it('rejects a title that is too short', () => {
    const result = tutorialSchema.safeParse({ ...validData, title: 'AB' })
    expect(result.success).toBe(false)
  })

  it('rejects empty audience_ids', () => {
    const result = tutorialSchema.safeParse({ ...validData, audience_ids: [] as string[] })
    expect(result.success).toBe(false)
  })

  it('rejects invalid last_content_update format', () => {
    const result = tutorialSchema.safeParse({ ...validData, last_content_update: '04/09/2026' })
    expect(result.success).toBe(false)
  })

  it('accepts valid content types', () => {
    for (const type of ['video', 'pdf', 'image', 'app', 'link', 'article'] as const) {
      const result = tutorialSchema.safeParse({ ...validData, content_type: type })
      expect(result.success).toBe(true)
    }
  })
})
