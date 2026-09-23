import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha obrigatória.'),
})

export const requestPasswordResetSchema = z.object({
  email: z.string().email('E-mail inválido.'),
})

export const updatePasswordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[a-z]/, 'Deve conter letra minúscula.')
  .regex(/[A-Z]/, 'Deve conter letra maiúscula.')
  .regex(/[0-9]/, 'Deve conter número.')
