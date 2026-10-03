// Liveness/readiness do Kubernetes (git-ops/academy). Não acessa Supabase nem o Core:
// só confirma que o processo Node responde. Fora do matcher do proxy (src/proxy.ts).
export const dynamic = 'force-dynamic'

export function GET() {
  return new Response('ok', {
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
  })
}
