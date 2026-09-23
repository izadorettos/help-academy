import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressBar } from '@/components/ui/progress-bar'
import { ProgressRing } from '@/components/ui/progress-ring'
import { EmptyState } from '@/components/ui/empty-state'

export default function DevUIPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/')

  return (
    <main id="main-content" className="min-h-dvh bg-bg p-8">
      <h1 className="text-h1 mb-8 font-bold">UI Components</h1>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="success">Concluído</Badge>
          <Badge variant="warning">Em andamento</Badge>
          <Badge variant="muted">Não iniciado</Badge>
          <Badge variant="xp">+10 XP</Badge>
          <Badge variant="required">Obrigatória</Badge>
          <Badge variant="brand">Brand</Badge>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Avatars</h2>
        <div className="flex items-center gap-4">
          <Avatar name="João Silva" size={32} />
          <Avatar name="Maria Oliveira" size={40} />
          <Avatar name="Carlos Santos" size={64} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Skeletons</h2>
        <div className="flex max-w-sm flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Progress Bar</h2>
        <div className="flex max-w-sm flex-col gap-4">
          <ProgressBar value={0} label="0%" showValue />
          <ProgressBar value={45} label="Em andamento" showValue />
          <ProgressBar value={100} label="Concluído" variant="success" showValue />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Progress Ring</h2>
        <div className="flex items-center gap-6">
          <ProgressRing value={0} />
          <ProgressRing value={45} />
          <ProgressRing value={100} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Cards</h2>
        <div className="grid max-w-lg grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-sm">Card padrão</p>
          </Card>
          <Card interactive className="p-4">
            <p className="text-sm">Card interativo</p>
          </Card>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-h2 mb-4 font-semibold">Empty State</h2>
        <Card className="max-w-sm">
          <EmptyState
            icon={BookOpen}
            title="Nenhuma trilha atribuída"
            description="Assim que o time de treinamento liberar seu onboarding, ele aparece aqui."
          />
        </Card>
      </section>
    </main>
  )
}
