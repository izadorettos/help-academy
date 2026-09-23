import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'
import { getPublicEnv } from '@/lib/env'

export async function createServerClient() {
  const env = getPublicEnv()
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Chamado de Server Component onde não é possível setar cookies.
            // O proxy.ts (middleware) garante a renovação da sessão.
          }
        },
      },
    },
  )
}
