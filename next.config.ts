import type { NextConfig } from 'next'
import { EMBED_ALLOWLIST } from './src/lib/embed-allowlist'

// Domínios permitidos no frame-src da CSP, derivados da allowlist de embeds.
// Formato: https://dominio (sem wildcard de subdomínio para YouTube/Vimeo principais)
const frameSrcDomains = [...new Set(EMBED_ALLOWLIST)]
  .map((domain) => `https://${domain}`)
  .join(' ')

// Headers de segurança. CSP frame-src usa a allowlist de embeds definida em
// src/lib/embed-allowlist.ts — manter os dois sincronizados.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      `frame-src 'self' ${frameSrcDomains}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
