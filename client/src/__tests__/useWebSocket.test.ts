import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── WebSocket mock ──────────────────────────────────────────────────

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }

  // Test helper: simulate server opening the connection
  _open() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  // Test helper: simulate receiving a message
  _receive(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

let instances: MockWebSocket[] = []

beforeEach(() => {
  instances = []
  vi.stubGlobal(
    'WebSocket',
    Object.assign(
      function (this: MockWebSocket, _url: string) {
        const ws = new MockWebSocket()
        instances.push(ws)
        return ws
      } as unknown as typeof WebSocket,
      {
        CONNECTING: MockWebSocket.CONNECTING,
        OPEN: MockWebSocket.OPEN,
        CLOSING: MockWebSocket.CLOSING,
        CLOSED: MockWebSocket.CLOSED,
      },
    ),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  // Reset the module-level singleton between tests
  vi.resetModules()
})

async function loadHook() {
  const mod = await import('../hooks/useWebSocket')
  return mod.useWebSocket
}

describe('useWebSocket', () => {
  it('starts disconnected', async () => {
    const useWebSocket = await loadHook()
    const { result } = renderHook(() => useWebSocket())
    expect(result.current.connected).toBe(false)
  })

  it('becomes connected after WebSocket opens and check interval fires', async () => {
    const useWebSocket = await loadHook()
    const { result } = renderHook(() => useWebSocket())

    // Open the connection
    act(() => {
      instances[0]._open()
    })

    // The hook checks readyState every 1000ms
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.connected).toBe(true)
  })

  it('subscribe receives messages and unsubscribe stops them', async () => {
    const useWebSocket = await loadHook()
    const { result } = renderHook(() => useWebSocket())
    const handler = vi.fn()

    act(() => {
      instances[0]._open()
    })

    let unsub: () => void
    act(() => {
      unsub = result.current.subscribe(handler)
    })

    // Send a message
    act(() => {
      instances[0]._receive({
        type: 'agent:status',
        payload: { id: 'a1' },
        timestamp: new Date().toISOString(),
      })
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'agent:status' }),
    )

    // Unsubscribe and send another message
    act(() => {
      unsub!()
    })

    act(() => {
      instances[0]._receive({
        type: 'agent:status',
        payload: { id: 'a2' },
        timestamp: new Date().toISOString(),
      })
    })

    // Handler should not have been called again
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores malformed JSON messages', async () => {
    const useWebSocket = await loadHook()
    const { result } = renderHook(() => useWebSocket())
    const handler = vi.fn()

    act(() => {
      instances[0]._open()
      result.current.subscribe(handler)
    })

    // Send invalid JSON directly on onmessage
    act(() => {
      instances[0].onmessage?.({ data: 'not-json{{{' })
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('cleans up handler and interval on unmount', async () => {
    const useWebSocket = await loadHook()
    const { result, unmount } = renderHook(() => useWebSocket())

    const handler = vi.fn()
    act(() => {
      instances[0]._open()
      result.current.subscribe(handler)
    })

    unmount()

    // The internal handler added by the hook effect should be removed,
    // but the user-subscribed handler is separate. Verify no errors on timer tick.
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  })

  it('attempts reconnect after close', async () => {
    const useWebSocket = await loadHook()
    renderHook(() => useWebSocket())
    expect(instances).toHaveLength(1)

    // Close the connection — triggers setTimeout(connect, 3000)
    act(() => {
      instances[0].close()
    })

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // A new WebSocket instance should have been created
    expect(instances.length).toBeGreaterThanOrEqual(2)
  })
})
