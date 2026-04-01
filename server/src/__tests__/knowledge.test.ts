import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Hono } from 'hono'

const TEST_DIR = join(tmpdir(), 'tenshu-test-knowledge')
const TEST_TEAM_DIR = join(TEST_DIR, 'team')
const TEST_ARTIFACTS_DIR = join(TEST_TEAM_DIR, 'knowledge', 'artifacts')

// Set environment before importing routes
process.env.TEAM_DIR = TEST_TEAM_DIR

describe('knowledge routes', () => {
  let app: Hono

  beforeEach(async () => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true })
    } catch {
      // ignore
    }
    mkdirSync(TEST_ARTIFACTS_DIR, { recursive: true })

    vi.resetModules()
    const { default: knowledgeRoute } = await import('../routes/knowledge.js')
    app = new Hono()
    app.route('/knowledge', knowledgeRoute)
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  describe('GET /knowledge', () => {
    it('returns empty artifacts when directory does not exist', async () => {
      rmSync(TEST_ARTIFACTS_DIR, { recursive: true, force: true })

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.artifacts).toEqual([])
      expect(data.total).toBe(0)
    })

    it('returns empty artifacts for empty directory', async () => {
      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.artifacts).toEqual([])
      expect(data.total).toBe(0)
    })

    it('lists markdown artifacts with parsed metadata', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-explore-api-20260324-100000.md'),
        '# Research\n---\nCycle: 1\nLength: 500\n\nThis is a substantive preview of the research artifact content.',
      )

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(1)
      expect(data.total).toBe(1)
      expect(data.artifacts[0].name).toBe(
        'research-explore-api-20260324-100000.md',
      )
      expect(data.artifacts[0].type).toBe('research')
      expect(data.artifacts[0].task).toBe('explore-api')
      expect(data.artifacts[0].agent).toBe('Senku')
      expect(data.artifacts[0].timestamp).toBe('2026-03-24 10:00:00')
      expect(data.artifacts[0].preview).toContain('substantive preview')
    })

    it('maps agent types to names (researcher=Senku, coder=Bulma, qa=Vegeta)', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task1-20260324-100000.md'),
        '# Research\n\n\n\nThis is substantive research content here.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'coder-task2-20260324-110000.md'),
        '# Code\n\n\n\nThis is substantive coder content here.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'qa-task3-20260324-120000.md'),
        '# QA\n\n\n\nThis is substantive qa review content here.',
      )

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(3)
      const research = data.artifacts.find(
        (a: { type: string }) => a.type === 'research',
      )
      const coder = data.artifacts.find(
        (a: { type: string }) => a.type === 'coder',
      )
      const qa = data.artifacts.find((a: { type: string }) => a.type === 'qa')
      expect(research.agent).toBe('Senku')
      expect(coder.agent).toBe('Bulma')
      expect(qa.agent).toBe('Vegeta')
    })

    it('handles malformed filenames as misc type', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'random-notes.md'),
        '# Notes\n\n\n\nSome miscellaneous notes content here.',
      )

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(1)
      expect(data.artifacts[0].type).toBe('misc')
      expect(data.artifacts[0].agent).toBe('unknown')
      expect(data.artifacts[0].timestamp).toBe('')
    })

    it('ignores non-markdown files', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        '# Research\n\n\n\nSubstantive research content here.',
      )
      writeFileSync(join(TEST_ARTIFACTS_DIR, 'data.json'), '{}')
      writeFileSync(join(TEST_ARTIFACTS_DIR, 'notes.txt'), 'text')

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(1)
      expect(data.artifacts[0].name).toContain('.md')
    })

    it('respects the limit query parameter', async () => {
      for (let i = 0; i < 10; i++) {
        writeFileSync(
          join(TEST_ARTIFACTS_DIR, `research-task${i}-20260324-10000${i}.md`),
          `# Task ${i}\n\n\n\nSubstantive content for task number ${i} here.`,
        )
      }

      const res = await app.request('/knowledge?limit=3')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(3)
      expect(data.total).toBe(10)
    })

    it('defaults to limit of 50', async () => {
      for (let i = 0; i < 55; i++) {
        writeFileSync(
          join(
            TEST_ARTIFACTS_DIR,
            `research-task${String(i).padStart(3, '0')}-20260324-100000.md`,
          ),
          `# Task ${i}\n\n\n\nSubstantive content for task number ${i} here.`,
        )
      }

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(50)
      expect(data.total).toBe(55)
    })

    it('filters by agent query parameter', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task1-20260324-100000.md'),
        '# Research\n\n\n\nSubstantive research content here for test.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'coder-task2-20260324-110000.md'),
        '# Code\n\n\n\nSubstantive coder content here for test.',
      )

      const res = await app.request('/knowledge?agent=research')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(1)
      expect(data.artifacts[0].type).toBe('research')
    })

    it('filters by type query parameter', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task1-20260324-100000.md'),
        '# Research\n\n\n\nSubstantive research content here for test.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'coder-task2-20260324-110000.md'),
        '# Code\n\n\n\nSubstantive coder content here for test.',
      )

      const res = await app.request('/knowledge?type=coder')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(1)
      expect(data.artifacts[0].type).toBe('coder')
    })

    it('filters by search query (filename match)', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-auth-flow-20260324-100000.md'),
        '# Research\n\n\n\nSubstantive research content here for test.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'coder-data-pipeline-20260324-110000.md'),
        '# Code\n\n\n\nSubstantive coder content here for test.',
      )

      const res = await app.request('/knowledge?search=auth')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(1)
      expect(data.artifacts[0].task).toBe('auth-flow')
    })

    it('filters by search query (content match)', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task1-20260324-100000.md'),
        '# Research\n\n\n\nThis artifact discusses authentication patterns in depth.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'coder-task2-20260324-110000.md'),
        '# Code\n\n\n\nThis artifact covers database migrations thoroughly.',
      )

      const res = await app.request('/knowledge?search=authentication')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts).toHaveLength(1)
      expect(data.artifacts[0].name).toContain('task1')
    })

    it('returns artifacts in reverse sorted order', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-aaa-20260324-100000.md'),
        '# A\n\n\n\nSubstantive content for artifact A here.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-zzz-20260324-110000.md'),
        '# Z\n\n\n\nSubstantive content for artifact Z here.',
      )

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts[0].name).toContain('zzz')
      expect(data.artifacts[1].name).toContain('aaa')
    })

    it('extracts preview skipping headers and metadata lines', async () => {
      const content = `# Title
## Subtitle
---
Cycle: 5
Length: 200

Short.

This is the first substantive preview line that should be extracted from the content.`

      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        content,
      )

      const res = await app.request('/knowledge')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.artifacts[0].preview).toContain(
        'first substantive preview line',
      )
    })
  })

  describe('GET /knowledge/artifact/:name', () => {
    it('returns full artifact content', async () => {
      const content = '# Research\n\nFull content of the artifact.'
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        content,
      )

      const res = await app.request(
        '/knowledge/artifact/research-task-20260324-100000.md',
      )
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.name).toBe('research-task-20260324-100000.md')
      expect(data.content).toBe(content)
      expect(data.type).toBe('research')
      expect(data.task).toBe('task')
      expect(data.agent).toBe('Senku')
      expect(data.timestamp).toBe('2026-03-24 10:00:00')
      expect(data.sizeKB).toBeGreaterThanOrEqual(0)
    })

    it('returns 404 for non-existent artifact', async () => {
      const res = await app.request('/knowledge/artifact/does-not-exist.md')
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Not found')
    })

    it('returns 400 for path traversal attempts with ..', async () => {
      const res = await app.request(
        '/knowledge/artifact/..%2F..%2Fetc%2Fpasswd',
      )
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid filename')
    })

    it('returns 400 for path traversal attempts with /', async () => {
      const res = await app.request('/knowledge/artifact/foo%2Fbar.md')
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid filename')
    })
  })

  describe('GET /knowledge/stats', () => {
    it('returns zero stats when artifacts directory does not exist', async () => {
      rmSync(TEST_ARTIFACTS_DIR, { recursive: true, force: true })

      const res = await app.request('/knowledge/stats')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.total).toBe(0)
      expect(data.byType).toEqual({})
      expect(data.byAgent).toEqual({})
    })

    it('returns aggregate counts by type and agent', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task1-20260324-100000.md'),
        '# R1\ncontent',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task2-20260324-110000.md'),
        '# R2\ncontent',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'coder-task3-20260324-120000.md'),
        '# C1\ncontent',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'qa-task4-20260324-130000.md'),
        '# Q1\ncontent',
      )

      const res = await app.request('/knowledge/stats')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.total).toBe(4)
      expect(data.byType.research).toBe(2)
      expect(data.byType.coder).toBe(1)
      expect(data.byType.qa).toBe(1)
      expect(data.byAgent.Senku).toBe(2)
      expect(data.byAgent.Bulma).toBe(1)
      expect(data.byAgent.Vegeta).toBe(1)
    })

    it('includes totalSizeKB in stats', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        'x'.repeat(2048),
      )

      const res = await app.request('/knowledge/stats')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.total).toBe(1)
      expect(data.totalSizeKB).toBeGreaterThanOrEqual(1)
    })

    it('ignores non-markdown files in stats', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        '# R\ncontent',
      )
      writeFileSync(join(TEST_ARTIFACTS_DIR, 'data.json'), '{}')

      const res = await app.request('/knowledge/stats')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.total).toBe(1)
    })
  })
})
