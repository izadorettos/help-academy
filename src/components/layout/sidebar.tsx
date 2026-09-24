'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Award, User, Settings, LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { signOut } from '@/features/auth/actions'
import type { SessionUser } from '@/lib/auth/guards'

interface SidebarProps {
  user: SessionUser
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trilhas', label: 'Minhas trilhas', icon: BookOpen },
  { href: '/conquistas', label: 'Conquistas', icon: Award },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="border-border bg-surface hidden w-60 shrink-0 flex-col border-r lg:flex"
      aria-label="Navegação principal"
    >
      <div className="border-border flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/brand/logo-help-positivo.png" alt="Help Academy" height={28} width={112} priority />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegação principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? 'bg-brand-soft text-brand-text' : 'text-text-muted hover:bg-surface-muted hover:text-text'}`}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
            </Link>
          )
        })}

        {user.role === 'admin' && (
          <>
            <div className="border-border my-2 border-t" />
            <Link
              href="/admin"
              aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${pathname.startsWith('/admin') ? 'bg-brand-soft text-brand-hover' : 'text-text-muted hover:bg-surface-muted hover:text-text'}`}
            >
              <Settings className="size-5 shrink-0" aria-hidden />
              Painel admin
            </Link>
          </>
        )}
      </nav>

      <div className="border-border border-t p-4 space-y-2">
        <Link href="/perfil" className="flex items-center gap-3">
          <Avatar src={user.avatarUrl} name={user.name} size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
          </div>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
