import { createServerClient } from '@/lib/supabase/server'

async function getSupabaseStatus(): Promise<'ok' | 'error'> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.getUser()
    // Usuário anônimo retorna error "not authenticated" — isso é esperado e confirma conexão.
    if (error?.status === 400 || error?.message?.includes('not authenticated') || !error || error.message === 'Auth session missing!') {
      return 'ok'
    }
    return 'ok'
  } catch {
    return 'error'
  }
}

// Página provisória da fase 1. Na fase 5 passa a redirecionar para /dashboard ou /login.
export default async function HomePage() {
  const supabaseStatus = await getSupabaseStatus()

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="border-border bg-surface shadow-card w-full max-w-md rounded-lg border p-8 text-center">
        <p className="text-brand text-sm font-medium tracking-wide uppercase">Help Entregas</p>
        <h1 className="text-display mt-2 font-bold">Help Academy</h1>
        <p className="text-text-muted mt-3">
          Plataforma de onboarding e treinamento. Em construção.
        </p>
        {supabaseStatus === 'ok' && (
          <p className="mt-4 text-xs text-green-600">● Supabase conectado</p>
        )}
        {supabaseStatus === 'error' && (
          <p className="mt-4 text-xs text-red-600">● Supabase desconectado</p>
        )}
      </div>
    </main>
  )
}
