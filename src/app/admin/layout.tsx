import { requireAdmin } from '@/lib/auth/guards'
import { AdminSidebar } from '@/components/layout/admin-sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="flex min-h-dvh bg-bg">
      <AdminSidebar />
      <main id="main-content" className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
