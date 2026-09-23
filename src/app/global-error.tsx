'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error.digest ?? error.message)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="bg-bg flex min-h-dvh items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xl font-bold">Algo deu errado.</p>
          <p className="text-text-muted text-sm">Recarregue a página ou tente novamente.</p>
          <button
            onClick={reset}
            className="bg-brand text-on-brand hover:bg-brand-hover rounded-md px-5 py-2.5 font-medium"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
