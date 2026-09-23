/**
 * Pure progress calculation functions — no Supabase, no server-only imports.
 * Exported separately so they can be unit-tested directly.
 */

export type PathStatus = 'not_started' | 'in_progress' | 'completed'

export interface OverallProgress {
  requiredTotal: number
  requiredDone: number
  percent: number
}

/**
 * Computes overall onboarding progress per RN-05:
 *   percent = sum(required_done) / sum(required_total) * 100
 *   across required paths; if none are required, use all paths.
 */
export function computeOverallProgress(
  paths: Array<{ requiredTotal: number; requiredDone: number; pathRequired: boolean }>,
): OverallProgress {
  if (paths.length === 0) {
    return { requiredTotal: 0, requiredDone: 0, percent: 0 }
  }

  const requiredPaths = paths.filter((p) => p.pathRequired)
  const source = requiredPaths.length > 0 ? requiredPaths : paths

  const requiredTotal = source.reduce((sum, p) => sum + p.requiredTotal, 0)
  const requiredDone = source.reduce((sum, p) => sum + p.requiredDone, 0)

  const percent = requiredTotal === 0 ? 0 : Math.floor((requiredDone / requiredTotal) * 100)

  return { requiredTotal, requiredDone, percent }
}
