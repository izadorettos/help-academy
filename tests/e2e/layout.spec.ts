import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ADMIN_EMAIL = 'admin@help.local'
const ADMIN_PASSWORD = 'Admin@123'
const MEMBER_EMAIL = 'membro@help.local'
const MEMBER_PASSWORD = 'Membro@123'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL)
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
}

async function loginAsMember(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(MEMBER_EMAIL)
  await page.getByLabel('Senha').fill(MEMBER_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
}

async function axeCheck(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  expect(
    serious,
    `Violações sérias: ${serious.map((v) => `${v.id}: ${v.description}`).join('; ')}`,
  ).toHaveLength(0)
}

// ─── CA-17: Layout — viewports and navigation ─────────────────────────────────

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
    await axeCheck(page)
  })

  test('screenshot desktop 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    await page.screenshot({ path: 'test-results/screenshots/dashboard-1440x900.png' })
  })

  test('screenshot laptop 1024x768', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    await page.screenshot({ path: 'test-results/screenshots/dashboard-1024x768.png' })
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

  test('screenshot mobile pequeno 360x780', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await page.goto('/dashboard')
    await page.screenshot({ path: 'test-results/screenshots/dashboard-360x780.png' })
  })

  test('bottom nav visível em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard')
    const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(bottomNav).toBeVisible()
  })

  test('sem rolagem horizontal em mobile 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalScroll).toBe(false)
  })
})

// ─── CA-17: axe em páginas principais do membro ───────────────────────────────

test.describe('acessibilidade — páginas do membro', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMember(page)
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test('sem violações axe na página /trilhas', async ({ page }) => {
    await page.goto('/trilhas')
    await page.waitForLoadState('domcontentloaded')
    await axeCheck(page)
  })

  test('sem violações axe na página /conquistas', async ({ page }) => {
    await page.goto('/conquistas')
    await page.waitForLoadState('domcontentloaded')
    await axeCheck(page)
  })

  test('sem violações axe na página /perfil', async ({ page }) => {
    await page.goto('/perfil')
    await page.waitForLoadState('domcontentloaded')
    await axeCheck(page)
  })

  test('sem violações axe em aula de texto', async ({ page }) => {
    await page.goto('/aula/00000000-0000-0000-0004-000000000001')
    await page.waitForLoadState('domcontentloaded')
    await axeCheck(page)
  })
})

// ─── CA-17: axe em páginas do admin ───────────────────────────────────────────

test.describe('acessibilidade — páginas do admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test('sem violações axe no painel admin', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')
    await axeCheck(page)
  })

  test('sem violações axe em /admin/relatorios', async ({ page }) => {
    await page.goto('/admin/relatorios')
    await page.waitForLoadState('domcontentloaded')
    await axeCheck(page)
  })
})

// ─── CA-17: login page acessibilidade ─────────────────────────────────────────

test.describe('acessibilidade — página de login', () => {
  test('sem violações axe na página /login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    await page.setViewportSize({ width: 1440, height: 900 })
    await axeCheck(page)
  })
})
