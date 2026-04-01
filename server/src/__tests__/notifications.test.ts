import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Hono } from 'hono'

const TEST_DIR = join(tmpdir(), 'tenshu-test-notifications')
const TEST_KNOWLEDGE_DIR = join(TEST_DIR, 'team', 'knowledge')
const TEST_RESULTS_TSV = join(TEST_KNOWLEDGE_DIR, 'results.tsv')
const TEST_ORCHESTRATOR_LOG = join(tmpdir(), 'tenshu-test-orch-notif.log')

// Set environment before importing routes
process.env.TEAM_DIR = join(TEST_DIR, 'team')
process.env.RESULTS_TSV = TEST_RESULTS_TSV

describe('notification routes', () => {
  let app: Hono

  beforeEach(async () => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true })
    } catch {
      // ignore
    }
    mkdirSync(TEST_KNOWLEDGE_DIR, { recursive: true })

    // Clear timers to prevent the setInterval from firing
    vi.useFakeTimers({ shouldAdvanceTime: false })

    vi.resetModules()
    const { default: notificationRoutes } =
      await import('../routes/notifications.js')

    app = new Hono()
    app.route('/notifications', notificationRoutes)

    vi.useRealTimers()
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    try {
      rmSync(TEST_ORCHESTRATOR_LOG, { force: true })
    } catch {
      // ignore
    }
  })

  describe('GET /notifications', () => {
    it('returns empty notifications initially', async () => {
      const res = await app.request('/notifications')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.notifications).toEqual([])
      expect(data.total).toBe(0)
    })

    it('returns notifications structure with limit and total', async () => {
      const res = await app.request('/notifications?limit=10')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveProperty('notifications')
      expect(data).toHaveProperty('total')
      expect(Array.isArray(data.notifications)).toBe(true)
    })
  })

  describe('DELETE /notifications/:id', () => {
    it('returns ok for deleting a non-existent notification', async () => {
      const res = await app.request('/notifications/nonexistent-id', {
        method: 'DELETE',
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })
  })

  describe('scanForEvents (via module import)', () => {
    it('generates notification for high score (>=9)', async () => {
      // We need to test the scanning logic by triggering it
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.resetModules()

      // Write results TSV with a high score before importing
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\tapi-design\tresearcher\t9.5\tkeep\tExcellent work',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const { default: notifRoutes } =
        await import('../routes/notifications.js')
      const testApp = new Hono()
      testApp.route('/notifications', notifRoutes)

      // Wait for initial scan to complete
      vi.useRealTimers()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const res = await testApp.request('/notifications')
      expect(res.status).toBe(200)
      const data = await res.json()

      // The initial scanForEvents call should have detected the high score
      const highScoreNotif = data.notifications.find(
        (n: { title: string }) => n.title === 'High Score!',
      )
      expect(highScoreNotif).toBeDefined()
      expect(highScoreNotif.level).toBe('success')
      expect(highScoreNotif.message).toContain('9.5')
    })

    it('generates notification for agent crash', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.resetModules()

      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t3\tauth-flow\tcoder\t0\tcrash\tSegfault',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const { default: notifRoutes } =
        await import('../routes/notifications.js')
      const testApp = new Hono()
      testApp.route('/notifications', notifRoutes)

      vi.useRealTimers()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const res = await testApp.request('/notifications')
      const data = await res.json()

      const crashNotif = data.notifications.find(
        (n: { title: string }) => n.title === 'Agent Crash',
      )
      expect(crashNotif).toBeDefined()
      expect(crashNotif.level).toBe('error')
      expect(crashNotif.message).toContain('coder')
    })

    it('generates notification for low score (<4)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.resetModules()

      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t2\trefactor\tqa\t2.5\tkeep\tPoor quality',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const { default: notifRoutes } =
        await import('../routes/notifications.js')
      const testApp = new Hono()
      testApp.route('/notifications', notifRoutes)

      vi.useRealTimers()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const res = await testApp.request('/notifications')
      const data = await res.json()

      const lowScoreNotif = data.notifications.find(
        (n: { title: string }) => n.title === 'Low Score',
      )
      expect(lowScoreNotif).toBeDefined()
      expect(lowScoreNotif.level).toBe('warning')
      expect(lowScoreNotif.message).toContain('2.5')
    })

    it('does not generate notification for mid-range scores', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.resetModules()

      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t6.0\tkeep\tAverage work',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const { default: notifRoutes } =
        await import('../routes/notifications.js')
      const testApp = new Hono()
      testApp.route('/notifications', notifRoutes)

      vi.useRealTimers()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const res = await testApp.request('/notifications')
      const data = await res.json()

      expect(data.notifications).toHaveLength(0)
    })
  })
})
