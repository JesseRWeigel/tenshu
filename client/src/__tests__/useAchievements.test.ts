import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAchievements } from '../hooks/useAchievements'
import type { ResultRow } from '@tenshu/shared'

function makeRow(overrides?: Partial<ResultRow>): ResultRow {
  return {
    timestamp: new Date().toISOString(),
    cycle: 1,
    task: 'test-task',
    agent: 'coder',
    score: 7,
    status: 'keep',
    description: 'test description',
    ...overrides,
  }
}

describe('useAchievements', () => {
  it('returns all 10 achievements', () => {
    const { result } = renderHook(() => useAchievements([]))
    expect(result.current).toHaveLength(10)
  })

  it('all achievements are locked with no data', () => {
    const { result } = renderHook(() => useAchievements([]))
    for (const a of result.current) {
      expect(a.unlocked).toBe(false)
      expect(a.unlockedAt).toBeUndefined()
    }
  })

  it('each achievement has required fields', () => {
    const { result } = renderHook(() => useAchievements([]))
    for (const a of result.current) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.description).toBeTruthy()
      expect(a.icon).toBeTruthy()
      expect(typeof a.unlocked).toBe('boolean')
    }
  })

  it('unlocks "first-blood" with any completed task', () => {
    const rows = [makeRow()]
    const { result } = renderHook(() => useAchievements(rows))
    const firstBlood = result.current.find((a) => a.id === 'first-blood')
    expect(firstBlood?.unlocked).toBe(true)
    expect(firstBlood?.unlockedAt).toBeDefined()
  })

  it('unlocks "perfect-score" when score >= 10', () => {
    const rows = [makeRow({ score: 10 })]
    const { result } = renderHook(() => useAchievements(rows))
    const perfect = result.current.find((a) => a.id === 'perfect-score')
    expect(perfect?.unlocked).toBe(true)
  })

  it('does not unlock "perfect-score" when score < 10', () => {
    const rows = [makeRow({ score: 9.9 })]
    const { result } = renderHook(() => useAchievements(rows))
    const perfect = result.current.find((a) => a.id === 'perfect-score')
    expect(perfect?.unlocked).toBe(false)
  })

  it('unlocks "hat-trick" with 3 keeps in a row', () => {
    const rows = [
      makeRow({ status: 'keep' }),
      makeRow({ status: 'keep' }),
      makeRow({ status: 'keep' }),
    ]
    const { result } = renderHook(() => useAchievements(rows))
    const hatTrick = result.current.find((a) => a.id === 'hat-trick')
    expect(hatTrick?.unlocked).toBe(true)
  })

  it('does not unlock "hat-trick" when streak is broken', () => {
    const rows = [
      makeRow({ status: 'keep' }),
      makeRow({ status: 'keep' }),
      makeRow({ status: 'discard' }),
      makeRow({ status: 'keep' }),
    ]
    const { result } = renderHook(() => useAchievements(rows))
    const hatTrick = result.current.find((a) => a.id === 'hat-trick')
    expect(hatTrick?.unlocked).toBe(false)
  })

  it('unlocks "on-fire" with 5 keeps in a row', () => {
    const rows = Array.from({ length: 5 }, () => makeRow({ status: 'keep' }))
    const { result } = renderHook(() => useAchievements(rows))
    const onFire = result.current.find((a) => a.id === 'on-fire')
    expect(onFire?.unlocked).toBe(true)
  })

  it('unlocks "untouchable" with 10 keeps in a row', () => {
    const rows = Array.from({ length: 10 }, () => makeRow({ status: 'keep' }))
    const { result } = renderHook(() => useAchievements(rows))
    const untouchable = result.current.find((a) => a.id === 'untouchable')
    expect(untouchable?.unlocked).toBe(true)
  })

  it('unlocks "comeback-kid" with keep after discard', () => {
    const rows = [makeRow({ status: 'discard' }), makeRow({ status: 'keep' })]
    const { result } = renderHook(() => useAchievements(rows))
    const comeback = result.current.find((a) => a.id === 'comeback-kid')
    expect(comeback?.unlocked).toBe(true)
  })

  it('does not unlock "comeback-kid" without discard-then-keep pattern', () => {
    const rows = [makeRow({ status: 'keep' }), makeRow({ status: 'discard' })]
    const { result } = renderHook(() => useAchievements(rows))
    const comeback = result.current.find((a) => a.id === 'comeback-kid')
    expect(comeback?.unlocked).toBe(false)
  })

  it('unlocks "night-owl" for task between midnight and 5am', () => {
    const nightTime = new Date()
    nightTime.setHours(2, 30, 0, 0) // 2:30 AM
    const rows = [makeRow({ timestamp: nightTime.toISOString() })]
    const { result } = renderHook(() => useAchievements(rows))
    const nightOwl = result.current.find((a) => a.id === 'night-owl')
    expect(nightOwl?.unlocked).toBe(true)
  })

  it('does not unlock "night-owl" for daytime task', () => {
    const dayTime = new Date()
    dayTime.setHours(14, 0, 0, 0) // 2:00 PM
    const rows = [makeRow({ timestamp: dayTime.toISOString() })]
    const { result } = renderHook(() => useAchievements(rows))
    const nightOwl = result.current.find((a) => a.id === 'night-owl')
    expect(nightOwl?.unlocked).toBe(false)
  })

  it('unlocks "consistency" with 5 scores > 7', () => {
    const rows = Array.from({ length: 5 }, () => makeRow({ score: 8 }))
    const { result } = renderHook(() => useAchievements(rows))
    const consistency = result.current.find((a) => a.id === 'consistency')
    expect(consistency?.unlocked).toBe(true)
  })

  it('does not unlock "consistency" with only 4 high scores', () => {
    const rows = [
      ...Array.from({ length: 4 }, () => makeRow({ score: 8 })),
      makeRow({ score: 3 }),
    ]
    const { result } = renderHook(() => useAchievements(rows))
    const consistency = result.current.find((a) => a.id === 'consistency')
    expect(consistency?.unlocked).toBe(false)
  })

  it('unlocks "renaissance" with 4+ distinct task types', () => {
    const rows = [
      makeRow({ task: 'code-review' }),
      makeRow({ task: 'testing' }),
      makeRow({ task: 'documentation' }),
      makeRow({ task: 'deployment' }),
    ]
    const { result } = renderHook(() => useAchievements(rows))
    const renaissance = result.current.find((a) => a.id === 'renaissance')
    expect(renaissance?.unlocked).toBe(true)
  })

  it('does not unlock "renaissance" with fewer than 4 task types', () => {
    const rows = [
      makeRow({ task: 'code-review' }),
      makeRow({ task: 'testing' }),
      makeRow({ task: 'code-review' }),
    ]
    const { result } = renderHook(() => useAchievements(rows))
    const renaissance = result.current.find((a) => a.id === 'renaissance')
    expect(renaissance?.unlocked).toBe(false)
  })

  it('unlocks "centurion" at 100 rows', () => {
    const rows = Array.from({ length: 100 }, (_, i) =>
      makeRow({ cycle: i + 1 }),
    )
    const { result } = renderHook(() => useAchievements(rows))
    const centurion = result.current.find((a) => a.id === 'centurion')
    expect(centurion?.unlocked).toBe(true)
  })

  it('does not unlock "centurion" at 99 rows', () => {
    const rows = Array.from({ length: 99 }, (_, i) => makeRow({ cycle: i + 1 }))
    const { result } = renderHook(() => useAchievements(rows))
    const centurion = result.current.find((a) => a.id === 'centurion')
    expect(centurion?.unlocked).toBe(false)
  })
})
