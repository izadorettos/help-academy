'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Loader2,
  Star,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { submitActivity } from '@/features/learning/actions'
import type { SubmitActivityResult, UnlockedAchievement } from '@/features/learning/actions'
import type { LastActivitySubmission } from '@/features/learning/queries'
import { Card } from '@/components/ui/card'
import { RewardPanel } from '@/components/learning/reward-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DragItem {
  id: string
  label: string
}

interface SayCard {
  id: string
  label: string
}

type GameKind = 'drag_sort' | 'say_dont_say'

interface GameConfig {
  kind?: GameKind
  intro?: string
  items?: DragItem[]
  cards?: SayCard[]
  cta_label?: string
}

interface GameActivityProps {
  lessonId: string
  pathSlug: string
  nextLessonId: string | null
  config: GameConfig
  lastSubmission: LastActivitySubmission | null
  initiallyCompleted: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GameActivity({
  lessonId,
  pathSlug,
  nextLessonId,
  config,
  lastSubmission,
  initiallyCompleted,
}: GameActivityProps) {
  const kind: GameKind = (config.kind ?? 'drag_sort') as GameKind
  const ctaLabel = config.cta_label ?? 'Enviar'

  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SubmitActivityResult | null>(null)
  const [rewardXp, setRewardXp] = useState(0)
  const [rewardAchievements, setRewardAchievements] = useState<UnlockedAchievement[]>([])
  const [showReward, setShowReward] = useState(false)

  const alreadyCompleted: boolean = Boolean(
    initiallyCompleted ||
      lastSubmission?.status === 'completed' ||
      (result?.ok && result.status === 'completed'),
  )

  const lastScore = result?.ok ? result.score : lastSubmission?.score ?? null
  const stars = starsForScore(lastScore)

  async function submit(payload: Record<string, unknown>) {
    if (pending || alreadyCompleted) return
    setPending(true)
    setResult(null)
    try {
      // RPC submit_activity espera { rounds: [{id, type, order|cards}] }.
      // O componente atual roda uma rodada por lesson (id 'r1' por convenção).
      const wrapped = wrapForRpc(kind, payload)
      const res = await submitActivity(lessonId, wrapped)
      setResult(res)
      if (res.ok) {
        setRewardXp(res.xpEarned)
        setRewardAchievements(res.achievementsUnlocked)
        setShowReward(res.status === 'completed')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-label="Game" className="space-y-4">
      {config.intro && <p className="text-sm text-text-muted">{config.intro}</p>}

      <Card className="p-5 space-y-4">
        {kind === 'drag_sort' && (
          <DragSort
            items={config.items ?? []}
            disabled={alreadyCompleted || pending}
            onSubmit={(order) => submit({ order })}
            ctaLabel={ctaLabel}
            pending={pending}
          />
        )}

        {kind === 'say_dont_say' && (
          <SayDontSay
            cards={config.cards ?? []}
            disabled={alreadyCompleted || pending}
            onSubmit={(answers) => submit({ answers })}
            ctaLabel={ctaLabel}
            pending={pending}
          />
        )}

        {alreadyCompleted && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-1.5 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              Game concluído
            </div>
            {typeof lastScore === 'number' && (
              <div className="inline-flex items-center gap-1 text-sm text-text-muted">
                Nota <strong className="text-text">{lastScore}%</strong>
                <span className="ml-1 inline-flex items-center gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`size-4 ${
                        s <= stars ? 'fill-xp text-xp' : 'text-text-subtle'
                      }`}
                      aria-hidden
                    />
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        {result?.ok === false && (
          <p role="alert" className="text-xs text-error">
            {result.error}
          </p>
        )}
        {result?.ok && result.status !== 'completed' && typeof result.score === 'number' && (
          <p className="text-xs text-warning">
            Nota {result.score}%. Você pode revisar o conteúdo e tentar novamente para desbloquear.
          </p>
        )}
      </Card>

      {showReward && result?.ok && result.status === 'completed' && (
        <RewardPanel
          xpEarned={rewardXp}
          achievements={rewardAchievements}
          nextLessonId={result.nextLessonId ?? nextLessonId}
          pathSlug={pathSlug}
          message={
            typeof result.score === 'number' && result.score === 100
              ? 'Nota máxima!'
              : 'Game concluído!'
          }
        />
      )}
    </section>
  )
}

// ─── Drag & sort ──────────────────────────────────────────────────────────────

interface DragSortProps {
  items: DragItem[]
  disabled: boolean
  ctaLabel: string
  pending: boolean
  onSubmit: (order: string[]) => void
}

function DragSort({ items, disabled, ctaLabel, pending, onSubmit }: DragSortProps) {
  const initial = useMemo(() => shuffleStable(items).map((i) => i.id), [items])
  const [order, setOrder] = useState<string[]>(initial)

  const map = new Map(items.map((i) => [i.id, i]))

  function move(idx: number, dir: -1 | 1) {
    if (disabled) return
    setOrder((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target]!, next[idx]!]
      return next
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-subtle">
        Reordene os passos usando as setas até formar a sequência correta.
      </p>
      <ol className="space-y-2">
        {order.map((id, idx) => {
          const item = map.get(id)
          if (!item) return null
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm">{item.label}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={disabled || idx === 0}
                  aria-label={`Mover ${item.label} para cima`}
                  className="rounded-md border border-border bg-surface p-1.5 text-text-muted hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={disabled || idx === order.length - 1}
                  aria-label={`Mover ${item.label} para baixo`}
                  className="rounded-md border border-border bg-surface p-1.5 text-text-muted hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      {!disabled && (
        <div>
          <button
            type="button"
            onClick={() => onSubmit(order)}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Enviando…
              </>
            ) : (
              ctaLabel
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Say / Don't say ─────────────────────────────────────────────────────────

interface SayDontSayProps {
  cards: SayCard[]
  disabled: boolean
  ctaLabel: string
  pending: boolean
  onSubmit: (answers: Record<string, 'say' | 'dont_say'>) => void
}

function SayDontSay({ cards, disabled, ctaLabel, pending, onSubmit }: SayDontSayProps) {
  const [answers, setAnswers] = useState<Record<string, 'say' | 'dont_say'>>({})

  const answered = cards.every((c) => answers[c.id])

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-subtle">
        Classifique cada frase como <strong>Diga</strong> ou <strong>Não diga</strong>.
      </p>
      <ul className="space-y-2">
        {cards.map((card) => {
          const answer = answers[card.id]
          return (
            <li
              key={card.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm">{card.label}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [card.id]: 'say' }))
                  }
                  disabled={disabled}
                  aria-pressed={answer === 'say'}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-focus ${
                    answer === 'say'
                      ? 'bg-success text-on-brand'
                      : 'bg-success-soft text-success hover:bg-success/20'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <ThumbsUp className="size-3.5" aria-hidden />
                  Diga
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [card.id]: 'dont_say' }))
                  }
                  disabled={disabled}
                  aria-pressed={answer === 'dont_say'}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-focus ${
                    answer === 'dont_say'
                      ? 'bg-danger text-on-brand'
                      : 'bg-danger-soft text-danger hover:bg-danger/20'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <ThumbsDown className="size-3.5" aria-hidden />
                  Não diga
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {!disabled && (
        <div>
          <button
            type="button"
            onClick={() => onSubmit(answers)}
            disabled={pending || !answered}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Enviando…
              </>
            ) : (
              ctaLabel
            )}
          </button>
          {!answered && (
            <p className="mt-1 text-xs text-text-subtle">
              Responda todas as frases para enviar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function starsForScore(score: number | null): number {
  if (score == null) return 0
  if (score >= 100) return 3
  if (score >= 85) return 2
  if (score >= 70) return 1
  return 0
}

/**
 * Ordena com base num hash simples do id. Deterministic entre renders
 * sem depender de `Math.random` (evita hidration mismatch).
 */
function shuffleStable<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => hashCode(a.id) - hashCode(b.id))
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h
}

/**
 * Adapta o payload do componente ({order} ou {answers}) para o formato
 * esperado pela RPC submit_activity ({rounds: [{id, type, order|cards}]}).
 * Uma rodada por lesson, id fixo 'r1' (bater com o gabarito no seed).
 */
function wrapForRpc(kind: GameKind, payload: Record<string, unknown>): Record<string, unknown> {
  if (kind === 'drag_sort') {
    const order = Array.isArray(payload.order) ? payload.order : []
    return {
      rounds: [{ id: 'r1', type: 'drag_sort', order }],
    }
  }
  // say_dont_say — vira array de {id, answer}
  const answers = (payload.answers ?? {}) as Record<string, 'say' | 'dont_say'>
  const cards = Object.entries(answers).map(([id, answer]) => ({ id, answer }))
  return {
    rounds: [{ id: 'r1', type: 'say_dont_say', cards }],
  }
}
