import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from './helpers'
import { System } from '../pages/System'
import type { SystemResources } from '@tenshu/shared'

vi.mock('@/hooks/useTheme', async () => {
  const actual = await vi.importActual('@/hooks/useTheme')
  return {
    ...actual,
    useTheme: vi.fn(() => ({ theme: 'warroom', setTheme: vi.fn() })),
  }
})

const mockSystemData: SystemResources = {
  gpu: {
    name: 'RTX 4090',
    tempC: 65,
    utilPercent: 75,
    memUsedMB: 16000,
    memTotalMB: 24000,
    powerW: 250,
    powerCapW: 450,
  },
  cpu: {
    usagePercent: 45,
    cores: 16,
  },
  memory: {
    usedMB: 24000,
    totalMB: 64000,
  },
  disk: {
    usedGB: 500,
    totalGB: 2000,
    path: '/',
  },
  loadedModels: [
    { name: 'qwen2.5-coder:32b', sizeGB: 18 },
    { name: 'llama3:8b', sizeGB: 4.7 },
  ],
  uptime: '3d 14h 22m',
}

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve(mockSystemData),
    ok: true,
  })
})

describe('System', () => {
  it('renders loading state when data is not available', () => {
    mockFetch.mockResolvedValue({
      json: () => new Promise(() => {}), // never resolves
      ok: true,
    })
    const { getByText } = renderWithProviders(<System />)
    expect(getByText('Loading system info...')).toBeTruthy()
  })

  it('renders the instruments header', async () => {
    const { findByText } = renderWithProviders(<System />)
    expect(await findByText('INSTRUMENTS')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', async () => {
    const { container, findByText } = renderWithProviders(<System />)
    await findByText('INSTRUMENTS')
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('System Instruments')
  })

  it('displays uptime badge', async () => {
    const { findByText } = renderWithProviders(<System />)
    expect(await findByText(/3d 14h 22m/)).toBeTruthy()
  })

  it('displays GPU information', async () => {
    const { findByText } = renderWithProviders(<System />)
    expect(await findByText('RTX 4090')).toBeTruthy()
    expect(await findByText('65°C')).toBeTruthy()
  })

  it('displays CPU core count', async () => {
    const { findByText } = renderWithProviders(<System />)
    expect(await findByText('16 cores')).toBeTruthy()
  })

  it('displays loaded models', async () => {
    const { findByText } = renderWithProviders(<System />)
    expect(await findByText('qwen2.5-coder:32b')).toBeTruthy()
    expect(await findByText('llama3:8b')).toBeTruthy()
    expect(await findByText('18GB')).toBeTruthy()
  })

  it('renders without GPU section when gpu is null', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ ...mockSystemData, gpu: null }),
      ok: true,
    })
    const { findByText, queryByText } = renderWithProviders(<System />)
    await findByText('INSTRUMENTS')
    expect(queryByText('RTX 4090')).toBeNull()
  })

  it('shows no models loaded message when models list is empty', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ ...mockSystemData, loadedModels: [] }),
      ok: true,
    })
    const { findByText } = renderWithProviders(<System />)
    expect(await findByText('No models loaded')).toBeTruthy()
  })
})
