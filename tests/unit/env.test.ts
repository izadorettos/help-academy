import { describe, expect, it } from 'vitest'
import { EnvValidationError, parseEnv, publicEnvSchema, serverEnvSchema } from '@/lib/env'

const validPublic = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-key-local',
}

const validServer = {
  ...validPublic,
  SUPABASE_SECRET_KEY: 'service-role-key-local',
}

describe('parseEnv', () => {
  it('aceita variáveis públicas válidas', () => {
    const env = parseEnv(publicEnvSchema, validPublic)
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000')
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://127.0.0.1:54321')
  })

  it('aceita variáveis de servidor válidas', () => {
    const env = parseEnv(serverEnvSchema, validServer)
    expect(env.SUPABASE_SECRET_KEY).toBe('service-role-key-local')
  })

  it('falha com mensagem clara quando variável está ausente', () => {
    expect(() => parseEnv(publicEnvSchema, {})).toThrow(EnvValidationError)
    expect(() => parseEnv(publicEnvSchema, {})).toThrow(/NEXT_PUBLIC_SITE_URL/)
    expect(() => parseEnv(publicEnvSchema, {})).toThrow(/\.env\.example/)
  })

  it('rejeita URL inválida ou com protocolo não http(s)', () => {
    expect(() =>
      parseEnv(publicEnvSchema, { ...validPublic, NEXT_PUBLIC_SITE_URL: 'nao-e-url' }),
    ).toThrow(EnvValidationError)
    expect(() =>
      parseEnv(publicEnvSchema, { ...validPublic, NEXT_PUBLIC_SITE_URL: 'ftp://help.com.br' }),
    ).toThrow(EnvValidationError)
  })

  it('falha quando SUPABASE_SECRET_KEY está ausente no schema de servidor', () => {
    expect(() => parseEnv(serverEnvSchema, validPublic)).toThrow(EnvValidationError)
    expect(() => parseEnv(serverEnvSchema, validPublic)).toThrow(/SUPABASE_SECRET_KEY/)
  })
})
