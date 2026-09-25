import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { adminGetLessons } from '@/features/admin/lessons/queries'
import { adminGetPaths } from '@/features/admin/paths/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LessonsFilter } from './lessons-filter'
import { FileText, Video, Link as LinkIcon, Code, File, BookOpen, Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Conteúdos — Admin — Help Academy' }

const CONTENT_TYPE_ICON: Record<string, React.ReactNode> = {
  text: <FileText className="size-4 text-blue-500" aria-hidden />,
  video: <Video className="size-4 text-purple-500" aria-hidden />,
  link: <LinkIcon className="size-4 text-green-500" aria-hidden />,
  embed: <Code className="size-4 text-orange-500" aria-hidden />,
  pdf: <File className="size-4 text-red-500" aria-hidden />,
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  text: 'Texto',
  video: 'Vídeo',
  link: 'Link',
  embed: 'Embed',
  pdf: 'PDF',
}

interface SearchParams {
  content_type?: string
  published?: string
  path_id?: string
  page?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function AdminConteudosPage({ searchParams }: Props) {
  await requireAdmin()
  const sp = await searchParams

  const contentType = sp.content_type as 'text' | 'video' | 'pdf' | 'link' | 'embed' | undefined
  const published =
    sp.published === 'true' ? true : sp.published === 'false' ? false : undefined
  const pathId = sp.path_id || undefined
  const page = sp.page ? parseInt(sp.page, 10) : 1

  const [result, paths] = await Promise.all([
    adminGetLessons({
      contentType,
      published,
      pathId,
      page,
      pageSize: 20,
    }),
    adminGetPaths(),
  ])

  const totalPages = Math.ceil(result.total / result.pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold">Conteúdos</h1>
          <p className="text-text-muted mt-1 text-sm">
            Todas as aulas da plataforma, de todas as trilhas.
          </p>
        </div>
        <Link href="/admin/conteudos/novo">
          <Button>
            <Plus className="size-4" aria-hidden />
            Novo conteúdo
          </Button>
        </Link>
      </div>

      <LessonsFilter
        paths={paths.map((p) => ({ id: p.id, title: p.title }))}
        currentFilters={{
          content_type: sp.content_type,
          published: sp.published,
          path_id: sp.path_id,
        }}
      />

      {result.lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma aula encontrada"
          description="Ajuste os filtros ou crie aulas nas trilhas."
        />
      ) : (
        <>
          <Card>
            <div className="divide-border divide-y">
              {result.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-4 px-6 py-4">
                  <span className="shrink-0">{CONTENT_TYPE_ICON[lesson.contentType]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{lesson.title}</span>
                      <Badge variant={lesson.published ? 'success' : 'warning'}>
                        {lesson.published ? 'Publicada' : 'Rascunho'}
                      </Badge>
                      {lesson.hasQuiz && <Badge variant="brand">Quiz</Badge>}
                      {!lesson.required && <Badge variant="neutral">Opcional</Badge>}
                    </div>
                    <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <span>{CONTENT_TYPE_LABEL[lesson.contentType]}</span>
                      {lesson.estimatedMinutes != null && (
                        <span>{lesson.estimatedMinutes} min</span>
                      )}
                      <span className="text-text-subtle">
                        <Link
                          href={`/admin/trilhas/${lesson.pathId}`}
                          className="hover:text-brand transition-colors"
                        >
                          {lesson.pathTitle}
                        </Link>
                        {' › '}
                        {lesson.moduleName}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={`/admin/trilhas/${lesson.pathId}`}
                      className="text-text-muted hover:text-text text-sm transition-colors"
                      aria-label={`Ver trilha de ${lesson.title}`}
                    >
                      Ver trilha
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-text-muted text-sm">
                {result.total} aula{result.total !== 1 ? 's' : ''} no total
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={{
                      pathname: '/admin/conteudos',
                      query: { ...sp, page: page - 1 },
                    }}
                    className="border-border bg-surface hover:bg-surface-muted rounded-md border px-3 py-1.5 text-sm transition-colors"
                  >
                    Anterior
                  </Link>
                )}
                <span className="text-text-muted text-sm">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={{
                      pathname: '/admin/conteudos',
                      query: { ...sp, page: page + 1 },
                    }}
                    className="border-border bg-surface hover:bg-surface-muted rounded-md border px-3 py-1.5 text-sm transition-colors"
                  >
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
