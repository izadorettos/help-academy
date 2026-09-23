'use client'

import { CheckCircle2, XCircle, RotateCcw, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { RewardToast } from '@/components/gamification/reward-toast'
import { completeLesson } from '@/features/learning/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizResultData {
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  passingScore: number
  xpEarned?: number
}

interface QuizResultProps {
  result: QuizResultData
  lessonId: string
  onRetry: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuizResult({ result, lessonId, onRetry }: QuizResultProps) {
  const [isPending, startTransition] = useTransition()
  const [lessonConcluded, setLessonConcluded] = useState(false)
  const [toastXp, setToastXp] = useState(0)

  const { score, passed, correctCount, totalQuestions, passingScore } = result

  // XP from quiz submission (passed in via result.xpEarned)
  // Additional XP from explicit "Concluir aula" button is accumulated here
  const quizXp = result.xpEarned ?? 0

  function handleConcluir() {
    startTransition(async () => {
      const res = await completeLesson(lessonId)
      if (res.ok && res.xpEarned > 0) {
        setToastXp(res.xpEarned)
      }
      setLessonConcluded(true)
    })
  }

  // Show "Aula concluída" after the user clicks "Concluir aula" successfully
  if (lessonConcluded) {
    return (
      <>
        <Card className="p-6">
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 text-center"
          >
            <CheckCircle2 className="size-14 text-success" aria-hidden />
            <p className="text-xl font-bold text-success">Aula concluída</p>
            <p className="text-sm text-text-muted">
              Parabéns! Você concluiu esta aula com {score}%.
            </p>
          </div>
        </Card>
        <RewardToast xpEarned={toastXp} onDismiss={() => setToastXp(0)} />
      </>
    )
  }

  return (
    <>
    {/* Show XP toast when quiz was submitted and XP was earned (auto-complete on pass) */}
    <RewardToast xpEarned={quizXp} />
    <Card className="p-6 space-y-5">
      {/* Status icon + score */}
      <div className="flex flex-col items-center gap-3 text-center">
        {passed ? (
          <CheckCircle2
            className="size-14 text-success"
            aria-hidden
          />
        ) : (
          <XCircle
            className="size-14 text-error"
            aria-hidden
          />
        )}

        <div>
          <p
            className={`text-4xl font-bold ${passed ? 'text-success' : 'text-error'}`}
            aria-live="polite"
          >
            {score}%
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {correctCount} de {totalQuestions} {totalQuestions === 1 ? 'questão correta' : 'questões corretas'}
          </p>
        </div>

        <p
          className={`text-base font-semibold ${passed ? 'text-success' : 'text-error'}`}
        >
          {passed ? 'Parabéns! Você passou no quiz.' : 'Você não atingiu a nota mínima.'}
        </p>

        {!passed && (
          <p className="text-sm text-text-muted">
            Você precisa atingir {passingScore}% para passar.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus"
        >
          <RotateCcw className="size-4" aria-hidden />
          Refazer quiz
        </button>

        {passed && (
          <button
            type="button"
            onClick={handleConcluir}
            disabled={isPending}
            aria-disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Concluindo…
              </>
            ) : (
              'Concluir aula'
            )}
          </button>
        )}
      </div>
    </Card>
    </>
  )
}
