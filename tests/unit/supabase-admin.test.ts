import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('admin.ts (server-only)', () => {
  it('importa server-only na primeira linha', () => {
    const content = readFileSync(resolve(process.cwd(), 'src/lib/supabase/admin.ts'), 'utf-8')
    // Verifica que a primeira importação é 'server-only' para prevenir uso no cliente
    expect(content.trimStart()).toMatch(/^import\s+['"]server-only['"]/)
  })

  it('não usa NEXT_PUBLIC_ para a chave secreta', () => {
    const content = readFileSync(resolve(process.cwd(), 'src/lib/supabase/admin.ts'), 'utf-8')
    expect(content).not.toContain('NEXT_PUBLIC_SUPABASE_SECRET')
    expect(content).not.toContain('NEXT_PUBLIC_SERVICE_ROLE')
  })
})
