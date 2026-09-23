'use client'
import { useActionState } from 'react'
import { updatePassword, type ResetPasswordState } from '@/features/auth/actions'

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    updatePassword,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && (
        <p role="alert" className="bg-danger-soft text-danger rounded-md px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="border-border bg-surface text-text focus:border-focus rounded-md border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-focus/20"
          placeholder="Mínimo 8 caracteres"
        />
        <p className="text-text-subtle text-xs">
          Mínimo 8 caracteres com letras maiúsculas, minúsculas e números.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-on-brand hover:bg-brand-hover mt-2 flex min-h-11 items-center justify-center rounded-md px-5 font-medium transition-colors disabled:opacity-60"
      >
        {pending ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
