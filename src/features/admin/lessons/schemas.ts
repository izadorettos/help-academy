import { z } from 'zod'

const ACTIVITY_TYPES = ['task', 'challenge', 'survey', 'game'] as const

export const lessonSchema = z
  .object({
    title: z
      .string()
      .min(2, 'Título deve ter no mínimo 2 caracteres')
      .max(160, 'Título deve ter no máximo 160 caracteres')
      .trim(),
    content_type: z.enum(
      ['text', 'video', 'pdf', 'link', 'embed', 'task', 'challenge', 'survey', 'game', 'image', 'presentation'],
      { error: 'Tipo de conteúdo inválido' },
    ),
    content: z.string().optional(),
    external_url: z
      .string()
      .regex(/^https:\/\//, 'URL deve começar com https://')
      .optional()
      .nullable(),
    file_path: z.string().optional().nullable(),
    /** JSON serializado (string) do formulário — validado abaixo. */
    config_json: z.string().optional().nullable(),
    /** Objeto de config final resolvido pelo parse. */
    config: z.record(z.string(), z.unknown()).optional().nullable(),
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
      ['link', 'embed'].includes(data.content_type) &&
      !data.external_url
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['external_url'],
        message: 'URL externa é obrigatória para este tipo de aula',
      })
    }
    if (data.content_type === 'video' && !data.external_url) {
      const provider = (data.config as Record<string, unknown> | null | undefined)?.['provider']
      if (provider !== 'placeholder') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['external_url'],
          message: 'Informe a URL do vídeo ou use provider "placeholder" no config',
        })
      }
    }
    // pdf/image/presentation file_path is optional at creation (uploaded separately via signed URL)
    if ((ACTIVITY_TYPES as readonly string[]).includes(data.content_type)) {
      const cfg = data.config
      if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg) || Object.keys(cfg).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['config_json'],
          message: 'Config JSON é obrigatório para tarefas, desafios, questionários e games',
        })
      }
    }
  })

export type LessonInput = z.infer<typeof lessonSchema>

export function parseLessonFormData(formData: FormData) {
  const estimatedRaw = formData.get('estimated_minutes')
  // Checkbox: value "true" when checked, absent when unchecked
  const requiredValue = formData.get('required')
  const rawConfig = formData.get('config_json')
  let config: Record<string, unknown> | null = null
  if (typeof rawConfig === 'string' && rawConfig.trim() !== '') {
    try {
      const parsed: unknown = JSON.parse(rawConfig)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        config = parsed as Record<string, unknown>
      } else {
        config = { __invalid: true }
      }
    } catch {
      config = { __invalid: true }
    }
  }
  return {
    title: formData.get('title'),
    content_type: formData.get('content_type'),
    content: formData.get('content') || undefined,
    external_url: formData.get('external_url') || null,
    file_path: formData.get('file_path') || null,
    config_json: typeof rawConfig === 'string' ? rawConfig : null,
    config,
    estimated_minutes:
      estimatedRaw && (estimatedRaw as string).trim() !== ''
        ? parseInt(estimatedRaw as string, 10)
        : null,
    required: requiredValue === 'true',
  }
}
