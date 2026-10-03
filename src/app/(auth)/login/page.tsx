import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getAuthProvider } from '@/lib/auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage() {
  // Renderização por requisição: a site key do captcha vem do ambiente em runtime.
  await connection()
  const provider = getAuthProvider()
  const capabilities = provider.capabilities
  const captcha = provider.getCaptcha?.() ?? null
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h1 font-bold">Entrar na conta</h1>
        <p className="text-text-muted mt-1 text-sm">Use o seu login e senha.</p>
      </div>
      <LoginForm capabilities={capabilities} captcha={captcha} />
    </div>
  )
}
