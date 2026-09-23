import { describe, expect, it } from 'vitest'
import { GENERIC_ERROR_MESSAGE, fail, isOk, ok } from '@/lib/action-result'

describe('action-result', () => {
  it('ok() sem dados', () => {
    expect(ok()).toEqual({ ok: true, data: undefined })
  })

  it('ok(data) carrega os dados', () => {
    const result = ok({ id: 1 })
    expect(isOk(result)).toBe(true)
    expect(result.data).toEqual({ id: 1 })
  })

  it('fail() usa mensagem genérica por padrão', () => {
    expect(fail()).toEqual({ ok: false, error: GENERIC_ERROR_MESSAGE })
  })

  it('fail() inclui erros de campo apenas quando existem', () => {
    expect(fail('Dados inválidos.', {})).toEqual({ ok: false, error: 'Dados inválidos.' })
    expect(fail('Dados inválidos.', { email: ['Email inválido.'] })).toEqual({
      ok: false,
      error: 'Dados inválidos.',
      fieldErrors: { email: ['Email inválido.'] },
    })
  })
})
