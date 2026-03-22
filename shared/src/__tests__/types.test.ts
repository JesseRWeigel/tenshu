import { describe, it, expect } from 'vitest'
import type {
  Agent,
  AgentConfig,
  AgentState,
  AgentStatus,
  CronJob,
  CronRun,
  ISOTimestamp,
  ResultRow,
  Session,
  SystemResources,
  TenshuConfig,
  WSMessage,
  WSMessageType,
} from '../types.js'

// These tests verify the type contracts are sound by constructing valid objects.
// If types change in a breaking way, these will fail to compile.

describe('Agent types', () => {
  it('accepts a valid Agent object', () => {
    const config: AgentConfig = {
      id: 'test-agent',
      name: 'Test',
      workspace: '/tmp/test',
      model: { primary: 'gpt-4', fallbacks: ['gpt-3.5'] },
    }

    const state: AgentState = {
      id: 'test-agent',
      status: 'working',
      currentTask: 'doing stuff',
      error: undefined,
      model: 'gpt-4',
      lastActivity: new Date().toISOString(),
    }

    const agent: Agent = {
      config,
      state,
      color: '#ff6b35',
      emoji: '🤖',
    }

    expect(agent.config.id).toBe('test-agent')
    expect(agent.state.status).toBe('working')
  })

  it('accepts all valid status values', () => {
    const statuses: AgentStatus[] = [
      'idle',
      'working',
      'thinking',
      'error',
      'offline',
    ]
    expect(statuses).toHaveLength(5)
  })
})

describe('Session type', () => {
  it('accepts a valid Session object', () => {
    const session: Session = {
      id: 'sess-1',
      agentId: 'test-agent',
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      model: 'gpt-4',
      cost: 0.05,
    }

    expect(session.totalTokens).toBe(session.inputTokens + session.outputTokens)
  })
})

describe('ResultRow type', () => {
  it('accepts valid status values', () => {
    const statuses: ResultRow['status'][] = ['keep', 'discard', 'crash', 'skip']
    expect(statuses).toHaveLength(4)
  })

  it('accepts a valid ResultRow', () => {
    const row: ResultRow = {
      timestamp: new Date().toISOString(),
      cycle: 42,
      task: 'code-review',
      agent: 'Bulma',
      score: 7.8,
      status: 'keep',
      description: 'Reviewed auth middleware',
    }

    expect(row.score).toBeGreaterThanOrEqual(0)
    expect(row.score).toBeLessThanOrEqual(10)
  })
})

describe('CronJob type', () => {
  it('accepts a valid CronJob object', () => {
    const job: CronJob = {
      id: 'cron-1',
      name: 'daily-review',
      schedule: '0 9 * * *',
      enabled: true,
      lastRun: new Date().toISOString(),
      nextRun: new Date().toISOString(),
      lastStatus: 'success',
    }

    expect(job.id).toBe('cron-1')
    expect(job.enabled).toBe(true)
  })

  it('accepts a minimal CronJob without optional fields', () => {
    const job: CronJob = {
      id: 'cron-2',
      name: 'weekly-cleanup',
      schedule: '0 0 * * 0',
      enabled: false,
    }

    expect(job.lastRun).toBeUndefined()
    expect(job.nextRun).toBeUndefined()
    expect(job.lastStatus).toBeUndefined()
  })

  it('accepts valid lastStatus values', () => {
    const statuses: CronJob['lastStatus'][] = ['success', 'error']
    expect(statuses).toHaveLength(2)
  })
})

describe('CronRun type', () => {
  it('accepts a valid CronRun object', () => {
    const run: CronRun = {
      id: 'run-1',
      jobId: 'cron-1',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: 'success',
      output: 'All checks passed',
    }

    expect(run.jobId).toBe('cron-1')
    expect(run.status).toBe('success')
  })

  it('accepts a minimal CronRun without optional fields', () => {
    const run: CronRun = {
      id: 'run-2',
      jobId: 'cron-1',
      startedAt: new Date().toISOString(),
      status: 'running',
    }

    expect(run.finishedAt).toBeUndefined()
    expect(run.output).toBeUndefined()
  })

  it('accepts all valid status values', () => {
    const statuses: CronRun['status'][] = ['running', 'success', 'error']
    expect(statuses).toHaveLength(3)
  })
})

describe('WSMessage type', () => {
  it('accepts a valid WSMessage', () => {
    const msg: WSMessage<{ id: string }> = {
      type: 'agent:status',
      payload: { id: 'agent-1' },
      timestamp: new Date().toISOString(),
    }

    expect(msg.type).toBe('agent:status')
    expect(msg.payload.id).toBe('agent-1')
  })

  it('accepts all valid WSMessageType values', () => {
    const types: WSMessageType[] = [
      'agent:status',
      'agent:activity',
      'session:update',
      'cron:run',
      'connected',
    ]
    expect(types).toHaveLength(5)
  })

  it('defaults payload to unknown', () => {
    const msg: WSMessage = {
      type: 'connected',
      payload: null,
      timestamp: new Date().toISOString(),
    }

    expect(msg.payload).toBeNull()
  })
})

describe('SystemResources type', () => {
  it('accepts a full SystemResources object with GPU', () => {
    const resources: SystemResources = {
      gpu: {
        name: 'NVIDIA RTX 4090',
        tempC: 65,
        utilPercent: 80,
        memUsedMB: 8192,
        memTotalMB: 24576,
        powerW: 300,
        powerCapW: 450,
      },
      cpu: {
        usagePercent: 45,
        cores: 16,
      },
      memory: {
        usedMB: 16384,
        totalMB: 32768,
      },
      disk: {
        usedGB: 500,
        totalGB: 1000,
        path: '/',
      },
      loadedModels: [{ name: 'llama-3', sizeGB: 8.5 }],
      uptime: '3d 14h 22m',
    }

    expect(resources.gpu?.name).toBe('NVIDIA RTX 4090')
    expect(resources.cpu.cores).toBe(16)
    expect(resources.loadedModels).toHaveLength(1)
  })

  it('accepts SystemResources with null GPU', () => {
    const resources: SystemResources = {
      gpu: null,
      cpu: { usagePercent: 20, cores: 8 },
      memory: { usedMB: 4096, totalMB: 16384 },
      disk: { usedGB: 100, totalGB: 500, path: '/home' },
      loadedModels: [],
      uptime: '1h 5m',
    }

    expect(resources.gpu).toBeNull()
    expect(resources.loadedModels).toHaveLength(0)
  })
})

describe('TenshuConfig type', () => {
  it('accepts a valid TenshuConfig object', () => {
    const config: TenshuConfig = {
      openclawDir: '~/.openclaw',
      port: 3001,
      clientPort: 5173,
      theme: 'dark',
      accentColor: '#ff6b35',
    }

    expect(config.port).toBe(3001)
    expect(config.theme).toBe('dark')
  })

  it('accepts all valid theme values', () => {
    const themes: TenshuConfig['theme'][] = ['dark', 'light', 'system']
    expect(themes).toHaveLength(3)
  })
})

describe('ISOTimestamp type', () => {
  it('is assignable from a string', () => {
    const ts: ISOTimestamp = '2026-03-12T14:00:00.000Z'
    expect(typeof ts).toBe('string')
  })
})

describe('AgentConfig optional fields', () => {
  it('accepts a minimal AgentConfig without optional fields', () => {
    const config: AgentConfig = {
      id: 'minimal-agent',
      name: 'Minimal',
      workspace: '/tmp/minimal',
    }

    expect(config.default).toBeUndefined()
    expect(config.model).toBeUndefined()
  })

  it('accepts AgentConfig with default flag', () => {
    const config: AgentConfig = {
      id: 'default-agent',
      name: 'Default',
      workspace: '/tmp/default',
      default: true,
    }

    expect(config.default).toBe(true)
  })

  it('accepts AgentConfig model without fallbacks', () => {
    const config: AgentConfig = {
      id: 'no-fallbacks',
      name: 'NoFallbacks',
      workspace: '/tmp/nf',
      model: { primary: 'gpt-4' },
    }

    expect(config.model?.fallbacks).toBeUndefined()
  })
})

describe('AgentState optional fields', () => {
  it('accepts a minimal AgentState', () => {
    const state: AgentState = {
      id: 'agent-1',
      status: 'idle',
    }

    expect(state.currentTask).toBeUndefined()
    expect(state.error).toBeUndefined()
    expect(state.model).toBeUndefined()
    expect(state.sessionId).toBeUndefined()
    expect(state.lastActivity).toBeUndefined()
  })
})
