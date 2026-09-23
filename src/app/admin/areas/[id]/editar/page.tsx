import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetDepartmentById } from '@/features/admin/departments/queries'
import { DepartmentForm } from '../../department-form'

export const metadata: Metadata = { title: 'Editar Área — Admin — Help Academy' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarDepartmentPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const department = await adminGetDepartmentById(id)

  if (!department) notFound()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-h1 font-bold">Editar área</h1>
        <p className="text-text-muted mt-1 text-sm">Atualize o nome da área.</p>
      </div>
      <DepartmentForm mode="edit" department={department} />
    </div>
  )
}
