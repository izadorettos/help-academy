'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { updateLevel } from '@/features/admin/settings/actions'
import type { Level } from '@/features/admin/settings/queries'
import type { ActionResult } from '@/lib/action-result'

async function levelAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return updateLevel(formData)
}

const INITIAL_STATE: ActionResult = { ok: false, error: '' }

interface LevelRowProps {
  level: Level
  isEditing: boolean
  onEditToggle: () => void
  onSaved: () => void
}

function LevelRow({ level, isEditing, onEditToggle, onSaved }: LevelRowProps) {
  const [state, formAction, isPending] = useActionState(levelAction, INITIAL_STATE)

  // Notify parent on success
  if (state.ok) {
    onSaved()
  }

  const nameError = !state.ok && state.fieldErrors?.name ? state.fieldErrors.name[0] : undefined
  const minXpError =
    !state.ok && state.fieldErrors?.min_xp ? state.fieldErrors.min_xp[0] : undefined

  if (!isEditing) {
    return (
      <tr className="border-border border-b last:border-0">
        <td className="px-4 py-3 text-sm font-medium">{level.level}</td>
        <td className="px-4 py-3 text-sm">{level.name ?? <span className="text-text-muted">—</span>}</td>
        <td className="px-4 py-3 text-sm tabular-nums">{level.minXp.toLocaleString('pt-BR')}</td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onEditToggle}
            className="text-brand hover:text-brand-hover text-sm font-medium underline-offset-2 hover:underline"
          >
            Editar
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-border bg-surface-muted border-b last:border-0">
      <td className="px-4 py-3 text-sm font-medium">{level.level}</td>
      <td colSpan={3} className="px-4 py-3">
        <form action={formAction} className="flex flex-wrap items-start gap-3">
          <input type="hidden" name="level" value={level.level} />

          {/* Name field */}
          <div className="min-w-0 flex-1">
            <label htmlFor={`name-${level.level}`} className="mb-1 block text-xs font-medium">
              Nome
            </label>
            <input
              id={`name-${level.level}`}
              name="name"
              type="text"
              maxLength={60}
              defaultValue={level.name ?? ''}
              aria-invalid={nameError !== undefined}
              aria-describedby={nameError !== undefined ? `name-error-${level.level}` : undefined}
              className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
              placeholder="Ex.: Iniciante"
            />
            {nameError && (
              <p id={`name-error-${level.level}`} className="text-danger mt-0.5 text-xs" role="alert">
                {nameError}
              </p>
            )}
          </div>

          {/* Min XP field */}
          <div className="w-32 shrink-0">
            <label htmlFor={`min_xp-${level.level}`} className="mb-1 block text-xs font-medium">
              XP mínimo
            </label>
            <input
              id={`min_xp-${level.level}`}
              name="min_xp"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={level.minXp}
              disabled={level.level === 1}
              aria-invalid={minXpError !== undefined}
              aria-describedby={minXpError !== undefined ? `min_xp-error-${level.level}` : undefined}
              className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {level.level === 1 && (
              <p className="text-text-muted mt-0.5 text-xs">Sempre 0</p>
            )}
            {minXpError && (
              <p id={`min_xp-error-${level.level}`} className="text-danger mt-0.5 text-xs" role="alert">
                {minXpError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-end gap-2 pb-px pt-5">
            <Button type="submit" size="sm" loading={isPending}>
              Salvar
            </Button>
            <button
              type="button"
              onClick={onEditToggle}
              className="border-border bg-surface text-text hover:bg-surface-muted inline-flex min-h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>

          {!state.ok && state.error !== '' && !state.fieldErrors && (
            <p className="text-danger w-full text-xs" role="alert">
              {state.error}
            </p>
          )}
        </form>
      </td>
    </tr>
  )
}

interface Props {
  levels: Level[]
}

export function LevelsTable({ levels }: Props) {
  const [editingLevel, setEditingLevel] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-border border-b">
            <th className="text-text-muted px-4 pb-3 text-xs font-medium uppercase tracking-wide">
              Nível
            </th>
            <th className="text-text-muted px-4 pb-3 text-xs font-medium uppercase tracking-wide">
              Nome
            </th>
            <th className="text-text-muted px-4 pb-3 text-xs font-medium uppercase tracking-wide">
              XP mínimo
            </th>
            <th className="px-4 pb-3" />
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => (
            <LevelRow
              key={level.level}
              level={level}
              isEditing={editingLevel === level.level}
              onEditToggle={() =>
                setEditingLevel((prev) => (prev === level.level ? null : level.level))
              }
              onSaved={() => setEditingLevel(null)}
            />
          ))}
        </tbody>
      </table>
      {levels.length === 0 && (
        <p className="text-text-muted py-8 text-center text-sm">Nenhum nível cadastrado.</p>
      )}
    </div>
  )
}
