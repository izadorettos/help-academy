/**
 * Demo — formato questionário (survey).
 *
 * Requer: `npm run demo:seed` e DEMO_USER_PASSWORD.
 */
import { expect, test } from '@playwright/test'
import { DEMO_LESSONS, DEMO_PASSWORD, loginAsDemo } from './demo-helpers'

test.describe('demo — formato: questionário', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes')
    await loginAsDemo(page)
  })

  test('caminho de erro — enviar sem campo obrigatório', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.survey}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Questionário enviado').first()
    if (await completed.isVisible().catch(() => false)) {
      test.skip(true, 'Questionário já enviado')
    }

    // Botão de envio desabilitado enquanto há obrigatórios pendentes.
    const submitBtn = page.getByRole('button', { name: 'Enviar respostas' })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
    await expect(submitBtn).toBeDisabled()

    await expect(
      page.getByText('Responda todas as perguntas obrigatórias para enviar.'),
    ).toBeVisible()
  })

  test('caminho feliz — preencher e enviar', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.survey}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Questionário enviado').first()
    if (await completed.isVisible().catch(() => false)) {
      await expect(completed).toBeVisible()
      return
    }

    // Q1 — scale 1..5 (obrigatório): clica no botão "5"
    await page
      .getByRole('radiogroup', { name: /Quão preparado/ })
      .getByRole('radio', { name: '5' })
      .click()

    // Q2 — single_choice (obrigatório): marca a primeira opção
    await page.getByRole('radio', { name: 'A história da Help' }).check()

    // Q3 — multiple_choice (opcional) — deixa vazio pra provar que "obrigatório" é o filtro

    // Q4 — yes_no (obrigatório): clica em "Sim"
    await page.getByRole('button', { name: 'Sim', exact: true }).click()

    // Q5 — nps 0..10 (obrigatório): clica no botão "10"
    await page
      .getByRole('radiogroup', { name: /De 0 a 10/ })
      .getByRole('radio', { name: '10' })
      .click()

    // Q6 — short_text (obrigatório)
    await page
      .locator('input[type="text"]')
      .first()
      .fill('Entrega em até 45 minutos com prova por QR.')

    // Q7 — long_text (opcional) — deixa vazio

    const submitBtn = page.getByRole('button', { name: 'Enviar respostas' })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
    await submitBtn.click()

    await expect(page.getByText('Questionário enviado')).toBeVisible({ timeout: 12_000 })
  })

  test('segundo envio retorna confirmação sem duplicar', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.survey}`)
    await page.waitForLoadState('domcontentloaded')

    // Como a primeira execução deste describe já enviou (ou este spec é rodado
    // após o caminho feliz), o chip de conclusão precisa estar presente e não
    // deve haver botão de envio nem estado de edição.
    await expect(page.getByText('Questionário enviado')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Enviar respostas' })).toHaveCount(0)
  })
})
