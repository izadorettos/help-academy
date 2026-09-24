'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { submitActivity } from '@/features/learning/actions'
import type { SubmitActivityResult, UnlockedAchievement } from '@/features/learning/actions'
import type { LastActivitySubmission } from '@/features/learning/queries'
import { Card } from '@/components/ui/card'
import { RewardPanel } from '@/components/learning/reward-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string
  label: string
  required?: boolean
}

interface TaskConfig {
  intro?: string
  items?: ChecklistItem[]
  note_optional?: boolean
  note_max_length?: number
  cta_label?: string
}

interface TaskActivityProps {
  lessonId: string
  pathSlug: string
  nextLessonId: string | null
  config: TaskConfig
  lastSubmission: LastActivitySubmission | null
  initiallyCompleted: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskActivity({
  lessonId,
  pathSlug,
  nextLessonId,
  config,
  lastSubmission,
  initiallyCompleted,
}: TaskActivityProps) {
  const items: ChecklistItem[] = useMemo(
    () =>
      (Array.isArray(config.items) ? config.items : []).filter(
        (i): i is ChecklistItem =>
          !!i && typeof i === 'object' && typeof i.id === 'string' && typeof i.label === 'string',
      ),
    [config.items],
  )

  const noteOptional = config.note_optional !== false
  const noteMax = Math.min(2000, Math.max(0, Number(config.note_max_length ?? 1000)))
  const ctaLabel = config.cta_label ?? 'Concluir atividade'

  const previousChecked = extractChecklist(lastSubmission?.payload, items)
  const previousNote = extractString(lastSubmission?.payload, 'note')

  const [checked, setChecked] = useState<Record<string, boolean>>(previousChecked)
  const [note, setNote] = useState<string>(previousNote)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SubmitActivityResult | null>(null)

  const alreadyCompleted: boolean = Boolean(
    initiallyCompleted ||
      lastSubmission?.status === 'completed' ||
      (result?.ok && result.status === 'completed'),
  )

  const [rewardXp, setRewardXp] = useState(0)
  const [rewardAchievements, setRewardAchievements] = useState<UnlockedAchievement[]>([])
  const [showReward, setShowReward] = useState(false)

  const missingRequired = items
    .filter((i) => i.required !== false && !checked[i.id])
    .map((i) => i.id)

  const canSubmit = missingRequired.length === 0 && !pending

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || alreadyCompleted) return
    setPending(true)
    setResult(null)
    try {
      const res = await submitActivity(lessonId, {
        checklist: checked,
        note: note.trim(),
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
    <section aria-label="Tarefa" className="space-y-4">
      {config.intro && (
        <p className="text-sm text-text-muted">{config.intro}</p>
      )}

      <Card className="p-5 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset className="space-y-2" disabled={alreadyCompleted}>
            <legend className="text-sm font-semibold">Passos</legend>
            <ul className="space-y-2">
              {items.map((item) => {
                const checkedItem = Boolean(checked[item.id])
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md p-1 hover:bg-surface-muted">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-border text-brand focus:ring-focus"
                        checked={checkedItem}
                        onChange={(e) =>
                          setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                      />
                      <span className="text-sm">
                        {item.label}
                        {item.required !== false && (
                          <span className="ml-1 text-xs text-text-subtle">(obrigatório)</span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <div className="space-y-1">
            <label htmlFor="task-note" className="block text-sm font-semibold">
              Observações
              {noteOptional && (
                <span className="ml-1 text-xs font-normal text-text-subtle">(opcional)</span>
              )}
            </label>
            <textarea
              id="task-note"
              className="min-h-24 w-full rounded-md border border-border bg-surface p-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              maxLength={noteMax}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={alreadyCompleted}
              placeholder="Anote aqui aprendizados, dúvidas ou próximos passos."
            />
            <p className="text-right text-xs text-text-subtle">
              {note.length}/{noteMax}
            </p>
          </div>

          {alreadyCompleted ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-4 py-2 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              Tarefa concluída
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
              {missingRequired.length > 0 && (
                <p className="text-xs text-text-subtle">
                  Marque todos os passos obrigatórios para enviar.
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

      {showReward && result?.ok && result.status === 'completed' && (
        <RewardPanel
          xpEarned={rewardXp}
          achievements={rewardAchievements}
          nextLessonId={result.nextLessonId ?? nextLessonId}
          pathSlug={pathSlug}
          message="Tarefa concluída!"
        />
      )}
    </section>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractChecklist(
  payload: Record<string, unknown> | undefined,
  items: ChecklistItem[],
): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  const source = payload?.['checklist']
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
      map[k] = Boolean(v)
    }
  }
  for (const item of items) {
    if (!(item.id in map)) map[item.id] = false
  }
  return map
}

function extractString(payload: Record<string, unknown> | undefined, key: string): string {
  const v = payload?.[key]
  return typeof v === 'string' ? v : ''
}
