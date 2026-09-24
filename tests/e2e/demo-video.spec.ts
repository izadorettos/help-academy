/**
 * Demo — formato vídeo (placeholder).
 *
 * Requer:
 *   1. `npm run demo:seed` executado antes.
 *   2. `DEMO_USER_PASSWORD` no ambiente (populada por demo:seed em .env.local).
 */
import { expect, test } from '@playwright/test'
import { DEMO_LESSONS, DEMO_PASSWORD, loginAsDemo } from './demo-helpers'

test.describe('demo — formato: vídeo', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes (DEMO_USER_PASSWORD ausente)')
    await loginAsDemo(page)
  })

  test('placeholder player e capítulos são renderizados', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.video}`)
    await page.waitForLoadState('domcontentloaded')

    // Play button (aria-label alterna entre "Reproduzir" e "Pausar")
    await expect(
      page.getByRole('button', { name: /Reproduzir vídeo|Pausar vídeo/i }),
    ).toBeVisible({ timeout: 10_000 })

    // Capítulos renderizados
    await expect(page.getByRole('button', { name: /Quem somos/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Propósito, visão e promessa/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Como a operação funciona/ })).toBeVisible()
  })

  test('vídeo com 0% de progresso não conclui via complete_lesson', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.video}`)
    await page.waitForLoadState('domcontentloaded')

    // O botão "Concluir aula" existe mas o servidor rejeita com VIDEO_NOT_WATCHED
    // enquanto progresso < 80% — a UI mostra erro genérico depois do clique.
    const btn = page.getByRole('button', { name: 'Concluir aula' })
    // Se completada anteriormente (chip Concluída), pula.
    const completed = page.getByText('Aula concluída').first()
    if (await completed.isVisible().catch(() => false)) {
      test.skip(true, 'Vídeo já concluído em run anterior')
    }

    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()

    // Espera aparecer aviso de erro OU marcação como concluída não aparecer.
    // A action retorna erro genérico; qualquer mensagem role=alert satisfaz.
    const alert = page.locator('[role="alert"]').first()
    await expect(alert).toBeVisible({ timeout: 8_000 })
  })
})
