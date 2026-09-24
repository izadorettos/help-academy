import { expect, type Page } from '@playwright/test'

// ─── Demo credentials ────────────────────────────────────────────────────────

export const DEMO_EMAIL = 'demo@help.local'
export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? ''

// ─── Demo path + lessons ─────────────────────────────────────────────────────

export const DEMO_PATH_SLUG = 'conhecendo-a-help'

export const DEMO_LESSONS = {
  video: 'de000000-0000-0000-0004-000000000001',
  text: 'de000000-0000-0000-0004-000000000002',
  quiz: 'de000000-0000-0000-0004-000000000003',
  game: 'de000000-0000-0000-0004-000000000004',
  task: 'de000000-0000-0000-0004-000000000005',
  challenge: 'de000000-0000-0000-0004-000000000006',
  survey: 'de000000-0000-0000-0004-000000000007',
} as const

// ─── Login helper ────────────────────────────────────────────────────────────

export async function loginAsDemo(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Login').fill(DEMO_EMAIL)
  await page.getByLabel('Senha').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}
