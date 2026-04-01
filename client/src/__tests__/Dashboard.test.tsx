import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, makeAgent } from './helpers'
import { Dashboard } from '../pages/Dashboard'

// Mock hooks
vi.mock('@/hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({ agents: [], loading: false, connected: true })),
}))
vi.mock('@/hooks/useTheme', async () => {
  const actual = await vi.importActual('@/hooks/useTheme')
  return {
    ...actual,
    useTheme: vi.fn(() => ({ theme: 'warroom', setTheme: vi.fn() })),
  }
})
vi.mock('@/hooks/useAgentHistory', () => ({
  useAgentHistory: vi.fn(() => ({ data: {} })),
}))
vi.mock('@/hooks/usePowerLevel', () => ({
  usePowerLevel: vi.fn(() => ({
    xp: 0,
    level: 0,
    levelName: 'Genin',
    nextLevelXp: 500,
    progress: 0,
    powerLevel: 0,
  })),
}))
vi.mock('@/hooks/useAchievements', () => ({
  useAchievements: vi.fn(() => []),
}))
vi.mock('@/hooks/useDemo', () => ({
  useDemo: vi.fn(() => ({ isDemo: true })),
}))
vi.mock('@/hooks/useMockData', () => ({
  useMockResults: vi.fn(() => ({ data: [], isLoading: false })),
}))
import { useMockResults } from '@/hooks/useMockData'
vi.mock('@/components/ActivityFeed', () => ({
  ActivityFeed: () => <div data-testid="activity-feed">ActivityFeed</div>,
}))

import { useAgents } from '@/hooks/useAgents'
import { useAchievements } from '@/hooks/useAchievements'
const mockUseAgents = vi.mocked(useAgents)
const mockUseAchievements = vi.mocked(useAchievements)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAgents.mockReturnValue({ agents: [], loading: false, connected: true })
  mockUseAchievements.mockReturnValue([])
})

describe('Dashboard', () => {
  it('renders loading state', () => {
    mockUseAgents.mockReturnValue({
      agents: [],
      loading: true,
      connected: false,
    })
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('Loading agents...')).toBeTruthy()
  })

  it('renders the overview header', () => {
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('OVERVIEW')).toBeTruthy()
  })

  it('shows connected status when connected', () => {
    mockUseAgents.mockReturnValue({
      agents: [],
      loading: false,
      connected: true,
    })
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('Connected')).toBeTruthy()
    expect(getByText('Live')).toBeTruthy()
  })

  it('shows disconnected status when not connected', () => {
    mockUseAgents.mockReturnValue({
      agents: [],
      loading: false,
      connected: false,
    })
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('Disconnected')).toBeTruthy()
    expect(getByText('Offline')).toBeTruthy()
  })

  it('renders agent cards for each agent', () => {
    const agents = [
      makeAgent({ config: { id: 'coder-bulma', name: 'Bulma' } }),
      makeAgent({ config: { id: 'qa-vegeta', name: 'Vegeta' } }),
    ]
    mockUseAgents.mockReturnValue({ agents, loading: false, connected: true })
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('Bulma')).toBeTruthy()
    expect(getByText('Vegeta')).toBeTruthy()
  })

  it('shows empty state when no agents configured', () => {
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('No agents configured in openclaw.json')).toBeTruthy()
  })

  it('displays correct active agent count', () => {
    const agents = [
      makeAgent({
        config: { id: 'coder-a', name: 'A' },
        state: { status: 'working' },
      }),
      makeAgent({
        config: { id: 'qa-b', name: 'B' },
        state: { status: 'idle' },
      }),
      makeAgent({
        config: { id: 'researcher-c', name: 'C' },
        state: { status: 'thinking' },
      }),
    ]
    mockUseAgents.mockReturnValue({ agents, loading: false, connected: true })
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('2/3')).toBeTruthy()
  })

  it('renders achievements when results exist', () => {
    vi.mocked(useMockResults).mockReturnValue({
      data: [
        {
          timestamp: '2024-01-01',
          cycle: 1,
          task: 'test',
          agent: 'a',
          score: 8,
          status: 'keep',
          description: 'test',
        },
      ],
      isLoading: false,
    })
    mockUseAchievements.mockReturnValue([
      {
        id: 'first-win',
        name: 'First Win',
        description: 'Win your first battle',
        icon: '🏆',
        unlocked: true,
      },
      {
        id: 'streak',
        name: 'Hot Streak',
        description: 'Win 5 in a row',
        icon: '🔥',
        unlocked: false,
      },
    ])
    const { getByText } = renderWithProviders(<Dashboard />)
    expect(getByText('First Win')).toBeTruthy()
    expect(getByText('Hot Streak')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', () => {
    const { container } = renderWithProviders(<Dashboard />)
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Dashboard Overview')
  })
})
