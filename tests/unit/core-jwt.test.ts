import { describe, expect, it } from 'vitest'
import { verifyCoreJwt } from '@/lib/auth/providers/core-jwt'
import { b64, CORE_JWT_SECRET as SECRET, signCoreJwt as signJwt } from './helpers/core-jwt'

const NOW = Date.UTC(2026, 9, 3, 12, 0, 0)
const nowSeconds = Math.floor(NOW / 1000)

const valid = {
  email: 'pessoa@help.com',
  tipo: 'Administrador',
  iat: nowSeconds,
  exp: nowSeconds + 86_400,
}

describe('verifyCoreJwt', () => {
  it('aceita token HS256 válido e devolve as claims', () => {
    expect(verifyCoreJwt(signJwt(valid), SECRET, NOW)).toEqual({ ok: true, claims: valid })
  })

  it('recusa assinatura com outro segredo', () => {
    expect(verifyCoreJwt(signJwt(valid, 'outro'), SECRET, NOW)).toEqual({
      ok: false,
      reason: 'assinatura inválida',
    })
  })

  it('recusa payload adulterado', () => {
    const [h, , s] = signJwt(valid).split('.')
    const forged = `${h}.${b64({ ...valid, tipo: 'Administrador', email: 'outra@help.com' })}.${s}`
    expect(verifyCoreJwt(forged, SECRET, NOW).ok).toBe(false)
  })

  it('recusa alg none e outros algoritmos', () => {
    const none = `${b64({ alg: 'none' })}.${b64(valid)}.`
    expect(verifyCoreJwt(none, SECRET, NOW)).toEqual({ ok: false, reason: 'algoritmo não aceito' })
    expect(verifyCoreJwt(signJwt(valid, SECRET, { alg: 'HS512' }), SECRET, NOW).ok).toBe(false)
  })

  it('recusa token expirado (tolerância de 60s)', () => {
    const expired = signJwt({ ...valid, exp: nowSeconds - 61 })
    expect(verifyCoreJwt(expired, SECRET, NOW)).toEqual({ ok: false, reason: 'token expirado' })
    expect(verifyCoreJwt(signJwt({ ...valid, exp: nowSeconds - 30 }), SECRET, NOW).ok).toBe(true)
  })

  it('recusa token sem exp, email ou tipo', () => {
    for (const field of ['exp', 'email', 'tipo'] as const) {
      const { [field]: _omit, ...rest } = valid
      expect(verifyCoreJwt(signJwt(rest), SECRET, NOW)).toEqual({
        ok: false,
        reason: 'claims ausentes',
      })
    }
  })

  it('recusa formato inválido', () => {
    expect(verifyCoreJwt('abc', SECRET, NOW).ok).toBe(false)
    expect(verifyCoreJwt('a.b.c', SECRET, NOW).ok).toBe(false)
  })
})
