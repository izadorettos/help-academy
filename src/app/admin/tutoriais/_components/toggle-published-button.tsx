'use client'

import { useTransition } from 'react'
import { toggleTutorialPublished } from '@/features/help/actions'

interface TogglePublishedButtonProps {
  id: string
  isPublished: boolean
}

export function TogglePublishedButton({ id, isPublished }: TogglePublishedButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await toggleTutorialPublished(id)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded px-2 py-0.5 text-[0.6875rem] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        isPublished
          ? 'bg-success/15 text-success hover:bg-danger/15 hover:text-danger'
          : 'bg-surface-muted text-text-muted hover:bg-brand-soft hover:text-brand'
      } disabled:opacity-50`}
    >
      {isPublished ? 'Publicado' : 'Rascunho'}
    </button>
  )
}
