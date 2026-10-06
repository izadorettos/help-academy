export type Identity = { subject: string; email: string | null; name: string | null }

export type AuthCapabilities = {
  passwordLogin: boolean
  passwordReset: boolean
  invites: boolean
  externalRedirect: boolean
}

export type AuthResult = { ok: true } | { ok: false; error: string }

/** Captcha exigido no formulário de login (hoje: Cloudflare Turnstile). */
export type CaptchaConfig = { provider: 'turnstile'; siteKey: string }

export type SignInInput = { login: string; password: string; captchaToken?: string }

export interface AuthProvider {
  readonly id: 'supabase' | 'help'
  readonly capabilities: AuthCapabilities
  getIdentity(): Promise<Identity | null>
  /** Captcha que o formulário deve exibir; null quando o provedor não exige. */
  getCaptcha?(): CaptchaConfig | null
  signInWithPassword(input: SignInInput): Promise<AuthResult>
  startExternalSignIn?(returnTo: string): Promise<{ redirectUrl: string }>
  signOut(): Promise<void>
  requestPasswordReset?(login: string): Promise<AuthResult>
}
