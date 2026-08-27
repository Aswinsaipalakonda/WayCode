import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendWhatsAppText, whatsappConfigured } from '../src/lib/whatsapp'

describe('WhatsApp Notification Helper', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it('reports configured true only when both token and phone ID exist', () => {
    delete process.env.WHATSAPP_TOKEN
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    expect(whatsappConfigured()).toBe(false)
  })

  it('formats phone numbers cleanly and sends structured message payload', async () => {
    process.env.WHATSAPP_TOKEN = 'mock_test_token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1213946748457901'

    let requestUrl = ''
    let requestBody: Record<string, unknown> | null = null

    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      requestUrl = String(url)
      requestBody = JSON.parse(init.body) as Record<string, unknown>
      return {
        ok: true,
        status: 200,
      }
    })

    const success = await sendWhatsAppText('+91 98765-43210', '✅ WayCode deployment succeeded')

    expect(success).toBe(true)
    expect(requestUrl).toContain('1213946748457901/messages')
    expect(requestBody).not.toBeNull()
    expect(requestBody!.messaging_product).toBe('whatsapp')
    expect(requestBody!.to).toBe('+919876543210')
    expect(requestBody!.type).toBe('text')
  })

  it('handles Meta API errors gracefully without throwing', async () => {
    process.env.WHATSAPP_TOKEN = 'mock_test_token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1213946748457901'

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":{"message":"Recipient not in allowed list"}}',
    })

    const success = await sendWhatsAppText('+91 99999 99999', 'Test message')
    expect(success).toBe(false)
  })
})
