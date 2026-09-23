'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createDepartment, updateDepartment } from '@/features/admin/departments/actions'
import type { AdminDepartment } from '@/features/admin/departments/queries'
import type { ActionResult } from '@/lib/action-result'

// ─── Create wrapper ───────────────────────────────────────────────────────────

async function createAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return createDepartment(formData)
}

// ─── Edit wrapper ─────────────────────────────────────────────────────────────

function makeUpdateAction(id: string) {
  return async function updateAction(
    _prev: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    return updateDepartment(id, formData)
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props =
  | { mode: 'create'; department?: never }
  | { mode: 'edit'; department: AdminDepartment }

// ─── Component ────────────────────────────────────────────────────────────────

export function DepartmentForm({ mode, department }: Props) {
  const router = useRouter()

  const initialCreateState: ActionResult<{ id: string }> = { ok: false, error: '' }
  const initialUpdateState: ActionResult = { ok: false, error: '' }

  const [createState, createFormAction, isCreatePending] = useActionState(
    createAction,
    initialCreateState,
  )

  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    makeUpdateAction(department?.id ?? ''),
    initialUpdateState,
  )

  const state = mode === 'create' ? createState : updateState
  const formAction = mode === 'create' ? createFormAction : updateFormAction
  const isPending = mode === 'create' ? isCreatePending : isUpdatePending

  // Redirect to list on success
  useEffect(() => {
    if (state.ok) {
      router.push('/admin/areas')
    }
  }, [state.ok, router])

  const nameError =
    !state.ok && state.error !== '' && state.fieldErrors?.name
      ? state.fieldErrors.name[0]
      : undefined

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
          Nome da área <span aria-hidden className="text-danger">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={60}
          defaultValue={department?.name ?? ''}
          aria-invalid={nameError !== undefined}
          aria-describedby={nameError !== undefined ? 'name-error' : undefined}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          placeholder="Ex.: Suporte ao Cliente"
        />
        {nameError && (
          <p id="name-error" className="text-danger mt-1 text-xs" role="alert">
            {nameError}
          </p>
        )}
      </div>

      {!state.ok && state.error !== '' && !state.fieldErrors && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          {mode === 'create' ? 'Criar área' : 'Salvar alterações'}
        </Button>
        <Link
          href="/admin/areas"
          className="border-border bg-surface text-text hover:bg-surface-muted inline-flex min-h-11 items-center gap-2 rounded-md border px-5 text-base font-medium transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
