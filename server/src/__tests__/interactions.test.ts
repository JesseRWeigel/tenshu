import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Hono } from 'hono'

const TEST_DIR = join(tmpdir(), 'tenshu-test-interactions')
const TEST_KNOWLEDGE_DIR = join(TEST_DIR, 'team', 'knowledge')
const TEST_RESULTS_TSV = join(TEST_KNOWLEDGE_DIR, 'results.tsv')

// Set environment before importing routes
process.env.RESULTS_TSV = TEST_RESULTS_TSV

describe('interactions routes', () => {
  let app: Hono

  beforeEach(async () => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true })
    } catch {
      // ignore
    }
    mkdirSync(TEST_KNOWLEDGE_DIR, { recursive: true })

    vi.resetModules()
    const { default: interactionsRoute } =
      await import('../routes/interactions.js')
    app = new Hono()
    app.route('/interactions', interactionsRoute)
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  describe('GET /interactions', () => {
    it('returns empty nodes and edges when results.tsv does not exist', async () => {
      const res = await app.request('/interactions')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.nodes).toEqual([])
      expect(data.edges).toEqual([])
    })

    it('returns empty nodes and edges for header-only TSV', async () => {
      writeFileSync(
        TEST_RESULTS_TSV,
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
      )

      const res = await app.request('/interactions')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.nodes).toEqual([])
      expect(data.edges).toEqual([])
    })

    it('builds agent nodes with task counts and average scores', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tResearched',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t8.0\tkeep\tImplemented',
        '2026-03-24T12:00:00Z\t2\ttask-b\tresearcher\t9.0\tkeep\tResearched again',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/interactions')
      expect(res.status).toBe(200)
      const data = await res.json()

      const researcher = data.nodes.find(
        (n: { id: string }) => n.id === 'researcher',
      )
      expect(researcher).toBeDefined()
      expect(researcher.name).toBe('Senku')
      expect(researcher.role).toBe('researcher')
      expect(researcher.tasksCompleted).toBe(2)
      expect(researcher.avgScore).toBe(8.0)

      const coder = data.nodes.find((n: { id: string }) => n.id === 'coder')
      expect(coder).toBeDefined()
      expect(coder.name).toBe('Bulma')
      expect(coder.tasksCompleted).toBe(1)
      expect(coder.avgScore).toBe(8.0)
    })

    it('maps known agent IDs to character names', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tR',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t7.0\tkeep\tC',
        '2026-03-24T12:00:00Z\t1\ttask-a\tqa\t7.0\tkeep\tQ',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/interactions')
      const data = await res.json()

      const names: Record<string, string> = {}
      for (const node of data.nodes) {
        names[node.id] = node.name
      }
      expect(names.researcher).toBe('Senku')
      expect(names.coder).toBe('Bulma')
      expect(names.qa).toBe('Vegeta')
    })

    it('uses agent ID as name for unknown agents', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tcustom-bot\t7.0\tkeep\tCustom',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/interactions')
      const data = await res.json()

      const custom = data.nodes.find(
        (n: { id: string }) => n.id === 'custom-bot',
      )
      expect(custom).toBeDefined()
      expect(custom.name).toBe('custom-bot')
    })

    it('handles agents with zero scores', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t0\tcrash\tCrashed',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/interactions')
      const data = await res.json()

      const researcher = data.nodes.find(
        (n: { id: string }) => n.id === 'researcher',
      )
      expect(researcher.avgScore).toBe(0)
    })

    it('infers delegation edges from cycle agent sequences', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tR',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t8.0\tkeep\tC',
        '2026-03-24T12:00:00Z\t1\ttask-a\tqa\t8.0\tkeep\tQ',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/interactions')
      const data = await res.json()

      expect(data.edges.length).toBeGreaterThan(0)

      const researcherToCoder = data.edges.find(
        (e: { from: string; to: string }) =>
          e.from === 'researcher' && e.to === 'coder',
      )
      expect(researcherToCoder).toBeDefined()
      expect(researcherToCoder.count).toBe(1)

      const coderToQa = data.edges.find(
        (e: { from: string; to: string }) =>
          e.from === 'coder' && e.to === 'qa',
      )
      expect(coderToQa).toBeDefined()
    })

    it('accumulates edge counts across multiple cycles', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tR1',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t7.0\tkeep\tC1',
        '2026-03-24T12:00:00Z\t2\ttask-b\tresearcher\t8.0\tkeep\tR2',
        '2026-03-24T13:00:00Z\t2\ttask-b\tcoder\t8.0\tkeep\tC2',
        '2026-03-24T14:00:00Z\t3\ttask-c\tresearcher\t9.0\tkeep\tR3',
        '2026-03-24T15:00:00Z\t3\ttask-c\tcoder\t9.0\tkeep\tC3',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/interactions')
      const data = await res.json()

      const researcherToCoder = data.edges.find(
        (e: { from: string; to: string }) =>
          e.from === 'researcher' && e.to === 'coder',
      )
      expect(researcherToCoder).toBeDefined()
      expect(researcherToCoder.count).toBe(3)
    })

    it('computes average score on edges', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tR1',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t8.0\tkeep\tC1',
        '2026-03-24T12:00:00Z\t2\ttask-b\tresearcher\t6.0\tkeep\tR2',
        '2026-03-24T13:00:00Z\t2\ttask-b\tcoder\t10.0\tkeep\tC2',
      ].join('\n')
      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/interactions')
      const data = await res.json()

      const edge = data.edges.find(
        (e: { from: string; to: string }) =>
          e.from === 'researcher' && e.to === 'coder',
      )
      expect(edge).toBeDefined()
      // Final scores per cycle: cycle 1 = 8.0, cycle 2 = 10.0 => avg 9.0
      expect(edge.avgScore).toBe(9.0)
    })

    it('tracks task names on edges (max 5)', async () => {
      const lines = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
      ]
      for (let i = 1; i <= 7; i++) {
        lines.push(
          `2026-03-24T${String(i + 9).padStart(2, '0')}:00:00Z\t${i}\ttask-${i}\tresearcher\t7.0\tkeep\tR`,
        )
        lines.push(
          `2026-03-24T${String(i + 9).padStart(2, '0')}:30:00Z\t${i}\ttask-${i}\tcoder\t7.0\tkeep\tC`,
        )
      }
      writeFileSync(TEST_RESULTS_TSV, lines.join('\n'))

      const res = await app.request('/interactions')
      const data = await res.json()

      const edge = data.edges.find(
        (e: { from: string; to: string }) =>
          e.from === 'researcher' && e.to === 'coder',
      )
      expect(edge.tasks.length).toBeLessThanOrEqual(5)
    })

    it('handles error gracefully and returns 500', async () => {
      // Create a directory where the file is expected to cause a read error
      rmSync(TEST_RESULTS_TSV, { force: true })
      mkdirSync(TEST_RESULTS_TSV, { recursive: true })

      const res = await app.request('/interactions')
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })
  })
})
