import { z } from 'zod'

export const gamificationSettingsSchema = z.object({
  xp_lesson_default: z.coerce
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Deve ser maior ou igual a 0'),
  xp_quiz_default: z.coerce
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Deve ser maior ou igual a 0'),
  xp_quiz_perfect_bonus: z.coerce
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Deve ser maior ou igual a 0'),
  xp_module_completed: z.coerce
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Deve ser maior ou igual a 0'),
  xp_path_completed: z.coerce
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Deve ser maior ou igual a 0'),
})

export type GamificationSettingsInput = z.infer<typeof gamificationSettingsSchema>

export const levelSchema = z.object({
  level: z.coerce.number().int().min(1),
  name: z.string().max(60, 'Nome deve ter no máximo 60 caracteres').trim().optional(),
  min_xp: z.coerce.number().int('Deve ser um número inteiro').min(0, 'Deve ser maior ou igual a 0'),
})

export type LevelInput = z.infer<typeof levelSchema>
