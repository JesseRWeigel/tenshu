import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../openclaw/cli.js', () => ({
  listSessions: vi.fn(),
}))

import { listSessions } from '../openclaw/cli.js'
import { fetchActiveSessions } from '../openclaw/gateway.js'

const mockedListSessions = vi.mocked(listSessions)

describe('openclaw gateway module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('fetchActiveSessions', () => {
    it('returns active sessions with working status', async () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // Session updated 2 minutes ago (within 5 min threshold)
      const recentTime = new Date('2024-01-01T11:58:00Z').toISOString()

      mockedListSessions.mockResolvedValue([
        {
          id: 's1',
          agentId: 'agent-1',
          label: 'Debugging issue',
          startedAt: '2024-01-01T11:50:00Z',
          lastActivity: recentTime,
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
          model: 'claude-sonnet-4',
          cost: 0,
        },
      ])

      const result = await fetchActiveSessions()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'agent-1',
        status: 'working',
        currentTask: 'Debugging issue',
        sessionId: 's1',
        lastActivity: recentTime,
        model: 'claude-sonnet-4',
      })
    })

    it('marks sessions as idle when last activity exceeds 5 minutes', async () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // Session updated 6 minutes ago (beyond 5 min threshold)
      const oldTime = new Date('2024-01-01T11:54:00Z').toISOString()

      mockedListSessions.mockResolvedValue([
        {
          id: 's2',
          agentId: 'agent-2',
          label: 'Old task',
          startedAt: '2024-01-01T11:00:00Z',
          lastActivity: oldTime,
          inputTokens: 50,
          outputTokens: 100,
          totalTokens: 150,
          model: 'claude-opus-4',
          cost: 0,
        },
      ])

      const result = await fetchActiveSessions()

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('idle')
    })

    it('handles multiple sessions with mixed statuses', async () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      mockedListSessions.mockResolvedValue([
        {
          id: 's1',
          agentId: 'agent-1',
          label: 'Active work',
          startedAt: '2024-01-01T11:58:00Z',
          lastActivity: new Date('2024-01-01T11:59:00Z').toISOString(),
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
          model: 'claude-sonnet-4',
          cost: 0,
        },
        {
          id: 's2',
          agentId: 'agent-2',
          label: 'Stale work',
          startedAt: '2024-01-01T11:00:00Z',
          lastActivity: new Date('2024-01-01T11:50:00Z').toISOString(),
          inputTokens: 50,
          outputTokens: 100,
          totalTokens: 150,
          model: 'claude-opus-4',
          cost: 0,
        },
      ])

      const result = await fetchActiveSessions()

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('working')
      expect(result[1].status).toBe('idle')
    })

    it('returns empty array when listSessions throws error', async () => {
      mockedListSessions.mockRejectedValue(new Error('CLI error'))

      const result = await fetchActiveSessions()

      expect(result).toEqual([])
    })

    it('returns empty array when no sessions exist', async () => {
      mockedListSessions.mockResolvedValue([])

      const result = await fetchActiveSessions()

      expect(result).toEqual([])
    })

    it('handles sessions with missing lastActivity field', async () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      mockedListSessions.mockResolvedValue([
        {
          id: 's1',
          agentId: 'agent-1',
          label: 'No activity time',
          startedAt: '2024-01-01T11:50:00Z',
          lastActivity: '',
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          model: 'claude-sonnet-4',
          cost: 0,
        },
      ])

      const result = await fetchActiveSessions()

      expect(result).toHaveLength(1)
      // Empty string converts to timestamp 0, which is way past threshold
      expect(result[0].status).toBe('idle')
    })

    it('correctly identifies edge case at exactly 5 minute threshold', async () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // Session updated exactly 5 minutes ago
      const exactThreshold = new Date(
        now.getTime() - 5 * 60 * 1000,
      ).toISOString()

      mockedListSessions.mockResolvedValue([
        {
          id: 's1',
          agentId: 'agent-1',
          label: 'Edge case',
          startedAt: '2024-01-01T11:50:00Z',
          lastActivity: exactThreshold,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          model: 'claude-sonnet-4',
          cost: 0,
        },
      ])

      const result = await fetchActiveSessions()

      expect(result).toHaveLength(1)
      // At exactly 5 minutes, it should NOT be active (threshold is <, not <=)
      expect(result[0].status).toBe('idle')
    })
  })
})
