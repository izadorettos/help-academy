import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LifeBuoy } from 'lucide-react'
import { getTutorials, getAudiences, getCategories } from '@/features/help/queries'
import { HelpCenterClient } from '@/components/help/help-center-client'
import { Eyebrow } from '@/components/ui/eyebrow'
import HelpCenterSkeleton from './loading'

export const metadata: Metadata = {
  title: 'Central de Ajuda — Help Academy',
  description: 'Tutoriais para resolver rápido.',
}

interface SearchParams {
  q?: string
  publico?: string
  categoria?: string
  tipo?: string
}

export default async function AjudaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q         = typeof sp.q        === 'string' ? sp.q        : ''
  const audience  = typeof sp.publico  === 'string' ? sp.publico  : ''
  const category  = typeof sp.categoria === 'string' ? sp.categoria : ''
  const type      = typeof sp.tipo     === 'string' ? sp.tipo     : ''

  const [tutorials, audiences, categories] = await Promise.all([
    getTutorials({ q, audience, category, type }),
    getAudiences(),
    getCategories(),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <Eyebrow>
          <LifeBuoy className="size-3.5" aria-hidden />
          CENTRAL DE AJUDA · {tutorials.length} MATERIAIS
        </Eyebrow>
        <h1 className="text-h1 font-bold">
          Tutoriais para resolver <em>rápido</em>.
        </h1>
        <p className="text-text-muted max-w-xl">
          Materiais de apoio para estabelecimentos, entregadores e equipe Help.
        </p>
      </header>

      <Suspense fallback={<HelpCenterSkeleton />}>
        <HelpCenterClient
          tutorials={tutorials}
          audiences={audiences}
          categories={categories}
          currentQ={q}
          currentAudience={audience}
          currentCategory={category}
          currentType={type}
        />
      </Suspense>
    </div>
  )
}
