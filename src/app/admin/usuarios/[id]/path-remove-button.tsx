'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { removePathFromUser } from '@/features/admin/users/actions'

interface Props {
  userId: string
  pathId: string
  pathTitle: string
}

export function PathRemoveButton({ userId, pathId, pathTitle }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await removePathFromUser(userId, pathId)
    })
  }

  return (
    <ConfirmDialog
      title="Remover atribuição"
      description={`Remover a atribuição individual de "${pathTitle}". O progresso do usuário será preservado.`}
      confirmLabel="Remover"
      onConfirm={handleConfirm}
      variant="danger"
    >
      <Button
        variant="danger"
        size="sm"
        loading={isPending}
        aria-label={`Remover atribuição de ${pathTitle}`}
      >
        Remover
      </Button>
    </ConfirmDialog>
  )
}
