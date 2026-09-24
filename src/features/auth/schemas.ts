import { z } from 'zod'

export const signInSchema = z.object({
  login: z.string().min(1, 'Login obrigatório.'),
  password: z.string().min(1, 'Senha obrigatória.'),
})

export const requestPasswordResetSchema = z.object({
  login: z.string().min(1, 'Login obrigatório.'),
})

export const updatePasswordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[a-z]/, 'Deve conter letra minúscula.')
  .regex(/[A-Z]/, 'Deve conter letra maiúscula.')
  .regex(/[0-9]/, 'Deve conter número.')
