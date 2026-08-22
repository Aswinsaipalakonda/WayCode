/**
 * Shared BYOK provider logic — used by the settings API routes and the daemon.
 * Handles provider resolution from key shape, key validation, and live
 * model-catalog fetching across OpenRouter / Gemini / Anthropic / custom.
 */

export type EffectiveProvider = 'openrouter' | 'gemini' | 'anthropic' | 'custom'

export interface ModelEntry {
  id: string
  name: string
  free: boolean
}

const TIMEOUT_MS = 15_000

/** Infer the real upstream provider from the selected card + the key's own shape. */
export function resolveProvider(
  provider: string,
  apiKey: string,
  baseUrl?: string | null,
): EffectiveProvider {
  const k = (apiKey || '').trim()
  // Claude keys are unmistakable — honor them regardless of the chosen card.
  if (k.startsWith('sk-ant-')) return 'anthropic'
  if (provider === 'gemini') return 'gemini'
  if (provider === 'openrouter') return 'openrouter'
  // Custom card: empty base URL + an OpenRouter-shaped key still routes to OpenRouter.
  if (!baseUrl && k.startsWith('sk-or-')) return 'openrouter'
  if (k.startsWith('AIza')) return 'gemini'
  return 'custom'
}

function errMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === 'TimeoutError') return `Validation timed out after ${TIMEOUT_MS / 1000}s`
    if (/fetch failed|network|ECONNREFUSED|ENOTFOUND/i.test(e.message)) {
      return 'Could not reach the provider — check the Base URL and your connection'
    }
    return e.message
  }
  return String(e)
}

function humanizeHttp(status: number, body: string, eff: EffectiveProvider): string {
  if (status === 401 || status === 403) return 'Invalid or unauthorized API key'
  if (status === 429) return 'Rate limited by the provider — retry in a moment'
  if (status === 404 && eff === 'custom') return 'Endpoint not found — check the Base URL (must expose /models)'
  const snippet = body.replace(/\s+/g, ' ').slice(0, 140)
  return `HTTP ${status}${snippet ? `: ${snippet}` : ''}`
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
}

export interface ValidationResult {
  ok: boolean
  latencyMs?: number
  error?: string
}

export async function validateKey(
  eff: EffectiveProvider,
  apiKey: string,
  baseUrl?: string | null,
): Promise<ValidationResult> {
  if (!apiKey.trim()) return { ok: false, error: 'API key is required' }

  const started = Date.now()
  try {
    let res: Response
    switch (eff) {
      case 'openrouter':
        // Dedicated account-key endpoint: cheap, unambiguous, never 404s on model churn.
        res = await timedFetch('https://openrouter.ai/api/v1/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        break
      case 'gemini':
        res = await timedFetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1`,
        )
        break
      case 'anthropic':
        res = await timedFetch('https://api.anthropic.com/v1/models?limit=1', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        })
        break
      case 'custom': {
        const base = (baseUrl || '').replace(/\/+$/, '')
        if (!base) return { ok: false, error: 'Base URL is required for custom endpoints' }
        res = await timedFetch(`${base}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        break
      }
    }

    const latencyMs = Date.now() - started
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, latencyMs, error: humanizeHttp(res.status, body, eff) }
    }
    return { ok: true, latencyMs }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

export interface CatalogResult {
  models: ModelEntry[]
  total: number
  free: number
  error?: string
}

function finalize(models: ModelEntry[]): CatalogResult {
  const seen = new Set<string>()
  const unique = models.filter((m) => {
    if (!m.id || seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
  unique.sort((a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name))
  return {
    models: unique.slice(0, 400),
    total: unique.length,
    free: unique.filter((m) => m.free).length,
  }
}

export async function fetchCatalog(
  eff: EffectiveProvider,
  apiKey: string,
  baseUrl?: string | null,
): Promise<CatalogResult> {
  try {
    let raw: ModelEntry[] = []

    switch (eff) {
      case 'openrouter': {
        const res = await timedFetch('https://openrouter.ai/api/v1/models', {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
        })
        if (!res.ok) return { models: [], total: 0, free: 0, error: humanizeHttp(res.status, await res.text().catch(() => ''), eff) }
        const j = (await res.json()) as {
          data?: Array<{ id: string; name?: string; pricing?: { prompt?: string } }>
        }
        raw = (j.data ?? []).map((m) => ({
          id: m.id,
          name: m.name || m.id,
          free: m.id.endsWith(':free') || Number(m.pricing?.prompt ?? '1') === 0,
        }))
        break
      }
      case 'gemini': {
        const res = await timedFetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`,
        )
        if (!res.ok) return { models: [], total: 0, free: 0, error: humanizeHttp(res.status, await res.text().catch(() => ''), eff) }
        const j = (await res.json()) as {
          models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }>
        }
        raw = (j.models ?? [])
          .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m) => ({
            id: m.name.replace(/^models\//, ''),
            name: m.displayName || m.name.replace(/^models\//, ''),
            free: false,
          }))
        break
      }
      case 'anthropic': {
        const res = await timedFetch('https://api.anthropic.com/v1/models?limit=100', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        })
        if (!res.ok) return { models: [], total: 0, free: 0, error: humanizeHttp(res.status, await res.text().catch(() => ''), eff) }
        const j = (await res.json()) as { data?: Array<{ id: string; display_name?: string }> }
        raw = (j.data ?? []).map((m) => ({ id: m.id, name: m.display_name || m.id, free: false }))
        break
      }
      case 'custom': {
        const base = (baseUrl || '').replace(/\/+$/, '')
        if (!base) return { models: [], total: 0, free: 0, error: 'Base URL is required for custom endpoints' }
        const res = await timedFetch(`${base}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!res.ok) return { models: [], total: 0, free: 0, error: humanizeHttp(res.status, await res.text().catch(() => ''), eff) }
        const j = (await res.json()) as { data?: Array<{ id: string }> }
        raw = (j.data ?? []).map((m) => ({ id: m.id, name: m.id, free: false }))
        break
      }
    }

    if (raw.length === 0) {
      return { models: [], total: 0, free: 0, error: 'The provider returned an empty model catalog' }
    }
    return finalize(raw)
  } catch (e) {
    return { models: [], total: 0, free: 0, error: errMessage(e) }
  }
}
