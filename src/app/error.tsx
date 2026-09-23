'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { ErrorState } from '@/components/ui/error-state'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Error]', error.digest ?? error.message)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-md">
        <ErrorState reset={reset} />
        <div className="mt-4 text-center">
          <Link href="/" className="text-brand text-sm hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  )
}
