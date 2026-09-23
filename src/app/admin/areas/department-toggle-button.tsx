'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toggleDepartmentActive } from '@/features/admin/departments/actions'

interface DepartmentToggleButtonProps {
  id: string
  name: string
  active: boolean
}

export function DepartmentToggleButton({ id, name, active }: DepartmentToggleButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await toggleDepartmentActive(id)
    })
  }

  const label = active ? 'Desativar' : 'Ativar'
  const description = active
    ? `Desativar "${name}" impedirá novos acessos de usuários desta área. Usuários já associados mantêm seus dados.`
    : `Ativar "${name}" permitirá que usuários desta área acessem novamente a plataforma.`

  return (
    <ConfirmDialog
      title={`${label} área`}
      description={description}
      confirmLabel={label}
      onConfirm={handleConfirm}
      variant={active ? 'danger' : 'primary'}
    >
      <Button
        variant={active ? 'secondary' : 'primary'}
        size="sm"
        loading={isPending}
        aria-label={`${label} área ${name}`}
      >
        {label}
      </Button>
    </ConfirmDialog>
  )
}
