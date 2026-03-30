import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChildProcess } from 'node:child_process'

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('node:util', () => ({
  promisify: vi.fn((fn) => fn),
}))

import { execFile } from 'node:child_process'
import {
  listSessions,
  listCronJobs,
  toggleCronJob,
  runCronJob,
  getCronRuns,
} from '../openclaw/cli.js'

const mockedExecFile = vi.mocked(execFile)

describe('openclaw cli module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSessions', () => {
    it('parses sessions from CLI output', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          sessions: [
            {
              sessionId: 's1',
              agentId: 'agent-1',
              model: 'claude-sonnet-4',
              inputTokens: 100,
              outputTokens: 200,
              totalTokens: 300,
              updatedAt: 1234567890000,
              key: 'my-session',
            },
          ],
        }),
        stderr: '',
      } as any)

      const sessions = await listSessions()

      expect(mockedExecFile).toHaveBeenCalledWith(
        'openclaw',
        ['sessions', '--all-agents', '--json'],
        { timeout: 15000 },
      )
      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toEqual({
        id: 's1',
        agentId: 'agent-1',
        label: 'my-session',
        startedAt: new Date(1234567890000).toISOString(),
        lastActivity: new Date(1234567890000).toISOString(),
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        model: 'claude-sonnet-4',
        cost: 0,
      })
    })

    it('handles CLI output with prefixed text before JSON', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: 'Loading config...\n{"sessions": []}',
        stderr: '',
      } as any)

      const sessions = await listSessions()

      expect(sessions).toEqual([])
    })

    it('throws error when CLI command fails', async () => {
      mockedExecFile.mockRejectedValue(
        Object.assign(new Error('Command failed'), {
          stderr: 'openclaw not found',
        }),
      )

      await expect(listSessions()).rejects.toThrow(
        'openclaw sessions --all-agents --json failed: openclaw not found',
      )
    })

    it('handles missing optional fields with defaults', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          sessions: [
            {
              sessionId: 's2',
              agentId: 'agent-2',
            },
          ],
        }),
        stderr: '',
      } as any)

      const sessions = await listSessions()

      expect(sessions[0]).toMatchObject({
        id: 's2',
        agentId: 'agent-2',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: 'unknown',
        cost: 0,
      })
    })
  })

  describe('listCronJobs', () => {
    it('parses cron jobs from CLI output', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          jobs: [
            {
              id: 'job-1',
              name: 'Daily Task',
              schedule: '0 0 * * *',
              enabled: true,
            },
          ],
        }),
        stderr: '',
      } as any)

      const jobs = await listCronJobs()

      expect(mockedExecFile).toHaveBeenCalledWith(
        'openclaw',
        ['cron', 'list', '--json', '--all'],
        { timeout: 15000 },
      )
      expect(jobs).toHaveLength(1)
      expect(jobs[0]).toEqual({
        id: 'job-1',
        name: 'Daily Task',
        schedule: '0 0 * * *',
        enabled: true,
      })
    })

    it('returns empty array when no jobs exist', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify({ jobs: [] }),
        stderr: '',
      } as any)

      const jobs = await listCronJobs()

      expect(jobs).toEqual([])
    })

    it('handles missing jobs property', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify({}),
        stderr: '',
      } as any)

      const jobs = await listCronJobs()

      expect(jobs).toEqual([])
    })
  })

  describe('toggleCronJob', () => {
    it('enables a cron job', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: 'Job enabled',
        stderr: '',
      } as any)

      await toggleCronJob('job-1', true)

      expect(mockedExecFile).toHaveBeenCalledWith(
        'openclaw',
        ['cron', 'enable', 'job-1'],
        { timeout: 15000 },
      )
    })

    it('disables a cron job', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: 'Job disabled',
        stderr: '',
      } as any)

      await toggleCronJob('job-1', false)

      expect(mockedExecFile).toHaveBeenCalledWith(
        'openclaw',
        ['cron', 'disable', 'job-1'],
        { timeout: 15000 },
      )
    })

    it('throws error when CLI command fails', async () => {
      mockedExecFile.mockRejectedValue(
        Object.assign(new Error('Command failed'), {
          stderr: 'Job not found',
        }),
      )

      await expect(toggleCronJob('job-1', true)).rejects.toThrow(
        'openclaw cron enable job-1 failed: Job not found',
      )
    })
  })

  describe('runCronJob', () => {
    it('runs a cron job with force flag', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: 'Job started',
        stderr: '',
      } as any)

      await runCronJob('job-1')

      expect(mockedExecFile).toHaveBeenCalledWith(
        'openclaw',
        ['cron', 'run', 'job-1', '--force'],
        { timeout: 15000 },
      )
    })
  })

  describe('getCronRuns', () => {
    it('parses cron runs from CLI output', async () => {
      const runs = [
        {
          id: 'run-1',
          jobId: 'job-1',
          status: 'success',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:05:00Z',
        },
      ]

      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify(runs),
        stderr: '',
      } as any)

      const result = await getCronRuns('job-1')

      expect(mockedExecFile).toHaveBeenCalledWith(
        'openclaw',
        ['cron', 'runs', 'job-1', '--json'],
        { timeout: 15000 },
      )
      expect(result).toEqual(runs)
    })

    it('handles array output starting with bracket', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: 'Loading...\n[{"id": "run-1"}]',
        stderr: '',
      } as any)

      const result = await getCronRuns('job-1')

      expect(result).toEqual([{ id: 'run-1' }])
    })

    it('throws error when output has no JSON', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: 'No runs found',
        stderr: '',
      } as any)

      await expect(getCronRuns('job-1')).rejects.toThrow(
        'Unexpected CLI output: No runs found',
      )
    })
  })
})
