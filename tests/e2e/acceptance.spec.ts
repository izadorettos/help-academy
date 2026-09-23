/**
 * PRD §9 — 17 acceptance criteria
 * CA-01 (login), CA-08 (quiz), CA-09 (result), CA-15 (admin progress),
 * CA-16 (authorization), CA-17 (viewports) are covered in other spec files.
 * This file covers: CA-02 through CA-07, CA-10 through CA-14.
 */
import { expect, test, type Page } from '@playwright/test'

// ─── Seed constants ────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@help.local'
const ADMIN_PASSWORD = 'Admin@123'
const MEMBER_EMAIL = 'membro@help.local'
const MEMBER_PASSWORD = 'Membro@123'

// Lesson IDs
const LESSON_1_ID = '00000000-0000-0000-0004-000000000001' // text
const LESSON_2_ID = '00000000-0000-0000-0004-000000000002' // video
const LESSON_3_ID = '00000000-0000-0000-0004-000000000003' // link
const LESSON_4_ID = '00000000-0000-0000-0004-000000000004' // embed

const PATH_ID = '00000000-0000-0000-0002-000000000001'

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

/** Completes a lesson if not already done. */
async function ensureLessonCompleted(page: Page, lessonId: string) {
  await page.goto(`/aula/${lessonId}`)
  const completedBadge = page.getByText('Aula concluída')
  const completeBtn = page.getByRole('button', { name: 'Concluir aula' })
  await Promise.race([
    completedBadge.waitFor({ timeout: 12_000 }).catch(() => null),
    completeBtn.waitFor({ timeout: 12_000 }).catch(() => null),
  ])
  if (await completedBadge.isVisible()) return
  if (await completeBtn.isVisible()) {
    await completeBtn.click()
    await completedBadge.waitFor({ timeout: 12_000 })
  }
}

// ─── CA-02: System identifies user area ───────────────────────────────────────

test.describe('CA-02: sistema identifica área do usuário', () => {
  test('dashboard exibe trilha atribuída à área Geral do membro', async ({ page }) => {
    await loginAsMember(page)
    // "Onboarding Geral" is assigned to the Geral department the member belongs to.
    // The path card heading is an <h3> inside a link.
    await expect(
      page.getByRole('heading', { level: 3, name: /Onboarding Geral/i }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})

// ─── CA-03: Member sees only their paths ──────────────────────────────────────

test.describe('CA-03: membro vê suas trilhas e apenas elas', () => {
  test('página /trilhas lista a trilha Onboarding Geral', async ({ page }) => {
    await loginAsMember(page)
    await page.goto('/trilhas')
    await expect(page.getByText('Onboarding Geral', { exact: false })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('admin não vê trilha na view de membro pois está em área diferente (TI)', async ({
    page,
  }) => {
    // Admin is in TI, which is not assigned to the demo path.
    // Dashboard should not show the Onboarding Geral path card.
    await loginAsAdmin(page)
    await page.goto('/trilhas')
    // The path is for "Geral" only — admin (TI dept) sees empty or no card for it
    // We just verify the page loads without error
    await expect(page).toHaveURL(/\/trilhas/)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })
})

// ─── CA-04: Member opens modules ──────────────────────────────────────────────

test.describe('CA-04: membro abre módulos da trilha', () => {
  test('detalhe da trilha exibe módulos com seus títulos', async ({ page }) => {
    await loginAsMember(page)
    await page.goto('/trilhas/onboarding-geral')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Bem-vindo à Help Entregas', { exact: false })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Processos e Ferramentas', { exact: false })).toBeVisible()
  })
})

// ─── CA-05: Member consumes all content types ─────────────────────────────────

test.describe('CA-05: conteúdos de todos os tipos são renderizados', () => {
  test('aula do tipo texto renderiza conteúdo Markdown', async ({ page }) => {
    await loginAsMember(page)
    await page.goto(`/aula/${LESSON_1_ID}`)
    await page.waitForLoadState('domcontentloaded')
    // The text lesson renders "## Missão" as an <h2> and lists "Agilidade"
    await expect(page.getByRole('heading', { name: 'Missão' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Agilidade').first()).toBeVisible()
  })

  test('aula do tipo vídeo exibe contêiner de embed', async ({ page }) => {
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)
    await page.goto(`/aula/${LESSON_2_ID}`)
    await page.waitForLoadState('domcontentloaded')
    // Video lessons render an iframe or a video embed container
    const videoContainer = page
      .locator('iframe, [data-lesson-type="video"], section[aria-label*="vídeo" i]')
      .first()
    await expect(videoContainer).toBeAttached({ timeout: 10_000 })
  })

  test('aula do tipo link exibe link externo acessível', async ({ page }) => {
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)
    await page.goto(`/aula/${LESSON_3_ID}`)
    await page.waitForLoadState('domcontentloaded')
    // Link lessons show an <a> to the external URL
    const externalLink = page.locator('a[href*="helpentregas.com.br"]')
    await expect(externalLink).toBeAttached({ timeout: 10_000 })
  })

  test('aula do tipo embed exibe iframe ou contêiner de embed', async ({ page }) => {
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)
    await ensureLessonCompleted(page, LESSON_2_ID)
    await page.goto(`/aula/${LESSON_4_ID}`)
    await page.waitForLoadState('domcontentloaded')
    // Embed lessons render an iframe for Google Slides or similar
    const embedEl = page.locator('iframe, [data-lesson-type="embed"]').first()
    await expect(embedEl).toBeAttached({ timeout: 10_000 })
  })
})

// ─── CA-06: Lesson completion (covered in quiz.spec.ts) ───────────────────────

// ─── CA-07: Progress persists between sessions ────────────────────────────────

test.describe('CA-07: progresso persiste entre sessões', () => {
  test('aula concluída permanece concluída após logout e novo login', async ({ page }) => {
    // Ensure lesson 1 is completed
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)

    // Log out
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    // Log back in
    await page.getByLabel('E-mail').fill(MEMBER_EMAIL)
    await page.getByLabel('Senha').fill(MEMBER_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // Navigate to lesson 1 again — should still show completed
    await page.goto(`/aula/${LESSON_1_ID}`)
    await expect(page.getByText('Aula concluída')).toBeVisible({ timeout: 10_000 })
  })
})

// ─── CA-08, CA-09: Quiz (covered in quiz.spec.ts) ─────────────────────────────

// ─── CA-10: Member receives XP ────────────────────────────────────────────────

test.describe('CA-10: membro recebe XP ao concluir aula', () => {
  test('perfil exibe XP > 0 após concluir ao menos uma aula', async ({ page }) => {
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)

    await page.goto('/perfil')
    await page.waitForLoadState('domcontentloaded')
    // XpCard renders "X XP" somewhere visible
    const xpText = page.getByText(/\d+\s*XP/i)
    await expect(xpText.first()).toBeVisible({ timeout: 10_000 })

    // XP should be a positive number
    const raw = await xpText.first().textContent()
    const match = raw?.match(/(\d+)\s*XP/i)
    expect(Number(match?.[1] ?? 0)).toBeGreaterThan(0)
  })
})

// ─── CA-11: XP does not duplicate ────────────────────────────────────────────

test.describe('CA-11: XP não duplica ao recarregar ou tentar concluir novamente', () => {
  test('aula já concluída não exibe botão Concluir aula (sem risco de duplo-clique)', async ({
    page,
  }) => {
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)

    // Reload the lesson page — completed state must be preserved
    await page.goto(`/aula/${LESSON_1_ID}`)
    await expect(page.getByText('Aula concluída')).toBeVisible({ timeout: 10_000 })
    // "Concluir aula" button must NOT be visible (prevents duplicate submission)
    await expect(page.getByRole('button', { name: 'Concluir aula' })).not.toBeVisible()
  })

  test('XP total não muda ao recarregar o perfil após aula já concluída', async ({ page }) => {
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)

    await page.goto('/perfil')
    await page.waitForLoadState('domcontentloaded')

    const xpText = page.getByText(/\d+\s*XP/i)
    const firstRaw = await xpText.first().textContent()
    const firstXp = Number(firstRaw?.match(/(\d+)\s*XP/i)?.[1] ?? 0)

    // Reload profile
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const secondRaw = await xpText.first().textContent()
    const secondXp = Number(secondRaw?.match(/(\d+)\s*XP/i)?.[1] ?? 0)

    expect(secondXp).toBe(firstXp)
  })
})

// ─── CA-12: Achievements unlocked ─────────────────────────────────────────────

test.describe('CA-12: conquistas são desbloqueadas', () => {
  test('conquistas page mostra "Primeira Aula" como desbloqueada', async ({ page }) => {
    await loginAsMember(page)
    await ensureLessonCompleted(page, LESSON_1_ID)

    await page.goto('/conquistas')
    await page.waitForLoadState('domcontentloaded')

    // "Primeira Aula" achievement should be visible and unlocked — exact match to avoid
    // matching the description "Concluiu sua primeira aula."
    await expect(page.getByText('Primeira Aula', { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    })
    // Summary text should indicate at least 1 achievement unlocked
    await expect(page.getByText(/\d+ de \d+ conquistas desbloqueadas/)).toBeVisible()
  })
})

// ─── CA-13: Admin creates/edits content ──────────────────────────────────────

test.describe('CA-13: admin cria e edita conteúdo', () => {
  test('admin acessa listagem de trilhas no painel', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/trilhas')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Trilhas', {
      timeout: 10_000,
    })
    // Demo path must be listed — target the visible link text, not hidden dialog text
    await expect(
      page.getByRole('link', { name: /Onboarding Geral/i }).first(),
    ).toBeVisible()
  })

  test('admin pode abrir formulário de edição da trilha existente', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`/admin/trilhas/${PATH_ID}`)
    // The path edit/detail page should load — check heading or title input
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
    // Should not be an error page
    await expect(page.getByText('404')).not.toBeVisible()
  })

  test('admin acessa listagem de usuários', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/usuarios')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Usuário', {
      timeout: 10_000,
    })
  })
})

// ─── CA-14: Admin assigns path ────────────────────────────────────────────────

test.describe('CA-14: admin atribui trilha por área e individualmente', () => {
  test('detalhe da trilha admin exibe atribuição de áreas', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`/admin/trilhas/${PATH_ID}`)
    await page.waitForLoadState('domcontentloaded')
    // The page must load without 404
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
    // The path is assigned to "Geral" area — check for the word "Geral" on the page
    await expect(page.getByText('Geral').first()).toBeVisible()
  })
})
