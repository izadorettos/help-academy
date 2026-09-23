import { z } from 'zod'

export const departmentSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(60, 'Nome deve ter no máximo 60 caracteres')
    .trim(),
})

export type DepartmentInput = z.infer<typeof departmentSchema>

/**
 * Generates a URL-safe slug from a name string.
 * Matches the constraint: ^[a-z0-9]+(-[a-z0-9]+)*$
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
