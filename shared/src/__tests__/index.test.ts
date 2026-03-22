import { describe, it, expect } from 'vitest'
import * as shared from '../index.js'

describe('shared index re-exports', () => {
  it('exports STATUS_COLORS', () => {
    expect(shared.STATUS_COLORS).toBeDefined()
  })

  it('exports AGENT_COLORS', () => {
    expect(shared.AGENT_COLORS).toBeDefined()
  })

  it('exports DEFAULT_PORT', () => {
    expect(shared.DEFAULT_PORT).toBeDefined()
  })

  it('exports DEFAULT_CLIENT_PORT', () => {
    expect(shared.DEFAULT_CLIENT_PORT).toBeDefined()
  })

  it('exports DEFAULT_OPENCLAW_DIR', () => {
    expect(shared.DEFAULT_OPENCLAW_DIR).toBeDefined()
  })
})
