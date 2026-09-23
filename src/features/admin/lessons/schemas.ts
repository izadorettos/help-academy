import { z } from 'zod'

export const lessonSchema = z
  .object({
    title: z
      .string()
      .min(2, 'Título deve ter no mínimo 2 caracteres')
      .max(160, 'Título deve ter no máximo 160 caracteres')
      .trim(),
    content_type: z.enum(['text', 'video', 'pdf', 'link', 'embed'], {
      error: 'Tipo de conteúdo inválido',
    }),
    content: z.string().optional(),
    external_url: z
      .string()
      .regex(/^https:\/\//, 'URL deve começar com https://')
      .optional()
      .nullable(),
    file_path: z.string().optional().nullable(),
    estimated_minutes: z
      .number()
      .int()
      .min(0)
      .max(600, 'Duração máxima é 600 minutos')
      .optional()
      .nullable(),
    required: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.content_type === 'text' && !data.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content'],
        message: 'Conteúdo é obrigatório para aulas do tipo texto',
      })
    }
    if (
      ['video', 'link', 'embed'].includes(data.content_type) &&
      !data.external_url
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['external_url'],
        message: 'URL externa é obrigatória para este tipo de aula',
      })
    }
    if (data.content_type === 'pdf' && !data.file_path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['file_path'],
        message: 'Caminho do arquivo é obrigatório para aulas PDF',
      })
    }
  })

export type LessonInput = z.infer<typeof lessonSchema>

export function parseLessonFormData(formData: FormData) {
  const estimatedRaw = formData.get('estimated_minutes')
  // Checkbox: value "true" when checked, absent when unchecked
  const requiredValue = formData.get('required')
  return {
    title: formData.get('title'),
    content_type: formData.get('content_type'),
    content: formData.get('content') || undefined,
    external_url: formData.get('external_url') || null,
    file_path: formData.get('file_path') || null,
    estimated_minutes:
      estimatedRaw && (estimatedRaw as string).trim() !== ''
        ? parseInt(estimatedRaw as string, 10)
        : null,
    required: requiredValue === 'true',
  }
}
