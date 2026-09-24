import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { getPublicEnv } from '@/lib/env'
import type { AuthProvider, AuthResult, Identity } from '../provider'

export const supabaseProvider: AuthProvider = {
  id: 'supabase',
  capabilities: {
    passwordLogin: true,
    passwordReset: true,
    invites: true,
    externalRedirect: false,
  },
  async getIdentity(): Promise<Identity | null> {
    const supabase = await createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) return null
    return {
      subject: user.id,
      email: user.email ?? null,
      name:
        ((user.user_metadata as Record<string, unknown>)?.name as string | null) ?? null,
    }
  },
  async signInWithPassword({ login, password }): Promise<AuthResult> {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email: login, password })
    if (error) return { ok: false, error: 'Login ou senha inválidos.' }
    return { ok: true }
  },
  async signOut(): Promise<void> {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
  },
  async requestPasswordReset(login: string): Promise<AuthResult> {
    const env = getPublicEnv()
    const supabase = await createServerClient()
    await supabase.auth.resetPasswordForEmail(login, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?type=recovery`,
    })
    return { ok: true }
  },
}

export async function supabaseGetCurrentUser() {
  const supabase = await createServerClient()
  return supabase.auth.getUser()
}

export async function supabaseVerifyOtp(type: string, token_hash: string) {
  const supabase = await createServerClient()
  // EmailOtpType is validated at runtime by Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.auth.verifyOtp({ type: type as any, token_hash })
}

export async function supabaseUpdatePassword(password: string) {
  const supabase = await createServerClient()
  return supabase.auth.updateUser({ password })
}
