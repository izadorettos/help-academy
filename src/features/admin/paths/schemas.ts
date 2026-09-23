import { z } from 'zod'

export const pathSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(120, 'Título deve ter no máximo 120 caracteres')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug deve ter no mínimo 2 caracteres')
    .max(120, 'Slug deve ter no máximo 120 caracteres')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .trim(),
  description: z.string().max(2000, 'Descrição muito longa').trim().optional(),
  owner_department_id: z.string().uuid('ID de área inválido').optional().nullable(),
  required: z.boolean().default(false),
  sequential: z.boolean().default(false),
})

export type PathInput = z.infer<typeof pathSchema>

/**
 * Generates a URL-safe slug from a title string.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

/**
 * Parses path form data into a raw object for Zod validation.
 * Checkboxes: present with value "true" when checked, absent when unchecked.
 */
export function parsePathFormData(formData: FormData) {
  return {
    title: formData.get('title'),
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    owner_department_id: formData.get('owner_department_id') || null,
    required: formData.get('required') === 'true',
    sequential: formData.get('sequential') === 'true',
  }
}
