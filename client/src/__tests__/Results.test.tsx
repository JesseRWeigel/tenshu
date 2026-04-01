import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from './helpers'
import { Results } from '../pages/Results'
import { fireEvent } from '@testing-library/react'

vi.mock('@/hooks/useTheme', async () => {
  const actual = await vi.importActual('@/hooks/useTheme')
  return {
    ...actual,
    useTheme: vi.fn(() => ({ theme: 'warroom', setTheme: vi.fn() })),
  }
})
vi.mock('@/hooks/useDemo', () => ({
  useDemo: vi.fn(() => ({ isDemo: true })),
}))
vi.mock('@/hooks/useMockData', () => ({
  useMockResults: vi.fn(() => ({
    data: [
      {
        timestamp: '2024-01-01T00:00:00Z',
        cycle: 1,
        task: 'code-review',
        agent: 'Bulma',
        score: 8.5,
        status: 'keep',
        description: 'Reviewed PR #42',
      },
      {
        timestamp: '2024-01-01T01:00:00Z',
        cycle: 2,
        task: 'tool-building',
        agent: 'Senku',
        score: 4.0,
        status: 'discard',
        description: 'Built a tool',
      },
      {
        timestamp: '2024-01-01T02:00:00Z',
        cycle: 3,
        task: 'code-review',
        agent: 'Bulma',
        score: 9.0,
        status: 'keep',
        description: 'Another review',
      },
    ],
    isLoading: false,
  })),
}))

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve([]),
    ok: true,
  })
})

describe('Results', () => {
  it('renders the battle record header', () => {
    const { getByText } = renderWithProviders(<Results />)
    expect(getByText('BATTLE RECORD')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', () => {
    const { container } = renderWithProviders(<Results />)
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Results')
  })

  it('displays stats cards with correct values', () => {
    const { getByText } = renderWithProviders(<Results />)
    // Total Cycles
    expect(getByText('Total Cycles')).toBeTruthy()
    expect(getByText('3')).toBeTruthy()
    // Kept
    expect(getByText('Kept')).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
    // Success Rate
    expect(getByText('Success Rate')).toBeTruthy()
    expect(getByText('67%')).toBeTruthy()
  })

  it('shows agent filter buttons', () => {
    const { getAllByText } = renderWithProviders(<Results />)
    expect(getAllByText('all').length).toBeGreaterThan(0)
    expect(getAllByText('Bulma').length).toBeGreaterThan(0)
    expect(getAllByText('Senku').length).toBeGreaterThan(0)
  })

  it('filters results by agent when filter clicked', () => {
    const { container } = renderWithProviders(<Results />)
    // Find the filter buttons area (gap-1 container)
    const filterButtons = container.querySelectorAll(
      '.flex.items-center.gap-1 button',
    )
    // Click the "Bulma" filter (second button after "all")
    const bulmaBtn = Array.from(filterButtons).find(
      (b) => b.textContent === 'Bulma',
    )
    expect(bulmaBtn).toBeTruthy()
    fireEvent.click(bulmaBtn!)
    // After filtering to Bulma, should see Bulma's results only
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
  })

  it('renders results table with correct columns', () => {
    const { getByText } = renderWithProviders(<Results />)
    expect(getByText('Time')).toBeTruthy()
    expect(getByText('Cycle')).toBeTruthy()
    expect(getByText('Task')).toBeTruthy()
    expect(getByText('Agent')).toBeTruthy()
    expect(getByText('Score')).toBeTruthy()
    expect(getByText('Status')).toBeTruthy()
    expect(getByText('Description')).toBeTruthy()
  })

  it('renders score trend chart', () => {
    const { getByText } = renderWithProviders(<Results />)
    expect(getByText(/Score Trend/)).toBeTruthy()
  })

  it('renders task type performance breakdown', () => {
    const { getByText } = renderWithProviders(<Results />)
    expect(getByText('Task Type Performance')).toBeTruthy()
  })
})
