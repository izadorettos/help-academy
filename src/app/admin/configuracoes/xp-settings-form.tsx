'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { updateGamificationSettings } from '@/features/admin/settings/actions'
import type { GamificationSetting } from '@/features/admin/settings/queries'
import type { ActionResult } from '@/lib/action-result'

const XP_KEYS_ORDER = [
  'xp_lesson_default',
  'xp_quiz_default',
  'xp_quiz_perfect_bonus',
  'xp_module_completed',
  'xp_path_completed',
] as const

type XpKey = (typeof XP_KEYS_ORDER)[number]

const XP_LABELS: Record<XpKey, string> = {
  xp_lesson_default: 'XP por aula concluída',
  xp_quiz_default: 'XP por quiz aprovado',
  xp_quiz_perfect_bonus: 'Bônus por quiz 100%',
  xp_module_completed: 'XP por módulo concluído',
  xp_path_completed: 'XP por trilha concluída',
}

async function settingsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return updateGamificationSettings(formData)
}

const INITIAL_STATE: ActionResult = { ok: false, error: '' }

interface Props {
  settings: GamificationSetting[]
}

export function XpSettingsForm({ settings }: Props) {
  const [state, formAction, isPending] = useActionState(settingsAction, INITIAL_STATE)

  const settingsByKey = Object.fromEntries(settings.map((s) => [s.key, s]))

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {XP_KEYS_ORDER.map((key) => {
          const setting = settingsByKey[key]
          const fieldError =
            !state.ok && state.fieldErrors?.[key] ? state.fieldErrors[key][0] : undefined

          return (
            <div key={key}>
              <label htmlFor={key} className="mb-1.5 block text-sm font-medium">
                {XP_LABELS[key]}
              </label>
              {setting?.description && (
                <p className="text-text-muted mb-1.5 text-xs">{setting.description}</p>
              )}
              <input
                id={key}
                name={key}
                type="number"
                min={0}
                step={1}
                required
                defaultValue={setting?.value ?? 0}
                aria-invalid={fieldError !== undefined}
                aria-describedby={fieldError !== undefined ? `${key}-error` : undefined}
                className="border-border bg-surface placeholder:text-text-subtle focus:border-brand focus:ring-brand w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              />
              {fieldError && (
                <p id={`${key}-error`} className="text-danger mt-1 text-xs" role="alert">
                  {fieldError}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {state.ok && (
        <p className="text-success text-sm font-medium" role="status">
          Configurações salvas com sucesso.
        </p>
      )}

      {!state.ok && state.error !== '' && !state.fieldErrors && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={isPending}>
        Salvar configurações
      </Button>
    </form>
  )
}
