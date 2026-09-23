import { describe, expect, it } from 'vitest'
import { EnvValidationError, parseEnv, publicEnvSchema } from '@/lib/env'

describe('parseEnv', () => {
  it('aceita variáveis válidas', () => {
    const env = parseEnv(publicEnvSchema, { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000')
  })

  it('falha com mensagem clara quando a variável está ausente', () => {
    expect(() => parseEnv(publicEnvSchema, {})).toThrow(EnvValidationError)
    expect(() => parseEnv(publicEnvSchema, {})).toThrow(/NEXT_PUBLIC_SITE_URL/)
    expect(() => parseEnv(publicEnvSchema, {})).toThrow(/\.env\.example/)
  })

  it('rejeita URL inválida ou com protocolo não http(s)', () => {
    expect(() => parseEnv(publicEnvSchema, { NEXT_PUBLIC_SITE_URL: 'nao-e-url' })).toThrow(
      EnvValidationError,
    )
    expect(() =>
      parseEnv(publicEnvSchema, { NEXT_PUBLIC_SITE_URL: 'ftp://help.com.br' }),
    ).toThrow(EnvValidationError)
  })
})
