/**
 * Demo — jornada completa: login → trilha → todas as atividades → conclusão.
 *
 * Rodada em dois viewports: mobile (390×844) e desktop (1440×900).
 * Requer: `npm run demo:seed` e DEMO_USER_PASSWORD.
 */
import { expect, test } from '@playwright/test'
import {
  DEMO_EMAIL,
  DEMO_LESSONS,
  DEMO_PASSWORD,
  DEMO_PATH_SLUG,
  loginAsDemo,
} from './demo-helpers'

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

for (const vp of VIEWPORTS) {
  test.describe(`demo — jornada completa (${vp.name} ${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test.beforeEach(() => {
      test.skip(!DEMO_PASSWORD, 'Requer npm run demo:seed antes')
    })

    test('login e dashboard acessíveis', async ({ page }) => {
      await loginAsDemo(page)
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.getByRole('heading', { name: /Olá|Bem-vindo/i }).first()).toBeVisible({
        timeout: 10_000,
      })
    })

    test('trilha aparece no dashboard e na listagem de trilhas', async ({ page }) => {
      await loginAsDemo(page)

      // Dashboard mostra a trilha
      await expect(page.getByText('Conhecendo a HELP')).toBeVisible({ timeout: 10_000 })

      // Listagem de trilhas
      await page.goto('/trilhas')
      await expect(page.getByText('Conhecendo a HELP')).toBeVisible({ timeout: 10_000 })
    })

    test('aula de vídeo (1) — player placeholder visível', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/aula/${DEMO_LESSONS.video}`)
      await page.waitForLoadState('domcontentloaded')

      await expect(
        page.getByRole('heading', { name: /Se é para ajudar/i }),
      ).toBeVisible({ timeout: 10_000 })

      // Player ou região de vídeo presentes
      await expect(
        page.locator('[aria-label="Player de vídeo"], [data-testid="video-player"], video, iframe').first(),
      ).toBeVisible({ timeout: 10_000 })
    })

    test('aula de texto (2) — conteúdo markdown renderizado', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/aula/${DEMO_LESSONS.text}`)
      await page.waitForLoadState('domcontentloaded')

      await expect(
        page.getByRole('heading', { name: /Como a gente fala/i }),
      ).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('O eixo não muda')).toBeVisible()
    })

    test('aula de quiz (3) — questões visíveis e quiz disponível', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/aula/${DEMO_LESSONS.quiz}`)
      await page.waitForLoadState('domcontentloaded')

      await expect(
        page.getByRole('region', { name: 'Quiz da aula' }),
      ).toBeVisible({ timeout: 15_000 })
    })

    test('aula de game (4) — cartões do game visíveis', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/aula/${DEMO_LESSONS.game}`)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('region', { name: 'Game' })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('entregador parceiro')).toBeVisible()
    })

    test('aula de tarefa (5) — checklist visível', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/aula/${DEMO_LESSONS.task}`)
      await page.waitForLoadState('domcontentloaded')

      // Fieldset com checkboxes ou chip de conclusão
      const completed = page.getByText('Tarefa concluída').first()
      const fieldset = page.locator('fieldset').first()

      await Promise.race([
        completed.waitFor({ timeout: 10_000 }).catch(() => null),
        fieldset.waitFor({ timeout: 10_000 }).catch(() => null),
      ])

      const visible =
        (await completed.isVisible().catch(() => false)) ||
        (await fieldset.isVisible().catch(() => false))
      expect(visible).toBe(true)
    })

    test('aula de desafio (6) — textarea de resposta visível', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/aula/${DEMO_LESSONS.challenge}`)
      await page.waitForLoadState('domcontentloaded')

      const completed = page.getByText('Desafio concluído').first()
      const textarea = page.locator('textarea').first()

      await Promise.race([
        completed.waitFor({ timeout: 10_000 }).catch(() => null),
        textarea.waitFor({ timeout: 10_000 }).catch(() => null),
      ])

      const visible =
        (await completed.isVisible().catch(() => false)) ||
        (await textarea.isVisible().catch(() => false))
      expect(visible).toBe(true)
    })

    test('aula de questionário (7) — perguntas visíveis', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/aula/${DEMO_LESSONS.survey}`)
      await page.waitForLoadState('domcontentloaded')

      const completed = page.getByText('Questionário enviado').first()
      const submitBtn = page.getByRole('button', { name: 'Enviar respostas' })

      await Promise.race([
        completed.waitFor({ timeout: 10_000 }).catch(() => null),
        submitBtn.waitFor({ timeout: 10_000 }).catch(() => null),
      ])

      const visible =
        (await completed.isVisible().catch(() => false)) ||
        (await submitBtn.isVisible().catch(() => false))
      expect(visible).toBe(true)
    })

    test('perfil do usuário demo exibe email correto', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto('/perfil')
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(DEMO_EMAIL)).toBeVisible({ timeout: 10_000 })
    })

    test('página da trilha exibe os módulos da demonstração', async ({ page }) => {
      await loginAsDemo(page)
      await page.goto(`/trilhas/${DEMO_PATH_SLUG}`)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText('A Help por dentro')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('Operação na prática')).toBeVisible()
      await expect(page.getByText('Mão na massa')).toBeVisible()
    })
  })
}
