import { redirect } from 'next/navigation'
import { getAuthProvider } from '@/lib/auth'

export default async function HomePage() {
  const identity = await getAuthProvider().getIdentity()
  redirect(identity ? '/dashboard' : '/login')
}
