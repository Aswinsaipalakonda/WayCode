/* WayCode service worker — web-push delivery, notification routing,
   and a lightweight offline shell so an installed PWA never dead-ends. */

const SHELL_CACHE = 'waycode-shell-v1'
const SHELL_ASSETS = [
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/maskable-192.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n !== SHELL_CACHE).map((n) => caches.delete(n)),
      )
      await self.clients.claim()
    })(),
  )
})

/* ---------------- Web push ---------------- */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'WayCode'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/maskable-192.png',
    tag: data.tag || 'waycode',
    renotify: true,
    data: { url: data.url || '/tasks' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = (event.notification.data && event.notification.data.url) || '/tasks'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})

/* ---------------- Offline shell ---------------- */

const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>WayCode — offline</title>
<style>body{margin:0;display:flex;min-height:100dvh;align-items:center;justify-content:center;background:#090d16;color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:24px}
main{max-width:280px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;line-height:1.6;color:#9ca3af;margin:0}</style>
</head><body><main><h1>You're offline</h1>
<p>WayCode needs a connection to reach your agent daemon. Queued tasks keep running on the VPS — reopen once you're back online.</p>
</main></body></html>`

function isOfflineResponse(response) {
  return !response || response.status === 504 || response.type === 'opaque'
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Never touch cross-origin traffic (Supabase, providers) or mutations.
  if (request.method !== 'GET') return
  try {
    if (new URL(request.url).origin !== self.location.origin) return
  } catch {
    return
  }

  const path = new URL(request.url).pathname
  if (path.startsWith('/api/') || path.startsWith('/auth/')) return

  // Navigations — network first, cached page next, branded offline card last.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          if (fresh && fresh.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put(request, fresh.clone()).catch(() => undefined)
          }
          return fresh
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match('/tasks')) ||
            new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 200,
            })
          )
        }
      })(),
    )
    return
  }

  // Static assets — cache first, refresh in the background.
  if (
    path.startsWith('/_next/static/') ||
    path.startsWith('/icons/') ||
    path === '/logo.png' ||
    /\.(?:css|js|woff2?|png|svg|ico|webp|avif)$/.test(path)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) {
          fetch(request)
            .then((fresh) => {
              if (fresh && fresh.ok) {
                caches.open(SHELL_CACHE).then((cache) => cache.put(request, fresh.clone()))
              }
            })
            .catch(() => undefined)
          return cached
        }

        try {
          const fresh = await fetch(request)
          if (!isOfflineResponse(fresh) && fresh.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put(request, fresh.clone()).catch(() => undefined)
          }
          return fresh
        } catch {
          return new Response('', { status: 504 })
        }
      })(),
    )
  }
})
