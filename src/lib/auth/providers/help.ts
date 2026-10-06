import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { getHelpAuthEnv } from '@/lib/env'
import type { AuthProvider, AuthResult, Identity } from '../provider'
import { loginWithCore, mapCoreRole, type CoreIdentity } from './help-core'

const PROVIDER_ID = 'help'
const GENERIC_ERROR = 'Não foi possível entrar agora. Tente novamente em instantes.'

/**
 * Login pela API do Core da HELP (docs/AUTH-PROVIDER.md, caminho "API própria").
 *
 * - Identidade: rota pública do Core (/usuario/login) com Turnstile obrigatório; o accessToken
 *   devolvido é validado aqui (HS256 + expiração) e email/perfil saem das claims assinadas.
 *   O Academy nunca armazena a senha nem o token do Core.
 * - Sessão: continua sendo do Supabase Auth (RLS via auth.uid()). Depois do login no Core,
 *   o usuário é criado/atualizado no Supabase e a sessão é aberta do lado do servidor.
 * - Perfil: Administrador no Core → admin; demais perfis → member (sincronizado a cada login).
 */
export const helpProvider: AuthProvider = {
  id: PROVIDER_ID,
  capabilities: {
    passwordLogin: true,
    passwordReset: false,
    invites: false,
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
      name: ((user.user_metadata as Record<string, unknown>)?.name as string | null) ?? null,
    }
  },
  getCaptcha() {
    return { provider: 'turnstile', siteKey: getHelpAuthEnv().HELP_TURNSTILE_SITE_KEY }
  },
  async signInWithPassword({ login, password, captchaToken }): Promise<AuthResult> {
    const env = getHelpAuthEnv()
    const core = await loginWithCore(
      { baseUrl: env.HELP_CORE_API_URL, jwtSecret: env.HELP_CORE_JWT_SECRET },
      { email: login, password, captchaToken: captchaToken ?? '' },
    )
    if (!core.ok) return core

    const provisioned = await provisionUser(core.identity)
    if (!provisioned.ok) return provisioned

    return openSession(provisioned.email)
  },
  async signOut(): Promise<void> {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
  },
}

type ProvisionResult = { ok: true; email: string } | { ok: false; error: string }

/**
 * Garante o usuário do Academy para a pessoa do Core.
 * Ordem de busca: vínculo (auth_provider, external_subject) → mesmo email (conta criada antes
 * da integração, preserva o progresso) → cria novo usuário no Supabase Auth.
 */
async function provisionUser(identity: CoreIdentity): Promise<ProvisionResult> {
  const admin = createAdminClient()
  const columns = 'id, email, name, active'

  const { data: linked, error: linkedError } = await admin
    .from('profiles')
    .select(columns)
    .eq('auth_provider', PROVIDER_ID)
    .eq('external_subject', identity.subject)
    .maybeSingle()
  if (linkedError) return fail('buscar perfil vinculado', linkedError)

  let profile = linked
  if (!profile) {
    const { data: byEmail, error } = await admin
      .from('profiles')
      .select(columns)
      .eq('email', identity.email)
      .maybeSingle()
    if (error) return fail('buscar perfil por email', error)
    profile = byEmail
  }

  if (!profile) {
    const { data, error } = await admin.auth.admin.createUser({
      email: identity.email,
      email_confirm: true,
      user_metadata: { name: identity.name },
    })
    if (error || !data.user) return fail('criar usuário', error)
    // O trigger on_auth_user_created cria o profile (role member, ativo).
    profile = { id: data.user.id, email: identity.email, name: '', active: true }
  }

  if (!profile.active) return { ok: false, error: 'Seu acesso ao Academy está desativado.' }

  if (profile.email.toLowerCase() !== identity.email) {
    const { error } = await admin.auth.admin.updateUserById(profile.id, {
      email: identity.email,
      email_confirm: true,
    })
    if (error) return fail('atualizar email', error)
  }

  const name = validName(identity.name) ?? validName(profile.name) ?? identity.email.split('@')[0]
  const { error: updateError } = await admin
    .from('profiles')
    .update({
      auth_provider: PROVIDER_ID,
      external_subject: identity.subject,
      email: identity.email,
      name,
      role: mapCoreRole(identity.coreRole),
    })
    .eq('id', profile.id)
  if (updateError) return fail('atualizar perfil', updateError)

  return { ok: true, email: identity.email }
}

/** Abre a sessão Supabase (cookies) sem senha: link mágico gerado e verificado no servidor. */
async function openSession(email: string): Promise<AuthResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data.properties?.hashed_token) return fail('gerar link de sessão', error)

  const supabase = await createServerClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: data.properties.hashed_token,
  })
  if (verifyError) return fail('abrir sessão', verifyError)
  return { ok: true }
}

function validName(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  return trimmed && trimmed.length >= 2 ? trimmed.slice(0, 120) : null
}

function fail(step: string, error: unknown): { ok: false; error: string } {
  console.error(`Login HELP: falha ao ${step}:`, error instanceof Error ? error.message : error)
  return { ok: false, error: GENERIC_ERROR }
}
