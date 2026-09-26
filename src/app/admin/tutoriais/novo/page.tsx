import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { getAudiences, getCategories } from '@/features/help/queries'
import { TutorialForm } from '../_components/tutorial-form'

export const metadata: Metadata = { title: 'Novo Tutorial — Admin Help Academy' }

export default async function NovoTutorialPage() {
  await requireAdmin()
  const [audiences, categories] = await Promise.all([getAudiences(), getCategories()])

  return (
    <div className="space-y-6">
      <nav>
        <Link
          href="/admin/tutoriais"
          className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Tutoriais
        </Link>
      </nav>
      <h1 className="text-h1 font-bold">Novo tutorial</h1>
      <TutorialForm audiences={audiences} categories={categories} />
    </div>
  )
}
