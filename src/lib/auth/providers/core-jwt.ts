import { createHmac, timingSafeEqual } from 'node:crypto'

/** Claims que o Core assina no login (JwtPayload do Core + campos padrão do jsonwebtoken). */
export type CoreJwtClaims = { email: string; tipo: string; iat?: number; exp: number }

export type CoreJwtResult = { ok: true; claims: CoreJwtClaims } | { ok: false; reason: string }

const CLOCK_SKEW_SECONDS = 60

/**
 * Valida o accessToken emitido pelo Core (@nestjs/jwt, HS256 com JWT_SECRET, expiração 1d).
 * Confere algoritmo, assinatura, expiração e o formato das claims usadas pelo Academy.
 */
export function verifyCoreJwt(
  token: string,
  secret: string,
  now: number = Date.now(),
): CoreJwtResult {
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'formato inválido' }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string]

  const header = decodeJson(encodedHeader)
  // Só HS256: impede "alg: none" e troca de algoritmo.
  if (header?.alg !== 'HS256') return { ok: false, reason: 'algoritmo não aceito' }

  const expected = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest()
  const received = Buffer.from(encodedSignature, 'base64url')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { ok: false, reason: 'assinatura inválida' }
  }

  const payload = decodeJson(encodedPayload)
  if (
    !payload ||
    typeof payload.email !== 'string' ||
    typeof payload.tipo !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    return { ok: false, reason: 'claims ausentes' }
  }

  const nowSeconds = Math.floor(now / 1000)
  if (payload.exp + CLOCK_SKEW_SECONDS <= nowSeconds) return { ok: false, reason: 'token expirado' }
  if (typeof payload.iat === 'number' && payload.iat - CLOCK_SKEW_SECONDS > nowSeconds) {
    return { ok: false, reason: 'token emitido no futuro' }
  }

  return {
    ok: true,
    claims: {
      email: payload.email,
      tipo: payload.tipo,
      exp: payload.exp,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
    },
  }
}

function decodeJson(segment: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}
