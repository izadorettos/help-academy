'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, type RecoverState } from '@/features/auth/actions'

export function RecoverForm() {
  const [state, action, pending] = useActionState<RecoverState, FormData>(
    requestPasswordReset,
    null,
  )

  if (state?.sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-success font-medium">Link enviado!</p>
        <p className="text-text-muted text-sm">
          Verifique sua caixa de entrada e clique no link de recuperação.
        </p>
        <Link href="/login" className="text-brand text-sm hover:underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && (
        <p role="alert" className="bg-danger-soft text-danger rounded-md px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login" className="text-sm font-medium">
          Login
        </label>
        <input
          id="login"
          name="login"
          type="text"
          required
          autoComplete="username"
          className="border-border bg-surface text-text focus:border-focus rounded-md border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-focus/20"
          placeholder="seu.login"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-on-brand hover:bg-brand-hover mt-2 flex min-h-11 items-center justify-center rounded-md px-5 font-medium transition-colors disabled:opacity-60"
      >
        {pending ? 'Enviando…' : 'Enviar link de recuperação'}
      </button>

      <Link
        href="/login"
        className="text-text-muted mt-1 text-center text-sm hover:text-text hover:underline"
      >
        Voltar ao login
      </Link>
    </form>
  )
}
