import type { Metadata } from 'next'
import { getAuthProvider } from '@/lib/auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  const capabilities = getAuthProvider().capabilities
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h1 font-bold">Entrar na conta</h1>
        <p className="text-text-muted mt-1 text-sm">Use o seu login e senha.</p>
      </div>
      <LoginForm capabilities={capabilities} />
    </div>
  )
}
