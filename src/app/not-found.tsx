import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-medium text-text-subtle">Erro 404</p>
        <h1 className="mt-2 text-h1 font-bold">Página não encontrada</h1>
        <p className="mt-3 text-text-muted">
          O endereço pode estar incorreto ou você não tem acesso a este conteúdo.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 font-medium text-on-brand transition-colors hover:bg-brand-hover"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
