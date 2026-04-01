import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

// We need to mock before importing the route
const mockedReadFile = vi.fn()
const mockedExecFile = vi.fn()

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockedReadFile(...args),
}))

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => mockedExecFile(...args),
}))

describe('system routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    // Re-apply mocks after resetModules
    vi.doMock('node:fs/promises', () => ({
      readFile: (...args: unknown[]) => mockedReadFile(...args),
    }))
    vi.doMock('node:child_process', () => ({
      execFile: (...args: unknown[]) => mockedExecFile(...args),
    }))

    const { default: systemRoute } = await import('../routes/system.js')
    app = new Hono()
    app.route('/system', systemRoute)
  })

  function setupProcMocks(overrides: Record<string, string> = {}) {
    const defaults: Record<string, string> = {
      '/proc/stat':
        'cpu  100 20 30 800 10 5 3 0 0 0\ncpu0  50 10 15 400 5 2 1 0 0 0',
      '/proc/cpuinfo':
        'processor\t: 0\nmodel name\t: Test CPU\n\nprocessor\t: 1\nmodel name\t: Test CPU\n',
      '/proc/meminfo':
        'MemTotal:       16384000 kB\nMemFree:         1000000 kB\nMemAvailable:    8192000 kB\n',
      '/proc/uptime': '90061.45 170000.00',
      ...overrides,
    }

    mockedReadFile.mockImplementation(async (path: unknown) => {
      const p = String(path)
      if (defaults[p] !== undefined) return defaults[p]
      throw new Error(`Unexpected readFile: ${p}`)
    })
  }

  function setupExecMocks(
    overrides: Record<string, { error?: Error; stdout?: string }> = {},
  ) {
    const defaults: Record<string, { error?: Error; stdout?: string }> = {
      'nvidia-smi': {
        stdout: 'NVIDIA RTX 4090, 55, 42, 8192, 24576, 280, 450',
      },
      df: { stdout: '  Used  Size\n  120G  500G\n' },
      ollama: {
        stdout:
          'NAME           ID       SIZE    PROCESSOR    UNTIL\nllama3:8b      abc123   4.7GB   100% GPU    Forever\n',
      },
      ...overrides,
    }

    mockedExecFile.mockImplementation(
      (cmd: string, _args: unknown[], _opts: unknown, cb?: Function) => {
        if (typeof _opts === 'function') cb = _opts
        const mock = defaults[cmd]
        if (mock?.error) {
          cb!(mock.error)
        } else if (mock) {
          cb!(null, { stdout: mock.stdout })
        } else {
          cb!(new Error(`Unknown command: ${cmd}`))
        }
        return {}
      },
    )
  }

  describe('GET /system', () => {
    it('returns full system resources on success', async () => {
      setupProcMocks()
      setupExecMocks()

      const res = await app.request('/system')
      expect(res.status).toBe(200)
      const data = await res.json()

      // CPU
      expect(data.cpu).toBeDefined()
      expect(data.cpu.cores).toBe(2)
      expect(data.cpu.usagePercent).toBeGreaterThan(0)

      // Memory
      expect(data.memory).toBeDefined()
      expect(data.memory.totalMB).toBeGreaterThan(0)
      expect(data.memory.usedMB).toBeGreaterThan(0)

      // GPU
      expect(data.gpu).toBeDefined()
      expect(data.gpu.name).toContain('RTX 4090')

      // Disk
      expect(data.disk).toBeDefined()
      expect(data.disk.path).toBe('/')

      // Uptime (90061s = 1d 1h 1m)
      expect(data.uptime).toContain('d')

      // Loaded models
      expect(data.loadedModels).toBeDefined()
    })

    it('returns null GPU when nvidia-smi fails', async () => {
      setupProcMocks()
      setupExecMocks({
        'nvidia-smi': { error: new Error('nvidia-smi not found') },
      })

      const res = await app.request('/system')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.gpu).toBeNull()
    })

    it('returns empty loaded models when ollama fails', async () => {
      setupProcMocks()
      setupExecMocks({
        'nvidia-smi': { error: new Error('not found') },
        ollama: { error: new Error('not found') },
      })

      const res = await app.request('/system')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.loadedModels).toEqual([])
    })

    it('returns fallback values when /proc files are unreadable', async () => {
      mockedReadFile.mockRejectedValue(new Error('Permission denied'))
      setupExecMocks({
        'nvidia-smi': { error: new Error('not found') },
        df: { error: new Error('not found') },
        ollama: { error: new Error('not found') },
      })

      const res = await app.request('/system')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.cpu).toEqual({ usagePercent: 0, cores: 0 })
      expect(data.memory).toEqual({ usedMB: 0, totalMB: 0 })
      expect(data.disk).toEqual({ usedGB: 0, totalGB: 0, path: '/' })
      expect(data.gpu).toBeNull()
      expect(data.loadedModels).toEqual([])
      expect(data.uptime).toBe('unknown')
    })

    it('formats uptime correctly for days', async () => {
      // 2 days, 3 hours, 25 minutes = 2*86400 + 3*3600 + 25*60 = 184100 (actually use correct value)
      // 2*86400 + 3*3600 + 25*60 = 172800 + 10800 + 1500 = 185100
      setupProcMocks({ '/proc/uptime': '185100.00 300000.00' })
      setupExecMocks({
        'nvidia-smi': { error: new Error('not found') },
        ollama: { error: new Error('not found') },
      })

      const res = await app.request('/system')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.uptime).toBe('2d 3h 25m')
    })

    it('formats uptime without days when under 24h', async () => {
      // 5 hours, 30 minutes = 5*3600 + 30*60 = 19800
      setupProcMocks({ '/proc/uptime': '19800.00 30000.00' })
      setupExecMocks({
        'nvidia-smi': { error: new Error('not found') },
        ollama: { error: new Error('not found') },
      })

      const res = await app.request('/system')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.uptime).toBe('5h 30m')
    })
  })
})
