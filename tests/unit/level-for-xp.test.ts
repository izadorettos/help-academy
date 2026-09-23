import { describe, expect, it } from 'vitest'

// ─── Pure TypeScript mirror of the SQL level_for_xp function ─────────────────
//
// Mirrors the behavior of public.level_for_xp(p_xp integer) from migration 0006.
// Seed levels: (1,0,'Iniciante') (2,100,'Aprendiz') (3,250,'Avançado')
//              (4,500,'Especialista') (5,1000,'Mestre')
//
// SQL logic:
//   SELECT level, min_xp, lead(min_xp) OVER (ORDER BY min_xp) AS next_min_xp
//   FROM levels
//   WHERE min_xp <= p_xp
//   ORDER BY min_xp DESC
//   LIMIT 1;
//
// Because the WHERE filter is applied before LEAD, next_min_xp is computed
// within the filtered set only — so for xp=100 the set is [level1, level2],
// and lead(level2) = null (it's the last in the window).
// The function returns the row with the highest min_xp ≤ p_xp.

export interface LevelRow {
  level: number
  minXp: number
  name: string
  nextMinXp: number | null
}

const LEVELS: Omit<LevelRow, 'nextMinXp'>[] = [
  { level: 1, minXp: 0,    name: 'Iniciante' },
  { level: 2, minXp: 100,  name: 'Aprendiz' },
  { level: 3, minXp: 250,  name: 'Avançado' },
  { level: 4, minXp: 500,  name: 'Especialista' },
  { level: 5, minXp: 1000, name: 'Mestre' },
]

/**
 * Pure TypeScript implementation of the SQL level_for_xp function.
 * Returns the current level row for a given XP total.
 * next_min_xp is the min_xp of the NEXT level (not restricted to filtered set),
 * matching the intended UX usage (progress bar needs to know the next threshold).
 */
export function levelForXp(xp: number): LevelRow {
  // Find the highest level where min_xp <= xp
  let current = LEVELS[0]!
  for (const l of LEVELS) {
    if (l.minXp <= xp) {
      current = l
    }
  }

  const nextLevel = LEVELS.find((l) => l.minXp > current.minXp) ?? null

  return {
    level: current.level,
    minXp: current.minXp,
    name: current.name,
    nextMinXp: nextLevel?.minXp ?? null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('levelForXp — pure TS mirror of SQL level_for_xp', () => {
  // ── Level 1 (0–99 XP) ───────────────────────────────────────────────────────
  it('returns level 1 at 0 XP (minimum)', () => {
    expect(levelForXp(0).level).toBe(1)
  })

  it('returns level 1 name "Iniciante" at 0 XP', () => {
    expect(levelForXp(0).name).toBe('Iniciante')
  })

  it('returns level 1 at 99 XP (just below threshold)', () => {
    expect(levelForXp(99).level).toBe(1)
  })

  it('returns next_min_xp = 100 at level 1', () => {
    expect(levelForXp(0).nextMinXp).toBe(100)
    expect(levelForXp(99).nextMinXp).toBe(100)
  })

  it('returns min_xp = 0 at level 1', () => {
    expect(levelForXp(0).minXp).toBe(0)
  })

  // ── Level 2 (100–249 XP) ────────────────────────────────────────────────────
  it('returns level 2 at exactly 100 XP (boundary)', () => {
    expect(levelForXp(100).level).toBe(2)
  })

  it('returns level 2 name "Aprendiz" at 100 XP', () => {
    expect(levelForXp(100).name).toBe('Aprendiz')
  })

  it('returns level 2 at 249 XP (just below next threshold)', () => {
    expect(levelForXp(249).level).toBe(2)
  })

  it('returns next_min_xp = 250 at level 2', () => {
    expect(levelForXp(100).nextMinXp).toBe(250)
    expect(levelForXp(249).nextMinXp).toBe(250)
  })

  // ── Level 3 (250–499 XP) ────────────────────────────────────────────────────
  it('returns level 3 at exactly 250 XP (boundary)', () => {
    expect(levelForXp(250).level).toBe(3)
  })

  it('returns level 3 name "Avançado" at 250 XP', () => {
    expect(levelForXp(250).name).toBe('Avançado')
  })

  it('returns level 3 at 499 XP', () => {
    expect(levelForXp(499).level).toBe(3)
  })

  it('returns next_min_xp = 500 at level 3', () => {
    expect(levelForXp(250).nextMinXp).toBe(500)
    expect(levelForXp(499).nextMinXp).toBe(500)
  })

  // ── Level 4 (500–999 XP) ────────────────────────────────────────────────────
  it('returns level 4 at exactly 500 XP (boundary)', () => {
    expect(levelForXp(500).level).toBe(4)
  })

  it('returns level 4 name "Especialista" at 500 XP', () => {
    expect(levelForXp(500).name).toBe('Especialista')
  })

  it('returns level 4 at 999 XP', () => {
    expect(levelForXp(999).level).toBe(4)
  })

  it('returns next_min_xp = 1000 at level 4', () => {
    expect(levelForXp(500).nextMinXp).toBe(1000)
    expect(levelForXp(999).nextMinXp).toBe(1000)
  })

  // ── Level 5 (1000+ XP) ──────────────────────────────────────────────────────
  it('returns level 5 at exactly 1000 XP (boundary)', () => {
    expect(levelForXp(1000).level).toBe(5)
  })

  it('returns level 5 name "Mestre" at 1000 XP', () => {
    expect(levelForXp(1000).name).toBe('Mestre')
  })

  it('returns level 5 at 9999 XP (well above max)', () => {
    expect(levelForXp(9999).level).toBe(5)
  })

  it('returns next_min_xp = null at level 5 (maximum level)', () => {
    expect(levelForXp(1000).nextMinXp).toBeNull()
    expect(levelForXp(9999).nextMinXp).toBeNull()
  })

  // ── Progress percentage helpers ─────────────────────────────────────────────
  it('progress within a level: 0% at level start', () => {
    const row = levelForXp(100)
    const progress = row.nextMinXp !== null
      ? Math.floor(((100 - row.minXp) / (row.nextMinXp - row.minXp)) * 100)
      : 100
    expect(progress).toBe(0)
  })

  it('progress within a level: 50% at midpoint', () => {
    // level 2: 100–250, midpoint=175 → (175-100)/(250-100) = 75/150 = 50%
    const row = levelForXp(175)
    expect(row.level).toBe(2)
    const progress = row.nextMinXp !== null
      ? Math.floor(((175 - row.minXp) / (row.nextMinXp - row.minXp)) * 100)
      : 100
    expect(progress).toBe(50)
  })

  it('progress at max level is treated as 100%', () => {
    const row = levelForXp(1500)
    expect(row.nextMinXp).toBeNull()
    const progress = row.nextMinXp !== null ? 0 : 100
    expect(progress).toBe(100)
  })
})
