'use client'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { BrandLogo } from '@/components/brand/brand-logo'
import { signOut } from '@/features/auth/actions'
import type { SessionUser } from '@/lib/auth/guards'

interface AppHeaderProps {
  user: SessionUser
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-border bg-surface sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2" aria-label="Help Academy — início">
        <BrandLogo height={36} priority />
        <span className="font-mono text-text-muted text-xs font-medium tracking-[0.08em] uppercase">
          Academy
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sair"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            <span>Sair</span>
          </button>
        </form>
        <Link href="/perfil" aria-label="Meu perfil">
          <Avatar src={user.avatarUrl} name={user.name} size={32} />
        </Link>
      </div>
    </header>
  )
}
