import { requireUser } from '@/lib/auth/guards'

// Layout completo com Sidebar, BottomNav e Header será implementado na Fase 6.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser()
  return <div className="min-h-dvh bg-bg">{children}</div>
}
