import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthProvider } from '@/lib/auth'
import { ResetPasswordForm } from './reset-form'

export const metadata: Metadata = { title: 'Nova senha' }

export default async function ResetPasswordPage() {
  const identity = await getAuthProvider().getIdentity()
  if (!identity) redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h1 font-bold">Nova senha</h1>
        <p className="text-text-muted mt-1 text-sm">Escolha uma senha segura para sua conta.</p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
