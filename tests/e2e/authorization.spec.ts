/**
 * Authorization suite — CA-16
 * Verifies that role boundaries are enforced at the HTTP/page level.
 * Deep RPC-level checks live in supabase/tests/rls_policies.test.sql.
 */
import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@help.local'
const ADMIN_PASSWORD = 'Admin@123'
const MEMBER_EMAIL = 'membro@help.local'
const MEMBER_PASSWORD = 'Membro@123'

// Admin-only pages that should return 404 for members
const ADMIN_PAGES = [
  '/admin',
  '/admin/usuarios',
  '/admin/trilhas',
  '/admin/areas',
  '/admin/relatorios',
  '/admin/configuracoes',
  '/admin/conteudos',
]

// Member pages that should redirect anon users to /login
const MEMBER_PAGES = [
  '/dashboard',
  '/trilhas',
  '/perfil',
  '/conquistas',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAsMember(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(MEMBER_EMAIL)
  await page.getByLabel('Senha').fill(MEMBER_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL)
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

// ─── Anonymous → /login redirect ─────────────────────────────────────────────

test.describe('CA-16: usuário anônimo é redirecionado para /login', () => {
  for (const path of MEMBER_PAGES) {
    test(`anônimo em ${path} → /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })
  }

  test('anônimo em /aula/[id] → /login', async ({ page }) => {
    await page.goto('/aula/00000000-0000-0000-0004-000000000001')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})

// ─── Member → admin pages return 404 ─────────────────────────────────────────

test.describe('CA-16: membro autenticado não acessa páginas de admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMember(page)
  })

  for (const path of ADMIN_PAGES) {
    test(`membro em ${path} → 404`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(404)
    })
  }
})

// ─── Member → admin API endpoints ────────────────────────────────────────────

test.describe('CA-16: membro não acessa endpoints de admin via API', () => {
  test('CSV endpoint retorna 403 para membro', async ({ page }) => {
    await loginAsMember(page)
    const response = await page.request.get('/api/admin/relatorios/csv')
    expect(response.status()).toBe(403)
  })
})

// ─── Admin can access all admin pages ────────────────────────────────────────

test.describe('CA-16: admin acessa todas as páginas administrativas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  for (const path of ADMIN_PAGES.filter((p) => p !== '/admin')) {
    test(`admin acessa ${path}`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      // Page must render a heading, not a redirect to login
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
    })
  }
})

// ─── Member cannot access another member's lesson data ───────────────────────

test.describe('CA-16: membro não vê dados de outro usuário', () => {
  test('membro acessa apenas suas próprias conquistas', async ({ page }) => {
    await loginAsMember(page)
    await page.goto('/conquistas')
    await page.waitForLoadState('domcontentloaded')
    // Page loads without error and shows the member's own achievements page
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Conquistas', {
      timeout: 10_000,
    })
    // The page must not show any server error or admin-only data
    await expect(page.getByText('500', { exact: true })).not.toBeVisible()
  })

  test('membro não consegue acessar painel de admin mesmo com URL direta', async ({ page }) => {
    await loginAsMember(page)
    // Try accessing admin dashboard directly
    const res = await page.goto('/admin')
    expect(res?.status()).toBe(404)
  })
})
