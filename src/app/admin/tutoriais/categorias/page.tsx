import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { getCategories } from '@/features/help/queries'
import { Card } from '@/components/ui/card'
import { CategoryCrudClient } from './_category-crud-client'

export const metadata: Metadata = { title: 'Categorias — Tutoriais Admin' }

export default async function CategoriasPage() {
  await requireAdmin()
  const categories = await getCategories()

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
      <h1 className="text-h1 font-bold">Categorias</h1>

      <Card className="p-6">
        <CategoryCrudClient categories={categories} />
      </Card>
    </div>
  )
}
