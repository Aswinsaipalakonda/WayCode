import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { provider, apiKey, model, customBaseUrl } = await request.json()

    if (!apiKey && provider !== 'openrouter') {
      return NextResponse.json(
        { success: false, error: 'API Key is required for connection validation' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    let apiUrl = ''
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (provider === 'openrouter') {
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
      headers['Authorization'] = `Bearer ${apiKey || 'free'}`
    } else if (provider === 'gemini') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    } else if (provider === 'custom') {
      apiUrl = `${customBaseUrl.replace(/\/$/, '')}/chat/completions`
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    // Lightweight validation payload (ping)
    const payload = provider === 'gemini' 
      ? { contents: [{ parts: [{ text: "ping" }] }] }
      : { model, messages: [{ role: "user", content: "ping" }], max_tokens: 5 }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const latency = `${Date.now() - startTime}ms`

    if (response.ok) {
      return NextResponse.json({ success: true, latency })
    } else {
      const errData = await response.text()
      return NextResponse.json(
        { success: false, error: `HTTP ${response.status}: ${errData.slice(0, 100)}` },
        { status: response.status }
      )
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown validation error' },
      { status: 500 }
    )
  }
}
