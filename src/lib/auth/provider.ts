export type Identity = { subject: string; email: string | null; name: string | null }

export type AuthCapabilities = {
  passwordLogin: boolean
  passwordReset: boolean
  invites: boolean
  externalRedirect: boolean
}

export type AuthResult = { ok: true } | { ok: false; error: string }

export interface AuthProvider {
  readonly id: 'supabase' | 'help'
  readonly capabilities: AuthCapabilities
  getIdentity(): Promise<Identity | null>
  signInWithPassword(input: { login: string; password: string }): Promise<AuthResult>
  startExternalSignIn?(returnTo: string): Promise<{ redirectUrl: string }>
  signOut(): Promise<void>
  requestPasswordReset?(login: string): Promise<AuthResult>
}
