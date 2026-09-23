'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { submitQuiz } from '@/features/learning/actions'
import { QuizResult, type QuizResultData } from '@/components/quiz/quiz-result'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false'
  options: QuizOption[]
}

export interface QuizData {
  id: string
  title: string
  passingScore: number
  questions: QuizQuestion[]
}

interface QuizFormProps {
  quiz: QuizData
  lessonId: string
  /** Initial attempt to show as result when the user has already tried */
  initialResult?: QuizResultData | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuizForm({ quiz, lessonId, initialResult = null }: QuizFormProps) {
  // answers: map of questionId → optionId
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResultData | null>(initialResult)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const allAnswered = quiz.questions.every((q) => answers[q.id] != null)

  function handleOptionChange(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  function handleRetry() {
    setAnswers({})
    setResult(null)
    setErrorMessage(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allAnswered) return

    setErrorMessage(null)

    const formattedAnswers = quiz.questions.map((q) => ({
      questionId: q.id,
      optionId: answers[q.id] as string,
    }))

    startTransition(async () => {
      const res = await submitQuiz(quiz.id, formattedAnswers)
      if (res.ok) {
        setResult({
          score: res.score,
          passed: res.passed,
          correctCount: res.correctCount,
          totalQuestions: res.totalQuestions,
          passingScore: res.passingScore,
          xpEarned: res.xpEarned,
          achievementsUnlocked: res.achievementsUnlocked,
        })
      } else {
        setErrorMessage(res.error)
      }
    })
  }

  // Show result screen if we have a result
  if (result) {
    return (
      <QuizResult
        result={result}
        lessonId={lessonId}
        onRetry={handleRetry}
      />
    )
  }

  return (
    <Card className="p-6 space-y-6">
      <header>
        <h2 className="text-lg font-bold">{quiz.title}</h2>
        <p className="mt-1 text-sm text-text-muted">
          Nota mínima para passar: {quiz.passingScore}%
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {quiz.questions.map((question, qIdx) => (
          <fieldset
            key={question.id}
            className="space-y-3 rounded-lg border border-border p-4"
          >
            <legend className="px-1 text-sm font-semibold text-text">
              <span className="text-text-muted mr-1">{qIdx + 1}.</span>
              {question.question}
            </legend>

            <div className="space-y-2">
              {question.options.map((option) => {
                const radioId = `opt-${question.id}-${option.id}`
                const isSelected = answers[question.id] === option.id

                return (
                  <label
                    key={option.id}
                    htmlFor={radioId}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? 'border-brand bg-brand/5 text-text'
                        : 'border-border bg-surface text-text-muted hover:border-brand/40 hover:bg-surface-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      id={radioId}
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={isSelected}
                      onChange={() => handleOptionChange(question.id, option.id)}
                      className="accent-brand size-4 shrink-0"
                    />
                    {option.text}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}

        {errorMessage && (
          <p role="alert" className="text-sm text-error">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!allAnswered || isPending}
            aria-disabled={!allAnswered || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Enviando…
              </>
            ) : (
              'Enviar respostas'
            )}
          </button>
        </div>
      </form>
    </Card>
  )
}
