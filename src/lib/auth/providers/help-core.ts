import type { Database } from '@/types/database.types'
import { verifyCoreJwt } from './core-jwt'

type UserRole = Database['public']['Enums']['user_role']

/**
 * Pessoa autenticada pelo Core da HELP.
 * `email` e `coreRole` vêm das claims do JWT validado; `subject` é o id do usuário no Core.
 */
export type CoreIdentity = {
  subject: string
  email: string
  name: string | null
  coreRole: string
}

export type CoreLoginResult = { ok: true; identity: CoreIdentity } | { ok: false; error: string }

export type CoreConfig = {
  baseUrl: string
  jwtSecret: string
  fetch?: typeof fetch
  timeoutMs?: number
  now?: () => number
}

export const INVALID_CREDENTIALS = 'Login ou senha inválidos.'
export const CAPTCHA_REQUIRED = 'Confirme que você não é um robô e tente novamente.'
const UNAVAILABLE = 'Não foi possível validar o login agora. Tente novamente em instantes.'

/** Perfis do Core → perfis do Academy: Administrador → admin; demais → member. */
export function mapCoreRole(coreRole: string): UserRole {
  return coreRole === 'Administrador' ? 'admin' : 'member'
}

type LoginRO = { accessToken: string; userId: number; nomeUsuario?: string | null }
type EntregadorLoginRO = {
  DeliverymanUser: { id: number; token: string; name?: string | null }
}

/**
 * Confere login e senha na rota pública do Core, com o token do Turnstile obrigatório.
 * 1. POST /usuario/login { email, senha, captchaToken } — o Core valida o captcha antes da senha;
 * 2. o Core recusa entregadores nessa rota com 403 (já depois do captcha), então tenta
 *    POST /entregador/login;
 * 3. o accessToken devolvido é validado aqui (assinatura HS256, expiração, email).
 */
export async function loginWithCore(
  config: CoreConfig,
  input: { email: string; password: string; captchaToken: string },
): Promise<CoreLoginResult> {
  const email = input.email.trim().toLowerCase()
  const captchaToken = input.captchaToken.trim()
  if (!captchaToken) return { ok: false, error: CAPTCHA_REQUIRED }

  const doFetch = config.fetch ?? fetch
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const post = (path: string, body: unknown) =>
    doFetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
      cache: 'no-store',
    })

  try {
    const res = await post('/usuario/login', { email, senha: input.password, captchaToken })

    if (res.ok) {
      const data = (await res.json()) as LoginRO
      return identityFromToken(config, email, data.accessToken, data.userId, data.nomeUsuario)
    }

    const message = await readErrorMessage(res)
    if (res.status === 403 && /entregador/i.test(message ?? '')) {
      const entregador = await post('/entregador/login', { email, password: input.password })
      if (!entregador.ok) {
        return {
          ok: false,
          error: describeError(entregador.status, await readErrorMessage(entregador)),
        }
      }
      const { DeliverymanUser: user } = (await entregador.json()) as EntregadorLoginRO
      return identityFromToken(config, email, user.token, user.id, user.name)
    }
    return { ok: false, error: describeError(res.status, message) }
  } catch (error) {
    console.error(
      'Falha ao contactar o Core da HELP:',
      error instanceof Error ? error.message : error,
    )
    return { ok: false, error: UNAVAILABLE }
  }
}

function identityFromToken(
  config: CoreConfig,
  email: string,
  token: unknown,
  userId: unknown,
  name: string | null | undefined,
): CoreLoginResult {
  const verified =
    typeof token === 'string'
      ? verifyCoreJwt(token, config.jwtSecret, config.now?.())
      : ({ ok: false, reason: 'token ausente' } as const)

  if (!verified.ok) {
    console.error(`Login HELP: JWT do Core rejeitado (${verified.reason}).`)
    return { ok: false, error: UNAVAILABLE }
  }
  // O token precisa ser da mesma pessoa que fez login.
  if (verified.claims.email.trim().toLowerCase() !== email) {
    console.error('Login HELP: JWT do Core emitido para outro email.')
    return { ok: false, error: UNAVAILABLE }
  }
  if (typeof userId !== 'number' && typeof userId !== 'string') {
    console.error('Login HELP: resposta do Core sem id de usuário.')
    return { ok: false, error: UNAVAILABLE }
  }

  return {
    ok: true,
    identity: {
      subject: String(userId),
      email,
      name: name ?? null,
      coreRole: verified.claims.tipo,
    },
  }
}

async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { message?: unknown }
    return typeof body.message === 'string' ? body.message : null
  } catch {
    return null
  }
}

function describeError(status: number, message: string | null): string {
  // Motivo detalhado só no log: o Core informa "email não validado" antes de conferir a
  // senha na rota de entregador, então repassá-lo permitiria descobrir contas existentes.
  console.warn(`Login HELP recusado pelo Core (HTTP ${status}): ${message ?? 'sem mensagem'}`)
  if (status >= 500) return UNAVAILABLE
  if (/captcha/i.test(message ?? '')) return CAPTCHA_REQUIRED
  return INVALID_CREDENTIALS
}
