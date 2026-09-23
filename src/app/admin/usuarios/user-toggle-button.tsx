'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toggleUserActive } from '@/features/admin/users/actions'

interface UserToggleButtonProps {
  id: string
  name: string
  active: boolean
}

export function UserToggleButton({ id, name, active }: UserToggleButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await toggleUserActive(id)
    })
  }

  const label = active ? 'Desativar' : 'Ativar'
  const description = active
    ? `Desativar "${name}" impedirá que o usuário acesse a plataforma. Os dados e progresso serão preservados.`
    : `Ativar "${name}" permitirá que o usuário acesse novamente a plataforma.`

  return (
    <ConfirmDialog
      title={`${label} usuário`}
      description={description}
      confirmLabel={label}
      onConfirm={handleConfirm}
      variant={active ? 'danger' : 'primary'}
    >
      <Button
        variant={active ? 'secondary' : 'primary'}
        size="sm"
        loading={isPending}
        aria-label={`${label} usuário ${name}`}
      >
        {label}
      </Button>
    </ConfirmDialog>
  )
}
