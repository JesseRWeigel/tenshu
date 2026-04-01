import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DemoProvider, useDemo } from '../hooks/useDemo'

function wrapper({ children }: { children: ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>
}

let originalLocation: Location

beforeEach(() => {
  originalLocation = window.location
  vi.restoreAllMocks()
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
  })
})

function setSearchParams(search: string) {
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, search },
    writable: true,
  })
}

describe('useDemo', () => {
  it('defaults to non-demo mode when no URL param and server is reachable', async () => {
    setSearchParams('')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { result } = renderHook(() => useDemo(), { wrapper })

    // After the fetch resolves, isDemo should still be false
    await waitFor(() => {
      expect(result.current.isDemo).toBe(false)
    })
  })

  it('enables demo mode when ?demo=true is in URL', () => {
    setSearchParams('?demo=true')
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(() => useDemo(), { wrapper })
    expect(result.current.isDemo).toBe(true)
  })

  it('auto-detects demo mode when server is unreachable (fetch rejects)', async () => {
    setSearchParams('')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    )

    const { result } = renderHook(() => useDemo(), { wrapper })

    await waitFor(() => {
      expect(result.current.isDemo).toBe(true)
    })
  })

  it('auto-detects demo mode when server returns non-ok response', async () => {
    setSearchParams('')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    )

    const { result } = renderHook(() => useDemo(), { wrapper })

    await waitFor(() => {
      expect(result.current.isDemo).toBe(true)
    })
  })

  it('does not fetch when already in demo mode via URL param', () => {
    setSearchParams('?demo=true')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useDemo(), { wrapper })

    // The effect returns early when isDemo is already true
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('without provider returns default context value (false)', () => {
    const { result } = renderHook(() => useDemo())
    expect(result.current.isDemo).toBe(false)
  })
})
