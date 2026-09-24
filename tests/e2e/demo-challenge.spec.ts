/**
 * Demo — formato desafio.
 *
 * Requer: `npm run demo:seed` e DEMO_USER_PASSWORD.
 */
/* vocab-allow */
import { expect, test } from '@playwright/test'
import { DEMO_LESSONS, DEMO_PASSWORD, loginAsDemo } from './demo-helpers'

const VALID_ANSWER =
  'Boa tarde. O #4821 está em rota desde 14:31, com o parceiro a 2 km da Rua Bahia. ' +
  'A previsão é até 15:18, dentro do SLA de 45 minutos. Quando ele entregar, o QR ' +
  'registra foto e geotag e o comprovante aparece no seu painel. Se o cliente ligar ' +
  'de novo, pode passar esse horário — e sigo acompanhando por aqui.'

// Resposta com termo travado embutido (para o caminho de erro)
const BLOCKED_ANSWER =
  'Boa tarde. O #4821 já saiu com um de nossos motoboys. ' +
  'A previsão é até 15:18. Assim que ele entregar, o comprovante aparece no seu painel. ' +
  'Estou acompanhando por aqui e te aviso se qualquer coisa mudar de rota.'

test.describe('demo — formato: desafio', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes')
    await loginAsDemo(page)
  })

  test('caminho de erro — palavra travada trava o envio', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.challenge}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Desafio concluído').first()
    if (await completed.isVisible().catch(() => false)) {
      test.skip(true, 'Desafio já concluído')
    }

    // Preenche resposta com termo travado
    await page.getByLabel('Sua resposta').fill(BLOCKED_ANSWER)

    // Marca todos os critérios de autoavaliação
    const criteriaCheckboxes = page.locator('fieldset input[type="checkbox"]')
    const count = await criteriaCheckboxes.count()
    for (let i = 0; i < count; i++) {
      await criteriaCheckboxes.nth(i).check()
    }

    // Alerta cliente sobre os termos + botão fica desabilitado.
    await expect(page.getByText(/Evite os termos/)).toBeVisible({ timeout: 5_000 })
    const submitBtn = page.getByRole('button', { name: 'Enviar resposta' })
    await expect(submitBtn).toBeDisabled()
  })

  test('caminho feliz — resposta válida com autoavaliação completa', async ({ page }) => {
    await page.goto(`/aula/${DEMO_LESSONS.challenge}`)
    await page.waitForLoadState('domcontentloaded')

    const completed = page.getByText('Desafio concluído').first()
    if (await completed.isVisible().catch(() => false)) {
      await expect(completed).toBeVisible()
      return
    }

    await page.getByLabel('Sua resposta').fill(VALID_ANSWER)

    const criteriaCheckboxes = page.locator('fieldset input[type="checkbox"]')
    const count = await criteriaCheckboxes.count()
    for (let i = 0; i < count; i++) {
      await criteriaCheckboxes.nth(i).check()
    }

    const submitBtn = page.getByRole('button', { name: 'Enviar resposta' })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
    await submitBtn.click()

    await expect(page.getByText('Desafio concluído')).toBeVisible({ timeout: 12_000 })
  })
})
/* /vocab-allow */
