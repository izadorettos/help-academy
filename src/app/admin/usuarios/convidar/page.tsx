import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetDepartments } from '@/features/admin/departments/queries'
import { InviteUserForm } from './invite-user-form'

export const metadata: Metadata = { title: 'Convidar Usuário — Admin — Help Academy' }

export default async function ConvidarUsuarioPage() {
  await requireAdmin()
  const departments = await adminGetDepartments()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-h1 font-bold">Convidar usuário</h1>
        <p className="text-text-muted mt-1 text-sm">
          Envie um convite por e-mail para um novo usuário entrar na plataforma.
        </p>
      </div>
      <InviteUserForm departments={departments} />
    </div>
  )
}
