import { supabaseProvider } from './providers/supabase'
import { helpProvider } from './providers/help'
import type { AuthProvider } from './provider'

export function getAuthProvider(): AuthProvider {
  const id = process.env.AUTH_PROVIDER ?? 'supabase'
  if (id === 'help') return helpProvider
  return supabaseProvider
}

export type { AuthProvider, Identity, AuthCapabilities, AuthResult } from './provider'
