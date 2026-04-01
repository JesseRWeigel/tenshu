import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from './helpers'
import { Knowledge } from '../pages/Knowledge'
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

describe('Knowledge', () => {
  it('renders the knowledge base header', () => {
    const { getByText } = renderWithProviders(<Knowledge />)
    expect(getByText('KNOWLEDGE BASE')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', () => {
    const { container } = renderWithProviders(<Knowledge />)
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Knowledge Base')
  })

  it('displays stats cards in demo mode', () => {
    const { getByText } = renderWithProviders(<Knowledge />)
    expect(getByText('Artifacts')).toBeTruthy()
    expect(getByText('30')).toBeTruthy()
    expect(getByText('Total Size')).toBeTruthy()
    expect(getByText('332KB')).toBeTruthy()
  })

  it('renders search input with correct placeholder', () => {
    const { container } = renderWithProviders(<Knowledge />)
    const input = container.querySelector('input[type="text"]')
    expect(input).not.toBeNull()
    expect(input?.getAttribute('placeholder')).toBe('Search artifacts...')
  })

  it('renders type filter buttons', () => {
    const { container } = renderWithProviders(<Knowledge />)
    const filterArea = container.querySelector('[role="search"]')
    expect(filterArea).not.toBeNull()
    const buttons = filterArea!.querySelectorAll('button')
    const buttonTexts = Array.from(buttons).map((b) => b.textContent)
    expect(buttonTexts).toContain('All')
    expect(buttonTexts).toContain('research')
    expect(buttonTexts).toContain('coder')
    expect(buttonTexts).toContain('qa')
  })

  it('shows artifact count', () => {
    const { getByText } = renderWithProviders(<Knowledge />)
    expect(getByText(/30 of 30 artifacts/)).toBeTruthy()
  })

  it('renders demo artifacts in grid', () => {
    const { container } = renderWithProviders(<Knowledge />)
    // Demo generates 30 artifacts, each in a ThemedCard
    const badges = container.querySelectorAll('[class*="badge"]')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('filters artifacts by type when filter button clicked', () => {
    const { container, getByText } = renderWithProviders(<Knowledge />)
    const filterArea = container.querySelector('[role="search"]')
    const researchBtn = Array.from(filterArea!.querySelectorAll('button')).find(
      (b) => b.textContent === 'research',
    )
    expect(researchBtn).toBeTruthy()
    fireEvent.click(researchBtn!)
    expect(getByText(/10 of 30 artifacts/)).toBeTruthy()
  })

  it('opens artifact detail when artifact is clicked', () => {
    const { container, getByText } = renderWithProviders(<Knowledge />)
    // Click first artifact card
    const cards = container.querySelectorAll('.cursor-pointer')
    if (cards[0]) {
      fireEvent.click(cards[0])
      // Should show Close button when detail is open
      expect(getByText('Close')).toBeTruthy()
    }
  })

  it('closes artifact detail when close button clicked', () => {
    const { container, getByText, queryByText } = renderWithProviders(
      <Knowledge />,
    )
    const cards = container.querySelectorAll('.cursor-pointer')
    if (cards[0]) {
      fireEvent.click(cards[0])
      expect(getByText('Close')).toBeTruthy()
      fireEvent.click(getByText('Close'))
      expect(queryByText('Close')).toBeNull()
    }
  })
})
