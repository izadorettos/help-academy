#!/usr/bin/env node
/* eslint-disable no-console */
// ============================================================================
// Demo seed/reset/remove — Help Academy
// Usage: node scripts/demo.mjs seed | reset | remove
//
// Safety:
//   * refuses non-local DATABASE_URL unless DEMO_ALLOW_REMOTE=true
//   * generates DEMO_USER_PASSWORD in .env.local if missing
// ============================================================================

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), '..')
const DEMO_DIR = join(ROOT, 'supabase/demo')
const ENV_LOCAL = join(ROOT, '.env.local')

const cmd = process.argv[2]
if (!['seed', 'reset', 'remove'].includes(cmd)) {
  console.error('Usage: node scripts/demo.mjs seed | reset | remove')
  process.exit(1)
}

function getDbUrl() {
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  const isLocal = dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost')
  if (!isLocal && process.env.DEMO_ALLOW_REMOTE !== 'true') {
    console.error(
      'ERROR: Demo scripts só rodam contra o banco local. Defina DEMO_ALLOW_REMOTE=true para forçar.',
    )
    process.exit(1)
  }
  return dbUrl
}

function getDemoPassword() {
  let envContent = existsSync(ENV_LOCAL) ? readFileSync(ENV_LOCAL, 'utf-8') : ''
  const match = envContent.match(/^DEMO_USER_PASSWORD=(.+)$/m)
  if (match) return match[1].trim()

  const password = randomBytes(16).toString('base64url')
  const separator = envContent.length && !envContent.endsWith('\n') ? '\n' : ''
  envContent += `${separator}DEMO_USER_PASSWORD=${password}\n`
  writeFileSync(ENV_LOCAL, envContent)
  console.log(`Gerada senha demo: ${password}`)
  console.log(`Salva em .env.local (DEMO_USER_PASSWORD).`)
  return password
}

function psql(dbUrl, file, vars = {}) {
  const varArgs = Object.entries(vars).flatMap(([k, v]) => [
    '--variable',
    `${k}=${v}`,
  ])
  const result = spawnSync(
    'psql',
    [dbUrl, '-v', 'ON_ERROR_STOP=1', '--file', file, ...varArgs],
    {
      stdio: 'inherit',
      cwd: ROOT,
    },
  )
  if (result.error) {
    console.error(`psql não pôde iniciar: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`psql falhou para ${file} (exit ${result.status})`)
    process.exit(result.status ?? 1)
  }
}

const dbUrl = getDbUrl()

if (cmd === 'remove') {
  psql(dbUrl, join(DEMO_DIR, 'remove.sql'))
  console.log('Demo removida.')
  process.exit(0)
}

// seed | reset
if (cmd === 'reset') {
  psql(dbUrl, join(DEMO_DIR, 'remove.sql'))
}

const password = getDemoPassword()
psql(dbUrl, join(DEMO_DIR, 'conhecendo-a-help.sql'))
psql(dbUrl, join(DEMO_DIR, 'demo-user.sql'), { demo_password: password })

console.log('')
console.log('Demo carregada.')
console.log('Login: demo@help.local')
console.log(`Senha: ${password}`)
console.log('')
console.log('Rode:  npm run dev  e acesse http://localhost:3000/login')
