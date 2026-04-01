import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, makeAgent } from './helpers'
import { Office } from '../pages/Office'

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
vi.mock('@/hooks/useSound', () => ({
  useSoundOnStatusChange: vi.fn(),
  useSound: vi.fn(() => ({ play: vi.fn(), muted: false, setMuted: vi.fn() })),
}))
vi.mock('@/office2d/WarRoom', () => ({
  WarRoom: ({ agents }: { agents: unknown[] }) => (
    <div data-testid="war-room">WarRoom ({agents.length} agents)</div>
  ),
}))
vi.mock('@/office2d/ControlDeck', () => ({
  ControlDeck: ({ agents }: { agents: unknown[] }) => (
    <div data-testid="control-deck">ControlDeck ({agents.length} agents)</div>
  ),
}))
vi.mock('@/office2d/GardenView', () => ({
  GardenView: ({ agents }: { agents: unknown[] }) => (
    <div data-testid="garden-view">GardenView ({agents.length} agents)</div>
  ),
}))
vi.mock('@/office2d/AgentPanel', () => ({
  default: ({ agent }: { agent: { config: { name: string } } }) => (
    <div data-testid="agent-panel">Panel: {agent.config.name}</div>
  ),
}))

import { useAgents } from '@/hooks/useAgents'
import { useTheme } from '@/hooks/useTheme'
const mockUseAgents = vi.mocked(useAgents)
const mockUseTheme = vi.mocked(useTheme)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAgents.mockReturnValue({ agents: [], loading: false, connected: true })
  mockUseTheme.mockReturnValue({ theme: 'warroom', setTheme: vi.fn() })
})

describe('Office', () => {
  it('renders loading state', () => {
    mockUseAgents.mockReturnValue({
      agents: [],
      loading: true,
      connected: false,
    })
    const { getByText } = renderWithProviders(<Office />)
    expect(getByText('Loading...')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', () => {
    const { container } = renderWithProviders(<Office />)
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Command Center')
  })

  it('renders WarRoom when theme is warroom', () => {
    mockUseTheme.mockReturnValue({ theme: 'warroom', setTheme: vi.fn() })
    const { getByTestId } = renderWithProviders(<Office />)
    expect(getByTestId('war-room')).toBeTruthy()
  })

  it('renders ControlDeck when theme is deck', () => {
    mockUseTheme.mockReturnValue({ theme: 'deck', setTheme: vi.fn() })
    const { getByTestId } = renderWithProviders(<Office />)
    expect(getByTestId('control-deck')).toBeTruthy()
  })

  it('renders GardenView when theme is garden', () => {
    mockUseTheme.mockReturnValue({ theme: 'garden', setTheme: vi.fn() })
    const { getByTestId } = renderWithProviders(<Office />)
    expect(getByTestId('garden-view')).toBeTruthy()
  })

  it('passes agents to the theme view', () => {
    const agents = [
      makeAgent({ config: { id: 'coder-a', name: 'Agent A' } }),
      makeAgent({ config: { id: 'qa-b', name: 'Agent B' } }),
    ]
    mockUseAgents.mockReturnValue({ agents, loading: false, connected: true })
    const { getByText } = renderWithProviders(<Office />)
    expect(getByText('WarRoom (2 agents)')).toBeTruthy()
  })

  it('does not show agent panel when no agent is selected', () => {
    const { queryByTestId } = renderWithProviders(<Office />)
    expect(queryByTestId('agent-panel')).toBeNull()
  })
})
