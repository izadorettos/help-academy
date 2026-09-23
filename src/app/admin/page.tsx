import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata: Metadata = { title: 'Painel Admin' }

export default async function AdminPage() {
  const user = await requireAdmin()
  return (
    <div>
      <h1 className="text-h1 font-bold">Painel Admin</h1>
      <p className="text-text-muted mt-2">
        Bem-vindo, {user.name}. Painel em construção — Fase 14.
      </p>
    </div>
  )
}
