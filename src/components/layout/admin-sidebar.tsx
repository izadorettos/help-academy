'use client'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand/brand-logo'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  ArrowLeft,
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users, exact: false },
  { href: '/admin/areas', label: 'Áreas', icon: Building2, exact: false },
  { href: '/admin/trilhas', label: 'Trilhas', icon: BookOpen, exact: false },
  { href: '/admin/conteudos', label: 'Conteúdos', icon: FileText, exact: false },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, exact: false },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="border-border bg-surface hidden w-60 shrink-0 flex-col border-r lg:flex"
      aria-label="Navegação admin"
    >
      <div className="border-border flex h-20 items-center gap-2 border-b px-4">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Painel admin — início">
          <BrandLogo height={44} priority />
          <span className="font-mono text-text-muted text-xs font-medium tracking-[0.08em] uppercase">Admin</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
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
      </nav>

      <div className="border-border border-t p-3">
        <Link
          href="/dashboard"
          className="text-text-muted hover:text-text flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-muted"
        >
          <ArrowLeft className="size-5 shrink-0" aria-hidden />
          Área do membro
        </Link>
      </div>
    </aside>
  )
}
