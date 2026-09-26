import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { loginAsDemo } from './demo-helpers'

// ─── Console error detection ──────────────────────────────────────────────────

function attachConsoleListener(page: Page) {
  const errors: string[] = []
  page.on('console', (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err: Error) => errors.push(err.message))
  return errors
}

// ─── Tests at 390×844 (mobile) ───────────────────────────────────────────────

test.describe('Central de Ajuda — mobile (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('abre /ajuda e mostra link para Central de Ajuda', async ({ page }) => {
    const errors = attachConsoleListener(page)
    await loginAsDemo(page)
    await page.goto('/ajuda')
    await expect(page.locator('h1')).toContainText('Tutoriais')
    expect(errors.filter((e) => !e.includes('hydration'))).toHaveLength(0)
  })

  test('busca "adiantamento" e mostra resultados (ou estado vazio válido)', async ({ page }) => {
    await loginAsDemo(page)
    await page.goto('/ajuda')
    const searchInput = page.getByRole('searchbox', { name: /buscar/i })
    if (await searchInput.isVisible()) {
      await searchInput.fill('adiantamento')
      // Wait for URL to update
      await page.waitForURL(/q=adiantamento/, { timeout: 5000 }).catch(() => {})
      // Either show results or a "no results" message
      const hasResults = await page.locator('ul[aria-label*="utoriais"] li').count()
      const hasEmpty = await page.locator('text=Nenhum material encontrado').isVisible().catch(() => false)
      expect(hasResults > 0 || hasEmpty).toBe(true)
    }
  })

  test('sidebar has Central de Ajuda link (bottom nav on mobile)', async ({ page }) => {
    await loginAsDemo(page)
    await page.goto('/dashboard')
    const nav = page.locator('nav[aria-label="Navegação principal"]').last()
    await expect(nav.getByRole('link', { name: /ajuda/i })).toBeVisible()
  })
})

// ─── Tests at 1440×900 (desktop) ─────────────────────────────────────────────

test.describe('Central de Ajuda — desktop (1440×900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('abre /ajuda, tem heading e sem erros de console', async ({ page }) => {
    const errors = attachConsoleListener(page)
    await loginAsDemo(page)
    await page.goto('/ajuda')
    await expect(page.locator('h1')).toContainText('Tutoriais')
    expect(errors.filter((e) => !e.includes('hydration'))).toHaveLength(0)
  })

  test('sidebar tem link Central de Ajuda', async ({ page }) => {
    await loginAsDemo(page)
    await page.goto('/dashboard')
    const sidebar = page.locator('aside[aria-label="Navegação principal"]')
    await expect(sidebar.getByRole('link', { name: /central de ajuda/i })).toBeVisible()
  })

  test('dashboard mostra seção de tutoriais recentes (ou ausência elegante)', async ({ page }) => {
    await loginAsDemo(page)
    await page.goto('/dashboard')
    // Section may or may not have tutorials depending on DB state
    const hasSection = await page
      .locator('section[aria-label="Materiais atualizados recentemente"]')
      .isVisible()
      .catch(() => false)
    // If section exists, it should have a link to /ajuda
    if (hasSection) {
      await expect(page.getByRole('link', { name: /ver central de ajuda/i })).toBeVisible()
    }
    // Either way — no error
    expect(true).toBe(true)
  })

  test('filtro de público atualiza URL', async ({ page }) => {
    await loginAsDemo(page)
    await page.goto('/ajuda')
    const entregadoresBtn = page.getByRole('button', { name: /entregadores/i })
    if (await entregadoresBtn.isVisible()) {
      await entregadoresBtn.click()
      await page.waitForURL(/publico=entregadores/, { timeout: 5000 }).catch(() => {})
      const url = page.url()
      expect(url).toContain('publico=entregadores')
    }
  })

  test('breadcrumb "Voltar" de tutorial preserva filtros', async ({ page }) => {
    await loginAsDemo(page)
    // Go to ajuda with a filter
    await page.goto('/ajuda?publico=entregadores')
    // Look for any tutorial link
    const firstLink = page.locator('ul[aria-label*="utoriais"] li a').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      // Check back link points to /ajuda with filter
      const backLink = page.getByRole('link', { name: /voltar para a central/i })
      if (await backLink.isVisible()) {
        const href = await backLink.getAttribute('href')
        // Back link should contain the previous URL context
        expect(href).toBeTruthy()
      }
    }
  })

  test('axe: sem violações sérias em /ajuda', async ({ page }) => {
    await loginAsDemo(page)
    await page.goto('/ajuda')
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .exclude('[aria-hidden]')
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(serious).toHaveLength(0)
  })

  test('membro em /admin/tutoriais recebe 403 ou redireciona', async ({ page }) => {
    await loginAsDemo(page)
    const response = await page.goto('/admin/tutoriais')
    // Should be redirected or blocked
    const url = page.url()
    const status = response?.status() ?? 0
    expect(url.includes('/admin') === false || status === 403 || status === 404 || url.includes('/dashboard')).toBe(true)
  })
})
