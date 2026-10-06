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

/**
 * Variáveis do provedor de login HELP (AUTH_PROVIDER=help).
 * - HELP_CORE_JWT_SECRET (somente servidor): o mesmo JWT_SECRET do Core, para validar o
 *   accessToken devolvido no login.
 * - HELP_TURNSTILE_SITE_KEY: site key pública do Cloudflare Turnstile (a mesma do Front);
 *   enviada ao navegador pela página de login.
 */
export const helpAuthEnvSchema = z.object({
  HELP_CORE_API_URL: z.url({ protocol: /^https?$/ }),
  HELP_CORE_JWT_SECRET: z.string().min(1),
  HELP_TURNSTILE_SITE_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type HelpAuthEnv = z.infer<typeof helpAuthEnvSchema>

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
let cachedHelpAuthEnv: HelpAuthEnv | undefined

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

export function getHelpAuthEnv(): HelpAuthEnv {
  cachedHelpAuthEnv ??= parseEnv(helpAuthEnvSchema, {
    HELP_CORE_API_URL: process.env.HELP_CORE_API_URL,
    HELP_CORE_JWT_SECRET: process.env.HELP_CORE_JWT_SECRET,
    HELP_TURNSTILE_SITE_KEY: process.env.HELP_TURNSTILE_SITE_KEY,
  })
  return cachedHelpAuthEnv
}
