import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('../openclaw/config.js', () => ({
  getConfig: vi.fn(),
}))

vi.mock('../openclaw/gateway.js', () => ({
  fetchActiveSessions: vi.fn(),
}))

import { getConfig } from '../openclaw/config.js'
import { fetchActiveSessions } from '../openclaw/gateway.js'

const mockedGetConfig = vi.mocked(getConfig)
const mockedFetchActiveSessions = vi.mocked(fetchActiveSessions)

async function createApp() {
  const mod = await import('../routes/agents.js')
  const app = new Hono()
  app.route('/agents', mod.default)
  return app
}

describe('agents route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns agents with state and color', async () => {
    mockedGetConfig.mockReturnValue({
      agents: [
        {
          id: 'agent-1',
          name: 'Senku',
          workspace: '/tmp/ws',
          default: true,
        },
        {
          id: 'agent-2',
          name: 'Bulma',
          workspace: '/tmp/ws2',
        },
      ],
      gatewayPort: 18789,
      gatewayToken: 'tok',
    })

    mockedFetchActiveSessions.mockResolvedValue([
      {
        id: 'agent-1',
        status: 'working',
        currentTask: 'code-review',
        sessionId: 's1',
      },
    ])

    const app = await createApp()
    const res = await app.request('/agents')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveLength(2)

    // First agent has an active session
    expect(body[0].config.id).toBe('agent-1')
    expect(body[0].state.status).toBe('working')
    expect(body[0].color).toBeDefined()
    expect(body[0].emoji).toBeDefined()

    // Second agent is offline (no session)
    expect(body[1].config.id).toBe('agent-2')
    expect(body[1].state.status).toBe('offline')
  })

  it('returns empty array when no agents configured', async () => {
    mockedGetConfig.mockReturnValue({
      agents: [],
      gatewayPort: 18789,
      gatewayToken: '',
    })
    mockedFetchActiveSessions.mockResolvedValue([])

    const app = await createApp()
    const res = await app.request('/agents')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveLength(0)
  })

  it('sets default agent emoji differently', async () => {
    mockedGetConfig.mockReturnValue({
      agents: [
        {
          id: 'a1',
          name: 'Default',
          workspace: '/tmp',
          default: true,
        },
        {
          id: 'a2',
          name: 'Regular',
          workspace: '/tmp',
        },
      ],
      gatewayPort: 18789,
      gatewayToken: '',
    })
    mockedFetchActiveSessions.mockResolvedValue([])

    const app = await createApp()
    const res = await app.request('/agents')
    const body = await res.json()

    // Default agent gets lobster emoji, non-default gets robot
    expect(body[0].emoji).not.toBe(body[1].emoji)
  })

  it('assigns colors cyclically based on index', async () => {
    const agents = Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      name: `Agent${i}`,
      workspace: '/tmp',
    }))

    mockedGetConfig.mockReturnValue({
      agents,
      gatewayPort: 18789,
      gatewayToken: '',
    })
    mockedFetchActiveSessions.mockResolvedValue([])

    const app = await createApp()
    const res = await app.request('/agents')
    const body = await res.json()

    expect(body).toHaveLength(10)
    // Each agent should have a color
    for (const agent of body) {
      expect(agent.color).toBeDefined()
    }
  })
})
