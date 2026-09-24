'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Award, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trilhas', label: 'Trilhas', icon: BookOpen },
  { href: '/conquistas', label: 'Conquistas', icon: Award },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="border-border bg-surface fixed bottom-0 left-0 right-0 z-10 flex h-16 border-t pb-safe lg:hidden"
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${active ? 'text-brand-text' : 'text-text-subtle hover:text-text-muted'}`}
          >
            <Icon className="size-6" aria-hidden />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
