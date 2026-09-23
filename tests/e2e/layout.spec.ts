import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ADMIN_EMAIL = 'admin@help.local'
const ADMIN_PASSWORD = 'Admin@123'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL)
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
}

test.describe('layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('skip link presente no DOM com href correto e visível ao focar', async ({ page }) => {
    const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skipLink).toBeAttached({ timeout: 5000 })
    await expect(skipLink).toHaveAttribute('href', '#main-content')
    await skipLink.focus()
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()
  })

  test('sidebar desktop mostra item ativo com aria-current', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(nav).toBeVisible({ timeout: 10_000 })
    const dashLink = nav.getByRole('link', { name: 'Dashboard' })
    await expect(dashLink).toHaveAttribute('aria-current', 'page')
  })

  test('sem violações axe críticas ou sérias no dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(
      serious,
      `Violações sérias: ${serious.map((v) => v.description).join(', ')}`,
    ).toHaveLength(0)
  })

  test('screenshot desktop 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    await page.screenshot({ path: 'test-results/screenshots/dashboard-1440x900.png' })
  })

  test('screenshot tablet 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard')
    await page.screenshot({ path: 'test-results/screenshots/dashboard-768x1024.png' })
  })

  test('screenshot mobile 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard')
    await page.screenshot({ path: 'test-results/screenshots/dashboard-390x844.png' })
  })

  test('bottom nav visível em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard')
    const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(bottomNav).toBeVisible()
  })
})
