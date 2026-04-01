import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider, useTheme } from '../hooks/useTheme'

const STORAGE_KEY = 'tenshu-theme'

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('useTheme', () => {
  it('defaults to warroom when no saved theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('warroom')
  })

  it('restores a saved theme from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'garden')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('garden')
  })

  it('falls back to warroom for invalid saved value', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-theme')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('warroom')
  })

  it('updates theme via setTheme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('deck')
    })

    expect(result.current.theme).toBe('deck')
  })

  it('persists theme changes to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('garden')
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBe('garden')
  })

  it('sets data-theme attribute on document root', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('deck')
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('deck')
  })

  it('without provider returns default context values', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('warroom')
    // setTheme is a no-op from the default context
    act(() => {
      result.current.setTheme('deck')
    })
    expect(result.current.theme).toBe('warroom')
  })
})
