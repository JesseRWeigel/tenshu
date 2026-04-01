import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePowerLevel } from '../hooks/usePowerLevel'
import type { CycleEntry } from '../hooks/useAgentHistory'

function makeEntry(overrides?: Partial<CycleEntry>): CycleEntry {
  return {
    cycle: 1,
    task: 'test-task',
    score: 5,
    status: 'keep',
    description: 'test',
    timestamp: new Date().toISOString(),
    detailedTask: 'detailed test task',
    verdict: 'pass',
    resultLength: 100,
    ...overrides,
  }
}

describe('usePowerLevel', () => {
  it('returns zero-state for undefined input', () => {
    const { result } = renderHook(() => usePowerLevel(undefined))
    expect(result.current.xp).toBe(0)
    expect(result.current.level).toBe(0)
    expect(result.current.levelName).toBe('Genin')
    expect(result.current.powerLevel).toBe(0)
  })

  it('returns zero-state for empty array', () => {
    const { result } = renderHook(() => usePowerLevel([]))
    expect(result.current.xp).toBe(0)
    expect(result.current.levelName).toBe('Genin')
    expect(result.current.progress).toBe(0)
  })

  it('computes correct power level for given entries', () => {
    const entries = [makeEntry({ score: 8 }), makeEntry({ score: 8 })]
    const { result } = renderHook(() => usePowerLevel(entries))

    // XP = (8 + 8) * 100 = 1600 → Chunin
    expect(result.current.xp).toBe(1600)
    expect(result.current.levelName).toBe('Chunin')
    // powerLevel = round(8 * 2 * (0.5 + 1*0.5)) = 16
    expect(result.current.powerLevel).toBe(16)
  })

  it('updates when entries change', () => {
    const { result, rerender } = renderHook(
      ({ entries }: { entries: CycleEntry[] | undefined }) =>
        usePowerLevel(entries),
      { initialProps: { entries: [makeEntry({ score: 5 })] } },
    )

    expect(result.current.xp).toBe(500)
    expect(result.current.levelName).toBe('Chunin')

    // Rerender with more entries
    rerender({
      entries: [
        makeEntry({ score: 5 }),
        makeEntry({ score: 5 }),
        makeEntry({ score: 5 }),
        makeEntry({ score: 5 }),
      ],
    })

    expect(result.current.xp).toBe(2000)
    expect(result.current.levelName).toBe('Jonin')
  })

  it('reaches Hokage level at 10000 XP', () => {
    // 20 entries × score 5 = 10000 XP
    const entries = Array.from({ length: 20 }, () => makeEntry({ score: 5 }))
    const { result } = renderHook(() => usePowerLevel(entries))
    expect(result.current.xp).toBe(10000)
    expect(result.current.levelName).toBe('Hokage')
    expect(result.current.progress).toBe(1)
  })

  it('handles mixed keep/discard correctly', () => {
    const entries = [
      makeEntry({ score: 10, status: 'keep' }),
      makeEntry({ score: 10, status: 'discard' }),
    ]
    const { result } = renderHook(() => usePowerLevel(entries))

    // avgScore = 10, count = 2, keepRate = 0.5
    // powerLevel = round(10 * 2 * (0.5 + 0.5*0.5)) = round(15) = 15
    expect(result.current.powerLevel).toBe(15)
  })
})
