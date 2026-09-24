'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { submitActivity } from '@/features/learning/actions'
import type { SubmitActivityResult, UnlockedAchievement } from '@/features/learning/actions'
import type { LastActivitySubmission } from '@/features/learning/queries'
import { Card } from '@/components/ui/card'
import { RewardPanel } from '@/components/learning/reward-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Criterion {
  id: string
  label: string
}

interface ChallengeConfig {
  scenario?: string
  instructions?: string
  reference_answer?: string
  evaluation_criteria?: Criterion[]
  min_length?: number
  max_length?: number
  blocked_terms?: string[]
  cta_label?: string
}

interface ChallengeActivityProps {
  lessonId: string
  pathSlug: string
  nextLessonId: string | null
  config: ChallengeConfig
  lastSubmission: LastActivitySubmission | null
  initiallyCompleted: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function findBlockedTerms(text: string, terms: string[]): string[] {
  const t = normalize(text)
  return terms.filter((raw) => {
    const term = normalize(raw)
    if (!term) return false
    return t.includes(term)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChallengeActivity({
  lessonId,
  pathSlug,
  nextLessonId,
  config,
  lastSubmission,
  initiallyCompleted,
}: ChallengeActivityProps) {
  const criteria: Criterion[] = useMemo(
    () =>
      (Array.isArray(config.evaluation_criteria) ? config.evaluation_criteria : []).filter(
        (c): c is Criterion =>
          !!c && typeof c === 'object' && typeof c.id === 'string' && typeof c.label === 'string',
      ),
    [config.evaluation_criteria],
  )
  const blockedTerms = useMemo(
    () =>
      (Array.isArray(config.blocked_terms) ? config.blocked_terms : []).filter(
        (t): t is string => typeof t === 'string' && t.length > 0,
      ),
    [config.blocked_terms],
  )

  const minLength = Math.max(0, Number(config.min_length ?? 200))
  const maxLength = Math.min(5000, Math.max(minLength + 1, Number(config.max_length ?? 2000)))
  const ctaLabel = config.cta_label ?? 'Enviar resposta'

  const previousResponse = extractString(lastSubmission?.payload, 'response')
  const previousChecked = extractCriteria(lastSubmission?.payload, criteria)

  const [response, setResponse] = useState<string>(previousResponse)
  const [checked, setChecked] = useState<Record<string, boolean>>(previousChecked)
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

  const foundBlocked = findBlockedTerms(response, blockedTerms)
  const trimmedLen = response.trim().length
  const missingCriteria = criteria.filter((c) => !checked[c.id])
  const canSubmit =
    !pending &&
    !alreadyCompleted &&
    trimmedLen >= minLength &&
    trimmedLen <= maxLength &&
    foundBlocked.length === 0 &&
    missingCriteria.length === 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setResult(null)
    try {
      const res = await submitActivity(lessonId, {
        response: response.trim(),
        criteria: checked,
      })
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
    <section aria-label="Desafio" className="space-y-4">
      {config.scenario && (
        <Card variant="dark" className="p-5 text-on-dark">
          <p className="text-xs uppercase tracking-wide text-on-dark-muted">Cenário</p>
          <p className="mt-2 text-sm leading-relaxed">{config.scenario}</p>
        </Card>
      )}

      {config.instructions && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-text-subtle">Instruções</p>
          <p className="mt-2 whitespace-pre-line text-sm">{config.instructions}</p>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="challenge-response" className="block text-sm font-semibold">
              Sua resposta
            </label>
            <textarea
              id="challenge-response"
              className="min-h-40 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={alreadyCompleted}
              maxLength={maxLength}
              placeholder="Descreva como você resolveria a situação."
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  trimmedLen < minLength ? 'text-text-subtle' : 'text-success'
                }
              >
                Mínimo {minLength} caracteres
              </span>
              <span className="text-text-subtle">
                {response.length}/{maxLength}
              </span>
            </div>
            {foundBlocked.length > 0 && !alreadyCompleted && (
              <div className="flex items-start gap-2 rounded-md bg-danger-soft p-2 text-xs text-danger">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <p>
                  Evite os termos:{' '}
                  <strong>{foundBlocked.join(', ')}</strong>. Reescreva usando linguagem
                  adequada.
                </p>
              </div>
            )}
          </div>

          {criteria.length > 0 && (
            <fieldset className="space-y-2" disabled={alreadyCompleted}>
              <legend className="text-sm font-semibold">Autoavaliação</legend>
              <ul className="space-y-2">
                {criteria.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md p-1 hover:bg-surface-muted">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-border text-brand focus:ring-focus"
                        checked={Boolean(checked[c.id])}
                        onChange={(e) =>
                          setChecked((prev) => ({ ...prev, [c.id]: e.target.checked }))
                        }
                      />
                      <span className="text-sm">{c.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          {alreadyCompleted ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-4 py-2 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              Desafio concluído
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
              {result?.ok === false && (
                <p role="alert" className="text-xs text-error">
                  {result.error}
                </p>
              )}
              {result?.ok && result.status !== 'completed' && (
                <p className="text-xs text-warning">
                  Enviado! Sua resposta ficou em análise ou precisa de ajustes.
                </p>
              )}
            </div>
          )}
        </form>
      </Card>

      {alreadyCompleted && config.reference_answer && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-text-subtle">Resposta de referência</p>
          <p className="mt-2 whitespace-pre-line text-sm text-text">
            {config.reference_answer}
          </p>
        </Card>
      )}

      {showReward && result?.ok && result.status === 'completed' && (
        <RewardPanel
          xpEarned={rewardXp}
          achievements={rewardAchievements}
          nextLessonId={result.nextLessonId ?? nextLessonId}
          pathSlug={pathSlug}
          message="Desafio concluído!"
        />
      )}
    </section>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractString(payload: Record<string, unknown> | undefined, key: string): string {
  const v = payload?.[key]
  return typeof v === 'string' ? v : ''
}

function extractCriteria(
  payload: Record<string, unknown> | undefined,
  criteria: Criterion[],
): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  const source = payload?.['criteria']
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
      map[k] = Boolean(v)
    }
  }
  for (const c of criteria) {
    if (!(c.id in map)) map[c.id] = false
  }
  return map
}
