import { z } from 'zod'

export const tutorialContentTypeValues = ['video', 'pdf', 'image', 'app', 'link', 'article'] as const
export const tutorialFreshnessValues   = ['current', 'needs_update', 'needs_review'] as const
export const tutorialVisibilityValues  = ['authenticated', 'public'] as const

export const tutorialSchema = z.object({
  title:               z.string().min(3).max(160),
  slug:                z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug inválido: apenas letras minúsculas, números e hífens'),
  description:         z.string().min(10).max(1000),
  category_id:         z.string().uuid(),
  content_type:        z.enum(tutorialContentTypeValues),
  video_url:           z.string().url().optional().nullable(),
  file_url:            z.string().optional().nullable(),
  thumbnail_url:       z.string().optional().nullable(),
  duration_seconds:    z.number().int().min(0).optional().nullable(),
  pages:               z.number().int().min(1).optional().nullable(),
  app_version:         z.string().max(30).optional().nullable(),
  freshness:           z.enum(tutorialFreshnessValues).default('current'),
  freshness_note:      z.string().max(500).optional().nullable(),
  visibility:          z.enum(tutorialVisibilityValues).default('authenticated'),
  is_published:        z.boolean().default(false),
  is_featured:         z.boolean().default(false),
  sort_order:          z.number().int().default(0),
  series_id:           z.string().uuid().optional().nullable(),
  series_position:     z.number().int().min(1).optional().nullable(),
  last_content_update: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (AAAA-MM-DD)'),
  date_source:         z.string().max(200).optional().nullable(),
  audience_ids:        z.array(z.string().uuid()).min(1, 'Selecione ao menos um público'),
})

export type TutorialFormValues = z.infer<typeof tutorialSchema>

export const categorySchema = z.object({
  slug:       z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug inválido'),
  name:       z.string().min(2).max(80),
  icon:       z.string().min(1).max(40).default('BookOpen'),
  sort_order: z.number().int().default(0),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export const audienceSchema = z.object({
  slug:        z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug inválido'),
  name:        z.string().min(2).max(80),
  description: z.string().max(300).optional().nullable(),
  sort_order:  z.number().int().default(0),
})

export type AudienceFormValues = z.infer<typeof audienceSchema>
