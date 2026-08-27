import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isPrivateOrReservedIp,
  isSafeWebhookUrl,
  triggerDeployHook,
} from '../src/lib/deploy-trigger'

describe('deploy-trigger SSRF guard', () => {
  describe('isPrivateOrReservedIp', () => {
    it('detects IPv4 loopback (127.0.0.1, 127.0.0.2)', () => {
      expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true)
      expect(isPrivateOrReservedIp('127.0.1.10')).toBe(true)
    })

    it('detects IPv4 cloud instance metadata (169.254.169.254)', () => {
      expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true)
      expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true)
    })

    it('detects RFC 1918 private ranges (10.x, 172.16-31.x, 192.168.x)', () => {
      expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true)
      expect(isPrivateOrReservedIp('10.255.255.255')).toBe(true)
      expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true)
      expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true)
      expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true)
      expect(isPrivateOrReservedIp('192.168.0.254')).toBe(true)
    })

    it('allows public IPv4 addresses', () => {
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false)
      expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false)
      expect(isPrivateOrReservedIp('104.26.10.23')).toBe(false)
      expect(isPrivateOrReservedIp('172.32.0.1')).toBe(false) // 172.32 is outside 172.16-31
    })

    it('detects IPv6 loopback and private unique local addresses', () => {
      expect(isPrivateOrReservedIp('::1')).toBe(true)
      expect(isPrivateOrReservedIp('fc00::1')).toBe(true)
      expect(isPrivateOrReservedIp('fd12:3456:789a::1')).toBe(true)
      expect(isPrivateOrReservedIp('fe80::1')).toBe(true)
    })
  })

  describe('isSafeWebhookUrl', () => {
    it('rejects empty or invalid URLs', () => {
      expect(isSafeWebhookUrl('').safe).toBe(false)
      expect(isSafeWebhookUrl('not-a-url').safe).toBe(false)
      expect(isSafeWebhookUrl('ftp://example.com/hook').safe).toBe(false)
      expect(isSafeWebhookUrl('file:///etc/passwd').safe).toBe(false)
    })

    it('rejects localhost and private hostnames', () => {
      expect(isSafeWebhookUrl('http://localhost/deploy').safe).toBe(false)
      expect(isSafeWebhookUrl('http://localhost:3000/api').safe).toBe(false)
      expect(isSafeWebhookUrl('http://service.internal/webhook').safe).toBe(false)
      expect(isSafeWebhookUrl('https://my-app.local/hook').safe).toBe(false)
    })

    it('rejects private IP URLs', () => {
      expect(isSafeWebhookUrl('http://127.0.0.1:8080/hook').safe).toBe(false)
      expect(isSafeWebhookUrl('http://169.254.169.254/latest/meta-data').safe).toBe(false)
      expect(isSafeWebhookUrl('http://192.168.1.50/deploy').safe).toBe(false)
      expect(isSafeWebhookUrl('http://10.0.1.5/deploy').safe).toBe(false)
      expect(isSafeWebhookUrl('http://[::1]:8080/hook').safe).toBe(false)
    })

    it('accepts valid public HTTP/HTTPS URLs', () => {
      expect(isSafeWebhookUrl('https://api.coolify.io/webhooks/deploy').safe).toBe(true)
      expect(isSafeWebhookUrl('https://dokku.example.com:443/deploy-hook').safe).toBe(true)
      expect(isSafeWebhookUrl('http://93.184.216.34/deploy').safe).toBe(true)
    })
  })

  describe('triggerDeployHook', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      vi.restoreAllMocks()
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('fails immediately for unsafe SSRF target URLs without fetching', async () => {
      const fetchSpy = vi.fn()
      global.fetch = fetchSpy

      const result = await triggerDeployHook({
        webhookUrl: 'http://169.254.169.254/latest',
        repoName: 'acme/webapp',
        branchName: 'waycode/feature-1',
        taskId: 'task-123',
      })

      expect(result.success).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('dispatches structured JSON payload on safe URLs', async () => {
      let requestedUrl = ''
      let requestedBody: Record<string, unknown> | null = null

      global.fetch = vi.fn().mockImplementation(async (url, init) => {
        requestedUrl = String(url)
        requestedBody = JSON.parse(init.body) as Record<string, unknown>
        return {
          ok: true,
          status: 200,
        }
      })

      const result = await triggerDeployHook({
        webhookUrl: 'https://deploy.example.com/hooks/waycode',
        repoName: 'acme/webapp',
        branchName: 'waycode/feature-1',
        taskId: 'task-123',
        prompt: 'Add dark mode toggle',
        prUrl: 'https://github.com/acme/webapp/pull/42',
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe(200)
      expect(requestedUrl).toBe('https://deploy.example.com/hooks/waycode')
      expect(requestedBody).not.toBeNull()
      expect(requestedBody!.event).toBe('waycode.task.shipped')
      expect(requestedBody!.taskId).toBe('task-123')
      expect(requestedBody!.repo).toBe('acme/webapp')
      expect(requestedBody!.branch).toBe('waycode/feature-1')
      expect(requestedBody!.prompt).toBe('Add dark mode toggle')
      expect(requestedBody!.pullRequestUrl).toBe('https://github.com/acme/webapp/pull/42')
      expect(requestedBody!.timestamp).toBeDefined()
    })

    it('handles non-200 responses gracefully without throwing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
      })

      const result = await triggerDeployHook({
        webhookUrl: 'https://deploy.example.com/hooks/waycode',
        repoName: 'acme/webapp',
        branchName: 'waycode/feature-1',
        taskId: 'task-123',
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe(502)
      expect(result.error).toContain('502')
    })
  })
})
