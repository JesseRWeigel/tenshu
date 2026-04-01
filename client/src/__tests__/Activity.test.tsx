import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from './helpers'
import { Activity } from '../pages/Activity'

vi.mock('@/hooks/useTheme', async () => {
  const actual = await vi.importActual('@/hooks/useTheme')
  return {
    ...actual,
    useTheme: vi.fn(() => ({ theme: 'warroom', setTheme: vi.fn() })),
  }
})
vi.mock('@/hooks/useDemo', () => ({
  useDemo: vi.fn(() => ({ isDemo: false })),
}))

// Mock fetch for react-query
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

import { useDemo } from '@/hooks/useDemo'
const mockUseDemo = vi.mocked(useDemo)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseDemo.mockReturnValue({ isDemo: false })
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve([]),
    ok: true,
  })
})

describe('Activity', () => {
  it('renders the activity log header', () => {
    const { getByText } = renderWithProviders(<Activity />)
    expect(getByText('ACTIVITY LOG')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', () => {
    const { container } = renderWithProviders(<Activity />)
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Activity Log')
  })

  it('shows empty state when no log entries', () => {
    const { getByText } = renderWithProviders(<Activity />)
    expect(getByText('No activity yet.')).toBeTruthy()
  })

  it('shows empty state for artifacts', () => {
    const { getByText } = renderWithProviders(<Activity />)
    expect(getByText('No artifacts yet.')).toBeTruthy()
  })

  it('renders section headings', () => {
    const { getByText } = renderWithProviders(<Activity />)
    expect(getByText('Agent Log')).toBeTruthy()
    expect(getByText('Recent Artifacts')).toBeTruthy()
  })

  it('renders cycle timeline in demo mode', () => {
    mockUseDemo.mockReturnValue({ isDemo: true })
    const { getByText } = renderWithProviders(<Activity />)
    expect(getByText('Cycle Timeline')).toBeTruthy()
  })

  it('does not render cycle timeline when not in demo and no current cycle', () => {
    mockUseDemo.mockReturnValue({ isDemo: false })
    const { queryByText } = renderWithProviders(<Activity />)
    expect(queryByText('Cycle Timeline')).toBeNull()
  })
})
