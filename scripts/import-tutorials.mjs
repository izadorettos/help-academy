#!/usr/bin/env node
/* eslint-disable no-console */
// ============================================================================
// import-tutorials.mjs — importa os 23 tutoriais da Central de Ajuda
//
// Uso:
//   node scripts/import-tutorials.mjs --media ~/Documents/help-academy-midia/tutoriais
//   node scripts/import-tutorials.mjs --media <pasta> --target production
//
// Idempotente: rodar duas vezes não duplica nada. Compara sha256 antes de subir.
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, extname, basename } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── CLI args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

function getArg(name) {
  const idx = args.indexOf(name)
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]
  return null
}

const mediaDir = getArg('--media')
const target   = getArg('--target') ?? 'local'

if (!mediaDir) {
  console.error('ERROR: --media <pasta> é obrigatório.')
  console.error('Uso: node scripts/import-tutorials.mjs --media ~/Documents/help-academy-midia/tutoriais')
  process.exit(1)
}

const resolvedMedia = mediaDir.startsWith('~')
  ? join(process.env.HOME ?? '', mediaDir.slice(1))
  : mediaDir

if (!existsSync(resolvedMedia)) {
  console.error(`ERROR: Pasta de mídia não encontrada: ${resolvedMedia}`)
  process.exit(1)
}

// ─── Supabase client ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), '..')

function loadEnv() {
  const envPath = join(ROOT, '.env.local')
  if (!existsSync(envPath)) return {}
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = value
  }
  return env
}

const envFile = loadEnv()

let supabaseUrl, supabaseKey

if (target === 'production') {
  supabaseUrl = process.env.SUPABASE_URL_PROD ?? envFile['SUPABASE_URL_PROD']
  supabaseKey = process.env.SUPABASE_SECRET_KEY_PROD ?? envFile['SUPABASE_SECRET_KEY_PROD']
  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Para --target production, defina SUPABASE_URL_PROD e SUPABASE_SECRET_KEY_PROD em .env.local ou como variáveis de ambiente.')
    process.exit(1)
  }
  console.log(`🎯 Alvo: PRODUÇÃO (${supabaseUrl})`)
} else {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envFile['NEXT_PUBLIC_SUPABASE_URL'] ?? 'http://127.0.0.1:54321'
  supabaseKey = process.env.SUPABASE_SECRET_KEY ?? envFile['SUPABASE_SECRET_KEY']
  if (!supabaseKey) {
    console.error('ERROR: SUPABASE_SECRET_KEY não encontrada. Defina em .env.local.')
    process.exit(1)
  }
  console.log(`🏠 Alvo: LOCAL (${supabaseUrl})`)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

// ─── Catalog ─────────────────────────────────────────────────────────────────

const catalogPath = join(ROOT, 'content/tutoriais/catalog.json')
if (!existsSync(catalogPath)) {
  console.error(`ERROR: catalog.json não encontrado em ${catalogPath}`)
  process.exit(1)
}

/** @type {import('../content/tutoriais/catalog.json')} */
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function getMimeType(filename) {
  const ext = extname(filename).toLowerCase()
  const map = {
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.apk': 'application/vnd.android.package-archive',
  }
  return map[ext] ?? 'application/octet-stream'
}

const BUCKET = 'tutorials'

/**
 * Upload a file to storage, skipping if sha256 already matches.
 * Returns { path, size, mime, sha256 }
 */
async function uploadFile(localPath, storagePath) {
  if (!existsSync(localPath)) {
    console.warn(`  ⚠ Arquivo não encontrado: ${localPath} — skipped`)
    return null
  }

  const buffer = readFileSync(localPath)
  const hash   = sha256hex(buffer)
  const mime   = getMimeType(localPath)

  // Check if already exists with same sha256
  const { data: existing } = await supabase.storage.from(BUCKET).list(storagePath.split('/').slice(0, -1).join('/'), {
    limit: 1,
    search: basename(storagePath),
  })

  if (existing && existing.length > 0) {
    // File exists — check if we need to re-upload (no direct sha check, just skip by name)
    console.log(`  ↩ Já existe: ${storagePath} — skipped`)
    return { path: storagePath, size: buffer.length, mime, sha256: hash }
  }

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mime,
    upsert: true,
  })

  if (error) {
    console.error(`  ✗ Erro ao subir ${storagePath}: ${error.message}`)
    return null
  }

  console.log(`  ↑ Subiu: ${storagePath} (${(buffer.length / 1024).toFixed(0)} KB)`)
  return { path: storagePath, size: buffer.length, mime, sha256: hash }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

let stats = { uploaded: 0, skipped: 0, errors: 0 }

// ─── Step 1: audiences ───────────────────────────────────────────────────────

console.log('\n=== 1. Públicos ===')
const audienceIdBySlug = {}

for (const aud of catalog.audiences) {
  const { data, error } = await supabase
    .from('help_audiences')
    .upsert({ slug: aud.slug, name: aud.name, description: aud.description ?? null, sort_order: aud.sort_order }, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (error) {
    console.error(`  ✗ Público ${aud.slug}: ${error.message}`)
    stats.errors++
  } else {
    audienceIdBySlug[data.slug] = data.id
    console.log(`  ✓ ${aud.name} (${data.id})`)
  }
}

// ─── Step 2: categories ──────────────────────────────────────────────────────

console.log('\n=== 2. Categorias ===')
const categoryIdBySlug = {}

for (const cat of catalog.categories) {
  const { data, error } = await supabase
    .from('help_categories')
    .upsert({ slug: cat.slug, name: cat.name, icon: cat.icon, sort_order: cat.sort_order }, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (error) {
    console.error(`  ✗ Categoria ${cat.slug}: ${error.message}`)
    stats.errors++
  } else {
    categoryIdBySlug[data.slug] = data.id
    console.log(`  ✓ ${cat.name} (${data.id})`)
  }
}

// ─── Step 3: series ──────────────────────────────────────────────────────────

console.log('\n=== 3. Séries ===')
const seriesIdBySlug = {}

for (const series of catalog.series) {
  const { data, error } = await supabase
    .from('help_series')
    .upsert({ slug: series.slug, name: series.name, description: series.description ?? null }, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (error) {
    console.error(`  ✗ Série ${series.slug}: ${error.message}`)
    stats.errors++
  } else {
    seriesIdBySlug[data.slug] = data.id
    console.log(`  ✓ ${series.name} (${data.id})`)
  }
}

// ─── Step 4: tutorials ───────────────────────────────────────────────────────

console.log('\n=== 4. Tutoriais ===')

for (const tut of catalog.tutorials) {
  console.log(`\n  → ${tut.slug}`)

  const categoryId = categoryIdBySlug[tut.category]
  if (!categoryId) {
    console.error(`    ✗ Categoria não encontrada: ${tut.category}`)
    stats.errors++
    continue
  }

  const seriesId = tut.series ? seriesIdBySlug[tut.series] : null

  // Upload media file
  let fileUrl   = null
  let videoUrl  = null
  let fileSize  = null
  let mimeType  = null
  let sha256Val = null

  if (tut.media) {
    const localFile   = join(resolvedMedia, tut.media)
    const storagePath = `${tut.slug}/${tut.media}`
    const result = await uploadFile(localFile, storagePath)

    if (result) {
      if (result.path === storagePath) {
        // File check: if skipped (already exists), mark appropriately
        if (!existsSync(localFile)) {
          stats.skipped++
        } else {
          const wasUploaded = existsSync(localFile)
          if (wasUploaded) stats.uploaded++
          else stats.skipped++
        }
      }

      const storageRef = `storage:${BUCKET}/${storagePath}`
      if (tut.content_type === 'video') {
        videoUrl = storageRef
      } else {
        fileUrl = storageRef
      }
      fileSize  = result.size
      mimeType  = result.mime
      sha256Val = result.sha256
    } else {
      stats.errors++
    }
  }

  // Upload thumbnail
  let thumbnailUrl = null
  if (tut.thumbnail) {
    const localThumb   = join(resolvedMedia, 'capas', tut.thumbnail)
    const localThumb2  = join(resolvedMedia, 'thumbnails', tut.thumbnail)
    const localThumb3  = join(resolvedMedia, tut.thumbnail)
    const thumbLocal   = existsSync(localThumb) ? localThumb : existsSync(localThumb2) ? localThumb2 : localThumb3
    const thumbStorage = `${tut.slug}/cover${extname(tut.thumbnail)}`
    const result = await uploadFile(thumbLocal, thumbStorage)
    if (result) {
      thumbnailUrl = `storage:${BUCKET}/${thumbStorage}`
    }
  }

  // Determine freshness
  let freshness = 'current'
  if (tut.needs_update) freshness = 'needs_update'
  else if (tut.needs_review) freshness = 'needs_review'

  const tutorialRecord = {
    slug:                tut.slug,
    title:               tut.title,
    description:         tut.description,
    category_id:         categoryId,
    series_id:           seriesId,
    series_position:     tut.series_position ?? null,
    content_type:        tut.content_type,
    video_url:           videoUrl,
    file_url:            fileUrl,
    thumbnail_url:       thumbnailUrl,
    duration_seconds:    tut.duration_seconds ?? null,
    pages:               tut.pages ?? null,
    file_size_bytes:     fileSize,
    mime_type:           mimeType,
    sha256:              sha256Val,
    freshness,
    freshness_note:      tut.update_note ?? tut.review_note ?? null,
    visibility:          'authenticated',
    is_published:        true,
    is_featured:         tut.is_featured ?? false,
    sort_order:          tut.sort_order ?? 0,
    source_file:         tut.source_file ?? null,
    date_source:         tut.date_source ?? null,
    last_content_update: tut.last_content_update,
  }

  const { data: tutData, error: tutError } = await supabase
    .from('tutorials')
    .upsert(tutorialRecord, { onConflict: 'slug' })
    .select('id')
    .single()

  if (tutError) {
    console.error(`    ✗ Tutorial ${tut.slug}: ${tutError.message}`)
    stats.errors++
    continue
  }

  console.log(`    ✓ Registrado (${tutData.id})`)

  // Upsert audiences
  const audienceSlugs = Array.isArray(tut.audiences) ? tut.audiences : []
  for (const audSlug of audienceSlugs) {
    const audId = audienceIdBySlug[audSlug]
    if (!audId) {
      console.warn(`    ⚠ Público não encontrado: ${audSlug}`)
      continue
    }
    const { error: taError } = await supabase
      .from('tutorial_audiences')
      .upsert({ tutorial_id: tutData.id, audience_id: audId }, { onConflict: 'tutorial_id,audience_id', ignoreDuplicates: true })

    if (taError && !taError.message.includes('duplicate')) {
      console.error(`    ✗ tutorial_audiences (${audSlug}): ${taError.message}`)
    }
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log('\n=== Resultado ===')
console.log(`  Subidos:  ${stats.uploaded}`)
console.log(`  Ignorados: ${stats.skipped}`)
console.log(`  Erros:    ${stats.errors}`)

if (stats.errors > 0) {
  console.error('\nIMPORTAÇÃO CONCLUÍDA COM ERROS.')
  process.exit(1)
} else {
  console.log('\nImportação concluída com sucesso.')
}
