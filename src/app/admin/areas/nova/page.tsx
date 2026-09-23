import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { DepartmentForm } from '../department-form'

export const metadata: Metadata = { title: 'Nova Área — Admin — Help Academy' }

export default async function NovaDepartmentPage() {
  await requireAdmin()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-h1 font-bold">Nova área</h1>
        <p className="text-text-muted mt-1 text-sm">Cadastre uma nova área / departamento.</p>
      </div>
      <DepartmentForm mode="create" />
    </div>
  )
}
