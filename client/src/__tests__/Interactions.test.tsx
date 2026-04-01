import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from './helpers'
import { Interactions } from '../pages/Interactions'

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

// Mock canvas getContext since jsdom doesn't support canvas
const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
  globalAlpha: 1,
  shadowColor: '',
  shadowBlur: 0,
}
HTMLCanvasElement.prototype.getContext = vi.fn(
  () => mockCtx,
) as unknown as typeof HTMLCanvasElement.prototype.getContext

// Mock requestAnimationFrame to run once then stop (prevent infinite loop)
let rafCallCount = 0
vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
  rafCallCount++
  if (rafCallCount <= 1) {
    cb(0)
  }
  return rafCallCount
})
vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  rafCallCount = 0
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ nodes: [], edges: [] }),
    ok: true,
  })
})

describe('Interactions', () => {
  it('renders the interaction map header', () => {
    const { getByText } = renderWithProviders(<Interactions />)
    expect(getByText('INTERACTION MAP')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', () => {
    const { container } = renderWithProviders(<Interactions />)
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Interaction Map')
  })

  it('displays stats cards with demo data', () => {
    const { getByText, getAllByText } = renderWithProviders(<Interactions />)
    expect(getByText('Agents')).toBeTruthy()
    // 5 appears in both Agents and Connections cards
    expect(getAllByText('5').length).toBe(2)
    expect(getByText('Delegations')).toBeTruthy()
    expect(getByText('568')).toBeTruthy()
    expect(getByText('Connections')).toBeTruthy()
    expect(getByText('Avg Score')).toBeTruthy()
    expect(getByText('6.4')).toBeTruthy()
  })

  it('renders the delegation flow section', () => {
    const { getByText } = renderWithProviders(<Interactions />)
    expect(getByText('Agent Delegation Flow')).toBeTruthy()
  })

  it('renders role color legend', () => {
    const { getAllByText } = renderWithProviders(<Interactions />)
    // Role labels appear in both the legend and delegation details table
    expect(getAllByText('planner').length).toBeGreaterThan(0)
    expect(getAllByText('researcher').length).toBeGreaterThan(0)
    expect(getAllByText('coder').length).toBeGreaterThan(0)
    expect(getAllByText('qa').length).toBeGreaterThan(0)
    expect(getAllByText('comms').length).toBeGreaterThan(0)
  })

  it('renders delegation details table in demo mode', () => {
    const { getByText } = renderWithProviders(<Interactions />)
    expect(getByText('Delegation Details')).toBeTruthy()
  })

  it('renders canvas element for graph', () => {
    const { container } = renderWithProviders(<Interactions />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
  })
})
