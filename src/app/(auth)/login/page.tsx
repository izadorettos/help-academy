import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h1 font-bold">Entrar na conta</h1>
        <p className="text-text-muted mt-1 text-sm">Use o e-mail e senha cadastrados.</p>
      </div>
      <LoginForm />
    </div>
  )
}
