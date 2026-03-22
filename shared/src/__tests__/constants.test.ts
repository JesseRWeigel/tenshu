import { describe, it, expect } from 'vitest'
import {
  STATUS_COLORS,
  AGENT_COLORS,
  DEFAULT_PORT,
  DEFAULT_CLIENT_PORT,
  DEFAULT_OPENCLAW_DIR,
} from '../constants.js'

describe('STATUS_COLORS', () => {
  it('has a color for every agent status', () => {
    const statuses = ['working', 'thinking', 'idle', 'error', 'offline']
    for (const status of statuses) {
      expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBeDefined()
      expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toMatch(
        /^#[0-9a-fA-F]{6}$/,
      )
    }
  })

  it('uses green for working', () => {
    expect(STATUS_COLORS.working).toBe('#22c55e')
  })

  it('uses red for error', () => {
    expect(STATUS_COLORS.error).toBe('#ef4444')
  })
})

describe('AGENT_COLORS', () => {
  it('has at least 5 colors for agents', () => {
    expect(AGENT_COLORS.length).toBeGreaterThanOrEqual(5)
  })

  it('contains valid hex colors', () => {
    for (const color of AGENT_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('defaults', () => {
  it('has correct default ports', () => {
    expect(DEFAULT_PORT).toBe(3001)
    expect(DEFAULT_CLIENT_PORT).toBe(5173)
  })

  it('has correct default openclaw directory', () => {
    expect(DEFAULT_OPENCLAW_DIR).toBe('~/.openclaw')
  })
})

describe('STATUS_COLORS completeness', () => {
  it('has exactly 5 status entries', () => {
    expect(Object.keys(STATUS_COLORS)).toHaveLength(5)
  })

  it('has specific color values for all statuses', () => {
    expect(STATUS_COLORS.thinking).toBe('#3b82f6')
    expect(STATUS_COLORS.idle).toBe('#6b7280')
    expect(STATUS_COLORS.offline).toBe('#374151')
  })
})

describe('AGENT_COLORS', () => {
  it('has exactly 8 colors', () => {
    expect(AGENT_COLORS).toHaveLength(8)
  })

  it('contains no duplicate colors', () => {
    const unique = new Set(AGENT_COLORS)
    expect(unique.size).toBe(AGENT_COLORS.length)
  })
})
