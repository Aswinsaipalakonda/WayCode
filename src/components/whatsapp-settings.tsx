'use client'

import { useEffect, useState } from 'react'
import { TbBrandWhatsapp, TbCheck, TbEdit, TbLoaderQuarter, TbTrash, TbX } from 'react-icons/tb'
import { toast } from 'sonner'

export function WhatsAppSettings({ initialNumber }: { initialNumber?: string | null }) {
  const [number, setNumber] = useState<string | null>(initialNumber ?? null)
  const [digits, setDigits] = useState<string>('')
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
    if (number) {
      const clean = number.replace(/\D/g, '')
      setDigits(clean.slice(-10))
    } else {
      setDigits('')
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setDigits('')
  }

  const handleDigitsChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    setDigits(cleaned)
  }

  const formattedDisplay = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits

  const handleSave = async () => {
    if (digits.length !== 10) {
      toast.warning('Please enter a valid 10-digit mobile number')
      return
    }

    const fullNumber = `+91${digits}`
    setLoading(true)

    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber: fullNumber }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setNumber(data.whatsappNumber)
        setIsEditing(false)
        toast.success('WhatsApp number saved', {
          description: `Connected to +91 ${formattedDisplay}`,
        })
      } else {
        toast.error('Failed to save WhatsApp number', {
          description: data.error || 'Please check your phone number.',
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
        setDigits('')
        toast.success('WhatsApp notifications removed')
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
          <TbLoaderQuarter className="h-4 w-4 animate-spin text-[#25D366]" />
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
            <span className="rounded-xl bg-[#25D366]/10 p-2 text-[#128C7E]">
              <TbBrandWhatsapp className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              WhatsApp alerts
              <span className="block text-[10.5px] font-medium text-[var(--muted-foreground)]">
                {number ? (
                  <span className="font-mono-code font-semibold text-[#111827]">{number}</span>
                ) : (
                  'Deploy receipts & preview URLs'
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
                  className="pressable inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-bold text-[#111827] shadow-xs hover:border-black/20"
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
                className="pressable rounded-full bg-[#25D366] text-white px-3.5 py-1.5 text-[11px] font-bold shadow-xs hover:bg-[#20bd5a]"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12px] font-bold text-[#111827]">
              <TbBrandWhatsapp className="h-4 w-4 text-[#128C7E]" />
              {number ? 'Update WhatsApp Number' : 'Connect WhatsApp Number'}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg p-1 text-[var(--muted-foreground)] hover:text-[#111827]"
            >
              <TbX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex h-11 flex-1 items-center rounded-xl border border-[#cbd5e1] bg-white px-2.5 transition-all focus-within:border-[#25D366] focus-within:ring-4 focus-within:ring-[#25D366]/15">
              <div className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-[#f1f5f9] px-2 text-xs font-bold text-[#0f172a] select-none">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formattedDisplay}
                onChange={(e) => handleDigitsChange(e.target.value)}
                placeholder="98765 43210"
                maxLength={11}
                className="h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 font-mono-code text-[14px] font-semibold text-[#0f172a] placeholder:font-normal placeholder:text-[#94a3b8]/70 focus:border-0 focus:outline-none focus:ring-0 outline-none ring-0"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || digits.length !== 10}
                className="pressable inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#20bd5a] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <TbLoaderQuarter className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <TbCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="pressable flex h-11 items-center rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-black/5 hover:text-[#111827]"
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="text-[10.5px] text-[var(--muted-foreground)]">
            Only 10-digit numbers for automated deploy receipts.
          </p>
        </div>
      )}
    </div>
  )
}
