/**
 * Formato de retorno padrão de todas as Server Actions.
 * Nunca retornar detalhes internos (mensagens do Postgres, stack) ao cliente.
 */
export type FieldErrors = Record<string, string[]>

export type ActionSuccess<T> = { ok: true; data: T }
export type ActionFailure = { ok: false; error: string; fieldErrors?: FieldErrors }
export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure

export const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir. Tente novamente.'

export function ok(): ActionSuccess<void>
export function ok<T>(data: T): ActionSuccess<T>
export function ok<T>(data?: T): ActionSuccess<T | undefined> {
  return { ok: true, data }
}

export function fail(error: string = GENERIC_ERROR_MESSAGE, fieldErrors?: FieldErrors): ActionFailure {
  return fieldErrors && Object.keys(fieldErrors).length > 0
    ? { ok: false, error, fieldErrors }
    : { ok: false, error }
}

export function isOk<T>(result: ActionResult<T>): result is ActionSuccess<T> {
  return result.ok
}
