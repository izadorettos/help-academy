import { expect, test } from '@playwright/test'

test('raiz redireciona para /login e retorna 200', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/login/)
  await expect(page).toHaveTitle(/Help Academy/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})

test('envia headers de segurança', async ({ request }) => {
  const response = await request.get('/login')
  expect(response.headers()['x-content-type-options']).toBe('nosniff')
  expect(response.headers()['x-frame-options']).toBe('DENY')
  expect(response.headers()['x-powered-by']).toBeUndefined()
})

test('rota inexistente mostra 404 amigável', async ({ page }) => {
  const response = await page.goto('/rota-que-nao-existe')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})

test('não gera rolagem horizontal', async ({ page }) => {
  await page.goto('/login')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})
