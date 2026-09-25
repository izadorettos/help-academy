'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Video,
  FileText,
  File,
  Image as ImageIcon,
  Presentation,
  Link as LinkIcon,
  Code,
  HelpCircle,
  CheckSquare,
  Zap,
  ListChecks,
  Puzzle,
  ChevronRight,
  ArrowLeft,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createLesson } from '@/features/admin/lessons/actions'
import { createModule } from '@/features/admin/modules/actions'
import { getModulesForPath } from '@/features/admin/paths/actions'

// ─── Content types ─────────────────────────────────────────────────────────────

type LessonType =
  | 'video'
  | 'text'
  | 'pdf'
  | 'image'
  | 'presentation'
  | 'link'
  | 'embed'
  | 'quiz'
  | 'task'
  | 'challenge'
  | 'survey'
  | 'game'

interface ContentTypeCard {
  type: LessonType
  icon: React.ReactNode
  name: string
  description: string
  color: string
}

const CONTENT_TYPES: ContentTypeCard[] = [
  {
    type: 'video',
    icon: <Video className="size-6" />,
    name: 'Vídeo',
    description: 'YouTube, Vimeo ou upload de arquivo',
    color: 'text-purple-600',
  },
  {
    type: 'text',
    icon: <FileText className="size-6" />,
    name: 'Texto',
    description: 'Conteúdo em Markdown com formatação rica',
    color: 'text-blue-600',
  },
  {
    type: 'pdf',
    icon: <File className="size-6" />,
    name: 'PDF',
    description: 'Documento PDF para visualização',
    color: 'text-red-600',
  },
  {
    type: 'image',
    icon: <ImageIcon className="size-6" aria-hidden />,
    name: 'Imagem',
    description: 'Uma ou mais imagens com legenda',
    color: 'text-green-600',
  },
  {
    type: 'presentation',
    icon: <Presentation className="size-6" />,
    name: 'Apresentação',
    description: 'PDF de slides ou arquivo PowerPoint',
    color: 'text-orange-600',
  },
  {
    type: 'link',
    icon: <LinkIcon className="size-6" />,
    name: 'Link',
    description: 'Link para recurso externo',
    color: 'text-sky-600',
  },
  {
    type: 'embed',
    icon: <Code className="size-6" />,
    name: 'Conteúdo incorporado',
    description: 'Google Docs, Canva, Loom e outros',
    color: 'text-indigo-600',
  },
  {
    type: 'quiz',
    icon: <HelpCircle className="size-6" />,
    name: 'Quiz',
    description: 'Questões de múltipla escolha ou verdadeiro/falso',
    color: 'text-yellow-600',
  },
  {
    type: 'task',
    icon: <CheckSquare className="size-6" />,
    name: 'Tarefa',
    description: 'Atividade com checklist de entrega',
    color: 'text-teal-600',
  },
  {
    type: 'challenge',
    icon: <Zap className="size-6" />,
    name: 'Desafio',
    description: 'Atividade aberta avaliada pelo admin',
    color: 'text-amber-600',
  },
  {
    type: 'survey',
    icon: <ListChecks className="size-6" />,
    name: 'Questionário',
    description: 'Formulário de múltipla escolha ou aberto',
    color: 'text-rose-600',
  },
  {
    type: 'game',
    icon: <Puzzle className="size-6" />,
    name: 'Game',
    description: 'Atividade interativa gamificada',
    color: 'text-violet-600',
  },
]

// Map quiz to quiz (created differently — just 'quiz' type), but lessons use the actual DB type
const TYPE_TO_DB: Record<LessonType, string> = {
  video: 'video',
  text: 'text',
  pdf: 'pdf',
  image: 'image',
  presentation: 'presentation',
  link: 'link',
  embed: 'embed',
  quiz: 'text', // Quiz is a lesson type with a quiz attached — created as "text" with quiz builder
  task: 'task',
  challenge: 'challenge',
  survey: 'survey',
  game: 'game',
}

// ─── Path/Module types ─────────────────────────────────────────────────────────

interface PathOption {
  id: string
  title: string
  status: string
}

interface ModuleOption {
  id: string
  title: string
  position: number
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  paths: PathOption[]
  defaultXp: number
  initialPathId?: string
  initialModuleId?: string
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i + 1 === current
                ? 'bg-brand text-on-brand'
                : i + 1 < current
                  ? 'bg-success text-on-brand'
                  : 'bg-surface-muted text-text-subtle'
            }`}
          >
            {i + 1}
          </div>
          {i < total - 1 && <ChevronRight className="size-4 text-text-subtle" aria-hidden />}
        </div>
      ))}
      <span className="ml-1">
        Passo {current} de {total}
      </span>
    </div>
  )
}

// ─── Main wizard ───────────────────────────────────────────────────────────────

export function NewContentWizard({ paths, defaultXp, initialPathId, initialModuleId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Step state
  const [step, setStep] = useState(1)

  // Step 1: type
  const [selectedType, setSelectedType] = useState<LessonType | null>(null)

  // Step 2: where
  const [selectedPathId, setSelectedPathId] = useState<string>(initialPathId ?? '')
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModuleId ?? '')
  const [modules, setModules] = useState<ModuleOption[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')

  // Step 3: content
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [xpReward, setXpReward] = useState(String(defaultXp))
  const [required, setRequired] = useState(true)
  const [published, setPublished] = useState(false)

  // Step-specific fields
  const [videoSource, setVideoSource] = useState<'youtube' | 'file'>('youtube')
  const [videoUrl, setVideoUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [externalUrl, setExternalUrl] = useState('')

  // Errors
  const [error, setError] = useState<string | null>(null)

  // ─── Load modules when path changes ──────────────────────────────────────────

  async function loadModules(pathId: string) {
    if (!pathId) {
      setModules([])
      setSelectedModuleId('')
      return
    }
    setLoadingModules(true)
    try {
      const result = await getModulesForPath(pathId)
      const mods = result.ok ? result.data : []
      setModules(mods)
      if (!initialModuleId || pathId !== initialPathId) {
        setSelectedModuleId(mods[0]?.id ?? '')
      }
    } catch {
      setModules([])
    } finally {
      setLoadingModules(false)
    }
  }

  // Load initial modules if path pre-selected
  useState(() => {
    if (initialPathId) {
      void loadModules(initialPathId)
    }
  })

  // ─── Step 1: type selection ───────────────────────────────────────────────────

  function handleSelectType(type: LessonType) {
    setSelectedType(type)
    setStep(2)
  }

  // ─── Step 2: where ────────────────────────────────────────────────────────────

  async function handlePathChange(pathId: string) {
    setSelectedPathId(pathId)
    setSelectedModuleId('')
    await loadModules(pathId)
  }

  async function handleCreateModule() {
    if (!newModuleTitle.trim() || !selectedPathId) return
    const formData = new FormData()
    formData.set('title', newModuleTitle.trim())
    startTransition(async () => {
      const result = await createModule(selectedPathId, formData)
      if (result.ok) {
        setNewModuleTitle('')
        setAddingModule(false)
        await loadModules(selectedPathId)
        setSelectedModuleId(result.data.id)
      } else {
        setError(result.error)
      }
    })
  }

  function handleStep2Next() {
    if (!selectedPathId) {
      setError('Selecione uma trilha.')
      return
    }
    if (!selectedModuleId) {
      setError('Selecione um módulo.')
      return
    }
    setError(null)
    setStep(3)
  }

  // ─── Step 3: submit ───────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType || !selectedPathId || !selectedModuleId) return
    setError(null)

    const dbType = TYPE_TO_DB[selectedType] ?? selectedType
    const formData = new FormData()
    formData.set('title', title.trim())
    formData.set('content_type', dbType)
    formData.set('required', required ? 'true' : 'false')
    if (description.trim()) formData.set('description', description.trim())
    if (estimatedMinutes) formData.set('estimated_minutes', estimatedMinutes)
    if (xpReward) formData.set('xp_reward', xpReward)

    // Type-specific fields
    if (selectedType === 'video' && videoSource === 'youtube' && videoUrl.trim()) {
      formData.set('external_url', videoUrl.trim())
    }
    if (selectedType === 'link' && externalUrl.trim()) {
      formData.set('external_url', externalUrl.trim())
    }
    if (selectedType === 'embed' && externalUrl.trim()) {
      formData.set('external_url', externalUrl.trim())
    }
    if (selectedType === 'text') {
      formData.set('content', ' ') // placeholder, edited later
    }

    // Activity types need empty config
    if (['task', 'challenge', 'survey', 'game'].includes(selectedType)) {
      formData.set('config_json', JSON.stringify({ title: title.trim() }))
    }

    // Quiz: create as "text" type, quiz builder is separate
    if (selectedType === 'quiz') {
      formData.set('content_type', 'text')
      formData.set('content', ' ')
    }

    startTransition(async () => {
      const result = await createLesson(selectedModuleId, selectedPathId, formData)
      if (result.ok) {
        // If published, update separately (createLesson defaults to false)
        if (published) {
          // Note: we don't toggle here — user can do it from the builder
        }
        router.push(`/admin/trilhas/${selectedPathId}?created=${result.data.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const selectedTypeCard = CONTENT_TYPES.find((t) => t.type === selectedType)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Novo conteúdo</h1>
        <StepIndicator current={step} total={3} />
      </div>

      {/* Back */}
      {step > 1 && (
        <button
          type="button"
          onClick={() => { setStep(step - 1); setError(null) }}
          className="text-text-muted hover:text-text inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar
        </button>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* ── Step 1: Type ─────────────────────────────────────────────────────── */}
      {step === 1 && (
        <section aria-label="Passo 1: Tipo de conteúdo">
          <h2 className="mb-4 text-base font-semibold">Qual tipo de conteúdo você quer criar?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.type}
                type="button"
                onClick={() => handleSelectType(ct.type)}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-brand hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-focus"
              >
                <span className={`${ct.color} transition-transform group-hover:scale-110`}>
                  {ct.icon}
                </span>
                <span className="text-sm font-semibold">{ct.name}</span>
                <span className="text-xs text-text-muted leading-snug">{ct.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Step 2: Where ─────────────────────────────────────────────────────── */}
      {step === 2 && (
        <section aria-label="Passo 2: Trilha e módulo">
          <h2 className="mb-4 text-base font-semibold">Onde ficará este conteúdo?</h2>

          {selectedTypeCard && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-surface-muted px-4 py-3">
              <span className={selectedTypeCard.color}>{selectedTypeCard.icon}</span>
              <div>
                <p className="text-sm font-semibold">{selectedTypeCard.name}</p>
                <p className="text-xs text-text-muted">{selectedTypeCard.description}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Trail */}
            <div className="space-y-1.5">
              <label htmlFor="path-select" className="block text-sm font-medium">
                Trilha
              </label>
              <select
                id="path-select"
                value={selectedPathId}
                onChange={(e) => void handlePathChange(e.target.value)}
                className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              >
                <option value="">Selecione uma trilha</option>
                {paths.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.status === 'draft' ? '(rascunho)' : p.status === 'archived' ? '(arquivada)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Module */}
            {selectedPathId && (
              <div className="space-y-1.5">
                <label htmlFor="module-select" className="block text-sm font-medium">
                  Módulo
                </label>
                {loadingModules ? (
                  <div className="border-border bg-surface-muted h-10 rounded-md border px-3 py-2 text-sm text-text-muted animate-pulse">
                    Carregando módulos...
                  </div>
                ) : (
                  <>
                    <select
                      id="module-select"
                      value={selectedModuleId}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                    >
                      <option value="">Selecione um módulo</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.position}. {m.title}
                        </option>
                      ))}
                    </select>

                    {/* Create new module inline */}
                    {addingModule ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Nome do novo módulo"
                          value={newModuleTitle}
                          onChange={(e) => setNewModuleTitle(e.target.value)}
                          className="border-border bg-surface focus:border-brand focus:ring-brand flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          loading={isPending}
                          onClick={() => void handleCreateModule()}
                          disabled={!newModuleTitle.trim()}
                        >
                          Criar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setAddingModule(false); setNewModuleTitle('') }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingModule(true)}
                        className="text-brand hover:text-brand-hover mt-1 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                      >
                        <Plus className="size-4" aria-hidden />
                        Criar novo módulo
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button
              onClick={handleStep2Next}
              disabled={!selectedPathId || !selectedModuleId}
            >
              Continuar
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      )}

      {/* ── Step 3: Content ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <section aria-label="Passo 3: Dados do conteúdo">
          <h2 className="mb-4 text-base font-semibold">Dados do conteúdo</h2>

          {selectedTypeCard && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-surface-muted px-4 py-3">
              <span className={selectedTypeCard.color}>{selectedTypeCard.icon}</span>
              <div>
                <p className="text-sm font-semibold">{selectedTypeCard.name}</p>
                <p className="text-xs text-text-muted">{selectedTypeCard.description}</p>
              </div>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-sm font-medium">
                Título <span className="text-danger">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Introdução à plataforma"
                className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                required
                minLength={2}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="description" className="block text-sm font-medium">
                Descrição <span className="text-text-muted font-normal">(opcional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Breve descrição do que o aluno vai aprender"
                className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              />
            </div>

            {/* Video source */}
            {selectedType === 'video' && (
              <div className="space-y-3">
                <span className="block text-sm font-medium">Fonte do vídeo</span>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="video_source"
                      value="youtube"
                      checked={videoSource === 'youtube'}
                      onChange={() => setVideoSource('youtube')}
                      className="text-brand"
                    />
                    YouTube / URL
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="video_source"
                      value="file"
                      checked={videoSource === 'file'}
                      onChange={() => setVideoSource('file')}
                      className="text-brand"
                    />
                    Upload de arquivo
                  </label>
                </div>
                {videoSource === 'youtube' && (
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                  />
                )}
                {videoSource === 'file' && (
                  <p className="text-xs text-text-muted bg-surface-muted rounded-md p-3">
                    Crie o conteúdo primeiro, depois faça o upload do arquivo na página de edição.
                    Limite: 50 MB (MP4, WebM, MOV).
                  </p>
                )}
              </div>
            )}

            {/* Alt text for image */}
            {selectedType === 'image' && (
              <div className="space-y-1.5">
                <label htmlFor="alt_text" className="block text-sm font-medium">
                  Texto alternativo <span className="text-danger">*</span>
                </label>
                <input
                  id="alt_text"
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Descrição da imagem para acessibilidade"
                  className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                />
                <p className="text-xs text-text-muted">
                  Faça o upload da imagem na página de edição após criar.
                </p>
              </div>
            )}

            {/* External URL for link/embed */}
            {(selectedType === 'link' || selectedType === 'embed') && (
              <div className="space-y-1.5">
                <label htmlFor="external_url" className="block text-sm font-medium">
                  URL <span className="text-danger">*</span>
                </label>
                <input
                  id="external_url"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                  className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                  required
                />
                {selectedType === 'embed' && (
                  <p className="text-xs text-text-muted">
                    Domínios permitidos: YouTube, Vimeo, Google Docs, Google Slides, Canva, Loom
                  </p>
                )}
              </div>
            )}

            {/* PDF/Presentation info */}
            {(selectedType === 'pdf' || selectedType === 'presentation') && (
              <div className="rounded-md bg-surface-muted p-3 text-xs text-text-muted space-y-1">
                <p>Crie o conteúdo primeiro, depois faça o upload do arquivo na página de edição.</p>
                {selectedType === 'presentation' && (
                  <p>Recomendamos exportar o PowerPoint como PDF para melhor visualização.</p>
                )}
              </div>
            )}

            {/* Quiz/Task/Challenge/Survey/Game info */}
            {['quiz', 'task', 'challenge', 'survey', 'game'].includes(selectedType ?? '') && (
              <div className="rounded-md bg-surface-muted p-3 text-xs text-text-muted">
                Configure via editor após criar o conteúdo.
              </div>
            )}

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="estimated_minutes" className="block text-sm font-medium">
                  Duração estimada (min)
                </label>
                <input
                  id="estimated_minutes"
                  type="number"
                  min="0"
                  max="600"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="0"
                  className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="xp_reward" className="block text-sm font-medium">
                  XP ao concluir
                </label>
                <input
                  id="xp_reward"
                  type="number"
                  min="0"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
                />
              </div>
            </div>

            {/* Required / Published */}
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded text-brand"
                />
                Obrigatória para avançar
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="rounded text-brand"
                />
                Publicar imediatamente
              </label>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Button type="submit" loading={isPending} disabled={!title.trim()}>
                Criar conteúdo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/admin/conteudos')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
