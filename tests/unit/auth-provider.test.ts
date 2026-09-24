import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

function collectFiles(dir: string, exts: string[]): string[] {
  const files: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== '.next'
        ) {
          files.push(...collectFiles(fullPath, exts))
        }
      } else if (exts.some((e) => entry.name.endsWith(e))) {
        files.push(fullPath)
      }
    }
  } catch {
    /* dir may not exist */
  }
  return files
}

describe('auth-provider — separação de responsabilidades', () => {
  const root = join(__dirname, '../..')
  const srcDir = join(root, 'src')
  const allSrcFiles = collectFiles(srcDir, ['.ts', '.tsx']).filter(
    (f) => !f.includes('.next'),
  )

  // Files that are allowed to use supabase.auth.* directly
  const ALLOWED = [
    join(srcDir, 'lib/auth/providers/'), // providers directory
    join(srcDir, 'lib/supabase/proxy.ts'), // session infrastructure
  ]

  const violators = allSrcFiles.filter((file) => {
    if (ALLOWED.some((allowed) => file.startsWith(allowed) || file === allowed)) return false
    const content = readFileSync(file, 'utf-8')
    return /supabase\.auth\./.test(content)
  })

  it('nenhum arquivo fora de lib/auth/providers/ chama supabase.auth.* diretamente', () => {
    expect(
      violators,
      `Arquivos com chamadas diretas a supabase.auth.*:\n${violators.map((f) => f.replace(root, '')).join('\n')}`,
    ).toHaveLength(0)
  })
})
