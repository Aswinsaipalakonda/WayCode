'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TbBrandWhatsapp, TbCheck, TbLoaderQuarter, TbX, TbShieldCheck } from 'react-icons/tb'
import { toast } from 'sonner'

interface WhatsAppOnboardingModalProps {
  user?: {
    id?: string
    email?: string
  } | null
}

export function WhatsAppOnboardingModal({ user }: WhatsAppOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !user.id || typeof window === 'undefined') return

    const storageKey = `waycode_whatsapp_prompted_${user.id}`
    const alreadyPrompted = localStorage.getItem(storageKey)
    if (alreadyPrompted) return

    let cancelled = false

    fetch('/api/settings/whatsapp')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.whatsappNumber) {
          // Already configured on server
          localStorage.setItem(storageKey, 'configured')
        } else {
          // Open onboarding prompt
          setIsOpen(true)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [user])

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`waycode_whatsapp_prompted_${user.id}`, 'dismissed')
    }
    setIsOpen(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = phone.trim()
    if (!raw) {
      toast.warning('Please enter your phone number with country code')
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
        if (user?.id) {
          localStorage.setItem(`waycode_whatsapp_prompted_${user.id}`, 'configured')
        }
        setIsOpen(false)
        toast.success('WhatsApp notifications enabled!', {
          description: 'You will receive deployment confirmations and live URLs on WhatsApp.',
        })
      } else {
        toast.error('Could not save WhatsApp number', {
          description: data.error || 'Please include your country code (e.g. +91 or +1).',
        })
      }
    } catch {
      toast.error('Network error while saving WhatsApp number')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
          />

          {/* Modal Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-xl)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#25D366] shadow-[0_2px_12px_-2px_rgba(37,211,102,0.3)]">
                  <TbBrandWhatsapp className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-[var(--foreground)]">
                    Deploy Receipts on WhatsApp
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Out-of-band mobile confirmations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="pressable rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <TbX className="h-4 w-4" />
              </button>
            </div>

            {/* Description */}
            <div className="mt-4 space-y-2 rounded-2xl bg-[var(--surface)] p-3.5 text-xs text-[var(--foreground-secondary)] leading-relaxed">
              <p>
                WayCode can ping your WhatsApp immediately after you approve tasks with:
              </p>
              <ul className="list-inside list-disc space-y-1 text-[11.5px] text-[var(--muted-foreground)]">
                <li>Production deployment status (success / failure)</li>
                <li>Live preview URLs &amp; PR links</li>
                <li>Automated commit &amp; branch metadata</li>
              </ul>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                  WhatsApp Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210 or +1 555 123 4567"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 font-mono-code text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[#25D366] focus:shadow-[0_0_0_3px_rgba(37,211,102,0.15)]"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                  Include country code prefix (e.g. <code className="font-mono-code text-[10px]">+91</code> or <code className="font-mono-code text-[10px]">+1</code>).
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#20bd5a] disabled:opacity-50"
                >
                  {loading ? (
                    <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                  ) : (
                    <TbCheck className="h-4 w-4" />
                  )}
                  Enable WhatsApp Alerts
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="pressable rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  Skip for now
                </button>
              </div>
            </form>

            <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)]">
              <TbShieldCheck className="h-3.5 w-3.5 text-[var(--success)]" />
              <span>You can change or remove your number anytime in Profile.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
