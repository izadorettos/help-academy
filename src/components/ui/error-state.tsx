'use client'
import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  reset?: () => void
}

export function ErrorState({
  title = 'Algo deu errado',
  description = 'Não foi possível carregar este conteúdo.',
  reset,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <AlertCircle className="text-danger size-12" aria-hidden />
      <p className="text-h3 font-semibold">{title}</p>
      <p className="text-text-muted max-w-xs text-sm">{description}</p>
      {reset && (
        <button
          onClick={reset}
          className="bg-brand text-on-brand hover:bg-brand-hover mt-2 inline-flex min-h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
