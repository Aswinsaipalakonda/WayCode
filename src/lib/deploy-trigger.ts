import net from 'net'

export interface SafeUrlCheckResult {
  safe: boolean
  reason?: string
}

/**
 * Checks whether an IP string is in a private, loopback, link-local,
 * or reserved address range (SSRF guard).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((p) => parseInt(p, 10))
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true
    }
    const [a, b] = parts

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true
    // 10.0.0.0/8 (Private network)
    if (a === 10) return true
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true
    // 169.254.0.0/16 (Link-local, AWS/GCP metadata)
    if (a === 169 && b === 254) return true
    // 172.16.0.0/12 (Private network: 172.16 - 172.31)
    if (a === 172 && b >= 16 && b <= 31) return true
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true

    return false
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase().trim()
    // ::1 loopback, :: unspecified
    if (normalized === '::1' || normalized === '::') return true
    // Unique local address (fc00::/7 -> fc.. or fd..)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
    // Link-local address (fe80::/10 -> fe8, fe9, fea, feb)
    if (/^fe[89ab]/i.test(normalized)) return true
    // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
    if (normalized.includes('::ffff:')) {
      const ipv4Part = normalized.split('::ffff:')[1]
      if (ipv4Part && net.isIPv4(ipv4Part)) {
        return isPrivateOrReservedIp(ipv4Part)
      }
    }
  }

  return false
}

/**
 * Validates whether a target webhook URL is safe from SSRF exploits.
 */
export function isSafeWebhookUrl(urlString: string): SafeUrlCheckResult {
  if (!urlString || typeof urlString !== 'string') {
    return { safe: false, reason: 'Webhook URL is required' }
  }

  let parsed: URL
  try {
    parsed = new URL(urlString.trim())
  } catch {
    return { safe: false, reason: 'Invalid URL format' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Protocol "${parsed.protocol}" is not supported (use http: or https:)` }
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (!hostname) {
    return { safe: false, reason: 'Hostname is empty' }
  }

  // Block obvious loopback and private hostname keywords
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return { safe: false, reason: `Destination host "${hostname}" is private or reserved` }
  }

  // Check direct IP address representation
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { safe: false, reason: `Destination IP "${hostname}" is private or reserved` }
    }
  }

  return { safe: true }
}

export interface TriggerDeployHookOptions {
  webhookUrl: string
  repoName: string
  branchName: string
  taskId: string
  prompt?: string | null
  prUrl?: string | null
}

export interface TriggerDeployHookResult {
  success: boolean
  status?: number
  error?: string
}

/**
 * Dispatches an outbound POST request to a per-repo deployment webhook.
 * Never throws — returns a structured result.
 */
export async function triggerDeployHook(
  options: TriggerDeployHookOptions,
): Promise<TriggerDeployHookResult> {
  const { webhookUrl, repoName, branchName, taskId, prompt, prUrl } = options

  const check = isSafeWebhookUrl(webhookUrl)
  if (!check.safe) {
    return { success: false, error: check.reason || 'Invalid webhook URL' }
  }

  const payload = {
    event: 'waycode.task.shipped',
    taskId,
    repo: repoName,
    branch: branchName,
    prompt: prompt ?? null,
    pullRequestUrl: prUrl ?? null,
    timestamp: new Date().toISOString(),
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WayCode-Deploy-Trigger/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: `Webhook responder returned HTTP ${res.status}`,
      }
    }

    return {
      success: true,
      status: res.status,
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: message,
    }
  }
}
