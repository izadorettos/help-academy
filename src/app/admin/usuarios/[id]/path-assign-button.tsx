'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { assignPathToUser } from '@/features/admin/users/actions'
import { Plus } from 'lucide-react'

interface Props {
  userId: string
  availablePaths: { id: string; title: string }[]
}

export function PathAssignButton({ userId, availablePaths }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedPathId, setSelectedPathId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!selectedPathId) {
      setError('Selecione uma trilha.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await assignPathToUser(userId, selectedPathId)
      if (result.ok) {
        setOpen(false)
        setSelectedPathId('')
      } else {
        setError(result.error)
      }
    })
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        Atribuir trilha
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectedPathId}
        onChange={(e) => setSelectedPathId(e.target.value)}
        aria-label="Selecionar trilha para atribuir"
        className="border-border bg-surface focus:border-brand focus:ring-brand rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
      >
        <option value="">Selecione uma trilha…</option>
        {availablePaths.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-danger text-xs" role="alert">
          {error}
        </span>
      )}
      <Button
        type="button"
        size="sm"
        loading={isPending}
        onClick={handleSubmit}
      >
        Atribuir
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(false)
          setSelectedPathId('')
          setError(null)
        }}
      >
        Cancelar
      </Button>
    </div>
  )
}
