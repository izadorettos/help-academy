import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './reset-form'

export const metadata: Metadata = { title: 'Nova senha' }

export default async function ResetPasswordPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
