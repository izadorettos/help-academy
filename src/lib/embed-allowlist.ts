/**
 * Allowlist de domínios permitidos para iframes embed nas aulas.
 * Qualquer URL fora desta lista não será renderizada como iframe.
 */

export const EMBED_ALLOWLIST: string[] = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'docs.google.com',
  'slides.google.com',
  'www.loom.com',
  'fast.wistia.net',
  'player.vimeo.com',
]

/**
 * Verifica se a URL de embed pertence a um domínio permitido.
 * Retorna false para URLs inválidas ou domínios fora da allowlist.
 */
export function isAllowedEmbed(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname.toLowerCase()
    return EMBED_ALLOWLIST.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
    )
  } catch {
    return false
  }
}

/**
 * Converte uma URL do YouTube (watch ou youtu.be) para a URL de embed.
 * Retorna null para URLs que não são do YouTube ou não possuem ID de vídeo.
 *
 * Exemplos suportados:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ  → https://www.youtube.com/embed/dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ                  → https://www.youtube.com/embed/dQw4w9WgXcQ
 *   https://www.youtube.com/embed/dQw4w9WgXcQ     → (retorna como está)
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Already an embed URL
    if (
      (hostname === 'www.youtube.com' || hostname === 'youtube.com') &&
      parsed.pathname.startsWith('/embed/')
    ) {
      return url
    }

    // youtu.be short URL
    if (hostname === 'youtu.be') {
      const videoId = parsed.pathname.replace(/^\//, '').split('/')[0]
      if (!videoId) return null
      return `https://www.youtube.com/embed/${videoId}`
    }

    // youtube.com/watch?v=...
    if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
      const videoId = parsed.searchParams.get('v')
      if (!videoId) return null
      return `https://www.youtube.com/embed/${videoId}`
    }

    return null
  } catch {
    return null
  }
}
