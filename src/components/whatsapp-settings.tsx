'use client'

import { useEffect, useState } from 'react'
import { TbBrandWhatsapp, TbCheck, TbEdit, TbLoaderQuarter, TbTrash, TbX } from 'react-icons/tb'
import { toast } from 'sonner'

export function WhatsAppSettings({ initialNumber }: { initialNumber?: string | null }) {
  const [number, setNumber] = useState<string | null>(initialNumber ?? null)
  const [inputVal, setInputVal] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(initialNumber === undefined)

  useEffect(() => {
    if (initialNumber !== undefined) return

    let cancelled = false
    fetch('/api/settings/whatsapp')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setNumber(data.whatsappNumber)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialNumber])

  const handleStartEdit = () => {
    setInputVal(number || '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setInputVal('')
  }

  const handleSave = async () => {
    const raw = inputVal.trim()
    if (!raw) {
      toast.warning('Please enter a valid phone number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber: raw }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setNumber(data.whatsappNumber)
        setIsEditing(false)
        toast.success('WhatsApp number saved', {
          description: 'You will now receive out-of-band deployment receipts on WhatsApp.',
        })
      } else {
        toast.error('Failed to save WhatsApp number', {
          description: data.error || 'Please check the phone number format.',
        })
      }
    } catch {
      toast.error('Failed to save WhatsApp number')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'DELETE',
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setNumber(null)
        setIsEditing(false)
        setInputVal('')
        toast.success('WhatsApp number removed')
      } else {
        toast.error('Failed to remove WhatsApp number')
      }
    } catch {
      toast.error('Failed to remove WhatsApp number')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[22px] border border-black/[0.05] bg-white/90 p-4 shadow-[var(--shadow-sm)]">
        <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[var(--muted-foreground)]">
          <TbLoaderQuarter className="h-4 w-4 animate-spin text-[var(--brand)]" />
          Loading WhatsApp settings…
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-[22px] border border-black/[0.05] bg-white/90 p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-black/[0.09] hover:bg-white">
      {!isEditing ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-[13px] font-semibold">
            <span className="rounded-xl bg-[#25D366]/15 p-2 text-[#25D366]">
              <TbBrandWhatsapp className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              WhatsApp alerts
              <span className="block text-[10px] font-medium text-[var(--muted-foreground)]">
                {number ? (
                  <span className="font-mono-code font-semibold text-[var(--foreground)]">{number}</span>
                ) : (
                  'Deploy receipts & live URLs'
                )}
              </span>
            </span>
          </span>

          <div className="flex items-center gap-2">
            {number ? (
              <>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="pressable inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--foreground-secondary)] shadow-sm hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  <TbEdit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={loading}
                  title="Remove WhatsApp Number"
                  className="pressable rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--error-soft)] hover:text-[var(--error)]"
                >
                  <TbTrash className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                className="btn-brand pressable rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm"
              >
                Add number
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12px] font-bold text-[var(--foreground)]">
              <TbBrandWhatsapp className="h-4 w-4 text-[#25D366]" />
              {number ? 'Update WhatsApp Number' : 'Connect WhatsApp Number'}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <TbX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="+1 555 123 4567 or +91 98765 43210"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 font-mono-code text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-soft)]"
              autoFocus
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || !inputVal.trim()}
                className="btn-brand pressable inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {loading ? (
                  <TbLoaderQuarter className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <TbCheck className="h-3.5 w-3.5" />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="pressable rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Include country code with <code className="font-mono-code text-[10px]">+</code>. Messages will be sent only when deployments succeed or fail.
          </p>
        </div>
      )}
    </div>
  )
}
