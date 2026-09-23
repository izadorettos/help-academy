import type { Metadata } from 'next'
import { RecoverForm } from './recover-form'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function RecoverPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-h1 font-bold">Recuperar senha</h1>
        <p className="text-text-muted mt-1 text-sm">
          Enviaremos um link para redefinir sua senha.
        </p>
      </div>
      <RecoverForm />
    </div>
  )
}
