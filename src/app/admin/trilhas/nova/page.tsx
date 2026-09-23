import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetDepartments } from '@/features/admin/departments/queries'
import { PathForm } from '../path-form'

export const metadata: Metadata = { title: 'Nova Trilha — Admin — Help Academy' }

export default async function NovaTrilhaPage() {
  await requireAdmin()
  const departments = await adminGetDepartments()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-h1 font-bold">Nova trilha</h1>
        <p className="text-text-muted mt-1 text-sm">Crie uma nova trilha de aprendizagem.</p>
      </div>
      <PathForm mode="create" departments={departments} />
    </div>
  )
}
