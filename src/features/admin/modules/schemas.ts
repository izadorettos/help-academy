import { z } from 'zod'

export const moduleSchema = z.object({
  title: z
    .string()
    .min(2, 'Título deve ter no mínimo 2 caracteres')
    .max(120, 'Título deve ter no máximo 120 caracteres')
    .trim(),
  description: z.string().max(2000, 'Descrição muito longa').trim().optional(),
})

export type ModuleInput = z.infer<typeof moduleSchema>

export function parseModuleFormData(formData: FormData) {
  return {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
  }
}
