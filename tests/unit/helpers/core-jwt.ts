import { createHmac } from 'node:crypto'

export const CORE_JWT_SECRET = 'segredo-do-core'

export function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/** Assina como o Core (@nestjs/jwt, HS256). */
export function signCoreJwt(
  payload: Record<string, unknown>,
  secret = CORE_JWT_SECRET,
  header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' },
): string {
  const unsigned = `${b64(header)}.${b64(payload)}`
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url')
  return `${unsigned}.${signature}`
}
