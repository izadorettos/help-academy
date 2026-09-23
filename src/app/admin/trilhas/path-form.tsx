'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createPath, updatePath } from '@/features/admin/paths/actions'
import { generateSlug } from '@/features/admin/paths/schemas'
import type { AdminPathDetail } from '@/features/admin/paths/queries'
import type { AdminDepartment } from '@/features/admin/departments/queries'
import type { ActionResult } from '@/lib/action-result'

// ─── Action wrappers ──────────────────────────────────────────────────────────

async function createAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return createPath(formData)
}

function makeUpdateAction(id: string) {
  return async function updateAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    return updatePath(id, formData)
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props =
  | { mode: 'create'; path?: never; departments: AdminDepartment[] }
  | { mode: 'edit'; path: AdminPathDetail; departments: AdminDepartment[] }

// ─── Component ────────────────────────────────────────────────────────────────

export function PathForm({ mode, path, departments }: Props) {
  const router = useRouter()
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [slugValue, setSlugValue] = useState(path?.slug ?? '')

  const initialCreateState: ActionResult<{ id: string }> = { ok: false, error: '' }
  const initialUpdateState: ActionResult = { ok: false, error: '' }

  const [createState, createFormAction, isCreatePending] = useActionState(
    createAction,
    initialCreateState,
  )
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    makeUpdateAction(path?.id ?? ''),
    initialUpdateState,
  )

  const state = mode === 'create' ? createState : updateState
  const formAction = mode === 'create' ? createFormAction : updateFormAction
  const isPending = mode === 'create' ? isCreatePending : isUpdatePending

  useEffect(() => {
    if (state.ok) {
      if (mode === 'create' && 'data' in state && state.data) {
        router.push(`/admin/trilhas/${state.data.id}`)
      } else {
        router.push(`/admin/trilhas/${path?.id}`)
      }
    }
  }, [state.ok, mode, router, path?.id, state])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugTouched) {
      setSlugValue(generateSlug(e.target.value))
    }
  }

  const fieldError = (field: string) => {
    if (!state.ok && state.error !== '' && state.fieldErrors?.[field]) {
      return state.fieldErrors[field][0]
    }
    return undefined
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
          Título <span aria-hidden className="text-danger">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          defaultValue={path?.title ?? ''}
          onChange={handleTitleChange}
          aria-invalid={fieldError('title') !== undefined}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          placeholder="Ex.: Onboarding Geral"
        />
        {fieldError('title') && (
          <p className="text-danger mt-1 text-xs" role="alert">
            {fieldError('title')}
          </p>
        )}
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="mb-1.5 block text-sm font-medium">
          Slug (URL) <span aria-hidden className="text-danger">*</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          minLength={2}
          maxLength={120}
          value={slugValue}
          onChange={(e) => {
            setSlugTouched(true)
            setSlugValue(e.target.value)
          }}
          aria-invalid={fieldError('slug') !== undefined}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus:ring-1"
          placeholder="onboarding-geral"
        />
        <p className="text-text-subtle mt-1 text-xs">
          Apenas letras minúsculas, números e hífens. Preenchido automaticamente a partir do título.
        </p>
        {fieldError('slug') && (
          <p className="text-danger mt-1 text-xs" role="alert">
            {fieldError('slug')}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={path?.description ?? ''}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          placeholder="Descreva o objetivo desta trilha..."
        />
      </div>

      {/* Owner department */}
      <div>
        <label htmlFor="owner_department_id" className="mb-1.5 block text-sm font-medium">
          Área responsável
        </label>
        <select
          id="owner_department_id"
          name="owner_department_id"
          defaultValue={path?.ownerDepartmentId ?? ''}
          className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        >
          <option value="">Sem área responsável</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Required */}
      <div className="flex items-start gap-3">
        <input
          id="required-checkbox"
          name="required"
          type="checkbox"
          value="true"
          defaultChecked={path?.required ?? false}
          className="border-border mt-0.5 size-4 rounded"
        />
        <div>
          <label htmlFor="required-checkbox" className="text-sm font-medium">
            Trilha obrigatória
          </label>
          <p className="text-text-subtle text-xs">
            Usuários das áreas atribuídas verão esta trilha como obrigatória.
          </p>
        </div>
      </div>

      {/* Sequential */}
      <div className="flex items-start gap-3">
        <input
          id="sequential-checkbox"
          name="sequential"
          type="checkbox"
          value="true"
          defaultChecked={path?.sequential ?? false}
          className="border-border mt-0.5 size-4 rounded"
        />
        <div>
          <label htmlFor="sequential-checkbox" className="text-sm font-medium">
            Trilha sequencial
          </label>
          <p className="text-text-subtle text-xs">
            Usuários precisam concluir as aulas anteriores antes de acessar as próximas.
          </p>
        </div>
      </div>

      {!state.ok && state.error !== '' && !state.fieldErrors && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          {mode === 'create' ? 'Criar trilha' : 'Salvar alterações'}
        </Button>
        <Link
          href={mode === 'create' ? '/admin/trilhas' : `/admin/trilhas/${path?.id}`}
          className="border-border bg-surface text-text hover:bg-surface-muted inline-flex min-h-11 items-center gap-2 rounded-md border px-5 text-base font-medium transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
