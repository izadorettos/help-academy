import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/guards'
import { getProfile } from '@/features/profile/queries'
import { updateProfile, uploadAvatar } from '@/features/profile/actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AvatarUpload } from '@/components/ui/avatar-upload'
import { ProgressBar } from '@/components/ui/progress-bar'
import { XpCard } from '@/components/gamification/xp-card'

async function handleUpdateProfile(formData: FormData): Promise<void> {
  'use server'
  await updateProfile(formData)
}

async function handleUploadAvatar(formData: FormData): Promise<void> {
  'use server'
  await uploadAvatar(formData)
}

export const metadata: Metadata = { title: 'Perfil — Help Academy' }

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function PerfilPage() {
  const user = await requireUser()
  const profile = await getProfile(user.id)

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-text-muted">Não foi possível carregar o perfil.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-h1 font-bold">Meu Perfil</h1>

      {/* ── Identity card ── */}
      <Card className="p-6">
        <div className="flex items-center gap-5">
          <AvatarUpload src={profile.avatarUrl} name={profile.name} action={handleUploadAvatar} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xl font-bold leading-tight truncate">{profile.name}</p>
                <p className="text-sm text-text-muted mt-0.5 truncate">{profile.email}</p>
              </div>
              <Badge variant={profile.role === 'admin' ? 'brand' : 'neutral'} className="shrink-0">
                {profile.role === 'admin' ? 'Admin' : 'Membro'}
              </Badge>
            </div>
            {(profile.departmentName || profile.jobTitle) && (
              <p className="text-sm text-text-subtle mt-1 truncate">
                {[profile.jobTitle, profile.departmentName].filter(Boolean).join(' · ')}
              </p>
            )}
            {profile.hireDate && (
              <p className="text-xs text-text-subtle mt-0.5">
                Entrada:{' '}
                {new Date(profile.hireDate).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Edit name ── */}
      <Card className="p-6">
        <h2 className="text-h3 font-semibold mb-4">Editar nome</h2>
        <EditNameForm currentName={profile.name} />
      </Card>

      {/* ── XP and level ── */}
      <XpCard
        totalXp={profile.totalXp}
        level={profile.level.level}
        levelName={profile.level.name}
        levelMinXp={profile.level.minXp}
        nextLevelMinXp={profile.level.nextMinXp}
      />

      {/* ── Stats ── */}
      <Card className="p-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-sm text-text-muted font-medium">Trilhas concluídas</p>
          <p className="text-2xl font-bold">{profile.completedPathsCount}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-text-muted font-medium">Progresso geral</p>
          <p className="text-2xl font-bold">{profile.overallPercent}%</p>
        </div>
        {profile.requiredTotal > 0 && (
          <div className="sm:col-span-2">
            <ProgressBar
              value={profile.overallPercent}
              label={`${profile.requiredDone} de ${profile.requiredTotal} aulas obrigatórias concluídas`}
              showValue
            />
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── EditNameForm (Server Component with inline action) ───────────────────────

async function EditNameForm({ currentName }: { currentName: string }) {
  return (
    <form action={handleUpdateProfile} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <label htmlFor="profile-name" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
          defaultValue={currentName}
          minLength={2}
          maxLength={120}
          required
          className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          aria-label="Seu nome"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus"
      >
        Salvar
      </button>
    </form>
  )
}
