import type { AuthProvider } from '../provider'

export const helpProvider: AuthProvider = {
  id: 'help',
  capabilities: {
    passwordLogin: false,
    passwordReset: false,
    invites: false,
    externalRedirect: true,
  },
  async getIdentity() {
    throw new Error('NotConfigured: AUTH_PROVIDER=help ainda não está integrado.')
  },
  async signInWithPassword() {
    throw new Error('NotConfigured: AUTH_PROVIDER=help ainda não está integrado.')
  },
  async signOut() {
    throw new Error('NotConfigured: AUTH_PROVIDER=help ainda não está integrado.')
  },
}
