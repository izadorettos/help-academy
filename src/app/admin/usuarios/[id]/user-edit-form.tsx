'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { updateUser } from '@/features/admin/users/actions'
import type { AdminUserDetail } from '@/features/admin/users/queries'
import type { AdminDepartment } from '@/features/admin/departments/queries'
import type { ActionResult } from '@/lib/action-result'

// ─── Wrapper to bind id ───────────────────────────────────────────────────────

function makeUpdateAction(id: string) {
  return async function (_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    return updateUser(id, formData)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  user: AdminUserDetail
  departments: AdminDepartment[]
}

export function UserEditForm({ user, departments }: Props) {
  const router = useRouter()

  const [state, formAction, isPending] = useActionState(
    makeUpdateAction(user.id),
    { ok: false, error: '' } as ActionResult,
  )

  useEffect(() => {
    if (state.ok) {
      router.refresh()
    }
  }, [state.ok, router])

  const nameError =
    !state.ok && state.error !== '' && state.fieldErrors?.name ? state.fieldErrors.name[0] : undefined
  const roleError =
    !state.ok && state.error !== '' && state.fieldErrors?.role ? state.fieldErrors.role[0] : undefined
  const deptError =
    !state.ok && state.error !== '' && state.fieldErrors?.department_id
      ? state.fieldErrors.department_id[0]
      : undefined

  return (
    <form action={formAction} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
          Nome <span aria-hidden className="text-danger">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={user.name}
          aria-invalid={nameError !== undefined}
          aria-describedby={nameError !== undefined ? 'name-error' : undefined}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        />
        {nameError && (
          <p id="name-error" className="text-danger mt-1 text-xs" role="alert">
            {nameError}
          </p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className="mb-1.5 block text-sm font-medium">
          Perfil <span aria-hidden className="text-danger">*</span>
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue={user.role}
          aria-invalid={roleError !== undefined}
          aria-describedby={roleError !== undefined ? 'role-error' : undefined}
          className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        >
          <option value="member">Membro</option>
          <option value="admin">Admin</option>
        </select>
        {roleError && (
          <p id="role-error" className="text-danger mt-1 text-xs" role="alert">
            {roleError}
          </p>
        )}
      </div>

      {/* Department */}
      <div>
        <label htmlFor="department_id" className="mb-1.5 block text-sm font-medium">
          Área
        </label>
        <select
          id="department_id"
          name="department_id"
          defaultValue={user.departmentId ?? ''}
          aria-invalid={deptError !== undefined}
          aria-describedby={deptError !== undefined ? 'dept-error' : undefined}
          className="border-border bg-surface focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
        >
          <option value="">Sem área</option>
          {departments
            .filter((d) => d.active)
            .map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
        </select>
        {deptError && (
          <p id="dept-error" className="text-danger mt-1 text-xs" role="alert">
            {deptError}
          </p>
        )}
      </div>

      {/* Global error */}
      {!state.ok && state.error !== '' && !state.fieldErrors && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      {/* Success feedback */}
      {state.ok && (
        <p className="text-success text-sm" role="status">
          Alterações salvas com sucesso.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          Salvar alterações
        </Button>
        <Link
          href="/admin/usuarios"
          className="border-border bg-surface text-text hover:bg-surface-muted inline-flex min-h-11 items-center gap-2 rounded-md border px-5 text-base font-medium transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
