'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Gauge,
} from 'lucide-react'
import { saveLessonProgress } from '@/features/learning/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chapter {
  label: string
  seconds: number
}

interface VideoConfig {
  provider?: 'placeholder' | string
  duration_seconds?: number
  chapters?: Chapter[]
  transcript?: string
  poster?: string
}

interface VideoPlayerProps {
  lessonId: string
  externalUrl: string | null
  config: VideoConfig
  initialProgressPercent: number
  initialPositionSeconds: number | null
  completed: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function getYouTubeEmbedInline(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    }
    if (host === 'youtube-nocookie.com') return url
  } catch {
    return null
  }
  return null
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2]

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoPlayer({
  lessonId,
  externalUrl,
  config,
  initialProgressPercent,
  initialPositionSeconds,
  completed,
}: VideoPlayerProps) {
  const provider = (config.provider ?? '').toString()
  const duration = Number(config.duration_seconds ?? 0) || 0

  const [percent, setPercent] = useState<number>(
    Math.max(0, Math.min(100, initialProgressPercent)),
  )
  const [position, setPosition] = useState<number>(
    Math.max(0, Math.min(duration || 999999, initialPositionSeconds ?? 0)),
  )
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)

  const chapters: Chapter[] = useMemo(
    () => (Array.isArray(config.chapters) ? config.chapters.filter(
      (c): c is Chapter =>
        !!c && typeof c === 'object' && typeof c.label === 'string' && typeof c.seconds === 'number',
    ) : []),
    [config.chapters],
  )

  const embedUrl = externalUrl ? getYouTubeEmbedInline(externalUrl) : null

  // ── Progress persistence ────────────────────────────────────────────────
  // Throttled call: at most one server action every 10s while playing.
  const lastSavedRef = useRef<number>(0)

  const persist = useCallback(
    async (nextPercent: number, nextPosition: number) => {
      lastSavedRef.current = Date.now()
      const clamped = Math.max(0, Math.min(100, Math.round(nextPercent)))
      await saveLessonProgress(lessonId, clamped, Math.max(0, Math.round(nextPosition)))
    },
    [lessonId],
  )

  // ── Placeholder tick ────────────────────────────────────────────────────
  useEffect(() => {
    if (provider !== 'placeholder' || !duration || !playing) return

    const id = window.setInterval(() => {
      setPosition((prev) => {
        const next = Math.min(duration, prev + speed)
        const nextPct = Math.floor((next / duration) * 100)
        setPercent((p) => Math.max(p, nextPct))
        const now = Date.now()
        if (now - lastSavedRef.current >= 10_000 || nextPct >= 100) {
          void persist(nextPct, next)
        }
        if (next >= duration) {
          setPlaying(false)
        }
        return next
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [provider, duration, playing, speed, persist])

  // Ensure final position saves when user unmounts / navigates away
  useEffect(() => {
    return () => {
      if (position > 0) {
        void persist(percent, position)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSeek = useCallback(
    (delta: number) => {
      setPosition((prev) => {
        if (!duration) return prev
        const next = Math.max(0, Math.min(duration, prev + delta))
        const nextPct = Math.floor((next / duration) * 100)
        setPercent((p) => Math.max(p, nextPct))
        void persist(Math.max(percent, nextPct), next)
        return next
      })
    },
    [duration, percent, persist],
  )

  const jumpTo = useCallback(
    (seconds: number) => {
      if (!duration) return
      const next = Math.max(0, Math.min(duration, seconds))
      const nextPct = Math.floor((next / duration) * 100)
      setPosition(next)
      setPercent((p) => Math.max(p, nextPct))
      void persist(Math.max(percent, nextPct), next)
    },
    [duration, percent, persist],
  )

  // ── Providers reais (YouTube / Vimeo) apenas via iframe ────────────────
  if (provider !== 'placeholder' && embedUrl) {
    return (
      <div className="space-y-3">
        <div className="aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            src={embedUrl}
            title="Vídeo da aula"
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="text-xs text-text-subtle">
          Progresso deste vídeo é registrado quando você marca como concluído.
        </p>
      </div>
    )
  }

  if (provider !== 'placeholder' && externalUrl && !embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-navy">
        <video src={externalUrl} controls className="size-full">
          <track kind="captions" />
        </video>
      </div>
    )
  }

  // ── Placeholder player ────────────────────────────────────────────────
  const progressPct = duration ? Math.round((position / duration) * 100) : percent

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-navy text-on-dark"
        style={config.poster ? { backgroundImage: `url(${config.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          <div className="text-xs uppercase tracking-wide text-on-dark-muted">
            Vídeo — pré-visualização
          </div>

          <div className="flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="flex size-16 items-center justify-center rounded-full bg-brand text-on-brand shadow-pop focus:outline-none focus:ring-2 focus:ring-focus"
              aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}
            >
              {playing ? <Pause className="size-7" /> : <Play className="size-7 fill-current" />}
            </button>
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => onSeek(-10)}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-focus"
                aria-label="Voltar 10 segundos"
              >
                <Rewind className="size-4" aria-hidden />
                10s
              </button>
              <button
                type="button"
                onClick={() => onSeek(10)}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-focus"
                aria-label="Avançar 10 segundos"
              >
                10s
                <FastForward className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-on-dark-muted">
              <span>{formatTime(position)}</span>
              <span>{duration ? formatTime(duration) : '--:--'}</span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
              aria-label="Progresso do vídeo"
            >
              <div
                className="h-full bg-brand"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-1 text-on-dark-muted">
                <Gauge className="size-3.5" aria-hidden />
                Velocidade
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="ml-1 rounded-md bg-white/10 px-1 py-0.5 text-on-dark focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {SPEED_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="text-text">
                      {opt}x
                    </option>
                  ))}
                </select>
              </label>
              {completed && (
                <span className="rounded-full bg-success px-2 py-0.5 text-[0.6875rem] font-semibold text-on-brand">
                  Concluída
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {chapters.length > 0 && (
        <section aria-label="Capítulos do vídeo" className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
            Capítulos
          </h2>
          <ul className="grid gap-1">
            {chapters.map((c, idx) => (
              <li key={`${c.seconds}-${idx}`}>
                <button
                  type="button"
                  onClick={() => jumpTo(c.seconds)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  <span className="truncate text-left">{c.label}</span>
                  <span className="ml-2 shrink-0 text-xs text-text-subtle">
                    {formatTime(c.seconds)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {config.transcript && (
        <details className="rounded-md border border-border bg-surface p-3 text-sm">
          <summary className="cursor-pointer text-sm font-semibold">Transcrição</summary>
          <p className="mt-2 whitespace-pre-line text-text-muted">{config.transcript}</p>
        </details>
      )}
    </div>
  )
}
