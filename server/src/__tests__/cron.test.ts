import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('../openclaw/cli.js', () => ({
  listCronJobs: vi.fn(),
  toggleCronJob: vi.fn(),
  runCronJob: vi.fn(),
  getCronRuns: vi.fn(),
  listSessions: vi.fn(),
}))

import {
  listCronJobs,
  toggleCronJob,
  runCronJob,
  getCronRuns,
} from '../openclaw/cli.js'

const mockedListCronJobs = vi.mocked(listCronJobs)
const mockedToggleCronJob = vi.mocked(toggleCronJob)
const mockedRunCronJob = vi.mocked(runCronJob)
const mockedGetCronRuns = vi.mocked(getCronRuns)

async function createApp() {
  const mod = await import('../routes/cron.js')
  const app = new Hono()
  app.route('/cron', mod.default)
  return app
}

describe('cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /', () => {
    it('returns list of cron jobs', async () => {
      const jobs = [
        { id: 'job-1', name: 'Backup', schedule: '0 * * * *', enabled: true },
      ]
      mockedListCronJobs.mockResolvedValue(jobs)

      const app = await createApp()
      const res = await app.request('/cron')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual(jobs)
    })

    it('returns 500 when listCronJobs fails', async () => {
      mockedListCronJobs.mockRejectedValue(new Error('CLI failed'))

      const app = await createApp()
      const res = await app.request('/cron')
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toBe('CLI failed')
    })
  })

  describe('PUT /:id', () => {
    it('toggles a cron job', async () => {
      mockedToggleCronJob.mockResolvedValue(undefined)

      const app = await createApp()
      const res = await app.request('/cron/job-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(mockedToggleCronJob).toHaveBeenCalledWith('job-1', true)
    })

    it('returns 400 for invalid job id', async () => {
      const app = await createApp()
      const res = await app.request('/cron/invalid%20id%21%40%23', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Invalid job id')
    })

    it('returns 400 when enabled is not a boolean', async () => {
      const app = await createApp()
      const res = await app.request('/cron/job-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: 'yes' }),
      })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('enabled must be a boolean')
    })

    it('returns 500 when toggleCronJob fails', async () => {
      mockedToggleCronJob.mockRejectedValue(new Error('toggle failed'))

      const app = await createApp()
      const res = await app.request('/cron/job-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toBe('toggle failed')
    })
  })

  describe('POST /:id/run', () => {
    it('runs a cron job', async () => {
      mockedRunCronJob.mockResolvedValue(undefined)

      const app = await createApp()
      const res = await app.request('/cron/job-1/run', { method: 'POST' })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(mockedRunCronJob).toHaveBeenCalledWith('job-1')
    })

    it('returns 400 for invalid job id', async () => {
      const app = await createApp()
      const res = await app.request('/cron/bad!id/run', { method: 'POST' })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Invalid job id')
    })

    it('returns 500 when runCronJob fails', async () => {
      mockedRunCronJob.mockRejectedValue(new Error('run failed'))

      const app = await createApp()
      const res = await app.request('/cron/job-1/run', { method: 'POST' })
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toBe('run failed')
    })
  })

  describe('GET /:id/runs', () => {
    it('returns cron run history', async () => {
      const runs = [
        {
          id: 'run-1',
          jobId: 'job-1',
          startedAt: '2026-03-12T14:00:00.000Z',
          status: 'success',
        },
      ]
      mockedGetCronRuns.mockResolvedValue(runs as any)

      const app = await createApp()
      const res = await app.request('/cron/job-1/runs')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual(runs)
      expect(mockedGetCronRuns).toHaveBeenCalledWith('job-1')
    })

    it('returns 400 for invalid job id', async () => {
      const app = await createApp()
      const res = await app.request('/cron/bad!id/runs')
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Invalid job id')
    })

    it('returns 500 when getCronRuns fails', async () => {
      mockedGetCronRuns.mockRejectedValue(new Error('runs failed'))

      const app = await createApp()
      const res = await app.request('/cron/job-1/runs')
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toBe('runs failed')
    })
  })

  describe('id validation', () => {
    it('accepts alphanumeric ids with hyphens and underscores', async () => {
      mockedToggleCronJob.mockResolvedValue(undefined)

      const app = await createApp()
      const res = await app.request('/cron/my_job-01', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      expect(res.status).toBe(200)
    })

    it('rejects ids longer than 64 characters', async () => {
      const longId = 'a'.repeat(65)
      const app = await createApp()
      const res = await app.request(`/cron/${longId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      expect(res.status).toBe(400)
    })
  })
})
