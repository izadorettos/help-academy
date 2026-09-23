// Página provisória da fase 1. Na fase 5 passa a redirecionar para /dashboard ou /login.
export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-medium tracking-wide text-brand uppercase">Help Entregas</p>
        <h1 className="mt-2 text-display font-bold">Help Academy</h1>
        <p className="mt-3 text-text-muted">
          Plataforma de onboarding e treinamento. Em construção.
        </p>
      </div>
    </main>
  )
}
