import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import type { SessionUser } from '@/lib/auth/guards'

interface AppHeaderProps {
  user: SessionUser
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-border bg-surface sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 lg:hidden">
      <Link href="/dashboard" className="text-brand font-bold">
        Help Academy
      </Link>
      <Link href="/perfil" aria-label="Meu perfil">
        <Avatar src={user.avatarUrl} name={user.name} size={32} />
      </Link>
    </header>
  )
}
