import { expect, test } from '@playwright/test'

const ADMIN_EMAIL = 'admin@help.local'
const ADMIN_PASSWORD = 'Admin@123'
const MEMBER_EMAIL = 'membro@help.local'
const MEMBER_PASSWORD = 'Membro@123'

test.describe('relatórios — admin', () => {
  test('admin acessa /admin/relatorios e vê a página de relatórios', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(ADMIN_EMAIL)
    await page.getByLabel('Senha').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

    await page.goto('/admin/relatorios')
    await expect(page).toHaveURL(/\/admin\/relatorios/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Relatórios')
  })

  test('botão Exportar CSV está presente na página de relatórios', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(ADMIN_EMAIL)
    await page.getByLabel('Senha').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

    await page.goto('/admin/relatorios')
    await page.waitForLoadState('networkidle')
    const csvLink = page.locator('a[href*="/api/admin/relatorios/csv"]')
    await expect(csvLink).toBeVisible({ timeout: 10_000 })
    const href = await csvLink.getAttribute('href')
    expect(href).toContain('/api/admin/relatorios/csv')
  })

  test('endpoint CSV retorna 200 e content-type text/csv para admin', async ({ page }) => {
    // First log in via page to get session cookies
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(ADMIN_EMAIL)
    await page.getByLabel('Senha').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

    // Use page context to make an authenticated request
    const response = await page.request.get('/api/admin/relatorios/csv')
    expect(response.status()).toBe(200)
    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType).toContain('text/csv')
  })

  test('endpoint CSV retorna 403 para membro autenticado', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(MEMBER_EMAIL)
    await page.getByLabel('Senha').fill(MEMBER_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

    const response = await page.request.get('/api/admin/relatorios/csv')
    expect(response.status()).toBe(403)
  })
})
