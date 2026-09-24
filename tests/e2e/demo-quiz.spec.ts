/**
 * Demo — formato quiz (aula 3: texto + quiz).
 *
 * Quiz: 5 questões, nota mínima 70% (4/5).
 * Requer: `npm run demo:seed` e DEMO_USER_PASSWORD.
 */
import { expect, test } from '@playwright/test'
import { DEMO_LESSONS, DEMO_PASSWORD, loginAsDemo } from './demo-helpers'

test.describe('demo — formato: quiz', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes')
    await loginAsDemo(page)
  })

  test('questões do quiz são exibidas na página', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.quiz}`)
    await page.waitForLoadState('domcontentloaded')

    const quizRegion = page.getByRole('region', { name: 'Quiz da aula' })
    await expect(quizRegion).toBeVisible({ timeout: 15_000 })

    await expect(
      page.getByText('O que a promessa "Você pilota, a gente cuida do resto" diz ao lojista?'),
    ).toBeVisible()
  })

  test('respostas erradas → nota abaixo do mínimo', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.quiz}`)
    await page.waitForLoadState('domcontentloaded')

    const quizRegion = page.getByRole('region', { name: 'Quiz da aula' })
    await expect(quizRegion).toBeVisible({ timeout: 15_000 })

    // Se já concluída, clica em refazer
    const retryBtn = page.getByRole('button', { name: 'Refazer quiz' })
    if (await retryBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await retryBtn.click()
      await page.waitForTimeout(500)
    }

    // Responde todas errado (primeira opção de cada questão)
    const radios = page.locator('input[type="radio"]')
    const count = await radios.count()
    // Marca apenas a primeira opção de cada bloco (5 questões)
    for (let i = 0; i < count; i += 1) {
      const radio = radios.nth(i)
      if (await radio.isEnabled()) {
        await radio.check()
        // Avança para o próximo grupo pulando as demais opções da mesma questão
        // (As opções de múltipla-escolha têm name distinto por questão)
        const name = await radio.getAttribute('name')
        while (i + 1 < count) {
          const nextName = await radios.nth(i + 1).getAttribute('name')
          if (nextName !== name) break
          i++
        }
      }
    }

    await page.getByRole('button', { name: 'Enviar respostas' }).click()

    await expect(page.getByText('Você não atingiu a nota mínima.')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'Refazer quiz' })).toBeVisible()
  })

  test('respostas corretas → passou no quiz e conclui aula', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.quiz}`)
    await page.waitForLoadState('domcontentloaded')

    const quizRegion = page.getByRole('region', { name: 'Quiz da aula' })
    await expect(quizRegion).toBeVisible({ timeout: 15_000 })

    // Se já concluída, apenas valida
    const alreadyDone = page.getByText('Aula concluída').first()
    if (await alreadyDone.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await expect(alreadyDone).toBeVisible()
      return
    }

    // Garante formulário de quiz ativo
    const retryBtn = page.getByRole('button', { name: 'Refazer quiz' })
    if (await retryBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await retryBtn.click()
      await page.waitForTimeout(500)
    }

    // Q1 — "Que o lojista cuida do negócio e a Help cuida do último quilômetro"
    await page
      .getByLabel('Que o lojista cuida do negócio e a Help cuida do último quilômetro')
      .check()

    // Q2 — "Espera / parada"
    await page.getByLabel('Espera / parada').check()

    // Q3 — "QR de entrega com foto e geotag"
    await page.getByLabel('QR de entrega com foto e geotag').check()

    // Q4 — V/F → "Falso" (suporte 24/7, não só comercial)
    await page.getByLabel('Falso').check()

    // Q5 — "45 minutos de prazo Help, medido porta a porta nos últimos 15 dias."
    await page
      .getByLabel('45 minutos de prazo Help, medido porta a porta nos últimos 15 dias.')
      .check()

    await page.getByRole('button', { name: 'Enviar respostas' }).click()

    await expect(page.getByText('Parabéns! Você passou no quiz.')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('100%', { exact: true })).toBeVisible()

    const concludeBtn = page.getByRole('button', { name: 'Concluir aula' })
    await expect(concludeBtn).toBeVisible()
    await concludeBtn.click()

    await expect(page.getByText('Aula concluída')).toBeVisible({ timeout: 15_000 })
  })
})
