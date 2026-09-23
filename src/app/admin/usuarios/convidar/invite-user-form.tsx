'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { inviteUser } from '@/features/admin/users/actions'
import type { AdminDepartment } from '@/features/admin/departments/queries'
import type { ActionResult } from '@/lib/action-result'

async function inviteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return inviteUser(formData)
}

interface Props {
  departments: AdminDepartment[]
}

export function InviteUserForm({ departments }: Props) {
  const router = useRouter()

  const [state, formAction, isPending] = useActionState(inviteAction, {
    ok: false,
    error: '',
  } as ActionResult)

  useEffect(() => {
    if (state.ok) {
      router.push('/admin/usuarios')
    }
  }, [state.ok, router])

  const emailError =
    !state.ok && state.error !== '' && state.fieldErrors?.email
      ? state.fieldErrors.email[0]
      : undefined
  const nameError =
    !state.ok && state.error !== '' && state.fieldErrors?.name
      ? state.fieldErrors.name[0]
      : undefined
  const roleError =
    !state.ok && state.error !== '' && state.fieldErrors?.role
      ? state.fieldErrors.role[0]
      : undefined
  const deptError =
    !state.ok && state.error !== '' && state.fieldErrors?.department_id
      ? state.fieldErrors.department_id[0]
      : undefined

  return (
    <form action={formAction} className="space-y-5">
      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          E-mail <span aria-hidden className="text-danger">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          aria-invalid={emailError !== undefined}
          aria-describedby={emailError !== undefined ? 'email-error' : undefined}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          placeholder="nome@empresa.com"
        />
        {emailError && (
          <p id="email-error" className="text-danger mt-1 text-xs" role="alert">
            {emailError}
          </p>
        )}
      </div>

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
          aria-invalid={nameError !== undefined}
          aria-describedby={nameError !== undefined ? 'name-error' : undefined}
          className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
          placeholder="Nome completo"
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
          defaultValue="member"
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
          defaultValue=""
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

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          Enviar convite
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
