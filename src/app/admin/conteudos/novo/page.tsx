import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetPaths } from '@/features/admin/paths/queries'
import { adminGetGamificationSettings } from '@/features/admin/settings/queries'
import { NewContentWizard } from './new-content-wizard'

export const metadata: Metadata = { title: 'Novo conteúdo — Admin — Help Academy' }

interface Props {
  searchParams: Promise<{ trilha?: string; modulo?: string }>
}

export default async function NovoConteudoPage({ searchParams }: Props) {
  await requireAdmin()
  const sp = await searchParams

  const [paths, settings] = await Promise.all([
    adminGetPaths(),
    adminGetGamificationSettings(),
  ])

  const defaultXp = settings.find((s) => s.key === 'xp_lesson_completed')?.value ?? 10

  return (
    <NewContentWizard
      paths={paths.map((p) => ({ id: p.id, title: p.title, status: p.status }))}
      defaultXp={defaultXp}
      initialPathId={sp.trilha}
      initialModuleId={sp.modulo}
    />
  )
}
