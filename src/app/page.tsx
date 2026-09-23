// Página provisória da fase 1. Na fase 5 passa a redirecionar para /dashboard ou /login.
export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="border-border bg-surface shadow-card w-full max-w-md rounded-lg border p-8 text-center">
        <p className="text-brand text-sm font-medium tracking-wide uppercase">Help Entregas</p>
        <h1 className="text-display mt-2 font-bold">Help Academy</h1>
        <p className="text-text-muted mt-3">
          Plataforma de onboarding e treinamento. Em construção.
        </p>
      </div>
    </main>
  )
}
