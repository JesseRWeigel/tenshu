import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
}))

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { Hono } from 'hono'

const mockedReadFile = vi.mocked(readFile)
const mockedWriteFile = vi.mocked(writeFile)
const mockedMkdir = vi.mocked(mkdir)
const mockedReaddir = vi.mocked(readdir)

async function createApp() {
  const mod = await import('../routes/avatars.js')
  const app = new Hono()
  app.route('/avatars', mod.default)
  return app
}

describe('avatars route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /', () => {
    it('returns avatar config from file', async () => {
      mockedReadFile.mockResolvedValue(
        JSON.stringify({ 'agent-1': '/assets/characters/goku.png' }),
      )

      const app = await createApp()
      const res = await app.request('/avatars')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body['agent-1']).toBe('/assets/characters/goku.png')
    })

    it('returns empty object when config file does not exist', async () => {
      mockedReadFile.mockRejectedValue(new Error('ENOENT'))

      const app = await createApp()
      const res = await app.request('/avatars')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual({})
    })
  })

  describe('GET /available', () => {
    it('returns list of character images', async () => {
      mockedReaddir.mockResolvedValueOnce([
        'goku.png',
        'vegeta.jpg',
        'readme.txt',
        'bulma.webp',
      ] as any)
      // Custom dir read
      mockedReaddir.mockRejectedValueOnce(new Error('ENOENT'))

      const app = await createApp()
      const res = await app.request('/avatars/available')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toHaveLength(3)
      expect(body).toContain('/assets/characters/goku.png')
      expect(body).toContain('/assets/characters/vegeta.jpg')
      expect(body).toContain('/assets/characters/bulma.webp')
      // txt file should be filtered out
      expect(body).not.toContain('/assets/characters/readme.txt')
    })

    it('includes custom directory images', async () => {
      mockedReaddir.mockResolvedValueOnce(['base.png'] as any)
      mockedReaddir.mockResolvedValueOnce(['custom-avatar.png'] as any)

      const app = await createApp()
      const res = await app.request('/avatars/available')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toContain('/assets/characters/base.png')
      expect(body).toContain('/assets/characters/custom/custom-avatar.png')
    })

    it('returns 500 when main readdir fails', async () => {
      mockedReaddir.mockRejectedValueOnce(new Error('Permission denied'))

      const app = await createApp()
      const res = await app.request('/avatars/available')
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toBe('Permission denied')
    })
  })

  describe('PUT /:agentId', () => {
    it('sets avatar for an agent', async () => {
      mockedReadFile.mockResolvedValue(JSON.stringify({}))
      mockedMkdir.mockResolvedValue(undefined)
      mockedWriteFile.mockResolvedValue(undefined)

      const app = await createApp()
      const res = await app.request('/avatars/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: '/assets/characters/goku.png' }),
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.agentId).toBe('agent-1')
      expect(body.image).toBe('/assets/characters/goku.png')
    })

    it('returns 400 when image is missing', async () => {
      const app = await createApp()
      const res = await app.request('/avatars/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: '' }),
      })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('image is required')
    })
  })

  describe('POST /:agentId/upload', () => {
    it('returns 400 when no file provided', async () => {
      const app = await createApp()
      const formData = new FormData()
      const res = await app.request('/avatars/agent-1/upload', {
        method: 'POST',
        body: formData,
      })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('file is required')
    })

    it('uploads a file and updates config', async () => {
      mockedMkdir.mockResolvedValue(undefined)
      mockedWriteFile.mockResolvedValue(undefined)
      mockedReadFile.mockResolvedValue(JSON.stringify({}))

      const app = await createApp()
      const formData = new FormData()
      const blob = new Blob(['fake-image-data'], { type: 'image/png' })
      formData.append('file', blob, 'avatar.png')

      const res = await app.request('/avatars/agent-1/upload', {
        method: 'POST',
        body: formData,
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.agentId).toBe('agent-1')
      expect(body.image).toContain('/assets/characters/custom/')
      expect(body.image).toContain('agent-1')
    })
  })
})
