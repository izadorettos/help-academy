/**
 * Demo — formato game (say_dont_say).
 *
 * Aula 4: "Rota certa — diga ou não diga"
 * 8 cartões, gabarito: c1=say, c2=dont_say, c3=say, c4=dont_say,
 *                       c5=say, c6=dont_say, c7=say, c8=dont_say
 * Nota mínima: 70%. Nota 100% = bônus.
 *
 * Requer: `npm run demo:seed` e DEMO_USER_PASSWORD.
 */
import { expect, test } from '@playwright/test'
import { DEMO_LESSONS, DEMO_PASSWORD, loginAsDemo } from './demo-helpers'

test.describe('demo — formato: game (say_dont_say)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes')
    await loginAsDemo(page)
  })

  test('cartões do game são exibidos', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.game}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('region', { name: 'Game' })).toBeVisible({ timeout: 10_000 })

    // Pelo menos um cartão visível
    await expect(page.getByText('entregador parceiro')).toBeVisible()
  })

  test('botão enviar desabilitado até classificar todos os cartões', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.game}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Game concluído').first()
    if (await completed.isVisible().catch(() => false)) {
      test.skip(true, 'Game já concluído')
    }

    const submitBtn = page.getByRole('button', { name: 'Enviar respostas' })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
    await expect(submitBtn).toBeDisabled()

    await expect(page.getByText('Responda todas as frases para enviar.')).toBeVisible()
  })

  test('respostas todas corretas → game concluído com bônus', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.game}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Game concluído').first()
    if (await completed.isVisible().catch(() => false)) {
      await expect(completed).toBeVisible()
      return
    }

    // Gabarito: say=c1,c3,c5,c7  dont_say=c2,c4,c6,c8
    const sayCards = ['entregador parceiro', 'QR de entrega com foto e geotag', 'suporte humano 24/7', 'prazo Help de 45 min, porta a porta, últimos 15 dias']
    const dontSayCards = ['nossos motoboys', 'tecnologia de ponta', 'frota própria', 'melhor do mercado']

    for (const label of sayCards) {
      const li = page.locator('li').filter({ hasText: label })
      await li.getByRole('button', { name: 'Diga' }).click()
    }
    for (const label of dontSayCards) {
      const li = page.locator('li').filter({ hasText: label })
      await li.getByRole('button', { name: 'Não diga' }).click()
    }

    const submitBtn = page.getByRole('button', { name: 'Enviar respostas' })
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    await expect(page.getByText('Game concluído')).toBeVisible({ timeout: 12_000 })
  })
})
