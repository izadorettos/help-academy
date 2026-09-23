import { describe, expect, it } from 'vitest'
import { computeOverallProgress } from '@/features/learning/progress'

describe('computeOverallProgress (RN-05)', () => {
  it('returns zero when no paths', () => {
    expect(computeOverallProgress([])).toEqual({ requiredTotal: 0, requiredDone: 0, percent: 0 })
  })

  it('returns 0% when nothing is done', () => {
    const result = computeOverallProgress([
      { requiredTotal: 5, requiredDone: 0, pathRequired: true },
    ])
    expect(result).toEqual({ requiredTotal: 5, requiredDone: 0, percent: 0 })
  })

  it('returns 100% when all done', () => {
    const result = computeOverallProgress([
      { requiredTotal: 5, requiredDone: 5, pathRequired: true },
      { requiredTotal: 3, requiredDone: 3, pathRequired: true },
    ])
    expect(result).toEqual({ requiredTotal: 8, requiredDone: 8, percent: 100 })
  })

  it('sums across multiple required paths', () => {
    // 3 done out of 10 total → 30%
    const result = computeOverallProgress([
      { requiredTotal: 5, requiredDone: 2, pathRequired: true },
      { requiredTotal: 5, requiredDone: 1, pathRequired: true },
    ])
    expect(result).toEqual({ requiredTotal: 10, requiredDone: 3, percent: 30 })
  })

  it('uses only required paths when any exist (ignores optional paths)', () => {
    // required path: 3/5 = 60%
    // optional path: 4/4 — should be excluded
    const result = computeOverallProgress([
      { requiredTotal: 5, requiredDone: 3, pathRequired: true },
      { requiredTotal: 4, requiredDone: 4, pathRequired: false },
    ])
    expect(result).toEqual({ requiredTotal: 5, requiredDone: 3, percent: 60 })
  })

  it('falls back to all paths when no required paths exist', () => {
    // No required paths: use all — 4/10 = 40%
    const result = computeOverallProgress([
      { requiredTotal: 5, requiredDone: 2, pathRequired: false },
      { requiredTotal: 5, requiredDone: 2, pathRequired: false },
    ])
    expect(result).toEqual({ requiredTotal: 10, requiredDone: 4, percent: 40 })
  })

  it('floors the percentage (no rounding up)', () => {
    // 1/3 = 33.33% → floors to 33
    const result = computeOverallProgress([
      { requiredTotal: 3, requiredDone: 1, pathRequired: true },
    ])
    expect(result.percent).toBe(33)
  })

  it('returns 0% when required_total is zero (no required published lessons)', () => {
    const result = computeOverallProgress([
      { requiredTotal: 0, requiredDone: 0, pathRequired: true },
    ])
    expect(result).toEqual({ requiredTotal: 0, requiredDone: 0, percent: 0 })
  })
})
