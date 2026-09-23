import { z } from 'zod'

/**
 * Variáveis públicas (disponíveis no navegador via next.js).
 * As referências precisam ser literais (process.env.NEXT_PUBLIC_…).
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

/**
 * Variáveis exclusivas do servidor (nunca no bundle do cliente).
 */
export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

export class EnvValidationError extends Error {
  constructor(issues: string[]) {
    super(
      `Variáveis de ambiente inválidas ou ausentes:\n${issues.map((i) => `  - ${i}`).join('\n')}\n` +
        'Confira o arquivo .env.example.',
    )
    this.name = 'EnvValidationError'
  }
}

export function parseEnv<S extends z.ZodType>(
  schema: S,
  source: Record<string, unknown>,
): z.infer<S> {
  const result = schema.safeParse(source)
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`),
    )
  }
  return result.data
}

let cachedPublicEnv: PublicEnv | undefined
let cachedServerEnv: ServerEnv | undefined

export function getPublicEnv(): PublicEnv {
  cachedPublicEnv ??= parseEnv(publicEnvSchema, {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
  return cachedPublicEnv
}

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= parseEnv(serverEnvSchema, {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  })
  return cachedServerEnv
}
