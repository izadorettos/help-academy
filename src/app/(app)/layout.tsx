import { requireUser } from '@/lib/auth/guards'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AppHeader } from '@/components/layout/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} />
        <main id="main-content" className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
