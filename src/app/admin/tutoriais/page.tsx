import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { getAdminTutorials, getAudiences, getCategories } from '@/features/help/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import { formatDate } from '@/components/help/tutorial-card'
import { TogglePublishedButton } from './_components/toggle-published-button'
import { ToggleFeaturedButton } from './_components/toggle-featured-button'
import type { TutorialListItem } from '@/features/help/queries'

export const metadata: Metadata = { title: 'Tutoriais — Admin Help Academy' }

interface SearchParams {
  q?: string
  publico?: string
  categoria?: string
  tipo?: string
}

export default async function AdminTutoriaisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdmin()
  const sp = await searchParams

  const [tutorials, audiences, categories] = await Promise.all([
    getAdminTutorials({
      q:        typeof sp.q === 'string' ? sp.q : '',
      audience: typeof sp.publico === 'string' ? sp.publico : '',
      category: typeof sp.categoria === 'string' ? sp.categoria : '',
      type:     typeof sp.tipo === 'string' ? sp.tipo : '',
    }),
    getAudiences(),
    getCategories(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold">Tutoriais</h1>
          <p className="text-text-muted text-sm mt-1">{tutorials.length} tutoriais</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/tutoriais/categorias"
            className="text-sm font-medium text-text-muted hover:text-text transition-colors"
          >
            Categorias
          </Link>
          <Link
            href="/admin/tutoriais/publicos"
            className="text-sm font-medium text-text-muted hover:text-text transition-colors"
          >
            Públicos
          </Link>
          <Link
            href="/admin/tutoriais/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Plus className="size-4" aria-hidden />
            Novo tutorial
          </Link>
        </div>
      </div>

      {/* Filter form */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={typeof sp.q === 'string' ? sp.q : ''}
          placeholder="Buscar..."
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <select
          name="publico"
          defaultValue={typeof sp.publico === 'string' ? sp.publico : ''}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Todos os públicos</option>
          {audiences.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
        <select
          name="categoria"
          defaultValue={typeof sp.categoria === 'string' ? sp.categoria : ''}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select
          name="tipo"
          defaultValue={typeof sp.tipo === 'string' ? sp.tipo : ''}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          <option value="video">Vídeo</option>
          <option value="pdf">PDF</option>
          <option value="image">Imagem</option>
          <option value="app">App</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted transition-colors"
        >
          Filtrar
        </button>
      </form>

      {/* Table */}
      {tutorials.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-text-muted">Nenhum tutorial encontrado.</p>
          <Link href="/admin/tutoriais/novo" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
            Criar primeiro tutorial
          </Link>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="px-4 py-3 text-left font-semibold">Título</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Público</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Categoria</th>
                <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Atualizado</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tutorials.map((tut) => (
                <TutorialRow key={tut.id} tutorial={tut} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TutorialRow({ tutorial }: { tutorial: TutorialListItem }) {
  return (
    <tr className="bg-surface hover:bg-surface-muted/50 transition-colors">
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          <p className="font-medium leading-snug">{tutorial.title}</p>
          {tutorial.freshness === 'needs_update' && (
            <Badge variant="warning">Atualização solicitada</Badge>
          )}
          {tutorial.freshness === 'needs_review' && (
            <Badge variant="neutral">Revisar</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-text-muted text-xs">
          {tutorial.audiences.map((a) => a.name).join(', ')}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-text-muted text-xs">{tutorial.category.name}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="font-mono text-xs text-text-muted">{tutorial.content_type}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="font-mono text-xs text-text-muted">
          {formatDate(tutorial.last_content_update)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <TogglePublishedButton id={tutorial.id} isPublished={tutorial.is_published} />
          <ToggleFeaturedButton id={tutorial.id} isFeatured={tutorial.is_featured} />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/tutoriais/${tutorial.id}/editar`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
        >
          <Pencil className="size-3" aria-hidden />
          Editar
        </Link>
      </td>
    </tr>
  )
}
