'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createOption,
  updateOption,
  deleteOption,
  setCorrectOption,
} from '@/features/admin/quiz/actions'
import type { AdminQuiz, AdminQuizQuestion, AdminQuizOption } from '@/features/admin/quiz/queries'
import { Plus, Trash2, Pencil, Check, X, CheckCircle } from 'lucide-react'

interface Props {
  quiz: AdminQuiz | null
  lessonId: string
  pathId: string
}

// ─── Create quiz form ──────────────────────────────────────────────────────────

function CreateQuizForm({
  lessonId,
  pathId,
  onCreated,
}: {
  lessonId: string
  pathId: string
  onCreated: (quiz: AdminQuiz) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createQuiz(lessonId, pathId, formData)
      if (result.ok) {
        onCreated({
          id: result.data.id,
          lessonId,
          title: (formData.get('title') as string) ?? '',
          passingScore: Number(formData.get('passing_score') ?? 70),
          xpReward: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          questions: [],
        })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-base font-semibold">Criar quiz</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="quiz-title" className="mb-1 block text-sm font-medium">
            Título do quiz
          </label>
          <input
            id="quiz-title"
            name="title"
            type="text"
            required
            placeholder="Ex.: Quiz do módulo 1"
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          />
        </div>
        <div>
          <label htmlFor="passing-score" className="mb-1 block text-sm font-medium">
            Nota mínima para aprovação (%)
          </label>
          <input
            id="passing-score"
            name="passing_score"
            type="number"
            min={0}
            max={100}
            defaultValue={70}
            required
            className="border-border bg-surface focus:border-brand focus:ring-brand w-32 rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          />
        </div>
        {error && (
          <p className="text-danger text-sm" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" loading={isPending}>
          Criar quiz
        </Button>
      </form>
    </Card>
  )
}

// ─── Option row ────────────────────────────────────────────────────────────────

function OptionRow({
  option,
  questionId,
  questionType,
  lessonId,
  pathId,
  onUpdated,
  onDeleted,
  onSetCorrect,
}: {
  option: AdminQuizOption
  questionId: string
  questionType: 'multiple_choice' | 'true_false'
  lessonId: string
  pathId: string
  onUpdated: (updated: AdminQuizOption) => void
  onDeleted: (id: string) => void
  onSetCorrect: (optionId: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(option.text)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!editText.trim()) return
    const formData = new FormData()
    formData.set('text', editText.trim())
    formData.set('is_correct', String(option.isCorrect))
    startTransition(async () => {
      const result = await updateOption(option.id, lessonId, pathId, formData)
      if (result.ok) {
        onUpdated({ ...option, text: editText.trim() })
        setIsEditing(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOption(option.id, lessonId, pathId)
      if (result.ok) onDeleted(option.id)
    })
  }

  function handleSetCorrect() {
    startTransition(async () => {
      const result = await setCorrectOption(questionId, option.id, lessonId, pathId)
      if (result.ok) onSetCorrect(option.id)
    })
  }

  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 ${option.isCorrect ? 'bg-success-soft' : 'bg-surface-muted'}`}>
      {/* Correct indicator */}
      <button
        type="button"
        onClick={handleSetCorrect}
        disabled={isPending || option.isCorrect}
        aria-label={option.isCorrect ? 'Opção correta' : 'Marcar como correta'}
        title={option.isCorrect ? 'Opção correta' : 'Marcar como correta'}
        className={`shrink-0 transition-colors ${option.isCorrect ? 'text-success cursor-default' : 'text-text-muted hover:text-success'}`}
      >
        <CheckCircle className="size-4" aria-hidden />
      </button>

      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="border-border bg-surface focus:border-brand focus:ring-brand min-w-0 flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') { setIsEditing(false); setEditText(option.text) }
          }}
        />
      ) : (
        <span className="min-w-0 flex-1 text-sm">{option.text}</span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              aria-label="Salvar"
              className="text-success hover:text-success rounded p-1"
            >
              <Check className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => { setIsEditing(false); setEditText(option.text) }}
              aria-label="Cancelar"
              className="text-text-muted hover:text-text rounded p-1"
            >
              <X className="size-4" aria-hidden />
            </button>
          </>
        ) : (
          <>
            {/* Only allow editing text if true_false (position label is fixed) */}
            {questionType === 'multiple_choice' && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Editar opção"
                className="text-text-muted hover:text-text rounded p-1 transition-colors"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            )}
            {questionType === 'multiple_choice' && (
              <ConfirmDialog
                title="Excluir opção"
                description={`Excluir a opção "${option.text}"?`}
                confirmLabel="Excluir"
                onConfirm={handleDelete}
                variant="danger"
              >
                <button
                  type="button"
                  aria-label="Excluir opção"
                  className="text-text-muted hover:text-danger rounded p-1 transition-colors"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </ConfirmDialog>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  lessonId,
  pathId,
  onUpdated,
  onDeleted,
}: {
  question: AdminQuizQuestion
  lessonId: string
  pathId: string
  onUpdated: (q: AdminQuizQuestion) => void
  onDeleted: (id: string) => void
}) {
  const [options, setOptions] = useState<AdminQuizOption[]>(question.options)
  const [isEditingQ, setIsEditingQ] = useState(false)
  const [editQuestion, setEditQuestion] = useState(question.question)
  const [editExplanation, setEditExplanation] = useState(question.explanation ?? '')
  const [addingOption, setAddingOption] = useState(false)
  const [newOptionText, setNewOptionText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSaveQuestion() {
    if (!editQuestion.trim()) return
    const formData = new FormData()
    formData.set('question', editQuestion.trim())
    formData.set('type', question.type)
    formData.set('explanation', editExplanation.trim())
    startTransition(async () => {
      const result = await updateQuestion(question.id, lessonId, pathId, formData)
      if (result.ok) {
        onUpdated({ ...question, question: editQuestion.trim(), explanation: editExplanation.trim() || null, options })
        setIsEditingQ(false)
      } else {
        setError(result.error)
      }
    })
  }

  function handleDeleteQuestion() {
    startTransition(async () => {
      const result = await deleteQuestion(question.id, lessonId, pathId)
      if (result.ok) onDeleted(question.id)
      else setError(result.error)
    })
  }

  function handleAddOption() {
    if (!newOptionText.trim()) return
    const formData = new FormData()
    formData.set('text', newOptionText.trim())
    formData.set('is_correct', 'false')
    startTransition(async () => {
      const result = await createOption(question.id, lessonId, pathId, formData)
      if (result.ok) {
        const newOpt: AdminQuizOption = {
          id: result.data.id,
          questionId: question.id,
          text: newOptionText.trim(),
          isCorrect: false,
          position: options.length + 1,
        }
        setOptions((prev) => [...prev, newOpt])
        setNewOptionText('')
        setAddingOption(false)
      } else {
        setError(result.error)
      }
    })
  }

  function handleOptionUpdated(updated: AdminQuizOption) {
    setOptions((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  function handleOptionDeleted(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  function handleSetCorrect(optionId: string) {
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.id === optionId })))
  }

  const hasCorrect = options.some((o) => o.isCorrect)

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface-muted flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          {isEditingQ ? (
            <div className="space-y-2">
              <textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                rows={3}
                className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-1"
                autoFocus
              />
              <input
                type="text"
                value={editExplanation}
                onChange={(e) => setEditExplanation(e.target.value)}
                placeholder="Explicação (exibida após resposta)"
                className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-1"
              />
              <div className="flex gap-2">
                <Button size="sm" loading={isPending} onClick={handleSaveQuestion}>
                  Salvar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setIsEditingQ(false); setEditQuestion(question.question); setEditExplanation(question.explanation ?? '') }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">{question.question}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-text-subtle text-xs">
                  {question.type === 'multiple_choice' ? 'Múltipla escolha' : 'Verdadeiro/Falso'}
                </span>
                {!hasCorrect && (
                  <span className="text-warning text-xs">⚠ Nenhuma opção correta</span>
                )}
              </div>
              {question.explanation && (
                <p className="text-text-muted mt-1 text-xs italic">{question.explanation}</p>
              )}
            </div>
          )}
        </div>

        {!isEditingQ && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditingQ(true)}
              aria-label="Editar pergunta"
              className="text-text-muted hover:text-text rounded p-1 transition-colors"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <ConfirmDialog
              title="Excluir pergunta"
              description={`Excluir a pergunta "${question.question}"? Todas as opções serão removidas.`}
              confirmLabel="Excluir"
              onConfirm={handleDeleteQuestion}
              variant="danger"
            >
              <button
                type="button"
                aria-label="Excluir pergunta"
                className="text-text-muted hover:text-danger rounded p-1 transition-colors"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </ConfirmDialog>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="divide-border divide-y px-4 py-3">
        <div className="space-y-2">
          {options.length === 0 && (
            <p className="text-text-subtle text-sm">Nenhuma opção ainda.</p>
          )}
          {options.map((opt) => (
            <OptionRow
              key={opt.id}
              option={opt}
              questionId={question.id}
              questionType={question.type}
              lessonId={lessonId}
              pathId={pathId}
              onUpdated={handleOptionUpdated}
              onDeleted={handleOptionDeleted}
              onSetCorrect={handleSetCorrect}
            />
          ))}
        </div>

        {/* Add option — only for multiple_choice */}
        {question.type === 'multiple_choice' && (
          <div className="pt-3">
            {addingOption ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  placeholder="Texto da opção"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddOption()
                    if (e.key === 'Escape') { setAddingOption(false); setNewOptionText('') }
                  }}
                  className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
                />
                <Button size="sm" loading={isPending} onClick={handleAddOption}>
                  Adicionar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setAddingOption(false); setNewOptionText('') }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingOption(true)}
                className="text-brand hover:text-brand-hover inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Plus className="size-4" aria-hidden />
                Adicionar opção
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="text-danger pt-2 text-sm" role="alert">
            {error}
          </p>
        )}
      </div>
    </Card>
  )
}

// ─── Add question form ─────────────────────────────────────────────────────────

function AddQuestionForm({
  quizId,
  lessonId,
  pathId,
  onCreated,
  onCancel,
}: {
  quizId: string
  lessonId: string
  pathId: string
  onCreated: (q: AdminQuizQuestion) => void
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createQuestion(quizId, lessonId, pathId, formData)
      if (result.ok) {
        const type = formData.get('type') as 'multiple_choice' | 'true_false'
        const newQuestion: AdminQuizQuestion = {
          id: result.data.id,
          quizId,
          question: (formData.get('question') as string) ?? '',
          type,
          explanation: (formData.get('explanation') as string) || null,
          position: 1,
          // true_false auto-creates options server-side; we show them after reload
          options:
            type === 'true_false'
              ? [
                  { id: 'tmp-v', questionId: result.data.id, text: 'Verdadeiro', isCorrect: false, position: 1 },
                  { id: 'tmp-f', questionId: result.data.id, text: 'Falso', isCorrect: false, position: 2 },
                ]
              : [],
        }
        onCreated(newQuestion)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Card className="p-4">
      <h4 className="mb-3 text-sm font-semibold">Nova pergunta</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="question-text" className="mb-1 block text-sm font-medium">
            Pergunta
          </label>
          <textarea
            id="question-text"
            name="question"
            rows={3}
            required
            placeholder="Digite a pergunta..."
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          />
        </div>
        <div>
          <label htmlFor="question-type" className="mb-1 block text-sm font-medium">
            Tipo
          </label>
          <select
            id="question-type"
            name="type"
            required
            defaultValue="multiple_choice"
            className="border-border bg-surface focus:border-brand focus:ring-brand rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          >
            <option value="multiple_choice">Múltipla escolha</option>
            <option value="true_false">Verdadeiro/Falso</option>
          </select>
        </div>
        <div>
          <label htmlFor="question-explanation" className="mb-1 block text-sm font-medium">
            Explicação <span className="text-text-muted font-normal">(opcional)</span>
          </label>
          <input
            id="question-explanation"
            name="explanation"
            type="text"
            placeholder="Exibida após a resposta"
            className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          />
        </div>
        {error && (
          <p className="text-danger text-sm" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={isPending}>
            Criar pergunta
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Main quiz builder ─────────────────────────────────────────────────────────

export function QuizBuilder({ quiz: initialQuiz, lessonId, pathId }: Props) {
  const [quiz, setQuiz] = useState<AdminQuiz | null>(initialQuiz)
  const [questions, setQuestions] = useState<AdminQuizQuestion[]>(initialQuiz?.questions ?? [])
  const [editingQuiz, setEditingQuiz] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // ── Quiz edit form ──
  function handleUpdateQuiz(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!quiz) return
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateQuiz(quiz.id, lessonId, pathId, formData)
      if (result.ok) {
        setQuiz((prev) =>
          prev
            ? {
                ...prev,
                title: (formData.get('title') as string) ?? prev.title,
                passingScore: Number(formData.get('passing_score') ?? prev.passingScore),
              }
            : prev,
        )
        setEditingQuiz(false)
      } else {
        setError(result.error)
      }
    })
  }

  function handleDeleteQuiz() {
    if (!quiz) return
    startTransition(async () => {
      const result = await deleteQuiz(quiz.id, lessonId, pathId)
      if (result.ok) {
        setQuiz(null)
        setQuestions([])
      } else {
        setError(result.error)
      }
    })
  }

  if (!quiz) {
    return (
      <CreateQuizForm
        lessonId={lessonId}
        pathId={pathId}
        onCreated={(newQuiz) => {
          setQuiz(newQuiz)
          setQuestions([])
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Quiz header card */}
      <Card className="p-6">
        {editingQuiz ? (
          <form onSubmit={handleUpdateQuiz} className="space-y-4">
            <div>
              <label htmlFor="edit-quiz-title" className="mb-1 block text-sm font-medium">
                Título do quiz
              </label>
              <input
                id="edit-quiz-title"
                name="title"
                type="text"
                required
                defaultValue={quiz.title}
                className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              />
            </div>
            <div>
              <label htmlFor="edit-passing-score" className="mb-1 block text-sm font-medium">
                Nota mínima para aprovação (%)
              </label>
              <input
                id="edit-passing-score"
                name="passing_score"
                type="number"
                min={0}
                max={100}
                defaultValue={quiz.passingScore}
                required
                className="border-border bg-surface focus:border-brand focus:ring-brand w-32 rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              />
            </div>
            {error && (
              <p className="text-danger text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={isPending}>
                Salvar
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditingQuiz(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">{quiz.title}</h3>
              <p className="text-text-muted mt-0.5 text-sm">
                Nota mínima: <strong>{quiz.passingScore}%</strong> ·{' '}
                {questions.length} pergunta{questions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingQuiz(true)}
                aria-label="Editar quiz"
                className="text-text-muted hover:text-text rounded p-1.5 transition-colors"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <ConfirmDialog
                title="Excluir quiz"
                description="Excluir este quiz removerá todas as perguntas. Quizzes com tentativas de usuários não podem ser excluídos."
                confirmLabel="Excluir"
                onConfirm={handleDeleteQuiz}
                variant="danger"
              >
                <button
                  type="button"
                  aria-label="Excluir quiz"
                  className="text-text-muted hover:text-danger rounded p-1.5 transition-colors"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </ConfirmDialog>
            </div>
          </div>
        )}
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Perguntas</h3>

        {questions.length === 0 && !addingQuestion && (
          <p className="text-text-muted text-sm">Nenhuma pergunta ainda.</p>
        )}

        {questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            lessonId={lessonId}
            pathId={pathId}
            onUpdated={(updated) =>
              setQuestions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
            }
            onDeleted={(id) => setQuestions((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}

        {addingQuestion ? (
          <AddQuestionForm
            quizId={quiz.id}
            lessonId={lessonId}
            pathId={pathId}
            onCreated={(newQ) => {
              setQuestions((prev) => [...prev, newQ])
              setAddingQuestion(false)
            }}
            onCancel={() => setAddingQuestion(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingQuestion(true)}
            className="border-border bg-surface hover:bg-surface-muted flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm font-medium transition-colors"
          >
            <Plus className="size-4" aria-hidden />
            Adicionar pergunta
          </button>
        )}
      </div>
    </div>
  )
}
