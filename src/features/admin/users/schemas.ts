import { z } from 'zod'

export const inviteUserSchema = z.object({
  email: z.string().email('E-mail inválido').max(254, 'E-mail muito longo'),
  name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(120, 'Nome deve ter no máximo 120 caracteres')
    .trim(),
  role: z.enum(['member', 'admin'], { message: 'Perfil inválido' }),
  department_id: z.string().uuid('Área inválida').optional().or(z.literal('')),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(120, 'Nome deve ter no máximo 120 caracteres')
    .trim(),
  role: z.enum(['member', 'admin'], { message: 'Perfil inválido' }),
  department_id: z.string().uuid('Área inválida').optional().or(z.literal('')),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
