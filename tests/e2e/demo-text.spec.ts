/**
 * Demo — formato texto.
 *
 * Requer: `npm run demo:seed` e DEMO_USER_PASSWORD.
 */
import { expect, test } from '@playwright/test'
import { DEMO_LESSONS, DEMO_PASSWORD, loginAsDemo } from './demo-helpers'

test.describe('demo — formato: texto', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes')
    await loginAsDemo(page)
  })

  test('conteúdo markdown é renderizado na página', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.text}`)
    await page.waitForLoadState('domcontentloaded')

    // Título da aula visível
    await expect(
      page.getByRole('heading', { name: /Como a gente fala/i }),
    ).toBeVisible({ timeout: 10_000 })

    // Conteúdo markdown renderizado (cabeçalho de seção)
    await expect(page.getByText('O eixo não muda')).toBeVisible()
  })

  test('botão concluir aula marca aula como concluída', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.text}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Aula concluída').first()
    if (await completed.isVisible().catch(() => false)) {
      await expect(completed).toBeVisible()
      return
    }

    const completeBtn = page.getByRole('button', { name: 'Concluir aula' })
    await expect(completeBtn).toBeVisible({ timeout: 10_000 })
    await completeBtn.click()

    await expect(page.getByText('Aula concluída')).toBeVisible({ timeout: 12_000 })
  })
})
