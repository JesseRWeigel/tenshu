import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Hono } from 'hono'

const TEST_DIR = join(tmpdir(), 'tenshu-test-activity')
const TEST_TEAM_DIR = join(TEST_DIR, 'team')
const TEST_KNOWLEDGE_DIR = join(TEST_TEAM_DIR, 'knowledge')
const TEST_LOG = join(TEST_KNOWLEDGE_DIR, 'team-log.jsonl')
const TEST_ARTIFACTS_DIR = join(TEST_KNOWLEDGE_DIR, 'artifacts')
const TEST_ORCHESTRATOR_LOG = '/tmp/orchestrator-output.log'
const TEST_RESULTS_TSV = join(TEST_KNOWLEDGE_DIR, 'results.tsv')

// Set environment before importing routes
process.env.TEAM_DIR = TEST_TEAM_DIR
process.env.RESULTS_TSV = TEST_RESULTS_TSV

describe('activity routes', () => {
  let app: Hono

  beforeEach(async () => {
    // Clean up from previous runs
    try {
      rmSync(TEST_DIR, { recursive: true, force: true })
    } catch {
      // ignore if doesn't exist
    }

    // Create test directory structure
    mkdirSync(TEST_ARTIFACTS_DIR, { recursive: true })

    // Dynamically import route to get fresh instance with correct env vars
    vi.resetModules()
    const { default: activityRoute } = await import('../routes/activity.js')

    // Mount the activity routes
    app = new Hono()
    app.route('/activity', activityRoute)
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    // Clean up orchestrator log if it was created
    try {
      rmSync(TEST_ORCHESTRATOR_LOG, { force: true })
    } catch {
      // ignore if doesn't exist
    }
  })

  describe('GET /activity/log', () => {
    it('returns empty array when log file does not exist', async () => {
      const res = await app.request('/activity/log')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('returns empty array for empty log file', async () => {
      writeFileSync(TEST_LOG, '')

      const res = await app.request('/activity/log')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('parses valid JSONL entries and returns them in reverse order', async () => {
      const entries = [
        {
          timestamp: '2026-03-24T10:00:00Z',
          type: 'task',
          agent: 'researcher',
          task: 'explore-api',
          result_length: 500,
          score: 7.5,
          verdict: 'keep',
        },
        {
          timestamp: '2026-03-24T11:00:00Z',
          type: 'task',
          agent: 'coder',
          task: 'implement-feature',
          result_length: 1200,
          score: 8.2,
          verdict: 'keep',
        },
        {
          timestamp: '2026-03-24T12:00:00Z',
          type: 'task',
          agent: 'qa',
          task: 'review-code',
          result_length: 300,
          score: 6.8,
          verdict: 'discard',
        },
      ]

      const jsonl = entries.map((e) => JSON.stringify(e)).join('\n')
      writeFileSync(TEST_LOG, jsonl)

      const res = await app.request('/activity/log')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(3)
      // Should be in reverse order (newest first)
      expect(data[0].timestamp).toBe('2026-03-24T12:00:00Z')
      expect(data[1].timestamp).toBe('2026-03-24T11:00:00Z')
      expect(data[2].timestamp).toBe('2026-03-24T10:00:00Z')
    })

    it('filters out malformed JSON lines', async () => {
      const jsonl = [
        JSON.stringify({
          timestamp: '2026-03-24T10:00:00Z',
          agent: 'researcher',
        }),
        'this is not valid JSON',
        '{ incomplete: json',
        JSON.stringify({ timestamp: '2026-03-24T11:00:00Z', agent: 'coder' }),
      ].join('\n')

      writeFileSync(TEST_LOG, jsonl)

      const res = await app.request('/activity/log')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(2)
      expect(data[0].agent).toBe('coder')
      expect(data[1].agent).toBe('researcher')
    })

    it('respects the limit query parameter', async () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        timestamp: `2026-03-24T${String(i).padStart(2, '0')}:00:00Z`,
        agent: 'researcher',
        task: `task-${i}`,
      }))

      const jsonl = entries.map((e) => JSON.stringify(e)).join('\n')
      writeFileSync(TEST_LOG, jsonl)

      const res = await app.request('/activity/log?limit=5')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(5)
      // Should be last 5 entries in reverse order
      expect(data[0].task).toBe('task-49')
      expect(data[4].task).toBe('task-45')
    })

    it('defaults to limit of 20', async () => {
      const entries = Array.from({ length: 30 }, (_, i) => ({
        timestamp: `2026-03-24T${String(i).padStart(2, '0')}:00:00Z`,
        agent: 'researcher',
        task: `task-${i}`,
      }))

      const jsonl = entries.map((e) => JSON.stringify(e)).join('\n')
      writeFileSync(TEST_LOG, jsonl)

      const res = await app.request('/activity/log')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(20)
    })

    it('handles log file with trailing newlines and empty lines', async () => {
      const jsonl = [
        JSON.stringify({
          timestamp: '2026-03-24T10:00:00Z',
          agent: 'researcher',
        }),
        '',
        JSON.stringify({ timestamp: '2026-03-24T11:00:00Z', agent: 'coder' }),
        '',
        '',
      ].join('\n')

      writeFileSync(TEST_LOG, jsonl)

      const res = await app.request('/activity/log')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(2)
    })
  })

  describe('GET /activity/artifacts', () => {
    it('returns empty array when artifacts directory does not exist', async () => {
      rmSync(TEST_ARTIFACTS_DIR, { recursive: true, force: true })

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('returns empty array for empty artifacts directory', async () => {
      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('returns artifact summaries with correct metadata', async () => {
      const content = `# Research: API exploration
---
Cycle: 5
Length: 500

This is a substantive preview that should be extracted from the research artifact.

More content here...`

      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-explore-api-20260324-100000.md'),
        content,
      )

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('research-explore-api-20260324-100000.md')
      expect(data[0].type).toBe('research')
      expect(data[0].task).toBe('explore-api')
      expect(data[0].timestamp).toBe('2026-03-24 10:00:00')
      expect(data[0].sizeKB).toBeGreaterThanOrEqual(0)
      expect(data[0].preview).toContain('substantive preview')
    })

    it('classifies artifacts by type (research, coder, qa)', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task1-20260324-100000.md'),
        '# Research\n\nResearch content here with enough text.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'coder-task2-20260324-110000.md'),
        '# Code\n\nCode implementation details here.',
      )
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'qa-task3-20260324-120000.md'),
        '# QA Review\n\nQA review feedback and results here.',
      )

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(3)
      // Files are sorted alphabetically in reverse, so: qa, research, coder
      expect(data.find((d) => d.type === 'qa')).toBeDefined()
      expect(data.find((d) => d.type === 'coder')).toBeDefined()
      expect(data.find((d) => d.type === 'research')).toBeDefined()
    })

    it('extracts preview from first substantive paragraph', async () => {
      const content = `# Title
---
Cycle: 1
Length: 100

This line should be extracted as the preview because it meets all criteria.`

      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        content,
      )

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data[0].preview).toContain('This line should be extracted')
    })

    it('skips headers and metadata when extracting preview', async () => {
      const content = `# Title
## Subtitle
---
Cycle: 5
Length: 200
{metadata}

Not long enough.

This is the first line that is long enough and substantive to be used as a preview.`

      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        content,
      )

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data[0].preview).toContain('first line that is long enough')
    })

    it('truncates preview to 200 characters', async () => {
      const longText = 'a'.repeat(300)
      const content = `# Title\n\n\n\n${longText}`

      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        content,
      )

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      // Preview is extracted, and if found, should be truncated to 200 chars
      // But the text 'aaa...' might not meet the 30+ char requirement
      // Let me check: 300 'a's definitely meets it
      expect(data[0].preview).toHaveLength(200)
    })

    it('respects the limit query parameter', async () => {
      for (let i = 0; i < 15; i++) {
        writeFileSync(
          join(
            TEST_ARTIFACTS_DIR,
            `research-task${i}-2026032${String(i % 10).padStart(2, '0')}-100000.md`,
          ),
          `# Task ${i}\n\nThis is substantive content for task ${i} with enough length.`,
        )
      }

      const res = await app.request('/activity/artifacts?limit=5')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(5)
    })

    it('defaults to limit of 10', async () => {
      for (let i = 0; i < 15; i++) {
        writeFileSync(
          join(
            TEST_ARTIFACTS_DIR,
            `research-task${i}-2026032${String(i % 10).padStart(2, '0')}-100000.md`,
          ),
          `# Task ${i}\n\nThis is substantive content for task ${i} with enough length.`,
        )
      }

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(10)
    })

    it('ignores non-markdown files', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        '# Valid\n\nValid markdown file content here.',
      )
      writeFileSync(join(TEST_ARTIFACTS_DIR, 'readme.txt'), 'text file')
      writeFileSync(join(TEST_ARTIFACTS_DIR, 'data.json'), '{}')

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(1)
      expect(data[0].name).toContain('.md')
    })

    it('handles malformed filenames gracefully', async () => {
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'invalid-filename.md'),
        '# Invalid\n\nThis file has an invalid filename format but should still work.',
      )

      const res = await app.request('/activity/artifacts')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toHaveLength(1)
      expect(data[0].type).toBe('unknown')
      expect(data[0].task).toBe('invalid-filename.md')
      expect(data[0].timestamp).toBe('')
    })

    it('handles file read errors gracefully', async () => {
      // Create directory instead of file to cause read error
      mkdirSync(join(TEST_ARTIFACTS_DIR, 'not-a-file.md'))
      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-20260324-100000.md'),
        '# Valid\n\nValid content here with enough length.',
      )

      const res = await app.request('/activity/artifacts')
      // Route returns 500 when it encounters errors reading files
      expect(res.status).toBe(500)
    })
  })

  describe('GET /activity/current', () => {
    it('returns running=false when orchestrator log does not exist', async () => {
      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.running).toBe(false)
      expect(data.lines).toEqual([])
    })

    it('returns running=true when orchestrator log is empty', async () => {
      writeFileSync(TEST_ORCHESTRATOR_LOG, '')

      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()
      // When log exists, it returns running=true even if empty
      expect(data.running).toBe(true)
    })

    it('extracts current cycle information from log', async () => {
      const log = [
        'Starting orchestrator...',
        'CYCLE 5 (#42) — implement-auth-flow',
        'Sending to researcher (research)',
        'researcher responded (1500 chars)',
        'Sending to coder (implement)',
        'Current task in progress...',
      ].join('\n')

      writeFileSync(TEST_ORCHESTRATOR_LOG, log)

      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.running).toBe(true)
      expect(data.cycle).toBe('42')
      expect(data.task).toBe('implement-auth-flow')
      expect(data.lastAgent).toBe('coder')
      expect(data.lastStatus).toBe('researcher responded (1500 chars)')
      expect(data.recentLines).toBeDefined()
    })

    it('detects agent responses', async () => {
      const log = [
        'CYCLE 1 (#10) — test-task',
        'Sending to coder (implement)',
        'coder responded (2400 chars)',
      ].join('\n')

      writeFileSync(TEST_ORCHESTRATOR_LOG, log)

      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.lastStatus).toBe('coder responded (2400 chars)')
    })

    it('detects agent timeout', async () => {
      const log = [
        'CYCLE 1 (#10) — test-task',
        'Sending to researcher (research)',
        '!! researcher timed out',
      ].join('\n')

      writeFileSync(TEST_ORCHESTRATOR_LOG, log)

      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.lastStatus).toContain('timed out')
    })

    it('detects cycle completion', async () => {
      const log = [
        'CYCLE 1 (#10) — test-task',
        'Sending to qa (review)',
        'qa responded (800 chars)',
        'CYCLE COMPLETE - Score: 8.5',
      ].join('\n')

      writeFileSync(TEST_ORCHESTRATOR_LOG, log)

      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.lastStatus).toBe('Cycle complete')
    })

    it('returns last 15 lines in recentLines', async () => {
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}`)
      writeFileSync(TEST_ORCHESTRATOR_LOG, lines.join('\n'))

      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.recentLines).toHaveLength(15)
      expect(data.recentLines[14]).toBe('Line 99')
    })

    it('handles log with fewer than 50 lines', async () => {
      const log = ['Line 1', 'Line 2', 'Line 3'].join('\n')
      writeFileSync(TEST_ORCHESTRATOR_LOG, log)

      const res = await app.request('/activity/current')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.running).toBe(true)
      expect(data.recentLines).toHaveLength(3)
    })
  })

  describe('GET /activity/agent-history', () => {
    it('returns error when results.tsv does not exist', async () => {
      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      // Should return empty agent maps
      expect(data.researcher).toEqual([])
      expect(data.coder).toEqual([])
      expect(data.qa).toEqual([])
      expect(data.planner).toEqual([])
    })

    it('parses results.tsv and groups by agent', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\texplore-api\tresearcher\t7.5\tkeep\tResearched API endpoints',
        '2026-03-24T11:00:00Z\t1\texplore-api\tcoder\t7.5\tkeep\tQA approved: implemented endpoints',
      ].join('\n')

      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.researcher).toHaveLength(1)
      expect(data.researcher[0].task).toBe('explore-api')
      expect(data.coder).toHaveLength(1)
      expect(data.coder[0].task).toBe('explore-api')
      expect(data.qa).toHaveLength(1)
      expect(data.planner).toHaveLength(1)
    })

    it('handles multiple cycles with retries', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tResearched',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t7.0\tdiscard\tQA rejected: bugs found',
        '2026-03-24T12:00:00Z\t1\ttask-a\tcoder\t8.0\tkeep\tQA approved: bugs fixed',
      ].join('\n')

      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      // Coder should show retry count
      expect(data.coder[0].description).toContain('1 retry')
      // QA should show rejection and approval
      expect(data.qa[0].description).toContain('Rejected 1x, then approved')
    })

    it('respects the limit query parameter', async () => {
      const lines = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
      ]

      for (let i = 1; i <= 20; i++) {
        lines.push(
          `2026-03-24T${String(i).padStart(2, '0')}:00:00Z\t${i}\ttask-${i}\tresearcher\t7.0\tkeep\tResearched`,
        )
        lines.push(
          `2026-03-24T${String(i).padStart(2, '0')}:30:00Z\t${i}\ttask-${i}\tcoder\t7.0\tkeep\tQA approved`,
        )
      }

      writeFileSync(TEST_RESULTS_TSV, lines.join('\n'))

      const res = await app.request('/activity/agent-history?limit=5')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.researcher).toHaveLength(5)
      expect(data.coder).toHaveLength(5)
    })

    it('defaults to limit of 10', async () => {
      const lines = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
      ]

      for (let i = 1; i <= 20; i++) {
        lines.push(
          `2026-03-24T${String(i).padStart(2, '0')}:00:00Z\t${i}\ttask-${i}\tresearcher\t7.0\tkeep\tResearched`,
        )
        lines.push(
          `2026-03-24T${String(i).padStart(2, '0')}:30:00Z\t${i}\ttask-${i}\tcoder\t7.0\tkeep\tQA approved`,
        )
      }

      writeFileSync(TEST_RESULTS_TSV, lines.join('\n'))

      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.researcher).toHaveLength(10)
    })

    it('synthesizes planner history from cycle data', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.5\tkeep\tResearched',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t8.5\tkeep\tQA approved',
      ].join('\n')

      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.planner).toHaveLength(1)
      expect(data.planner[0].description).toContain('Coordinated')
      expect(data.planner[0].description).toContain('2 agents')
    })

    it('marks QA verdict based on approval/rejection', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tResearched',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t7.0\tdiscard\tQA rejected: issues found',
      ].join('\n')

      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.qa[0].verdict).toBe('FAIL')
    })

    it('processes cycles in reverse order (newest first)', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tFirst',
        '2026-03-24T11:00:00Z\t1\ttask-a\tcoder\t7.0\tkeep\tFirst',
        '2026-03-24T12:00:00Z\t2\ttask-b\tresearcher\t8.0\tkeep\tSecond',
        '2026-03-24T13:00:00Z\t2\ttask-b\tcoder\t8.0\tkeep\tSecond',
      ].join('\n')

      writeFileSync(TEST_RESULTS_TSV, tsv)

      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      // Newest cycle (2) should be first
      expect(data.researcher[0].cycle).toBe(2)
      expect(data.researcher[1].cycle).toBe(1)
    })

    it('enriches entries with artifact previews when available', async () => {
      const tsv = [
        'timestamp\tcycle\ttask\tagent\tscore\tstatus\tdescription',
        '2026-03-24T10:00:00Z\t1\ttask-a\tresearcher\t7.0\tkeep\tResearched',
        '2026-03-24T10:00:00Z\t1\ttask-a\tcoder\t7.0\tkeep\tImplemented',
      ].join('\n')

      writeFileSync(TEST_RESULTS_TSV, tsv)

      // Create matching artifact
      const artifactContent = `# Research
---
Cycle: 1
Length: 500

This is a detailed preview from the artifact that should be included in the history.`

      writeFileSync(
        join(TEST_ARTIFACTS_DIR, 'research-task-a-20260324-100000.md'),
        artifactContent,
      )

      const res = await app.request('/activity/agent-history')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.researcher[0].detailedTask).toContain(
        'detailed preview from the artifact',
      )
    })
  })
})
