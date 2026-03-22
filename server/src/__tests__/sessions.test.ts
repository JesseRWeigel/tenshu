import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('../openclaw/cli.js', () => ({
  listSessions: vi.fn(),
  listCronJobs: vi.fn(),
  toggleCronJob: vi.fn(),
  runCronJob: vi.fn(),
  getCronRuns: vi.fn(),
}))

import { listSessions } from '../openclaw/cli.js'

const mockedListSessions = vi.mocked(listSessions)

async function createApp() {
  const mod = await import('../routes/sessions.js')
  const app = new Hono()
  app.route('/sessions', mod.default)
  return app
}

describe('sessions route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /', () => {
    it('returns list of sessions', async () => {
      const sessions = [
        {
          id: 's1',
          agentId: 'agent-1',
          label: 'code-review',
          startedAt: '2026-03-12T14:00:00.000Z',
          lastActivity: '2026-03-12T14:05:00.000Z',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          model: 'claude-opus-4-20250514',
          cost: 0,
        },
      ]
      mockedListSessions.mockResolvedValue(sessions)

      const app = await createApp()
      const res = await app.request('/sessions')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual(sessions)
    })

    it('returns empty array when no sessions', async () => {
      mockedListSessions.mockResolvedValue([])

      const app = await createApp()
      const res = await app.request('/sessions')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual([])
    })

    it('returns 500 when listSessions fails', async () => {
      mockedListSessions.mockRejectedValue(new Error('CLI timeout'))

      const app = await createApp()
      const res = await app.request('/sessions')
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toBe('CLI timeout')
    })
  })
})
