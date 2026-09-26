'use client'

import { useTransition } from 'react'
import { toggleTutorialFeatured } from '@/features/help/actions'

interface ToggleFeaturedButtonProps {
  id: string
  isFeatured: boolean
}

export function ToggleFeaturedButton({ id, isFeatured }: ToggleFeaturedButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await toggleTutorialFeatured(id)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded px-2 py-0.5 text-[0.6875rem] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        isFeatured
          ? 'bg-brand-soft text-brand-text'
          : 'text-text-subtle hover:text-text-muted'
      } disabled:opacity-50`}
    >
      {isFeatured ? '★ Destaque' : '☆ Destaque'}
    </button>
  )
}
