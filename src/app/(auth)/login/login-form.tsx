'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { signIn, type SignInState } from '@/features/auth/actions'
import type { AuthCapabilities } from '@/lib/auth'

interface LoginFormProps {
  capabilities: AuthCapabilities
}

export function LoginForm({ capabilities }: LoginFormProps) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, null)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && (
        <p
          role="alert"
          className="bg-status-danger-chip-bg text-status-danger-chip-fg rounded-lg px-4 py-3 text-sm"
        >
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
          className="border-border bg-surface text-text focus:border-focus rounded-lg border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-focus/20"
          placeholder="seu.login"
        />
      </div>

      {capabilities.passwordLogin && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            {capabilities.passwordReset && (
              <Link href="/recuperar-senha" className="text-brand-text text-sm hover:underline">
                Esqueceu a senha?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="border-border bg-surface text-text focus:border-focus rounded-lg border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-focus/20"
            placeholder="••••••••"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-on-brand hover:bg-brand-hover mt-2 flex min-h-11 items-center justify-center rounded-full px-5 font-medium transition-colors disabled:opacity-60"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
