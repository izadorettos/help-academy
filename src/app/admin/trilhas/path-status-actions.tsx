'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  publishPath,
  unpublishPath,
  archivePath,
  duplicatePath,
} from '@/features/admin/paths/actions'

interface PathStatusActionsProps {
  id: string
  title: string
  status: 'draft' | 'published' | 'archived'
  showDuplicate?: boolean
}

export function PathStatusActions({
  id,
  title,
  status,
  showDuplicate,
}: PathStatusActionsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handlePublish() {
    startTransition(async () => {
      const result = await publishPath(id)
      if (!result.ok) {
        alert(result.error)
      }
    })
  }

  function handleUnpublish() {
    startTransition(async () => {
      await unpublishPath(id)
    })
  }

  function handleArchive() {
    startTransition(async () => {
      await archivePath(id)
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicatePath(id)
      if (result.ok) {
        router.push(`/admin/trilhas/${result.data.id}`)
      } else {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'draft' && (
        <ConfirmDialog
          title="Publicar trilha"
          description={`Publicar "${title}" tornará a trilha visível para os usuários das áreas atribuídas. A trilha precisa ter pelo menos 1 aula publicada.`}
          confirmLabel="Publicar"
          onConfirm={handlePublish}
          variant="primary"
        >
          <Button variant="primary" size="sm" loading={isPending}>
            Publicar
          </Button>
        </ConfirmDialog>
      )}

      {status === 'published' && (
        <ConfirmDialog
          title="Despublicar trilha"
          description={`Despublicar "${title}" tornará a trilha invisível para os usuários. O progresso existente é preservado.`}
          confirmLabel="Despublicar"
          onConfirm={handleUnpublish}
          variant="danger"
        >
          <Button variant="secondary" size="sm" loading={isPending}>
            Despublicar
          </Button>
        </ConfirmDialog>
      )}

      {status !== 'archived' && (
        <ConfirmDialog
          title="Arquivar trilha"
          description={`Arquivar "${title}" removerá a trilha da lista de ativas. Esta ação pode ser revertida pelo suporte.`}
          confirmLabel="Arquivar"
          onConfirm={handleArchive}
          variant="danger"
        >
          <Button variant="ghost" size="sm" loading={isPending}>
            Arquivar
          </Button>
        </ConfirmDialog>
      )}

      {showDuplicate && (
        <Button variant="ghost" size="sm" loading={isPending} onClick={handleDuplicate}>
          Duplicar
        </Button>
      )}
    </div>
  )
}
