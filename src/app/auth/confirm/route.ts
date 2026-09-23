import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getPublicEnv } from '@/lib/env'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  const env = getPublicEnv()
  const base = env.NEXT_PUBLIC_SITE_URL

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=link_invalido', base))
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=link_invalido', base))
  }

  if (type === 'invite' || type === 'recovery') {
    return NextResponse.redirect(new URL('/redefinir-senha', base))
  }

  return NextResponse.redirect(new URL(next, base))
}
