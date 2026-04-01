import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from './helpers'
import { Sessions } from '../pages/Sessions'
import type { Session } from '@tenshu/shared'

vi.mock('@/hooks/useTheme', async () => {
  const actual = await vi.importActual('@/hooks/useTheme')
  return {
    ...actual,
    useTheme: vi.fn(() => ({ theme: 'warroom', setTheme: vi.fn() })),
  }
})

const mockSessions: Session[] = [
  {
    id: 'sess-1',
    agentId: 'coder-bulma',
    label: 'Code review',
    startedAt: '2024-01-01T10:00:00Z',
    lastActivity: '2024-01-01T10:30:00Z',
    inputTokens: 5000,
    outputTokens: 3000,
    totalTokens: 8000,
    model: 'gpt-4o',
    cost: 0.0234,
  },
  {
    id: 'sess-2',
    agentId: 'qa-vegeta',
    startedAt: '2024-01-01T11:00:00Z',
    lastActivity: '2024-01-01T11:15:00Z',
    inputTokens: 2000,
    outputTokens: 1000,
    totalTokens: 3000,
    model: 'claude-3.5-sonnet',
    cost: 0.0089,
  },
]

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve(mockSessions),
    ok: true,
  })
})

describe('Sessions', () => {
  it('renders loading state initially', () => {
    mockFetch.mockResolvedValue({
      json: () => new Promise(() => {}),
      ok: true,
    })
    const { getByText } = renderWithProviders(<Sessions />)
    expect(getByText('Loading sessions...')).toBeTruthy()
  })

  it('renders the sessions header', async () => {
    const { findByText } = renderWithProviders(<Sessions />)
    expect(await findByText('SESSIONS')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', async () => {
    const { container, findByText } = renderWithProviders(<Sessions />)
    await findByText('SESSIONS')
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Sessions')
  })

  it('displays stats cards with totals', async () => {
    const { findByText } = renderWithProviders(<Sessions />)
    expect(await findByText('Active')).toBeTruthy()
    expect(await findByText('Total Cost')).toBeTruthy()
    expect(await findByText('Tokens')).toBeTruthy()
  })

  it('displays session agent IDs', async () => {
    const { findByText } = renderWithProviders(<Sessions />)
    expect(await findByText('coder-bulma')).toBeTruthy()
    expect(await findByText('qa-vegeta')).toBeTruthy()
  })

  it('displays session labels when present', async () => {
    const { findByText } = renderWithProviders(<Sessions />)
    expect(await findByText('Code review')).toBeTruthy()
  })

  it('displays session models', async () => {
    const { findByText } = renderWithProviders(<Sessions />)
    expect(await findByText('gpt-4o')).toBeTruthy()
    expect(await findByText('claude-3.5-sonnet')).toBeTruthy()
  })

  it('shows empty state when no sessions', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve([]),
      ok: true,
    })
    const { findByText } = renderWithProviders(<Sessions />)
    expect(await findByText('No active sessions')).toBeTruthy()
  })

  it('displays token breakdown per session', async () => {
    const { findByText } = renderWithProviders(<Sessions />)
    expect(await findByText(/In: 5,000/)).toBeTruthy()
    expect(await findByText(/Out: 3,000/)).toBeTruthy()
  })
})
