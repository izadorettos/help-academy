'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { submitActivity } from '@/features/learning/actions'
import type { SubmitActivityResult, UnlockedAchievement } from '@/features/learning/actions'
import type { LastActivitySubmission } from '@/features/learning/queries'
import { Card } from '@/components/ui/card'
import { RewardPanel } from '@/components/learning/reward-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

type SurveyQuestionType =
  | 'scale'
  | 'nps'
  | 'single_choice'
  | 'multiple_choice'
  | 'yes_no'
  | 'short_text'
  | 'long_text'

interface SurveyChoice {
  id: string
  label: string
}

interface SurveyQuestion {
  id: string
  question: string
  type: SurveyQuestionType
  required?: boolean
  choices?: SurveyChoice[]
  max_length?: number
}

interface SurveyConfig {
  intro?: string
  outro?: string
  questions?: SurveyQuestion[]
  cta_label?: string
}

interface SurveyActivityProps {
  lessonId: string
  pathSlug: string
  nextLessonId: string | null
  config: SurveyConfig
  lastSubmission: LastActivitySubmission | null
  initiallyCompleted: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SurveyActivity({
  lessonId,
  pathSlug,
  nextLessonId,
  config,
  lastSubmission,
  initiallyCompleted,
}: SurveyActivityProps) {
  const questions: SurveyQuestion[] = useMemo(
    () =>
      (Array.isArray(config.questions) ? config.questions : []).filter(
        (q): q is SurveyQuestion =>
          !!q &&
          typeof q === 'object' &&
          typeof q.id === 'string' &&
          typeof q.question === 'string' &&
          typeof q.type === 'string',
      ),
    [config.questions],
  )

  const ctaLabel = config.cta_label ?? 'Enviar respostas'

  const previousAnswers = extractAnswers(lastSubmission?.payload)
  const [answers, setAnswers] = useState<Record<string, unknown>>(previousAnswers)

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

  function setAnswer(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const missing = questions
    .filter((q) => q.required !== false)
    .filter((q) => !isAnswered(q, answers[q.id]))

  const canSubmit = !pending && !alreadyCompleted && missing.length === 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setResult(null)
    try {
      const res = await submitActivity(lessonId, { answers })
      setResult(res)
      if (res.ok) {
        setRewardXp(res.xpEarned)
        setRewardAchievements(res.achievementsUnlocked)
        setShowReward(true)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-label="Questionário" className="space-y-4">
      {config.intro && <p className="text-sm text-text-muted">{config.intro}</p>}

      <Card className="p-5 space-y-5">
        <form onSubmit={onSubmit} className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2 border-b border-border pb-4 last:border-b-0 last:pb-0">
              <p className="text-sm font-semibold">
                {idx + 1}. {q.question}
                {q.required !== false && (
                  <span className="ml-1 text-xs font-normal text-text-subtle">
                    (obrigatório)
                  </span>
                )}
              </p>
              <QuestionInput
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
                disabled={alreadyCompleted}
              />
            </div>
          ))}

          {alreadyCompleted ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-4 py-2 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              Questionário enviado
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <button
                type="submit"
                disabled={!canSubmit}
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
              {missing.length > 0 && (
                <p className="text-xs text-text-subtle">
                  Responda todas as perguntas obrigatórias para enviar.
                </p>
              )}
              {result?.ok === false && (
                <p role="alert" className="text-xs text-error">
                  {result.error}
                </p>
              )}
            </div>
          )}
        </form>
      </Card>

      {config.outro && alreadyCompleted && (
        <p className="text-sm text-text-muted">{config.outro}</p>
      )}

      {showReward && result?.ok && result.status === 'completed' && (
        <RewardPanel
          xpEarned={rewardXp}
          achievements={rewardAchievements}
          nextLessonId={result.nextLessonId ?? nextLessonId}
          pathSlug={pathSlug}
          message={
            result.alreadySubmitted ? 'Você já havia enviado este questionário.' : 'Respostas enviadas!'
          }
        />
      )}
    </section>
  )
}

// ─── Question Input ──────────────────────────────────────────────────────────

interface QuestionInputProps {
  question: SurveyQuestion
  value: unknown
  onChange: (v: unknown) => void
  disabled: boolean
}

function QuestionInput({ question, value, onChange, disabled }: QuestionInputProps) {
  const choices = Array.isArray(question.choices) ? question.choices : []

  switch (question.type) {
    case 'scale':
      return (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={question.question}>
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = value === n
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onChange(n)}
                className={`size-10 rounded-md border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-focus ${
                  selected
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-border bg-surface text-text hover:bg-surface-muted'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {n}
              </button>
            )
          })}
        </div>
      )

    case 'nps':
      return (
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={question.question}>
          {Array.from({ length: 11 }).map((_, n) => {
            const selected = value === n
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onChange(n)}
                className={`size-9 rounded-md border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-focus ${
                  selected
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-border bg-surface text-text hover:bg-surface-muted'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {n}
              </button>
            )
          })}
        </div>
      )

    case 'single_choice':
      return (
        <ul className="space-y-1.5">
          {choices.map((c) => {
            const selected = value === c.id
            return (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md p-1 hover:bg-surface-muted">
                  <input
                    type="radio"
                    name={question.id}
                    className="size-4 border-border text-brand focus:ring-focus"
                    checked={selected}
                    onChange={() => onChange(c.id)}
                    disabled={disabled}
                  />
                  <span className="text-sm">{c.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )

    case 'multiple_choice': {
      const selected = new Set(Array.isArray(value) ? (value as string[]) : [])
      return (
        <ul className="space-y-1.5">
          {choices.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md p-1 hover:bg-surface-muted">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border text-brand focus:ring-focus"
                  checked={selected.has(c.id)}
                  onChange={(e) => {
                    const next = new Set(selected)
                    if (e.target.checked) next.add(c.id)
                    else next.delete(c.id)
                    onChange(Array.from(next))
                  }}
                  disabled={disabled}
                />
                <span className="text-sm">{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )
    }

    case 'yes_no':
      return (
        <div className="flex gap-2">
          {(
            [
              { id: 'yes', label: 'Sim' },
              { id: 'no', label: 'Não' },
            ] as const
          ).map((opt) => {
            const selected = value === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                disabled={disabled}
                className={`min-w-20 rounded-full border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus ${
                  selected
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-border bg-surface text-text hover:bg-surface-muted'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )

    case 'short_text': {
      const maxLen = Math.min(240, Math.max(1, Number(question.max_length ?? 120)))
      return (
        <input
          type="text"
          className="w-full rounded-md border border-border bg-surface p-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          maxLength={maxLen}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }

    case 'long_text': {
      const maxLen = Math.min(2000, Math.max(1, Number(question.max_length ?? 1000)))
      return (
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-surface p-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          maxLength={maxLen}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }

    default:
      return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAnswered(q: SurveyQuestion, v: unknown): boolean {
  switch (q.type) {
    case 'scale':
    case 'nps':
      return typeof v === 'number' && Number.isFinite(v)
    case 'single_choice':
    case 'yes_no':
      return typeof v === 'string' && v.length > 0
    case 'multiple_choice':
      return Array.isArray(v) && v.length > 0
    case 'short_text':
    case 'long_text':
      return typeof v === 'string' && v.trim().length > 0
    default:
      return false
  }
}

function extractAnswers(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  const source = payload?.['answers']
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    return { ...(source as Record<string, unknown>) }
  }
  return {}
}
