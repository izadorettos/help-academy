'use client'
import { useEffect, useRef } from 'react'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string
      theme?: 'light' | 'dark' | 'auto'
      language?: string
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<TurnstileApi> | undefined

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile indisponível'))
    script.onerror = () => {
      scriptPromise = undefined
      reject(new Error('Falha ao carregar o Turnstile'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface TurnstileWidgetProps {
  siteKey: string
  /** Muda a cada tentativa de login: o token é de uso único e precisa ser renovado. */
  resetKey: unknown
  onTokenChange: (hasToken: boolean) => void
}

/**
 * Cloudflare Turnstile. O widget injeta o campo oculto `cf-turnstile-response` no formulário
 * que o contém; o Server Action repassa esse token ao Core, que o valida.
 */
export function TurnstileWidget({ siteKey, resetKey, onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenChangeRef = useRef(onTokenChange)

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange
  }, [onTokenChange])

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          language: 'pt-br',
          callback: () => onTokenChangeRef.current(true),
          'expired-callback': () => onTokenChangeRef.current(false),
          'error-callback': () => onTokenChangeRef.current(false),
        })
      })
      .catch((error: unknown) => {
        console.error(error)
        onTokenChangeRef.current(false)
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }
  }, [siteKey])

  useEffect(() => {
    if (resetKey === null || !widgetIdRef.current || !window.turnstile) return
    onTokenChangeRef.current(false)
    window.turnstile.reset(widgetIdRef.current)
  }, [resetKey])

  return <div ref={containerRef} className="flex min-h-[65px] justify-center" />
}
