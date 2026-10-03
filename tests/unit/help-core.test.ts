import { afterEach, describe, expect, it, vi } from 'vitest'
import { CAPTCHA_REQUIRED, loginWithCore, mapCoreRole } from '@/lib/auth/providers/help-core'
import { CORE_JWT_SECRET, signCoreJwt } from './helpers/core-jwt'

type Call = { url: string; init: RequestInit }

function fakeFetch(responses: Record<string, { status: number; body: unknown }>) {
  const calls: Call[] = []
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const key = String(url)
    calls.push({ url: key, init: init ?? {} })
    const res = responses[key]
    if (!res) throw new Error(`rota inesperada: ${key}`)
    return new Response(JSON.stringify(res.body), { status: res.status })
  })
  return { fetch: fn as unknown as typeof fetch, calls }
}

const BASE = 'http://core.local'
const NOW = Date.UTC(2026, 9, 3, 12, 0, 0)
const iat = Math.floor(NOW / 1000)
const credentials = { email: ' Pessoa@Help.com ', password: 'segredo', captchaToken: 'cf-token' }
const config = (fetch: typeof globalThis.fetch) => ({
  baseUrl: `${BASE}/`,
  jwtSecret: CORE_JWT_SECRET,
  fetch,
  now: () => NOW,
})
const token = (claims: Record<string, unknown> = {}) =>
  signCoreJwt({
    email: 'pessoa@help.com',
    tipo: 'Administrador',
    iat,
    exp: iat + 86_400,
    ...claims,
  })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mapCoreRole', () => {
  it('Administrador vira admin', () => {
    expect(mapCoreRole('Administrador')).toBe('admin')
  })

  it.each(['Analista', 'Gestor', 'Estabelecimento', 'Afiliado', 'PessoaFisica', 'Entregador'])(
    '%s vira member',
    (role) => {
      expect(mapCoreRole(role)).toBe('member')
    },
  )
})

describe('loginWithCore', () => {
  it('usa a rota pública /usuario/login com o captchaToken e lê o perfil do JWT', async () => {
    const { fetch, calls } = fakeFetch({
      [`${BASE}/usuario/login`]: {
        status: 201,
        // tipoUsuario do corpo é ignorado: vale a claim assinada
        body: { accessToken: token(), userId: 42, tipoUsuario: 'Analista', nomeUsuario: 'Pessoa' },
      },
    })

    const result = await loginWithCore(config(fetch), credentials)

    expect(result).toEqual({
      ok: true,
      identity: {
        subject: '42',
        email: 'pessoa@help.com',
        name: 'Pessoa',
        coreRole: 'Administrador',
      },
    })
    expect(calls).toHaveLength(1)
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      email: 'pessoa@help.com',
      senha: 'segredo',
      captchaToken: 'cf-token',
    })
  })

  it('exige o token do Turnstile e nem chama o Core sem ele', async () => {
    const { fetch, calls } = fakeFetch({})

    const result = await loginWithCore(config(fetch), { ...credentials, captchaToken: '  ' })

    expect(result).toEqual({ ok: false, error: CAPTCHA_REQUIRED })
    expect(calls).toHaveLength(0)
  })

  it('repassa a recusa do captcha pelo Core', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { fetch } = fakeFetch({
      [`${BASE}/usuario/login`]: {
        status: 401,
        body: { statusCode: 401, message: 'Verificação de captcha falhou' },
      },
    })

    expect(await loginWithCore(config(fetch), credentials)).toEqual({
      ok: false,
      error: CAPTCHA_REQUIRED,
    })
  })

  it.each([
    [
      'assinado com outro segredo',
      () => signCoreJwt({ email: 'pessoa@help.com', tipo: 'Administrador', exp: iat + 60 }, 'x'),
    ],
    ['expirado', () => token({ exp: iat - 3600 })],
    ['emitido para outro email', () => token({ email: 'outra@help.com' })],
    ['ausente', () => undefined],
  ])('recusa o login quando o JWT do Core está %s', async (_label, makeToken) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { fetch } = fakeFetch({
      [`${BASE}/usuario/login`]: {
        status: 201,
        body: { accessToken: makeToken(), userId: 42, tipoUsuario: 'Administrador' },
      },
    })

    const result = await loginWithCore(config(fetch), credentials)

    expect(result.ok).toBe(false)
  })

  it('tenta /entregador/login quando o Core recusa entregador na rota padrão', async () => {
    const { fetch, calls } = fakeFetch({
      [`${BASE}/usuario/login`]: {
        status: 403,
        body: { statusCode: 403, message: 'Não é possível fazer o login como entregador' },
      },
      [`${BASE}/entregador/login`]: {
        status: 200,
        body: {
          DeliverymanUser: { id: 9, name: 'Entregador X', token: token({ tipo: 'Entregador' }) },
        },
      },
    })

    const result = await loginWithCore(config(fetch), credentials)

    expect(result).toEqual({
      ok: true,
      identity: {
        subject: '9',
        email: 'pessoa@help.com',
        name: 'Entregador X',
        coreRole: 'Entregador',
      },
    })
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({
      email: 'pessoa@help.com',
      password: 'segredo',
    })
  })

  it('devolve mensagem genérica para credencial inválida ou cadastro recusado', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { fetch } = fakeFetch({
      [`${BASE}/usuario/login`]: {
        status: 401,
        body: { statusCode: 401, message: 'Você deve validar seu email antes de continuar!' },
      },
    })

    expect(await loginWithCore(config(fetch), credentials)).toEqual({
      ok: false,
      error: 'Login ou senha inválidos.',
    })
  })

  it('informa indisponibilidade quando o Core falha ou não responde', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { fetch: down } = fakeFetch({ [`${BASE}/usuario/login`]: { status: 502, body: {} } })
    const offline = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch

    for (const fetch of [down, offline]) {
      const result = await loginWithCore(config(fetch), credentials)
      expect(result.ok).toBe(false)
      expect(!result.ok && result.error).toMatch(/Tente novamente/)
    }
  })
})
