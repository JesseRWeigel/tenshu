import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from './helpers'
import { Cron } from '../pages/Cron'
import { fireEvent, waitFor } from '@testing-library/react'
import type { CronJob } from '@tenshu/shared'

vi.mock('@/hooks/useTheme', async () => {
  const actual = await vi.importActual('@/hooks/useTheme')
  return {
    ...actual,
    useTheme: vi.fn(() => ({ theme: 'warroom', setTheme: vi.fn() })),
  }
})

const mockJobs: CronJob[] = [
  {
    id: 'job-1',
    name: 'Orchestrate Cycle',
    schedule: '*/30 * * * *',
    enabled: true,
    lastRun: '2024-01-01T10:00:00Z',
    nextRun: '2024-01-01T10:30:00Z',
    lastStatus: 'success',
  },
  {
    id: 'job-2',
    name: 'Health Check',
    schedule: '0 * * * *',
    enabled: false,
    lastStatus: 'error',
  },
]

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve(mockJobs),
    ok: true,
  })
})

describe('Cron', () => {
  it('renders loading state initially', () => {
    mockFetch.mockResolvedValue({
      json: () => new Promise(() => {}),
      ok: true,
    })
    const { getByText } = renderWithProviders(<Cron />)
    expect(getByText('Loading cron jobs...')).toBeTruthy()
  })

  it('renders the scheduled ops header', async () => {
    const { findByText } = renderWithProviders(<Cron />)
    expect(await findByText('SCHEDULED OPS')).toBeTruthy()
  })

  it('renders sr-only heading for accessibility', async () => {
    const { container, findByText } = renderWithProviders(<Cron />)
    await findByText('SCHEDULED OPS')
    const srHeading = container.querySelector('.sr-only')
    expect(srHeading?.textContent).toBe('Scheduled Operations')
  })

  it('displays job names', async () => {
    const { findByText } = renderWithProviders(<Cron />)
    expect(await findByText('Orchestrate Cycle')).toBeTruthy()
    expect(await findByText('Health Check')).toBeTruthy()
  })

  it('displays cron schedules', async () => {
    const { findByText } = renderWithProviders(<Cron />)
    expect(await findByText('*/30 * * * *')).toBeTruthy()
    expect(await findByText('0 * * * *')).toBeTruthy()
  })

  it('displays last status badges', async () => {
    const { findByText } = renderWithProviders(<Cron />)
    expect(await findByText('success')).toBeTruthy()
    expect(await findByText('error')).toBeTruthy()
  })

  it('shows paused badge for disabled jobs', async () => {
    const { findByText } = renderWithProviders(<Cron />)
    expect(await findByText('paused')).toBeTruthy()
  })

  it('shows empty state when no jobs', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve([]),
      ok: true,
    })
    const { findByText } = renderWithProviders(<Cron />)
    expect(await findByText('No cron jobs configured')).toBeTruthy()
  })

  it('calls toggle mutation when play/pause button is clicked', async () => {
    const { findByText, container } = renderWithProviders(<Cron />)
    await findByText('Orchestrate Cycle')
    // Reset mock after initial data fetch calls
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockJobs),
      ok: true,
    })
    // Find all buttons - first two per job (toggle + run)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    // Click the first toggle button (pause for enabled job)
    fireEvent.click(buttons[0])
    // Mutation fires asynchronously
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cron/job-1',
        expect.objectContaining({
          method: 'PUT',
        }),
      )
    })
  })

  it('calls run mutation when refresh button is clicked', async () => {
    const { findByText, container } = renderWithProviders(<Cron />)
    await findByText('Orchestrate Cycle')
    // Reset mock after initial data fetch calls
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockJobs),
      ok: true,
    })
    const buttons = container.querySelectorAll('button')
    // Second button per job is the run button
    fireEvent.click(buttons[1])
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cron/job-1/run',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })
  })
})
