import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getServerEnv } from '@/lib/env'

let adminClient: ReturnType<typeof createClient<Database>> | undefined

export function createAdminClient() {
  const env = getServerEnv()
  adminClient ??= createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return adminClient
}
