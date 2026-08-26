'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function NotificationToggle() {
  const [supported, setSupported] = useState(true)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false

    ;(async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setSupported(false)
        return
      }

      try {
        const keyRes = await fetch('/api/push/public-key')
        if (!cancelled) setConfigured(keyRes.ok)

        const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        const existing = await reg?.pushManager.getSubscription()
        if (!cancelled && existing && Notification.permission === 'granted') setEnabled(true)
      } catch {
        if (!cancelled) setConfigured(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.info('Permission denied', { description: 'Enable notifications in your browser settings to get review alerts.' })
        return
      }

      const res = await fetch('/api/push/public-key')
      if (!res.ok) {
        toast.error('Push not available', { description: 'The server has no VAPID keys configured yet.' })
        return
      }
      const { publicKey } = await res.json()

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
      if (!saveRes.ok) throw new Error('save failed')

      setEnabled(true)
      toast.success('Notifications on', {
        description: "You'll be pinged the moment a diff is ready for review.",
      })
    } catch {
      toast.error('Could not enable notifications', { description: 'Try reloading and enabling again.' })
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEnabled(false)
      toast.info('Notifications off')
    } finally {
      setBusy(false)
    }
  }

  if (!supported || configured === false) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-black/[0.05] bg-white/90 p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-black/[0.09] hover:bg-white">
      <span className="flex items-center gap-2.5 text-[13px] font-semibold">
        <span className={`rounded-xl p-2 ${enabled ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--brand-soft)] text-[var(--brand)]'}`}>
          {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          Push notifications
          <span className="block text-[10px] font-medium text-[var(--muted-foreground)]">
            Review-ready &amp; failure alerts
          </span>
        </span>
      </span>

      <button
        type="button"
        onClick={enabled ? disable : enable}
        disabled={busy}
        aria-pressed={enabled}
        className={`pressable min-w-[86px] rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-50 ${
          enabled
            ? 'border border-[var(--border-strong)] bg-white text-[var(--foreground-secondary)]'
            : 'btn-brand'
        }`}
      >
        {busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : enabled ? 'On' : 'Enable'}
      </button>
    </div>
  )
}
