import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../hooks/useTheme'

// We need to mock useDemo before importing the hooks
vi.mock('../hooks/useDemo', () => ({
  DemoProvider: ({ children }: { children: ReactNode }) => children,
  useDemo: vi.fn().mockReturnValue({ isDemo: false }),
}))

// Mock useWebSocket to avoid real WebSocket connections
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn().mockReturnValue({
    connected: true,
    subscribe: vi.fn().mockReturnValue(() => {}),
  }),
}))

import { useAgents } from '../hooks/useAgents'
import { useDemo } from '../hooks/useDemo'
import { useWebSocket } from '../hooks/useWebSocket'
import { makeAgent } from './helpers'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.mocked(useDemo).mockReturnValue({ isDemo: false })
  vi.mocked(useWebSocket).mockReturnValue({
    connected: true,
    subscribe: vi.fn().mockReturnValue(() => {}),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAgents', () => {
  it('starts with loading=true and empty agents in real mode', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve([]),
      }),
    )

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.agents).toEqual([])
  })

  it('fetches agents from /api/agents and updates state', async () => {
    const mockAgents = [
      makeAgent({
        config: { id: 'a1', name: 'Agent 1', workspace: '/tmp/a1' },
      }),
      makeAgent({
        config: { id: 'a2', name: 'Agent 2', workspace: '/tmp/a2' },
      }),
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockAgents),
      }),
    )

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agents).toHaveLength(2)
    expect(result.current.agents[0].config.id).toBe('a1')
  })

  it('handles fetch errors gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    )

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agents).toEqual([])
    consoleSpy.mockRestore()
  })

  it('returns mock agents in demo mode', () => {
    vi.mocked(useDemo).mockReturnValue({ isDemo: true })

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    })

    // useMockAgents returns 5 demo agents
    expect(result.current.agents).toHaveLength(5)
    expect(result.current.loading).toBe(false)
    expect(result.current.connected).toBe(true)
  })

  it('subscribes to WebSocket for agent:status updates', async () => {
    const subscribeFn = vi.fn().mockReturnValue(() => {})
    vi.mocked(useWebSocket).mockReturnValue({
      connected: true,
      subscribe: subscribeFn,
    })

    const agents = [
      makeAgent({
        config: { id: 'a1', name: 'Agent 1', workspace: '/tmp/a1' },
      }),
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(agents),
      }),
    )

    renderHook(() => useAgents(), { wrapper: createWrapper() })

    // Subscribe should be called for the ws effect
    expect(subscribeFn).toHaveBeenCalled()
  })

  it('does not fetch or subscribe in demo mode', () => {
    vi.mocked(useDemo).mockReturnValue({ isDemo: true })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const subscribeFn = vi.fn().mockReturnValue(() => {})
    vi.mocked(useWebSocket).mockReturnValue({
      connected: true,
      subscribe: subscribeFn,
    })

    renderHook(() => useAgents(), { wrapper: createWrapper() })

    // Fetch should NOT be called in demo mode
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
