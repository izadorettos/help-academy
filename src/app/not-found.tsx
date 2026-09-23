import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="border-border bg-surface shadow-card w-full max-w-md rounded-lg border p-8 text-center">
        <p className="text-text-subtle text-sm font-medium">Erro 404</p>
        <h1 className="text-h1 mt-2 font-bold">Página não encontrada</h1>
        <p className="text-text-muted mt-3">
          O endereço pode estar incorreto ou você não tem acesso a este conteúdo.
        </p>
        <Link
          href="/"
          className="bg-brand text-on-brand hover:bg-brand-hover mt-6 inline-flex min-h-11 items-center justify-center rounded-md px-5 font-medium transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
