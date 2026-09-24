import { expect, test, type Page } from '@playwright/test'

// Seed IDs (from supabase/seed.sql)
const MEMBER_EMAIL = 'membro@help.local'
const MEMBER_PASSWORD = 'Membro@123'

// Lesson IDs (sequential path: 1 → 2 → (3 optional) → 4 → 5)
const LESSON_1_ID = '00000000-0000-0000-0004-000000000001'
const LESSON_2_ID = '00000000-0000-0000-0004-000000000002'
const LESSON_4_ID = '00000000-0000-0000-0004-000000000004'
// Lesson 5 — "Verificação de conhecimento" — has quiz
const LESSON_5_ID = '00000000-0000-0000-0004-000000000005'
const LESSON_5_URL = `/aula/${LESSON_5_ID}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAsMember(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Login').fill(MEMBER_EMAIL)
  await page.getByLabel('Senha').fill(MEMBER_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

/**
 * Completes a required lesson (non-quiz) by navigating to it and clicking
 * the "Concluir aula" button. Handles the case where it's already completed.
 */
async function completeLesson(page: Page, lessonId: string) {
  await page.goto(`/aula/${lessonId}`)

  const completedBadge = page.getByText('Aula concluída')
  const completeBtn = page.getByRole('button', { name: 'Concluir aula' })

  // Wait for the page to settle
  await Promise.race([
    completedBadge.waitFor({ timeout: 10_000 }).catch(() => null),
    completeBtn.waitFor({ timeout: 10_000 }).catch(() => null),
  ])

  if (await completedBadge.isVisible()) return // already done

  if (await completeBtn.isVisible()) {
    await completeBtn.click()
    await completedBadge.waitFor({ timeout: 10_000 })
  }
}

/**
 * Ensures lessons 1, 2, and 4 are completed before testing lesson 5.
 * The path is sequential so these are required prerequisites.
 */
async function completePriorLessons(page: Page) {
  await completeLesson(page, LESSON_1_ID)
  await completeLesson(page, LESSON_2_ID)
  await completeLesson(page, LESSON_4_ID)
}

/**
 * Navigate to lesson 5, complete prior lessons if needed, and ensure
 * the quiz form (not a result) is shown. Clicks "Refazer quiz" if needed.
 */
async function openQuizForm(page: Page) {
  await completePriorLessons(page)
  await page.goto(LESSON_5_URL)

  // Wait for either the quiz region or an "Aula concluída" status
  const quizRegion = page.getByRole('region', { name: 'Quiz da aula' })
  await expect(quizRegion).toBeVisible({ timeout: 15_000 })

  // If a previous result is shown, click retry to go back to the form
  const retryBtn = page.getByRole('button', { name: 'Refazer quiz' })
  if (await retryBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await retryBtn.click()
    // Wait for the form fields to appear
    await page.waitForTimeout(500)
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('quiz — aula 5', () => {
  test('quiz questions are visible on lesson page', async ({ page }) => {
    await loginAsMember(page)
    // Use openQuizForm which handles clicking "Refazer quiz" if a previous result is shown
    await openQuizForm(page)

    // Both questions should be rendered in the quiz form
    await expect(page.getByText('Qual é a missão da Help Entregas?')).toBeVisible()
    await expect(
      page.getByText('A Help Entregas valoriza a transparência como um de seus princípios.'),
    ).toBeVisible()
  })

  test('network responses do not contain is_correct before submission', async ({ page }) => {
    const isCorrectLeaked: string[] = []

    // Intercept all responses and check for is_correct leaks
    page.on('response', async (response) => {
      const url = response.url()
      // Only inspect JSON API/RPC responses (not HTML pages)
      if (
        url.includes('/rest/v1/') ||
        url.includes('/rpc/') ||
        response.headers()['content-type']?.includes('application/json')
      ) {
        try {
          const body = await response.text()
          if (body.includes('"is_correct"')) {
            isCorrectLeaked.push(url)
          }
        } catch {
          // ignore read errors
        }
      }
    })

    await loginAsMember(page)
    await completePriorLessons(page)
    await page.goto(LESSON_5_URL)
    await expect(page.getByRole('region', { name: 'Quiz da aula' })).toBeVisible({
      timeout: 15_000,
    })

    expect(isCorrectLeaked).toHaveLength(0)
  })

  test('wrong answers → fail message shown', async ({ page }) => {
    await loginAsMember(page)
    await openQuizForm(page)

    // Answer wrong: Q1 wrong option (partial text match), Q2 wrong (Falso)
    await page.getByLabel('Vender produtos eletrônicos online').check()
    await page.getByLabel('Falso').check()

    await page.getByRole('button', { name: 'Enviar respostas' }).click()

    // Should show fail state
    await expect(page.getByText('Você não atingiu a nota mínima.')).toBeVisible({
      timeout: 15_000,
    })
    // Score should be 0% (exact match to avoid matching "70%")
    await expect(page.getByText('0%', { exact: true })).toBeVisible()

    // Retry button should be present
    await expect(page.getByRole('button', { name: 'Refazer quiz' })).toBeVisible()
    // "Concluir aula" button should NOT be present on failure
    await expect(page.getByRole('button', { name: 'Concluir aula' })).not.toBeVisible()
  })

  test('correct answers → pass message, then conclude lesson', async ({ page }) => {
    await loginAsMember(page)
    await openQuizForm(page)

    // Answer correctly
    await page.getByLabel('Facilitar a logística de última milha com tecnologia e cuidado').check()
    await page.getByLabel('Verdadeiro').check()

    await page.getByRole('button', { name: 'Enviar respostas' }).click()

    // Should show pass state
    await expect(page.getByText('Parabéns! Você passou no quiz.')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('100%', { exact: true })).toBeVisible()

    // "Concluir aula" button should be visible on pass
    const concludeBtn = page.getByRole('button', { name: 'Concluir aula' })
    await expect(concludeBtn).toBeVisible()

    // Click to conclude the lesson
    await concludeBtn.click()

    // Page should reload and lesson should be marked as concluded
    await expect(page.getByText('Aula concluída')).toBeVisible({ timeout: 15_000 })
  })
})
