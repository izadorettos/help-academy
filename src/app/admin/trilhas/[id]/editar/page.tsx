import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetPath } from '@/features/admin/paths/queries'
import { adminGetDepartments } from '@/features/admin/departments/queries'
import { PathForm } from '../../path-form'

export const metadata: Metadata = { title: 'Editar Trilha — Admin — Help Academy' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarTrilhaPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const [path, departments] = await Promise.all([
    adminGetPath(id),
    adminGetDepartments(),
  ])

  if (!path) notFound()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-h1 font-bold">Editar trilha</h1>
        <p className="text-text-muted mt-1 text-sm">Atualize os metadados desta trilha.</p>
      </div>
      <PathForm mode="edit" path={path} departments={departments} />
    </div>
  )
}
