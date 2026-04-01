import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../hooks/useTheme'
import {
  useAvatarConfig,
  useAvailableAvatars,
  useSetAvatar,
  useUploadAvatar,
} from '../hooks/useAvatarConfig'

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
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAvatarConfig', () => {
  it('fetches avatar config from /api/avatars', async () => {
    const mockConfig = { agent1: 'avatar1.png', agent2: 'avatar2.png' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockConfig),
      }),
    )

    const { result } = renderHook(() => useAvatarConfig(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockConfig)
  })

  it('starts in loading state', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => new Promise(() => {}), // never resolves
      }),
    )

    const { result } = renderHook(() => useAvatarConfig(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('handles fetch errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    )

    const { result } = renderHook(() => useAvatarConfig(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useAvailableAvatars', () => {
  it('fetches available avatars from /api/avatars/available', async () => {
    const mockAvatars = ['cat.png', 'dog.png', 'bird.png']
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockAvatars),
      }),
    )

    const { result } = renderHook(() => useAvailableAvatars(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockAvatars)
  })

  it('returns string array type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(['a.png', 'b.png']),
      }),
    )

    const { result } = renderHook(() => useAvailableAvatars(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(Array.isArray(result.current.data)).toBe(true)
  })

  it('handles fetch errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    )

    const { result } = renderHook(() => useAvailableAvatars(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useSetAvatar', () => {
  it('sends PUT request with agentId and image', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSetAvatar(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        agentId: 'agent-1',
        image: 'new-avatar.png',
      })
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/avatars/agent-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'new-avatar.png' }),
    })
  })

  it('is idle before mutation is triggered', () => {
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(() => useSetAvatar(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isIdle).toBe(true)
  })

  it('handles mutation errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Server error')))

    const { result } = renderHook(() => useSetAvatar(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({
        agentId: 'agent-1',
        image: 'bad.png',
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useUploadAvatar', () => {
  it('sends POST request with FormData', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: createWrapper(),
    })

    const mockFile = new File(['content'], 'avatar.png', {
      type: 'image/png',
    })

    await act(async () => {
      await result.current.mutateAsync({
        agentId: 'agent-1',
        file: mockFile,
      })
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/avatars/agent-1/upload', {
      method: 'POST',
      body: expect.any(FormData),
    })
  })

  it('is idle before mutation is triggered', () => {
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isIdle).toBe(true)
  })

  it('handles upload errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Upload failed')),
    )

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: createWrapper(),
    })

    const mockFile = new File(['content'], 'avatar.png', {
      type: 'image/png',
    })

    act(() => {
      result.current.mutate({
        agentId: 'agent-1',
        file: mockFile,
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
