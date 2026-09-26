'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteTutorial } from '@/features/help/actions'

interface DeleteTutorialButtonProps {
  id: string
  title: string
}

export function DeleteTutorialButton({ id, title }: DeleteTutorialButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTutorial(id)
      if (result.ok) {
        router.push('/admin/tutoriais')
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm">
        <p className="text-text">Excluir <strong>{title}</strong>?</p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded px-3 py-1 bg-danger text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Excluindo…' : 'Confirmar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded px-3 py-1 border border-border text-xs font-medium text-text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <Trash2 className="size-4" aria-hidden />
      Excluir
    </button>
  )
}
