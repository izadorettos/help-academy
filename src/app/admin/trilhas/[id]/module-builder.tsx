'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createModule, updateModule, deleteModule, reorderLessons } from '@/features/admin/modules/actions'
import { reorderModules } from '@/features/admin/paths/actions'
import { deleteLesson, toggleLessonPublished } from '@/features/admin/lessons/actions'
import { AddLessonForm } from './add-lesson-form'
import type { AdminModule } from '@/features/admin/paths/queries'
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Video,
  Link as LinkIcon,
  Code,
  File,
  BookOpen,
  ClipboardList,
} from 'lucide-react'

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

interface Props {
  pathId: string
  modules: AdminModule[]
}

interface EditingModule {
  id: string
  title: string
  description: string
}

export function ModuleBuilder({ pathId, modules: initialModules }: Props) {
  const [modules, setModules] = useState<AdminModule[]>(initialModules)
  const [isPending, startTransition] = useTransition()
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newModuleDesc, setNewModuleDesc] = useState('')
  const [editingModule, setEditingModule] = useState<EditingModule | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(initialModules.map((m) => m.id)),
  )
  const [addingLessonForModule, setAddingLessonForModule] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ─── Module reorder ────────────────────────────────────────────────────────

  function moveModule(index: number, direction: 'up' | 'down') {
    const newModules = [...modules]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newModules.length) return
    const tmp = newModules[index]!
    newModules[index] = newModules[targetIndex]!
    newModules[targetIndex] = tmp
    setModules(newModules)
    startTransition(async () => {
      await reorderModules(
        pathId,
        newModules.map((m) => m.id),
      )
    })
  }

  // ─── Add module ────────────────────────────────────────────────────────────

  function handleAddModule() {
    if (!newModuleTitle.trim()) return
    const formData = new FormData()
    formData.set('title', newModuleTitle.trim())
    formData.set('description', newModuleDesc.trim())
    startTransition(async () => {
      const result = await createModule(pathId, formData)
      if (result.ok) {
        setAddingModule(false)
        setNewModuleTitle('')
        setNewModuleDesc('')
        // Optimistic: refresh will happen via revalidation
        window.location.reload()
      } else {
        setGlobalError(result.error)
      }
    })
  }

  // ─── Edit module ───────────────────────────────────────────────────────────

  function handleEditModule(id: string) {
    if (!editingModule || editingModule.id !== id) return
    const formData = new FormData()
    formData.set('title', editingModule.title.trim())
    formData.set('description', editingModule.description.trim())
    startTransition(async () => {
      const result = await updateModule(id, pathId, formData)
      if (result.ok) {
        setModules((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, title: editingModule.title, description: editingModule.description }
              : m,
          ),
        )
        setEditingModule(null)
      } else {
        setGlobalError(result.error)
      }
    })
  }

  // ─── Delete module ─────────────────────────────────────────────────────────

  function handleDeleteModule(id: string) {
    startTransition(async () => {
      const result = await deleteModule(id, pathId)
      if (result.ok) {
        setModules((prev) => prev.filter((m) => m.id !== id))
      } else {
        setGlobalError(result.error)
      }
    })
  }

  // ─── Lesson reorder ────────────────────────────────────────────────────────

  function moveLessonInModule(moduleId: string, lessonIndex: number, direction: 'up' | 'down') {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m
        const lessons = [...m.lessons]
        const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1
        if (targetIndex < 0 || targetIndex >= lessons.length) return m
        const tmpLesson = lessons[lessonIndex]!
        lessons[lessonIndex] = lessons[targetIndex]!
        lessons[targetIndex] = tmpLesson
        startTransition(async () => {
          await reorderLessons(
            moduleId,
            pathId,
            lessons.map((l) => l.id),
          )
        })
        return { ...m, lessons }
      }),
    )
  }

  // ─── Toggle lesson published ───────────────────────────────────────────────

  function handleToggleLesson(moduleId: string, lessonId: string) {
    startTransition(async () => {
      const result = await toggleLessonPublished(lessonId, pathId)
      if (result.ok) {
        setModules((prev) =>
          prev.map((m) => {
            if (m.id !== moduleId) return m
            return {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId ? { ...l, published: !l.published } : l,
              ),
            }
          }),
        )
      } else {
        setGlobalError(result.error)
      }
    })
  }

  // ─── Delete lesson ─────────────────────────────────────────────────────────

  function handleDeleteLesson(moduleId: string, lessonId: string) {
    startTransition(async () => {
      const result = await deleteLesson(lessonId, pathId)
      if (result.ok) {
        setModules((prev) =>
          prev.map((m) => {
            if (m.id !== moduleId) return m
            return { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
          }),
        )
      } else {
        setGlobalError(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {globalError && (
        <p className="text-danger text-sm" role="alert">
          {globalError}
        </p>
      )}

      {modules.length === 0 && !addingModule && (
        <Card className="p-8 text-center">
          <p className="text-text-muted text-sm">Nenhum módulo ainda. Adicione o primeiro abaixo.</p>
        </Card>
      )}

      {modules.map((module, moduleIndex) => {
        const isExpanded = expandedModules.has(module.id)
        const isEditingThis = editingModule?.id === module.id

        return (
          <Card key={module.id} className="overflow-hidden">
            {/* Module header */}
            <div className="bg-surface-muted flex items-center gap-3 px-4 py-3">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => moveModule(moduleIndex, 'up')}
                  disabled={moduleIndex === 0 || isPending}
                  aria-label="Mover módulo para cima"
                  className="text-text-muted hover:text-text disabled:opacity-30"
                >
                  <ChevronUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => moveModule(moduleIndex, 'down')}
                  disabled={moduleIndex === modules.length - 1 || isPending}
                  aria-label="Mover módulo para baixo"
                  className="text-text-muted hover:text-text disabled:opacity-30"
                >
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                {isEditingThis ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingModule.title}
                      onChange={(e) =>
                        setEditingModule({ ...editingModule, title: e.target.value })
                      }
                      className="border-border bg-surface focus:border-brand w-full rounded border px-2 py-1 text-sm outline-none focus:ring-1"
                      autoFocus
                    />
                    <Button size="sm" loading={isPending} onClick={() => handleEditModule(module.id)}>
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingModule(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleExpand(module.id)}
                    className="w-full text-left"
                  >
                    <span className="truncate font-medium">{module.title}</span>
                    <span className="text-text-subtle ml-2 text-xs">
                      {module.lessons.length} aula{module.lessons.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                )}
              </div>

              {!isEditingThis && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingModule({
                        id: module.id,
                        title: module.title,
                        description: module.description ?? '',
                      })
                    }
                    aria-label={`Editar módulo ${module.title}`}
                    className="text-text-muted hover:text-text rounded p-1 transition-colors"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <ConfirmDialog
                    title="Excluir módulo"
                    description={`Excluir "${module.title}" removerá também todas as suas aulas. Módulos com progresso de usuários não podem ser excluídos.`}
                    confirmLabel="Excluir"
                    onConfirm={() => handleDeleteModule(module.id)}
                    variant="danger"
                  >
                    <button
                      type="button"
                      aria-label={`Excluir módulo ${module.title}`}
                      className="text-text-muted hover:text-danger rounded p-1 transition-colors"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </ConfirmDialog>
                </div>
              )}
            </div>

            {/* Lessons list */}
            {isExpanded && (
              <div className="divide-border divide-y">
                {module.lessons.length === 0 && (
                  <p className="text-text-subtle px-6 py-3 text-sm">Nenhuma aula neste módulo.</p>
                )}

                {module.lessons.map((lesson, lessonIndex) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => moveLessonInModule(module.id, lessonIndex, 'up')}
                        disabled={lessonIndex === 0 || isPending}
                        aria-label="Mover aula para cima"
                        className="text-text-muted hover:text-text disabled:opacity-30"
                      >
                        <ChevronUp className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLessonInModule(module.id, lessonIndex, 'down')}
                        disabled={lessonIndex === module.lessons.length - 1 || isPending}
                        aria-label="Mover aula para baixo"
                        className="text-text-muted hover:text-text disabled:opacity-30"
                      >
                        <ChevronDown className="size-4" aria-hidden />
                      </button>
                    </div>

                    <span className="shrink-0">
                      {CONTENT_TYPE_ICON[lesson.contentType]}
                    </span>

                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm font-medium">{lesson.title}</span>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-text-subtle text-xs">
                          {CONTENT_TYPE_LABEL[lesson.contentType]}
                        </span>
                        {lesson.estimatedMinutes != null && (
                          <span className="text-text-subtle text-xs">
                            {lesson.estimatedMinutes} min
                          </span>
                        )}
                        {lesson.hasQuiz && (
                          <Badge variant="brand">Quiz</Badge>
                        )}
                        {!lesson.required && (
                          <Badge variant="neutral">Opcional</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {/* Content editor link */}
                      <Link
                        href={`/admin/trilhas/${pathId}/aulas/${lesson.id}/editar`}
                        className="text-text-muted hover:text-text rounded p-1 transition-colors"
                        aria-label={`Editar conteúdo da aula ${lesson.title}`}
                        title="Editar conteúdo"
                      >
                        <BookOpen className="size-4" aria-hidden />
                      </Link>

                      {/* Quiz builder link */}
                      <Link
                        href={`/admin/trilhas/${pathId}/aulas/${lesson.id}/quiz`}
                        className="text-text-muted hover:text-text rounded p-1 transition-colors"
                        aria-label={`Gerenciar quiz da aula ${lesson.title}`}
                        title="Gerenciar quiz"
                      >
                        <ClipboardList className="size-4" aria-hidden />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleToggleLesson(module.id, lesson.id)}
                        disabled={isPending}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          lesson.published
                            ? 'bg-success-soft text-success hover:bg-success/20'
                            : 'bg-surface-muted text-text-muted hover:bg-surface-muted'
                        }`}
                        aria-label={
                          lesson.published ? 'Despublicar aula' : 'Publicar aula'
                        }
                      >
                        {lesson.published ? 'Publicada' : 'Rascunho'}
                      </button>

                      <ConfirmDialog
                        title="Excluir aula"
                        description={`Excluir "${lesson.title}" é irreversível. Aulas com progresso de usuários não podem ser excluídas.`}
                        confirmLabel="Excluir"
                        onConfirm={() => handleDeleteLesson(module.id, lesson.id)}
                        variant="danger"
                      >
                        <button
                          type="button"
                          aria-label={`Excluir aula ${lesson.title}`}
                          className="text-text-muted hover:text-danger rounded p-1 transition-colors"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </ConfirmDialog>
                    </div>
                  </div>
                ))}

                {/* Add lesson */}
                {addingLessonForModule === module.id ? (
                  <div className="px-4 py-4">
                    <AddLessonForm
                      moduleId={module.id}
                      pathId={pathId}
                      onSuccess={(newLesson) => {
                        setModules((prev) =>
                          prev.map((m) =>
                            m.id === module.id
                              ? { ...m, lessons: [...m.lessons, newLesson] }
                              : m,
                          ),
                        )
                        setAddingLessonForModule(null)
                      }}
                      onCancel={() => setAddingLessonForModule(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-4 py-3">
                    <Link
                      href={`/admin/conteudos/novo?trilha=${pathId}&modulo=${module.id}`}
                      className="text-brand hover:text-brand-hover inline-flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                      <Plus className="size-4" aria-hidden />
                      Adicionar conteúdo
                    </Link>
                    <button
                      type="button"
                      onClick={() => setAddingLessonForModule(module.id)}
                      className="text-text-muted hover:text-text inline-flex items-center gap-1.5 text-xs transition-colors"
                    >
                      Forma rápida
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}

      {/* Add module form */}
      {addingModule ? (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Novo módulo</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título do módulo"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              autoFocus
            />
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={newModuleDesc}
              onChange={(e) => setNewModuleDesc(e.target.value)}
              className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={isPending}
                disabled={!newModuleTitle.trim()}
                onClick={handleAddModule}
              >
                Criar módulo
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAddingModule(false)
                  setNewModuleTitle('')
                  setNewModuleDesc('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setAddingModule(true)}
          className="border-border bg-surface hover:bg-surface-muted flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" aria-hidden />
          Adicionar módulo
        </button>
      )}
    </div>
  )
}
