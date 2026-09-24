/**
 * Demo — formato tarefa.
 *
 * Requer: `npm run demo:seed` e DEMO_USER_PASSWORD.
 */
import { expect, test } from '@playwright/test'
import { DEMO_LESSONS, DEMO_PASSWORD, loginAsDemo } from './demo-helpers'

test.describe('demo — formato: tarefa', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes')
    await loginAsDemo(page)
  })

  test('caminho de erro — botão desabilitado sem itens obrigatórios', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.task}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Tarefa concluída').first()
    if (await completed.isVisible().catch(() => false)) {
      test.skip(true, 'Tarefa já concluída')
    }

    const submitBtn = page.getByRole('button', { name: /Enviar tarefa|Concluir atividade/i })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
    await expect(submitBtn).toBeDisabled()

    await expect(
      page.getByText('Marque todos os passos obrigatórios para enviar.'),
    ).toBeVisible()
  })

  test('caminho feliz — marcar itens e enviar', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.task}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Tarefa concluída').first()
    if (await completed.isVisible().catch(() => false)) {
      // Já concluída — apenas valida presença do chip
      await expect(completed).toBeVisible()
      return
    }

    // Marca todos os checkboxes obrigatórios (3 itens)
    const checkboxes = page.locator('fieldset input[type="checkbox"]')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check()
    }

    const submitBtn = page.getByRole('button', { name: /Enviar tarefa|Concluir atividade/i })
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    await expect(page.getByText('Tarefa concluída')).toBeVisible({ timeout: 12_000 })
  })
})
