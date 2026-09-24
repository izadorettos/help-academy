import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const BANNED = [
  'colaborador',
  'funcionário',
  'entregador dedicado',
  'exclusividade de entregador',
  'frota própria',
  'nossos motoboys',
  'equipe fixa',
  'escala',
  'fidelidade',
  'dedicação',
]

const _BANNED_ADJECTIVES = [
  'líder',
  'referência nacional',
  'revolucionário',
  'inovador',
  'disruptivo',
  'exclusivo',
  'melhor do mercado',
  'excelência',
]

function collectFiles(dir: string, exts: string[]): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next') {
        files.push(...collectFiles(fullPath, exts))
      }
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      files.push(fullPath)
    }
  }
  return files
}

function stripAllowBlocks(content: string): string {
  // HTML-style allow blocks (Markdown, JSX comments)
  const noHtml = content.replace(
    /<!--\s*vocab-allow\s*-->[\s\S]*?<!--\s*\/vocab-allow\s*-->/g,
    '',
  )
  // SQL/JS-style allow blocks — for .sql files (and any /* … */ context).
  // Matches /* vocab-allow */ … /* /vocab-allow */
  return noHtml.replace(
    /\/\*\s*vocab-allow\s*\*\/[\s\S]*?\/\*\s*\/vocab-allow\s*\*\//g,
    '',
  )
}

describe('vocabulary — palavras travadas', () => {
  const root = join(__dirname, '../..')
  const srcFiles = collectFiles(join(root, 'src'), ['.tsx', '.ts']).filter(
    (f) => !f.includes('.next') && !f.includes('vocabulary.test'),
  )
  const seedFile = join(root, 'supabase/seed.sql')
  const demoDir = join(root, 'supabase/demo')

  const allFiles = [...srcFiles]
  try {
    readFileSync(seedFile, 'utf-8')
    allFiles.push(seedFile)
  } catch {
    // seed.sql may not exist in CI before db setup
  }

  // Include demo SQL files if present. Demo content ensina sobre palavras
  // travadas; blocos intencionais são marcados com /* vocab-allow */.
  try {
    for (const f of collectFiles(demoDir, ['.sql'])) {
      allFiles.push(f)
    }
  } catch {
    // demo dir may not exist yet
  }

  for (const file of allFiles) {
    it(`não contém palavras travadas em ${file.replace(root, '')}`, () => {
      const content = stripAllowBlocks(readFileSync(file, 'utf-8'))
      const lower = content.toLowerCase()
      const found = BANNED.filter((w) => lower.includes(w.toLowerCase()))
      expect(found, `Palavras travadas encontradas: ${found.join(', ')}`).toHaveLength(0)
    })
  }
})
