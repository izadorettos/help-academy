'use server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getPublicEnv } from '@/lib/env'
import { signInSchema, requestPasswordResetSchema, updatePasswordSchema } from './schemas'

export type SignInState = { error: string } | null

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'E-mail ou senha inválidos.' }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) return { error: 'E-mail ou senha inválidos.' }

  redirect('/dashboard')
}

export async function signOut(): Promise<never> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type RecoverState = { error?: string; sent?: true } | null

export async function requestPasswordReset(
  _prev: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'E-mail inválido.' }

  const env = getPublicEnv()
  const supabase = await createServerClient()

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?type=recovery`,
  })

  return { sent: true }
}

export type ResetPasswordState = { error: string } | null

export async function updatePassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = updatePasswordSchema.safeParse(formData.get('password'))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Senha inválida.' }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data })

  if (error) return { error: 'Não foi possível redefinir a senha. Tente novamente.' }

  redirect('/dashboard')
}
