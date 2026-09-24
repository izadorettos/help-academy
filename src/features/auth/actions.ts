'use server'
import { redirect } from 'next/navigation'
import { getAuthProvider } from '@/lib/auth'
import { signInSchema, requestPasswordResetSchema, updatePasswordSchema } from './schemas'
import { supabaseUpdatePassword } from '@/lib/auth/providers/supabase'

export type SignInState = { error: string } | null

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    login: formData.get('login'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Login ou senha inválidos.' }

  const result = await getAuthProvider().signInWithPassword(parsed.data)
  if (!result.ok) return { error: result.error }

  redirect('/dashboard')
}

export async function signOut(): Promise<never> {
  await getAuthProvider().signOut()
  redirect('/login')
}

export type RecoverState = { error?: string; sent?: true } | null

export async function requestPasswordReset(
  _prev: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const parsed = requestPasswordResetSchema.safeParse({ login: formData.get('login') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Login inválido.' }

  const provider = getAuthProvider()
  if (!provider.requestPasswordReset) return { error: 'Recuperação de senha não disponível.' }
  await provider.requestPasswordReset(parsed.data.login)
  return { sent: true }
}

export type ResetPasswordState = { error: string } | null

export async function updatePassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = updatePasswordSchema.safeParse(formData.get('password'))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Senha inválida.' }

  const { error } = await supabaseUpdatePassword(parsed.data)
  if (error) return { error: 'Não foi possível redefinir a senha. Tente novamente.' }

  redirect('/dashboard')
}
