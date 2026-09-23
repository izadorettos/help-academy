import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/guards'
import { signOut } from '@/features/auth/actions'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireUser()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="border-border bg-surface shadow-card w-full max-w-md rounded-xl border p-8 text-center">
        <p className="text-brand text-xs font-semibold tracking-widest uppercase">Help Academy</p>
        <h1 className="text-h1 mt-2 font-bold">Olá, {user.name}!</h1>
        <p className="text-text-muted mt-2 text-sm">
          Dashboard em construção — volte em breve.
        </p>
        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="text-text-muted text-sm underline-offset-2 hover:text-text hover:underline"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
