import Link from 'next/link'
import {
  BookText,
  Video,
  FileText,
  Link as LinkIcon,
  Code2,
  CheckSquare,
  Zap,
  ListChecks,
  Puzzle,
  Lock,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Database } from '@/types/database.types'

type LessonType = Database['public']['Enums']['lesson_type']

export interface StepperItem {
  id: string
  title: string
  contentType: LessonType
  state: 'locked' | 'available' | 'completed'
}

interface ActivityStepperProps {
  items: StepperItem[]
  currentLessonId: string
}

const ICON_BY_TYPE: Record<LessonType, LucideIcon> = {
  text: BookText,
  video: Video,
  pdf: FileText,
  link: LinkIcon,
  embed: Code2,
  task: CheckSquare,
  challenge: Zap,
  survey: ListChecks,
  game: Puzzle,
}

/**
 * Trilha visual no topo da tela da aula, mostrando as etapas
 * (aulas / atividades) do módulo/trilha atual. Aulas concluídas
 * ficam preenchidas, a atual ganha borda destacada e as bloqueadas
 * mostram cadeado.
 */
export function ActivityStepper({ items, currentLessonId }: ActivityStepperProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Progresso da trilha"
      className="flex flex-wrap items-center gap-2 rounded-full bg-surface-muted p-2"
    >
      {items.map((item) => {
        const Icon =
          item.state === 'locked'
            ? Lock
            : item.state === 'completed'
              ? Check
              : ICON_BY_TYPE[item.contentType]

        const isCurrent = item.id === currentLessonId

        const base =
          'inline-flex size-8 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-focus'
        const styles = isCurrent
          ? 'bg-brand text-on-brand ring-2 ring-brand/40'
          : item.state === 'completed'
            ? 'bg-success text-on-brand'
            : item.state === 'locked'
              ? 'bg-surface text-text-subtle cursor-not-allowed opacity-60'
              : 'bg-surface text-text-muted hover:text-text'

        const className = `${base} ${styles}`
        const label = `${item.title}${
          item.state === 'completed'
            ? ' — concluída'
            : item.state === 'locked'
              ? ' — bloqueada'
              : ''
        }`

        if (item.state === 'locked' || isCurrent) {
          return (
            <span key={item.id} className={className} title={label} aria-current={isCurrent ? 'step' : undefined}>
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{label}</span>
            </span>
          )
        }

        return (
          <Link
            key={item.id}
            href={`/aula/${item.id}`}
            className={className}
            title={label}
          >
            <Icon className="size-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
