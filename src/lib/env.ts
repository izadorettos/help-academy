import { z } from 'zod'

/**
 * Variáveis públicas (podem ir para o navegador).
 * Variáveis de servidor ficam em um schema separado, adicionado na fase 2
 * (SUPABASE_SECRET_KEY), e só podem ser lidas em código server-only.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

export class EnvValidationError extends Error {
  constructor(issues: string[]) {
    super(
      `Variáveis de ambiente inválidas ou ausentes:\n${issues.map((i) => `  - ${i}`).join('\n')}\n` +
        'Confira o arquivo .env.example.',
    )
    this.name = 'EnvValidationError'
  }
}

export function parseEnv<S extends z.ZodType>(schema: S, source: Record<string, unknown>): z.infer<S> {
  const result = schema.safeParse(source)
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`),
    )
  }
  return result.data
}

let cachedPublicEnv: PublicEnv | undefined

/**
 * Lê as variáveis públicas. As referências precisam ser literais
 * (process.env.NEXT_PUBLIC_…) para o Next.js conseguir embuti-las no bundle do cliente.
 */
export function getPublicEnv(): PublicEnv {
  cachedPublicEnv ??= parseEnv(publicEnvSchema, {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  })
  return cachedPublicEnv
}
