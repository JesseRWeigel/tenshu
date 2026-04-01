import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../hooks/useTheme'

vi.mock('../hooks/useDemo', () => ({
  DemoProvider: ({ children }: { children: ReactNode }) => children,
  useDemo: vi.fn().mockReturnValue({ isDemo: false }),
}))

import { useAgentHistory, useCurrentCycle } from '../hooks/useAgentHistory'
import { useDemo } from '../hooks/useDemo'

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
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAgentHistory', () => {
  it('fetches agent history from API in real mode', async () => {
    const mockHistory = {
      coder: [
        {
          cycle: 1,
          task: 'test',
          score: 8,
          status: 'keep',
          description: 'desc',
          timestamp: new Date().toISOString(),
          detailedTask: 'detailed',
          verdict: 'keep',
          resultLength: 100,
        },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockHistory),
      }),
    )

    const { result } = renderHook(() => useAgentHistory(10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockHistory)
  })

  it('passes limit parameter to the API URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useAgentHistory(25), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/activity/agent-history?limit=25',
      )
    })
  })

  it('uses default limit of 10', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useAgentHistory(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/activity/agent-history?limit=10',
      )
    })
  })

  it('returns mock data in demo mode', () => {
    vi.mocked(useDemo).mockReturnValue({ isDemo: true })

    const { result } = renderHook(() => useAgentHistory(5), {
      wrapper: createWrapper(),
    })

    // Mock data has all 5 roles
    const data = result.current.data as Record<string, unknown[]>
    expect(Object.keys(data)).toContain('planner')
    expect(Object.keys(data)).toContain('coder')
    expect(result.current.isLoading).toBe(false)
  })

  it('does not fetch in demo mode', () => {
    vi.mocked(useDemo).mockReturnValue({ isDemo: true })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useAgentHistory(), { wrapper: createWrapper() })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('useCurrentCycle', () => {
  it('fetches current cycle from API in real mode', async () => {
    const mockCycle = {
      running: true,
      cycle: '42',
      task: 'code-review',
      lastAgent: 'Bulma',
      lastStatus: 'working',
      recentLines: ['line1', 'line2'],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockCycle),
      }),
    )

    const { result } = renderHook(() => useCurrentCycle(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockCycle)
  })

  it('returns mock data in demo mode', () => {
    vi.mocked(useDemo).mockReturnValue({ isDemo: true })

    const { result } = renderHook(() => useCurrentCycle(), {
      wrapper: createWrapper(),
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.data!.running).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('queries /api/activity/current endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useCurrentCycle(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/activity/current')
    })
  })
})
